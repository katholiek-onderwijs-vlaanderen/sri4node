/*
  The core server for the REST api.
  It is configurable, and provides a simple framework for creating REST interfaces.
*/


// External dependencies.
const compression = require('compression');
const bodyParser = require('body-parser');
const express = require('express');
const route = require('route-parser');
const pathfinderUI = require('pathfinder-ui')
const _ = require('lodash');
const pMap = require('p-map');
const Busboy = require('busboy');
const EventEmitter = require('events');
const pEvent = require('p-event');
const httpContext = require('express-http-context');
const shortid = require('shortid');
const stream = require('stream');
const util = require('util');
const JSONStream = require('JSONStream');
const { v4: uuidv4 } = require('uuid');

const Ajv = require("ajv")
const ajv = new Ajv({ coerceTypes: true }) // options can be passed, e.g. {allErrors: true}
const addFormats = require("ajv-formats")
addFormats(ajv)

const { cl, debug, error, pgConnect, pgExec, typeToConfig, SriError, installVersionIncTriggerOnTable, stringifyError, settleResultsToSriResults,
        mapColumnsToObject, executeOnFunctions, tableFromMapping, transformRowToObject, transformObjectToRow, startTransaction, startTask,
        typeToMapping, setServerTimingHdr, jsonArrayStream, sqlColumnNames, getPgp, handleRequestDebugLog, createDebugLogConfigObject,
        installEMT, emtReportToServerTiming } = require('./js/common.js');
const queryobject = require('./js/queryObject.js');
const $q = require('./js/queryUtils.js');
const phaseSyncedSettle = require('./js/phaseSyncedSettle.js')
const hooks = require('./js/hooks.js');
const listResource = require('./js/listResource.js')
const regularResource = require('./js/regularResource.js')
const batch = require('./js/batch.js')
const utilLib = require('./js/utilLib.js')
const schemaUtils = require('./js/schemaUtils.js');


// Force https in production.
function forceSecureSockets(req, res, next) {
  'use strict';
  const isHttps = req.headers['x-forwarded-proto'] === 'https';
  if (!isHttps && req.get('Host').indexOf('localhost') < 0 && req.get('Host').indexOf('127.0.0.1') < 0) {
    return res.redirect('https://' + req.get('Host') + req.url);
  }

  next();
}


/* Handle GET /{type}/schema */
function getSchema(req, resp) {
  'use strict';
  const type = req.route.path.split('/').slice(0, req.route.path.split('/').length - 1).join('/');
  const mapping = typeToMapping(type);

  resp.set('Content-Type', 'application/json');
  resp.send(mapping.schema);
}

/* Handle GET /docs and /{type}/docs */
function getDocs(req, resp) {
  'use strict';
  const typeToMappingMap = typeToConfig(global.sri4node_configuration.resources);
  const type = req.route.path.split('/').slice(0, req.route.path.split('/').length - 1).join('/');
  if (type in typeToMappingMap) {
    const mapping = typeToMappingMap[type];
    resp.locals.path = req._parsedUrl.pathname;
    resp.render('resource', {resource: mapping, queryUtils: exports.queryUtils});
  } else if (req.route.path === '/docs') {
    resp.render('index', {config: global.sri4node_configuration});
  } else {
    resp.status(404).send('Not Found');
  }
}

const getResourcesOverview = (req, resp) => {
  resp.set('Content-Type', 'application/json');
  const resourcesToSend = {};
  global.sri4node_configuration.resources.forEach( (resource) => {
    const resourceName = resource.type.substring(1) // strip leading slash
    resourcesToSend[resourceName] = {
      docs: resource.type + '/docs',
      schema: resource.type + '/schema',
      href: resource.type
    };

    if (resource.schema) {
      resourcesToSend[resourceName].description = resource.schema.title;
    }

  });
  resp.send(resourcesToSend);
}

function checkRequiredFields(mapping, information) {
  'use strict';
  const table = tableFromMapping(mapping);
  const idx = mapping.type;
  if (!information[idx]) {
    throw new Error(`Table '${table}' seems to be missing in the database.`);
  }  
  const mandatoryFields = ['key', '$$meta.created', '$$meta.modified', '$$meta.deleted'];
  mandatoryFields.forEach( field => {
    if (! field in information[idx]) {
      throw new Error(`Mapping '${mapping.type}' lacks mandatory field '${field}'`);
    }    
  })
}

const middlewareErrorWrapper = (fun) => {
  return async (req, resp) => {
      try {
        await fun(req, resp)
      } catch (err) {
        error('____________________________ E R R O R (middlewareErrorWrapper) ___________________________') 
        error(err)
        error('STACK:')
        error(err.stack)        
        error('___________________________________________________________________________________________') 
        resp.status(500).send(`Internal Server Error. [${stringifyError(err)}]`);
      }
    }
}


process.on("unhandledRejection", function (err) { console.log(err); throw err; })


const handleRequest = async (sriRequest, func, mapping) => {
  const t = sriRequest.dbT;
  let result;
  if (sriRequest.isBatchRequest) {
    result = await func(sriRequest);
  } else {
    const jobs = [ [func, [t, sriRequest, mapping]] ];

    [ result ] = settleResultsToSriResults(await phaseSyncedSettle(jobs, { beforePhaseHooks: global.sri4node_configuration.beforePhase }));
    if (result instanceof SriError) {
      throw result
    }

    if (sriRequest.streamStarted === undefined || ! sriRequest.streamStarted()) {
      await hooks.applyHooks('transform response'
                            , mapping.transformResponse
                            , f => f(t, sriRequest, result)
                            , sriRequest
                            )
    }
  }
  return result;
}



const expressWrapper = (dbR, dbW, func, config, mapping, streaming, isBatchRequest, readOnly0) => {
  return async function (req, resp, next) {
    let t=null, endTask, resolveTx, rejectTx, readOnly;
    const reqMsgStart = req.method + ' ' + req.path;
    debug('requests', `${reqMsgStart} starting.`);
    req.startTime = Date.now();
    resp.on('finish', function () {
        const duration = Date.now() - req.startTime;
        debug('requests', `${reqMsgStart} took ${duration} ms`);
    });
    debug('trace', 'Starting express wrapper');
    try {
      let batchRoutingDuration = 0;
      if (isBatchRequest) {
        // evaluate batch body now to know wether the batch is completetly read-only
        // and do early error detecion

        const startTime = Date.now();
        batch.matchBatch(req);
        batchRoutingDuration = Date.now() - startTime;

        const mapReadOnly = (a) => {
          if ( Array.isArray(a) ) {
            return a.map(mapReadOnly);
          } else {
            return a.match.handler.readOnly;
          }
        }
        readOnly = _.flatten(req.body.map(mapReadOnly)).every(e => e);
      } else {
        readOnly = readOnly0
      }
      global.overloadProtection.startPipeline();

        const reqId = httpContext.get('reqId')
        if (reqId!==undefined) {
          resp.set('vsko-req-id', reqId);
        }

        const sriRequest  = {
          id: uuidv4(),
          path: req.path,
          originalUrl: req.originalUrl,
          query: req.query,
          params: req.params,
          httpMethod: req.method,
          headers: req.headers,
          protocol: req.protocol,
          body: req.body,
          isBatchPart: false,
          isBatchRequest: isBatchRequest,
          readOnly: readOnly,   
          SriError: SriError,
          context: {},
          logDebug: debug,
          logError: error
        }

        if (readOnly === true) {
            ({t, endTask} = await startTask(dbR, sriRequest))
          } else {
            ({tx:t, resolveTx, rejectTx} = await startTransaction(dbW, sriRequest))
        }
        sriRequest.dbT = t;

        if (streaming) {
          // use passthrough streams to avoid passing req and resp in sriRequest
          var inStream = new stream.PassThrough({allowHalfOpen: false, emitClose: true});
          var outStream = new stream.PassThrough({allowHalfOpen: false, emitClose: true});
          sriRequest.inStream = req.pipe(inStream);
          sriRequest.outStream = outStream.pipe(resp);
          sriRequest.setHeader = ((k, v) => resp.set(k, v));
          sriRequest.setStatus = ((s) => resp.status(s));
          sriRequest.streamStarted = (() => resp.headersSent);
        }

        req.sriRequest = sriRequest;

        req.on('close', function (err){
            sriRequest.reqCancelled = true;
         });

        await hooks.applyHooks('transform request'
            , config.transformRequest
            , f => f(req, sriRequest, t)
            , sriRequest 
        )

        setServerTimingHdr(sriRequest, 'batch-routing', batchRoutingDuration);

        const result = await handleRequest(sriRequest, func, mapping);

        const terminateDb = async (error, readOnly) => {
          if (readOnly===true) {
            debug('db', '++ Processing went OK. Closing database task. ++');
            await endTask()     
          } else {
            if (error) {
              if (req.query.dryRun === 'true') {
                debug('db', '++ Error during processing in dryRun mode. Rolling back database transaction.');
              } else {
                debug('db', '++ Error during processing. Rolling back database transaction.');
              }
              await rejectTx()     
            } else {
              if (req.query.dryRun === 'true') {
                debug('db', '++ Processing went OK in dryRun mode. Rolling back database transaction.');
                await rejectTx()   
              } else {
                debug('db', '++ Processing went OK. Committing database transaction.');  
                await resolveTx()   
              }
            }
          }
        }

        if (resp.headersSent) {
          // we are in streaming mode
          if ((sriRequest['headers']['request-server-timing'] !== undefined) && (sriRequest.serverTiming !== undefined)) {
                emtReportToServerTiming(req, resp, sriRequest);
                const notNullEntries = Object.entries(sriRequest.serverTiming)
                                             .filter(([property, value]) => value > 0)
    
                if (notNullEntries.length > 0) {
                    const hdrVal = notNullEntries.map(([property, value]) => `${property};dur=${value}`).join(', ');
                    sriRequest.outStream.addTrailers({
                        'Server-Timing': hdrVal
                    });
                }
          }
          sriRequest.outStream.end();
          if (result.status < 300) {
            await terminateDb(false, readOnly);
          } else {
            await terminateDb(true, readOnly);
          }
        } else {
          if (result.status < 300) {
            await terminateDb(false, readOnly);
          } else {
            await terminateDb(true, readOnly);
          }

          if ((sriRequest['headers']['request-server-timing'] !== undefined) && (sriRequest.serverTiming !== undefined)) {
            emtReportToServerTiming(req, resp, sriRequest);
            const notNullEntries = Object.entries(sriRequest.serverTiming)
                                         .filter(([property, value]) => value > 0)

            if (notNullEntries.length > 0) {
                const hdrVal = notNullEntries.map(([property, value]) => `${property};dur=${value}`).join(', ');
                resp.set('Server-Timing', hdrVal);
            }
          }

          if (result.headers) {
            resp.set(result.headers)
          }
          resp.status(result.status).send(result.body)

          await hooks.applyHooks('afterRequest'
          , config.afterRequest
          , f => f(sriRequest)
          , sriRequest)
        }
        if (global.sri4node_configuration.logdebug.statuses !== undefined) {
            setImmediate(() => {
                // use setImmediate to make sure also the last log messages are buffered before calling handleRequestDebugLog
                handleRequestDebugLog(result.status);
            })
        }
    } catch (err) {
      //TODO: what with streaming errors
      if (t!=null) { // t will be null in case of error during startTask/startTransaction
        if (readOnly===true) {
          debug('db', '++ Exception catched. Closing database task. ++');
          await endTask();
        } else {
          debug('db', '++ Exception catched. Rolling back database transaction. ++');
          await rejectTx()  
        }
      }

      if (resp.headersSent) {
        error('____________________________ E R R O R (expressWrapper)____________________________________')
        error(err)
        error('STACK:')
        error(err.stack)
        error('___________________________________________________________________________________________')
        error('NEED TO DESTROY STREAMING REQ')
        // TODO: HTTP trailer
        // next(err)
        req.destroy()
      } else {
        if (err instanceof SriError) {
          if (err.status>0) {
              const reqId = httpContext.get('reqId')
              if (reqId!==undefined) {
                err.body.vskoReqId = reqId;
                err.headers['vsko-req-id'] = reqId;
              }
              resp.set(err.headers).status(err.status).send(err.body);
          }
        } else {
          error('____________________________ E R R O R (expressWrapper)____________________________________') 
          error(err)
          error('STACK:')
          error(err.stack)
          error('___________________________________________________________________________________________') 
          resp.status(500).send(`Internal Server Error. [${stringifyError(err)}]`);
        }
      }
      if (global.sri4node_configuration.logdebug.statuses !== undefined) {
        setImmediate(() => {
            // use setImmediate to make sure also the last log messages are buffered before calling handleRequestDebugLog
            console.log('GOING TO CALL handleRequestDebugLog' )
            handleRequestDebugLog(err.status ? err.status : 500);
        })
      }
    } finally {
      global.overloadProtection.endPipeline();
    } 
  }
}



const toArray = (resource, name) => {
  // makes the property <name> of object <resource> an array
  if (resource[name] === undefined) {
    resource[name] = []
  } else if (resource[name] === null) {
    console.log(`WARNING: handler '${name}' was set to 'null' -> assume []`)
    resource[name] = []
  } else if (!Array.isArray(resource[name])) {
    resource[name] = [ resource[name] ]
  }
}



/* express.js application, configuration for roa4node */
exports = module.exports = {
  configure: async function (app, config) {
    'use strict';

    let maxHeapUsage = 0;

    if (config.trackHeapMax === true) {
        var gc = (require('gc-stats'))();
        gc.on('stats', function (stats) {
          const heapUsage =  (stats.before.usedHeapSize  / 1024 / 1024);
          if (heapUsage > maxHeapUsage) {
            maxHeapUsage = heapUsage;
          }
        });
    }



    try {
      config.resources.forEach( (resource) => {
          // initialize undefined hooks in all resources with empty list
          [ 'afterRead', 'beforeUpdate', 'afterUpdate', 'beforeInsert', 
            'afterInsert', 'beforeDelete', 'afterDelete', , 'customRoutes', 'transformResponse' ]
              .forEach((name) => toArray(resource, name))
          // for backwards compability set listResultDefaultIncludeCount default to true
          if (resource.listResultDefaultIncludeCount === undefined) { 
            resource.listResultDefaultIncludeCount = true
          }
        }
      );

      // initialize undefined global hooks with empty list
      ([ 'beforePhase', 'transformRequest', 'transformInternalRequest'])
        .forEach((name) => toArray(config, name))
      config.beforePhase.push(regularResource.beforePhaseQueryByKey);
      config.beforePhase.push(regularResource.beforePhaseInsertUpdate);

      if (config.bodyParserLimit === undefined) {
        config.bodyParserLimit = '5mb'
      }
      
      config.resources.forEach( (mapping) => {
        if (!mapping.onlyCustom) {
          // In case query is not defied -> use defaultFilter
          if (mapping.query === undefined) {
            mapping.query = { defaultFilter: $q.defaultFilter }
          }
          // In case of 'referencing' fields -> add expected filterReferencedType query if not defined.        
          Object.keys(mapping.map).forEach( (key) => {
            if (mapping.map[key].references !== undefined && mapping.query[key] === undefined) {
              mapping.query[key] = $q.filterReferencedType(mapping.map[key].references, key)
            }
          })

          //TODO: what with custom stuff ?
          //  e.g content-api with attachments / security/query
          //TODO: implement a better way to determine key type!!
          if (mapping.schema === undefined) {
            throw new Error(`Schema definition is missing for '${mapping.type}' !`);
          }
          // TODO: use json-schema to validate if it is valid json schema
          if (mapping.schema.properties === undefined) {
            throw new Error(`Schema definition invalid for '${mapping.type}' !`);
          }
          if (mapping.schema.properties.key === undefined) {
            throw new Error(`Key is not defined in the schema of '${mapping.type}' !`);
          }
          if (mapping.schema.properties.key.pattern === schemaUtils.guid('foo').pattern) {
            mapping.singleResourceRegex = new RegExp(`^${mapping.type}/([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})$`);
          } else if (mapping.schema.properties.key.type === schemaUtils.numeric('foo').type) {
            mapping.singleResourceRegex = new RegExp(`^${mapping.type}/([0-9]+)$`);
          } else if (mapping.schema.properties.key.type === schemaUtils.string('foo').type) {
            mapping.singleResourceRegex = new RegExp(`^${mapping.type}/(\\w+)$`);
          }  else {
            throw new Error(`Key type of resource ${mapping.type} unknown!`);
          }
          mapping.listResourceRegex = new RegExp(`^${mapping.type}(?:[?#]\\S*)?$`);
          mapping.validateKey =  ajv.compile(mapping.schema.properties.key);
        }
      })

      config.resources.forEach( (mapping) => {
          if (mapping.metaType === undefined) {
            error(`WARNING: metaType missing for resource ${mapping.type}`)
            mapping.metaType = 'not specified'
          }
      });

      config.utils = exports.utils

      if (config.batchConcurrency === undefined) {
        config.batchConcurrency = 4;
      }

      if (config.logdebug !== undefined) {
        config.logdebug  = createDebugLogConfigObject(config.logdebug);
      }

      global.sri4node_configuration = config // share configuration with other modules

      let dbR, dbW;
      if (config.db !== undefined) {
        dbR = config.db;
        dbW = config.db;
      } else if (config.dbR !== undefined && config.dbW !== undefined) {
        dbR = config.dbR;
        dbW = config.dbW;
      } else {
        const db = await pgConnect(config);
        dbR = db;
        dbW = db;
      }

      await pMap(
        config.resources,
        async (mapping) => {
          if (!mapping.onlyCustom) {
            await installVersionIncTriggerOnTable(dbW, tableFromMapping(mapping))
          }
        }, { concurrency: 1 })

      global.sri4node_configuration.informationSchema = await require('./js/informationSchema.js')(dbR, config)

      // Prepare pg-promise columnsets for multi insert/update & delete
      const pgp = getPgp();

      const generatePgColumnSet = (columnNames, type, table) => {
            const columns = columnNames.map(cname => {
                const col = { name: cname };
                if (cname.includes('.')) {
                    // popertynames with dot like $$meta.* are problematic with default pg-promise
                    // see https://github.com/vitaly-t/pg-promise/issues/494  ==> workaround with .init() fun
                    col.prop = `_${cname.replace(/\./g, '_')}`; // if prop is not unique multiple $$meta.* will get the same value!
                    col.init = c => {
                        return c.source[cname]
                    }
                }
                const cType = global.sri4node_configuration.informationSchema[type][cname].type;
                const cElementType = global.sri4node_configuration.informationSchema[type][cname].element_type;
                if (cType !== 'text') {
                    if (cType === 'ARRAY') {
                        col.cast = `${cElementType}[]`;
                    } else {
                        col.cast = cType;
                    }
                }
                if (cname === 'key') {
                    col.cnd = true;
                }
                return col;
            });

            return new pgp.helpers.ColumnSet(columns, { table });
      }

      global.sri4node_configuration.pgColumns = Object.fromEntries(
            config.resources.map(resource => {
                if (!resource.onlyCustom) {
                    const type = resource.type;
                    const table = tableFromMapping(typeToMapping(type));
                    const columns = JSON.parse('[' + sqlColumnNames(typeToMapping(type)) + ']')
                        .filter(cname => !cname.startsWith('$$meta.'));
                    const ret = {}
                    ret.insert = new pgp.helpers.ColumnSet(columns, { table });

                    const dummyUpdateRow = transformObjectToRow({}, resource, false);
                    ret.update = generatePgColumnSet([...new Set(["key", "$$meta.modified", ...Object.keys(dummyUpdateRow)])], type, table);
                    ret.delete = generatePgColumnSet(["key", "$$meta.modified", "$$meta.deleted"], type, table);

                    return [table, ret];
                }
            }).filter( e => e !== undefined) );


      global.sri4node_loaded_plugins = new Map();

      global.sri4node_install_plugin = async (plugin) => {
        const util=require('util');
        console.log(`Installing plugin ${util.inspect(plugin)}`)
        // load plugins with a uuid only once; backwards compatible with old system without uuid
        if ((plugin.uuid !== undefined) && global.sri4node_loaded_plugins.has(plugin.uuid)) {
          return
        }

        await plugin.install(global.sri4node_configuration, dbW);

        if (plugin.uuid !== undefined) {
          debug('general', `Loaded plugin ${plugin.uuid}.`)
          global.sri4node_loaded_plugins.set(plugin.uuid, plugin);
        }
      }

      if (config.plugins !== undefined) {
        await pMap(config.plugins, async (plugin) => {
          await global.sri4node_install_plugin(plugin)
        }, {concurrency: 1} )
      }

      // set the overload protection as first middleware to drop requests as soon as possible
      global.overloadProtection = require('./js/overloadProtection.js')(config.overloadProtection);
      app.use(async function(req, res, next) {
        if ( global.overloadProtection.canAccept() ) {
          next();
        } else {
          debug('overloadProtection', `DROPPED REQ`);
          if (config.overloadProtection.retryAfter !== undefined) {
            res.set('Retry-After', config.overloadProtection.retryAfter);
          }
          res.status(503).send([{code: 'too.busy', msg: 'The request could not be processed as the server is too busy right now. Try again later.'}]);
        }
      });   

      const emt = installEMT(app)

      if (global.sri4node_configuration.forceSecureSockets) {
        // All URLs force SSL and allow cross origin access.
        app.use(forceSecureSockets);
      }

      app.use(emt.instrument(compression(), 'mw-compression'))
      app.use(emt.instrument(bodyParser.json({limit: config.bodyParserLimit, extended: true, strict: false}), 'mw-bodyparser'));
        //use option 'strict: false' to allow also valid JSON like a single boolean

      app.use('/pathfinder', function(req, res, next){
        pathfinderUI(app)
        next()
      }, pathfinderUI.router)


      //to parse html pages
      app.use('/docs/static', express.static(__dirname + '/js/docs/static'));
      app.engine('.pug', require('pug').__express);
      app.set('view engine', 'pug');
      app.set('views', __dirname + '/js/docs');

      app.put('/log', middlewareErrorWrapper(function (req, resp) {
        const err = req.body;
        cl('Client side error :');
        err.stack.split('\n').forEach( (line) => cl(line) )
        resp.end();
      }));

      app.get('/docs', middlewareErrorWrapper(getDocs));
      app.get('/resources', middlewareErrorWrapper(getResourcesOverview));

      app.post('/setlogdebug', function (req, resp, next) {
        global.sri4node_configuration.logdebug = createDebugLogConfigObject(req.body);
        resp.send('OK')
      });

      app.use(httpContext.middleware);
      // Run the context for each request. Assign a unique identifier to each request
      app.use(function(req, res, next) {
          httpContext.ns.bindEmitter(req);
          httpContext.ns.bindEmitter(res);
          let reqId = shortid.generate();
          if (config.id!==undefined) {
              reqId = `${config.id}#${reqId}`;
          }
          httpContext.set('reqId', reqId);
          next();
      });


      await pMap(
        config.resources,
        async (mapping) => {
          if (!mapping.onlyCustom) {
            if (mapping.map['key'] === undefined) {
              mapping.map['key'] = {} // add key if missing, needed for key offset paging
            }
            checkRequiredFields(mapping, config.informationSchema);

            // append relation filters if auto-detected a relation resource
            if (mapping.map.from && mapping.map.to) {

              //mapping.query.relationsFilter = mapping.query.relationsFilter(mapping.map.from, mapping.map.to);
              const relationFilters = require('./js/relationsFilter.js');
              if (!mapping.query) {
                mapping.query = {};
              }

              for (const key in relationFilters) {
                if (relationFilters.hasOwnProperty(key)) {
                  mapping.query[key] = relationFilters[key];
                }
              }
            }

            // register schema for external usage. public.
            app.get(mapping.type + '/schema', middlewareErrorWrapper(getSchema));
            
            //register docs for this type
            app.get(mapping.type + '/docs', middlewareErrorWrapper(getDocs));
            app.use(mapping.type + '/docs/static', express.static(__dirname + '/js/docs/static'));
          }
        }, {concurrency: 1})

      // temporarilty allow a global /batch via config option for samenscholing
      if (config.enableGlobalBatch) {
        const globalBatchPath = ((config.globalBatchRoutePrefix !== undefined) ? config.globalBatchRoutePrefix : '') + '/batch';
        debug('general', `registering route ${globalBatchPath} - PUT/POST`)
        debug('general', `registering route ${globalBatchPath + '_streaming'} - PUT/POST`)
        app.put(globalBatchPath, expressWrapper(dbR, dbW, batch.batchOperation, config, null, false, true, false));
        app.post(globalBatchPath, expressWrapper(dbR, dbW, batch.batchOperation, config, null, false, true, false));

        app.put(globalBatchPath + '_streaming', expressWrapper(dbR, dbW, batch.batchOperationStreaming, config, null, true, true, false));
        app.post(globalBatchPath + '_streaming', expressWrapper(dbR, dbW, batch.batchOperationStreaming, config, null, true, true, false));
      }

      // map with urls which can be called within a batch 
      const batchHandlerMap = config.resources.reduce( (acc, mapping) => {

        // [path, verb, func, mapping, streaming, readOnly, isBatch]
        const crudRoutes = 
          [ [ mapping.type + '/:key', 'GET', regularResource.getRegularResource, config, mapping, false, true, false]
          , [ mapping.type + '/:key', 'PUT', regularResource.createOrUpdateRegularResource, config, mapping, false, false, false]
          , [ mapping.type + '/:key', 'PATCH', regularResource.patchRegularResource, config, mapping, false, false, false]
          , [ mapping.type + '/:key', 'DELETE', regularResource.deleteRegularResource, config, mapping, false, false, false]
          , [ mapping.type, 'GET', listResource.getListResource, config, mapping, false, true, false]
          // a check operation to determine wether lists A is part of list B
          , [ mapping.type + '/isPartOf', 'POST', listResource.isPartOf, config, mapping, false, true, false]
          ]

        const batchRoutes = 
          [ [ mapping.type + '/batch', 'PUT', batch.batchOperation, config, mapping, false, false, true]
          , [ mapping.type + '/batch', 'POST', batch.batchOperation, config, mapping, false, false, true]
          , [ mapping.type + '/batch_streaming', 'PUT', batch.batchOperationStreaming, config, mapping, true, false, true]
          , [ mapping.type + '/batch_streaming', 'POST', batch.batchOperationStreaming, config, mapping, true, false, true]
          ]

// TODO: check customRoutes have required fields and make sense ==> use json schema for validation

        mapping.customRoutes.forEach( cr => {
            const customMapping = _.cloneDeep(mapping);
            if (cr.alterMapping !== undefined) {
              cr.alterMapping(customMapping)
            } 
            else {
      			  if (cr.transformRequest !== undefined) {
      		      customMapping.transformRequest.push(cr.transformRequest)
      		    }
      		    if (cr.transformResponse !== undefined) {
      		      customMapping.transformResponse.push(cr.transformResponse)
      		    }
      	    }

            cr.httpMethods.forEach( method => {
              if (cr.like !== undefined) {
                const crudPath = mapping.type + cr.like;
                Object.assign(customMapping.query, cr.query);

                const likeMatches = crudRoutes.filter( ([path, verb]) => (path === crudPath && verb === method.toUpperCase()) )
                if (likeMatches.length === 0) {
                  console.log(`\nWARNING: customRoute like ${crudPath} - ${method} not found => ignored.\n`)
                } else {
                  const [path, verb, handler, _mapping, streaming] = likeMatches[0]
                  acc.push([ crudPath + cr.routePostfix, verb, handler, config, customMapping, streaming, likeMatches.readOnly, false ])                  
                }
              } else if (cr.streamingHandler !== undefined) {
                acc.push( [ mapping.type + cr.routePostfix
                          , method.toUpperCase()
                          , async (phaseSyncer, tx, sriRequest, mapping) => {
                              await phaseSyncer.phase()
                              if ( sriRequest.isBatchPart ) {
                                throw new SriError({status: 400, errors: [{code: 'streaming.not.allowed.in.batch', msg: 'Streaming mode cannot be used inside a batch.'}]})
                              }
                              await phaseSyncer.phase()
                              if (cr.busBoy) {
                                try {
                                  let busBoyConfig = {}
                                  if (cr.busBoyConfig) {
                                    busBoyConfig = _.cloneDeep(cr.busBoyConfig)
                                  }
                                  busBoyConfig.headers = sriRequest.headers;
                                  const busBoy = new Busboy(busBoyConfig);
                                  sriRequest.busBoy = busBoy
                                } catch (err) {
                                    throw new SriError({status: 400, errors: [{code: 'error.initialising.busboy', msg: 'Error during initialisation of busboy: ' + err}]})                                  
                                }
                              }

                              if (cr.beforeStreamingHandler !== undefined) {
                                try {
                                    const result = await cr.beforeStreamingHandler(tx, sriRequest, customMapping)
                                    if (result !== undefined) {
                                      const {status, headers} = result
                                      headers.forEach( ([k, v]) => sriRequest.setHeader(k, v) )
                                      sriRequest.setStatus(status)
                                    }
                                } catch (err) {
                                    if (err instanceof SriError) {
                                        throw err;
                                    } else {
                                        throw new SriError({status: 500, errors: [ `${util.format(err)}`]});
                                    }
                                }
                              }
                              await phaseSyncer.phase()
                              
                              let keepAliveTimer = null;
                              let streamingHandlerPromise;
                              let stream;
                              const streamEndEmitter = new EventEmitter()
                              const streamDonePromise = pEvent(streamEndEmitter, 'done')

                              if (cr.binaryStream) {
                                stream = sriRequest.outStream;
                              } else {
                                sriRequest.setHeader('Content-Type', 'application/json; charset=utf-8')
                                stream = new require('stream').Readable({objectMode: true});
                                stream._read = function () {};
                                stream.pipe(JSONStream.stringify()).pipe(sriRequest.outStream);
                                keepAliveTimer = setInterval(() => { stream.push('') }, 20000)
                              }

                              stream.on('close', () => streamEndEmitter.emit('done'));
                              // 'end' event listener needed for backwards compability with node 8
                              //  (on node 12, the 'close' event will do the job)
                              stream.on('end', () => streamEndEmitter.emit('done'));

                              streamingHandlerPromise = cr.streamingHandler(tx, sriRequest, stream)

                              // Wait till busboy handler are in place (can be done in beforeStreamingHandler 
                              // or streamingHandler) before piping request to busBoy (otherwise events might get lost).
                              if (cr.busBoy) {
                                sriRequest.inStream.pipe(sriRequest.busBoy);
                              }

                              try {
                                await streamingHandlerPromise;
                              } finally {
                                if (keepAliveTimer !== null) {
                                  clearInterval(keepAliveTimer) 
                                }
                              }

                              if (cr.binaryStream) {
                                stream.end();
                              } else {
                                stream.push(null)
                                stream.destroy();
                              }

                              // wait until stream is ended
                              await streamDonePromise;

                              return { status: 200 }
                            }
                          , config
                          , customMapping
                          , true
                          , cr.readOnly
                          , false ] )
              } else {
                acc.push( [ mapping.type + cr.routePostfix
                          , method.toUpperCase()
                          , async (phaseSyncer, tx, sriRequest, mapping) => {
                                await phaseSyncer.phase()
                                if (cr.beforeHandler !== undefined) {
                                  await cr.beforeHandler(tx, sriRequest, customMapping)
                                }
                                await phaseSyncer.phase()
                                const result = await cr.handler(tx, sriRequest, customMapping)
                                await phaseSyncer.phase()
                                if (cr.afterHandler !== undefined) {
                                  await cr.afterHandler(tx, sriRequest, customMapping, result)
                                }
                                await phaseSyncer.phase()
                                return result
                              }
                          , config
                          , customMapping
                          , false
                          , cr.readOnly
                          , false ] )

              }              
            })
          })

        acc.push(...batchRoutes);

        if (!mapping.onlyCustom) {
          acc.push(...crudRoutes)
        }

        return acc        
      }, [])


      // register individual routes in express
      batchHandlerMap.forEach( ([path, verb, func, config, mapping, streaming, readOnly, isBatch]) => {
        // Also use phaseSyncedSettle like in batch to use same shared code,
        // has no direct added value in case of single request.
        debug('general', `registering route ${path} - ${verb} - ${readOnly}`)
        app[verb.toLowerCase()]( path, 
                                 emt.instrument(expressWrapper(dbR, dbW, func, config, mapping, streaming, isBatch, readOnly), 'express-wrapper') )
      })

      // transform map with 'routes' to be usable in batch
      config.batchHandlerMap = _.groupBy(batchHandlerMap.map( ([path, verb, func, config, mapping, streaming, readOnly, isBatch]) => {
        return { route: new route(path), verb, func, config, mapping, streaming, readOnly, isBatch}
      }), e => e.verb);


      app.get('/', (req, res) => res.redirect('/resources'))

      global.sri4node_internal_interface = async (internalReq) => {
        const match = batch.matchHref(internalReq.href, internalReq.verb);

        const sriRequest  = {
          id: uuidv4(),
          path: match.path,          
          query: match.queryParams,
          params: match.routeParams,
          sriType: match.handler.mapping.type,
          isBatchRequest: match.handler.isBatch,
          readOnly: match.handler.readOnly,   

          originalUrl: internalReq.href,
          httpMethod: internalReq.verb,
          headers: internalReq.headers ? internalReq.headers : {},
          body: internalReq.body,
          dbT: internalReq.dbT,
          inStream: internalReq.inStream,
          outStream: internalReq.outStream,
          setHeader: internalReq.setHeader,
          setStatus: internalReq.setStatus,
          streamStarted: internalReq.streamStarted,

          context: {},
          SriError: SriError,
          protocol: '_internal_',
          isBatchPart: false,

          parentSriRequest: internalReq.parentSriRequest,
          logDebug: debug,
          logError: error
        }

        await hooks.applyHooks('transform internal sriRequest'
                            // , match.handler.mapping.transformInternalRequest
                            , match.handler.transformInternalRequest
                            , f => f(internalReq.dbT, sriRequest, internalReq.parentSriRequest)
                            , sriRequest)

        const result = await handleRequest(sriRequest, match.handler.func, match.handler.mapping);
        // we do a JSON stringify/parse cycle because certain fields like Date fields are expected
        // in string format instead of Date objects
        return  JSON.parse( JSON.stringify(result) );
      }

      if (config.trackHeapMax === true) {
        app.get('/heap_max', (req, res) => {
            res.set('Content-Type', 'application/json');
            res.send({ maxHeapUsage: maxHeapUsage });
        });
      }

      console.log('___________________________ SRI4NODE INITIALIZATION DONE _____________________________')
    } catch (err) {
      console.error('___________________________ SRI4NODE INITIALIZATION ERROR _____________________________')
      console.error(err)
      process.exit(1)
    }
  }, // configure

  utils: 
      { // Utility to run arbitrary SQL in validation, beforeupdate, afterupdate, etc..
        executeSQL: pgExec,
        prepareSQL: queryobject.prepareSQL,
        convertListResourceURLToSQL: listResource.getSQLFromListResource,
        addReferencingResources: utilLib.addReferencingResources,
      },
  queryUtils: require('./js/queryUtils.js'),
  mapUtils: require('./js/mapUtils.js'),
  schemaUtils: require('./js/schemaUtils.js'),
  SriError: SriError,
  transformRowToObject: transformRowToObject,
  transformObjectToRow: transformObjectToRow,
};
