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
const _ = require('lodash')
const pMap = require('p-map');
const readAllStream = require('read-all-stream')
const Busboy = require('busboy');
const EventEmitter = require('events');
const pEvent = require('p-event');
const httpContext = require('express-http-context');
const shortid = require('shortid');
// const toobusy = require('toobusy-js');
const toobusy = require('node-toobusy');
  
// Set check interval to a faster value. This will catch more latency spikes
// but may cause the check to be too sensitive.
toobusy.interval(250);
 


const { cl, debug, error, pgConnect, pgExec, typeToConfig, SriError, installVersionIncTriggerOnTable, stringifyError, settleResultsToSriResults,
        mapColumnsToObject, executeOnFunctions, tableFromMapping, transformRowToObject, transformObjectToRow, startTransaction, startTask,
        typeToMapping, createReadableStream, jsonArrayStream } = require('./js/common.js');
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


const logRequests = (req, res, next) => {
  'use strict';
  if (global.sri4node_configuration.logrequests) {
    debug(req.method + ' ' + req.path + ' starting.'
              + (req.headers['x-request-id'] ? ' req_id: ' + req.headers['x-request-id'] : '') + ' ');
    req.startTime = Date.now();
    res.on('finish', function () {
      const duration = Date.now() - req.startTime;
      debug(req.method + ' ' + req.path + ' took ' + duration + ' ms. '
                + (req.headers['x-request-id'] ? ' req_id: ' + req.headers['x-request-id'] : '') + ' ');
    });
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
  const table = tableFromMapping(mapping)
  const idx = '/' + table
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

const installEMT = () => {
  if (global.sri4node_configuration.logmiddleware) {
    process.env.TIMER = true; //eslint-disable-line
    const emt = require('express-middleware-timer');
    // init timer
    app.use(emt.init(function emtReporter(req, res) {
      // Write report to file.
      const report = emt.calculate(req, res);
      const out = 'middleware timing: ';
      const timerLogs = Object.keys(report.timers).map.filter(timer => {
        '[' + timer + ' took ' + report.timers[timer].took + ']'
      })
      console.log(out + timerLogs.join(',')); //eslint-disable-line

    }));
    return emt
  } else {
    return {
      instrument: function noop(middleware) {
        return middleware;
      }
    };
  }
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
    [ result ] = settleResultsToSriResults(await phaseSyncedSettle(jobs))  
    if (result instanceof SriError) {
      throw result
    }

    if (sriRequest.streamStarted !== undefined && ! sriRequest.streamStarted()) {
      await hooks.applyHooks('transform response'
                            , mapping.transformResponse
                            , f => f(t, sriRequest, result))          
    }
  }
  return result;
}



const expressWrapper = (db, func, mapping, streaming, isBatchRequest, readOnly) => {
  return async function (req, resp, next) {
    // if it already took too long just too reach this point, we are overloaded
    // drop request and signal overload protection
    const busy = (Date.now() - req.startTime);
    if ( busy > 500 ) { 
      debug('*** DROPPING REQ DUE TO DELAY ***')
      if (config.overloadProtection.retryAfter !== undefined) {
        resp.set('Retry-After', config.overloadProtection.retryAfter);
      }
      res.status(503).send([{code: 'too.busy', msg: 'The request could not be processed as the server is too busy right now. Try again later.'}]);
      global.overloadProtection.addExtraDrops();
    } else {
      global.overloadProtection.startPipeline();
    
      debug(`*** busy: ${busy} ***`)
      debug('expressWrapper starts processing ' + req.originalUrl);
      let t, endTask, resolveTx, rejectTx;
      if (readOnly === true) {
        ({t, endTask} = await startTask(db))
      } else {
        ({tx:t, resolveTx, rejectTx} = await startTransaction(db))
      }
      try {
        const reqId = httpContext.get('reqId')
        if (reqId!==undefined) {
          resp.set('vsko-req-id', reqId);
        }

        const sriRequest  = {
          path: req.path,
          originalUrl: req.originalUrl,
          query: req.query,
          params: req.params,
          httpMethod: req.method,
          headers: req.headers,
          protocol: req.protocol,
          body: req.body,
          sriType: mapping.type,
          isBatchPart: false,
          isBatchRequest: isBatchRequest,
          readOnly: readOnly,   
          SriError: SriError,
          dbT: t,
          context: {}
        }
        if (streaming) {
          // use passthrough streams to avoid passing req and resp in sriRequest
          var inStream = new stream.PassThrough();
          var outStream = new stream.PassThrough();
          sriRequest.inStream = req.pipe(inStream);
          sriRequest.outStream = inStream.pipe(resp);
          sriRequest.setHeader = resp.set;
          sriRequest.setStatus = resp.status; 
          sriRequest.streamStarted = (() => resp.headersSent);
        }

        await hooks.applyHooks('transform request'
                              , mapping.transformRequest
                              , f => f(req, sriRequest, t))


        const result = await handleRequest(sriRequest, func, mapping);

        const terminateDb = async (error) => {
          if (readOnly===true) {
            debug('++ Processing went OK. Closing database transaction. ++');
            await endTask()     
          } else {
            if (error) {
              if (req.query.dryRun === 'true') {
                debug('++ Error during processing in dryRun mode. Rolling back database transaction.');
              } else {
                debug('++ Error during processing. Rolling back database transaction.');
              }
              await rejectTx()     
            } else {
              if (req.query.dryRun === 'true') {
                debug('++ Processing went OK in dryRun mode. Rolling back database transaction.');
                await rejectTx()   
              } else {
                debug('++ Processing went OK. Committing database transaction.');  
                await resolveTx()   
              }
            }
          }
        }

        if (resp.headersSent) {
          await terminateDb(false);
        } else {
          if (result.status < 300) {
            await terminateDb(false);
          } else {
            await terminateDb(true);  
          }

          if (result.headers) {
            resp.set(result.headers)
          }
          resp.status(result.status).send(result.body)
        }
      } catch (err) {
        //TODO: what with streaming errors
        if (readOnly===true) {
          debug('++ Exception catched. Closing database transaction. ++');
          debug(endTask)
          await endTask();
        } else {
          debug('++ Exception catched. Rolling back database transaction. ++');
          await rejectTx()  
        }

        if (resp.headersSent) {
          error('NEED TO DESTROY STREAMING REQ')
          // TODO: HTTP trailer
          // next(err)
          req.destroy()
        } else {
          if (err instanceof SriError) {
            debug('Sending SriError to client.')
            const reqId = httpContext.get('reqId')
            if (reqId!==undefined) {
              err.body.vskoReqId = reqId;
              err.headers['vsko-req-id'] = reqId;
            }
            resp.set(err.headers).status(err.status).send(err.body);
          } else {      
            error('____________________________ E R R O R (expressWrapper)____________________________________') 
            error(err)
            error('STACK:')
            error(err.stack)
            error('___________________________________________________________________________________________') 
            resp.status(500).send(`Internal Server Error. [${stringifyError(err)}]`);
          }        
        }
      } finally {
        if (!isBatchRequest) {
          global.overloadProtection.endPipeline();
        }
      } 
    }
  }
}



/* express.js application, configuration for roa4node */
exports = module.exports = {
  configure: async function (app, config) {
    'use strict';

    try {
      config.resources.forEach( (resource) => {
          // initialize undefined hooks in all resources with empty list
          [ 'afterRead', 'beforeUpdate', 'afterUpdate', 'beforeInsert', 
            'afterInsert', 'beforeDelete', 'afterDelete', 'transformRequest', 'transformInternalRequest', 'transformResponse', 'customRoutes'  ]
              .forEach((name) => { 
                  if (resource[name] === undefined) { 
                    resource[name] = [] 
                  } else if (resource[name] === null) {
                    console.log(`WARNING: handler '${name}' was set to 'null' -> assume []`)
                    resource[name] = []
                  } else if (!Array.isArray(resource[name])) {
                    resource[name] = [ resource[name] ]
                  } 
              })

          // for backwards compability set listResultDefaultIncludeCount default to true
          if (resource.listResultDefaultIncludeCount === undefined) { 
            resource.listResultDefaultIncludeCount = true
          }
        }
      )
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
          }  else {
            throw new Error(`Key type of resource ${mapping.type} unknown!`);
          }
          mapping.listResourceRegex = new RegExp(`^${mapping.type}(?:[?#]\\S*)?$`);
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

      global.sri4node_configuration = config // share configuration with other modules

      let db;
      if (config.db !== undefined) {
        db = config.db;
      } else {
        db = await pgConnect(config)
      }

      await pMap(
        config.resources,
        async (mapping) => {
          if (!mapping.onlyCustom) {
            await installVersionIncTriggerOnTable(db, tableFromMapping(mapping))
          }
        }, { concurrency: 1 })

      global.sri4node_configuration.informationSchema = await require('./js/informationSchema.js')(db, config)


      if (config.plugins !== undefined) {
        await pMap(config.plugins, async (plugin) => await plugin.install(global.sri4node_configuration, db), {concurrency: 1}  )
      }

      

      // set the overload protection as first middleware to drop requests as soon as possible
      global.overloadProtection = require('./js/overloadProtection.js')(config.overloadProtection);
      app.use(async function(req, res, next) {
        if ( global.overloadProtection.canAccept() && ! toobusy() ) {
          next();
        } else {
          debug(`DROPPED REQ`);
          if (config.overloadProtection.retryAfter !== undefined) {
            resp.set('Retry-After', config.overloadProtection.retryAfter);
          }
          res.status(503).send([{code: 'too.busy', msg: 'The request could not be processed as the server is too busy right now. Try again later.'}]);
        }
      });   

      toobusy.onLag(function(currentLag) {
        debug("Event loop lag detected! Latency: " + currentLag + "ms");
      });

      const emt = installEMT()

      if (global.sri4node_configuration.forceSecureSockets) {
        // All URLs force SSL and allow cross origin access.
        app.use(forceSecureSockets);
      }

      app.use(emt.instrument(compression()))
      app.use(emt.instrument(bodyParser.json({limit: config.bodyParserLimit, extended: true})));

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
        if (req.query.enabled === 'true') {
          global.sri4node_configuration.logdebug = true
          debug('Enabled logdebug via /setlogdebug')
          resp.send('Enabled logdebug.')
        } else {
          debug('Disabled logdebug via /setlogdebug')
          global.sri4node_configuration.logdebug = false
          resp.send('Disabled logdebug.')
        }
      });
      app.post('/setlogsql', function (req, resp, next) {
        if (req.query.enabled === 'true') {
          global.sri4node_configuration.logsql = true
          debug('Enabled logdebug via /setlogsql')
          resp.send('Enabled logsql.')
        } else {
          debug('Disabled logdebug via /setlogsql')
          global.sri4node_configuration.logsql = false
          resp.send('Disabled logsql.')
        }
      });

      app.use(httpContext.middleware);
      // Run the context for each request. Assign a unique identifier to each request
      app.use(function(req, res, next) {
          httpContext.ns.bindEmitter(req);
          httpContext.ns.bindEmitter(res);
          httpContext.set('reqId',shortid.generate());
          next();
      });

      app.use(emt.instrument(logRequests))



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
        app.put(globalBatchPath, expressWrapper(db, batch.batchOperation, null, false, true, false));
        app.post(globalBatchPath, expressWrapper(db, batch.batchOperation, null, false, true, false));
      }

      // map with urls which can be called within a batch 
      const batchHandlerMap = config.resources.reduce( (acc, mapping) => {

        // [path, verb, func, mapping, streaming, readOnly, isBatch]
        const crudRoutes = 
          [ [ mapping.type + '/:key', 'GET', regularResource.getRegularResource, mapping, false, true, false]
          , [ mapping.type + '/:key', 'PUT', regularResource.createOrUpdateRegularResource, mapping, false, false, false]
          , [ mapping.type + '/:key', 'PATCH', regularResource.patchRegularResource, mapping, false, false, false]
          , [ mapping.type + '/:key', 'DELETE', regularResource.deleteRegularResource, mapping, false, false, false]
          , [ mapping.type, 'GET', listResource.getListResource, mapping, false, true, false]
          // a check operation to determine wether lists A is part of list B
          , [ mapping.type + '/isPartOf', 'POST', listResource.isPartOf, mapping, false, true, false]
          ]

        const batchRoutes = 
          [ [ mapping.type + '/batch', 'PUT', batch.batchOperation, mapping, false, false, true]
          , [ mapping.type + '/batch', 'POST', batch.batchOperation, mapping, false, false, true]
          ]

// TODO: check customRoutes have required fields and make sense ==> use json schema for validation

        mapping.customRoutes.forEach( cr => {
            const customMapping = _.cloneDeep(mapping);
            if (cr.alterMapping !== undefined) {
              cr.alterMapping(customMapping)
            } else {
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
                  acc.push([ crudPath + cr.routePostfix, verb, handler, customMapping, streaming ])                  
                }
              } else if (cr.streamingHandler !== undefined) {
                acc.push( [ mapping.type + cr.routePostfix
                          , method.toUpperCase()
                          , async (phaseSyncer, tx, sriRequest, mapping) => {
                              if ( sriRequest.isBatchPart ) {
                                throw new SriError({status: 400, errors: [{code: 'streaming.not.allowed.in.batch', msg: 'Streaming mode cannot be used inside a batch.'}]})
                              }
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
                                const result = await cr.beforeStreamingHandler(tx, sriRequest, customMapping)
                                if (result !== undefined) {
                                  const {status, headers} = result
                                  headers.forEach( ([k, v]) => sriRequest.setHeader(k, v) )
                                  sriRequest.setStatus(status)                                  
                                }
                              }

                              let keepAliveTimer = null;
                              let streamingHandlerPromise;
                              let stream;
                              const streamEndEmitter = new EventEmitter()
                              const streamDonePromise = pEvent(streamEndEmitter, 'done')

                              if (cr.binaryStream) {
                                const {PassThrough} = require('stream')
                                stream = new PassThrough()
                                stream.on('end', () => streamEndEmitter.emit('done'));
                                stream.pipe(sriRequest.outStream);
                                streamingHandlerPromise = cr.streamingHandler(tx, sriRequest, stream)
                              } else {
                                sriRequest.setHeader('Content-Type', 'application/json; charset=utf-8')
                                stream = createReadableStream()
                                stream.on('end', () => streamEndEmitter.emit('done'));
                                jsonArrayStream(stream).pipe(sriRequest.outStream)
                                keepAliveTimer = setInterval(() => { stream.push('') }, 20000)
                                streamingHandlerPromise = cr.streamingHandler(tx, sriRequest, stream)
                              }

                              // Wait till busboy handler are in place (can be done in beforeStreamingHandler 
                              // or streamingHandler) before piping request to busBoy (otherwise events might get lost).
                              if (cr.busBoy) {
                                sriRequest.inStream.pipe(sriRequest.busBoy);
                              }

                              await streamingHandlerPromise;
                              // push null to stream to signal we are done
                              stream.push(null);

                              // wait until stream is ended                              
                              await streamDonePromise;

                              if (keepAliveTimer !== null) {
                                clearInterval(keepAliveTimer) 
                              }
                            }
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
                                debug('phase done')
                                if (cr.afterHandler !== undefined) {
                                  await cr.afterHandler(tx, sriRequest, customMapping, result)
                                }
                                debug('returning result')
                                return result
                              }
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
      batchHandlerMap.forEach( ([path, verb, func, mapping, streaming, readOnly, isBatch]) => {
        // Also use phaseSyncedSettle like in batch to use same shared code,
        // has no direct added value in case of single request.
        debug(`registering route ${path}`)
        app[verb.toLowerCase()]( path, 
                                 emt.instrument(expressWrapper(db, func, mapping, streaming, isBatch, readOnly), 'func') )
      })

      // transform map with 'routes' to be usable in batch
      config.batchHandlerMap = batchHandlerMap.map( ([path, verb, func, mapping, streaming, readOnly, isBatch]) => {
        return { route: new route(path), verb, func, mapping, streaming, readOnly, isBatch}
      })

      app.get('/', (req, res) => res.redirect('/resources'))

      global.sri4node_internal_interface = async (internalReq) => {
        const match = batch.matchHref(internalReq.href, internalReq.verb);

        const sriRequest  = {
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

          parentSriRequest: internalReq.parentSriRequest
        }

        await hooks.applyHooks('transform internal sriRequest'
                            , match.handler.mapping.transformInternalRequest
                            , f => f(internalReq.dbT, sriRequest, internalReq.parentSriRequest))   

        const result = await handleRequest(sriRequest, match.handler.func, match.handler.mapping);
        return result;
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
