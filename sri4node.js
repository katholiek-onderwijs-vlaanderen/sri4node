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


const { cl, debug, pgConnect, pgExec, typeToConfig, SriError, installVersionIncTriggerOnTable, stringifyError, settleResultsToSriResults,
        mapColumnsToObject, executeOnFunctions, tableFromMapping, transformRowToObject, transformObjectToRow, startTransaction, 
        typeToMapping, createReadableStream, jsonArrayStream } = require('./js/common.js');
const queryobject = require('./js/queryObject.js');
const $q = require('./js/queryUtils.js');
const phaseSyncedSettle = require('./js/phaseSyncedSettle.js')
const hooks = require('./js/hooks.js');
const listResource = require('./js/listResource.js')
const regularResource = require('./js/regularResource.js')
const batch = require('./js/batch.js')
const utilLib = require('./js/utilLib.js')

function error(x) {
  'use strict';
  cl(x);
}



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
    const start = Date.now();
    res.on('finish', function () {
      const duration = Date.now() - start;
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
        console.log('____________________________ E R R O R ____________________________________________________') 
        console.log(err)
        console.log('___________________________________________________________________________________________') 
        resp.status(500).send(`Internal Server Error. [${stringifyError(err)}]`);
      }
    }
}


process.on("unhandledRejection", function (err) { console.log(err); throw err; })

const expressWrapper = (db, func, mapping, streaming, isBatchRequest) => {
  return async function (req, resp, next) {
    //cl('+ Create new transaction, db.pool: ' + db.$pool.idleCount + ' / ' + db.$pool.waitingCount + ' / ' + db.$pool.totalCount)
    const {tx, resolveTx, rejectTx} = await startTransaction(db)    
    try {

      let result
      if (isBatchRequest) {
        result = await func(tx, req)
      } else {

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
          SriError: SriError
        }

        await hooks.applyHooks('transform request'
                              , mapping.transformRequest
                              , f => f(req, sriRequest, tx))

        const jobs = [ [func, [tx, sriRequest, mapping, streaming ? req : null, streaming ? resp : null]] ];
        [ result ] = settleResultsToSriResults(await phaseSyncedSettle(jobs))  
        if (result instanceof SriError) {
          throw result
        }
        if (! resp.headersSent) {
          await hooks.applyHooks('transform response'
                                , mapping.transformResponse
                                , f => f(db, sriRequest, result))          
        }
      }

      if (resp.headersSent) {
          if (req.query.dryRun === 'true') {
            debug('++ Processing went OK in dryRun mode. Rolling back database transaction.');
            await rejectTx()   
          } else {
            debug('++ Processing went OK. Committing database transaction.');  
            await resolveTx()   
          }
      } else {
        if (result.status < 300) {
          if (req.query.dryRun === 'true') {
            debug('++ Processing went OK in dryRun mode. Rolling back database transaction.');
            await rejectTx()   
          } else {
            debug('++ Processing went OK. Committing database transaction.');  
            await resolveTx()   
          }
        } else {
          if (req.query.dryRun === 'true') {
            debug('++ Error during processing in dryRun mode. Rolling back database transaction.');
          } else {
            debug('++ Error during processing. Rolling back database transaction.');
          }
          await rejectTx()          
        }

        if (result.headers) {
          resp.set(result.headers)
        }
        resp.status(result.status).send(result.body)
      }
    } catch (err) {
      //TODO: what with streaming errors
      debug('++ Exception catched. Rolling back database transaction. ++');
      await rejectTx()  

      if (resp.headersSent) {
        console.log('NEED TO DESTROY STREAMING REQ')
        // TODO: HTTP trailer
        // next(err)
        req.destroy()
      } else {
        if (err instanceof SriError) {
          debug('Sending SriError to client.')
          resp.set(err.headers).status(err.status).send(err.body);
        } else {      
          console.log('____________________________ E R R O R ____________________________________________________') 
          console.log(err)
          console.log('___________________________________________________________________________________________') 
          resp.status(500).send(`Internal Server Error. [${stringifyError(err)}]`);
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
            'afterInsert', 'beforeDelete', 'afterDelete', 'transformRequest', 'transformResponse', 'customRoutes'  ]
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
        }
      })

      config.utils = exports.utils

      global.sri4node_configuration = config // share configuration with other modules

      const db = await pgConnect(config)


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


      var router = express.Router()

      const emt = installEMT()

      if (global.sri4node_configuration.forceSecureSockets) {
        // All URLs force SSL and allow cross origin access.
        router.use(forceSecureSockets);
      }

      router.use(emt.instrument(compression()))
      router.use(emt.instrument(logRequests))
      router.use(emt.instrument(bodyParser.json({limit: config.bodyParserLimit, extended: true})));

      router.use('/pathfinder', function(req, res, next){
        pathfinderUI(app)
        next()
      }, pathfinderUI.router)


      //to parse html pages
      router.use('/docs/static', express.static(__dirname + '/js/docs/static'));
      app.engine('.jade', require('jade').__express);
      app.set('view engine', 'jade');
      app.set('views', __dirname + '/js/docs');

      router.put('/log', middlewareErrorWrapper(function (req, resp) {
        const err = req.body;
        cl('Client side error :');
        err.stack.split('\n').forEach( (line) => cl(line) )
        resp.end();
      }));

      router.get('/docs', middlewareErrorWrapper(getDocs));
      router.get('/resources', middlewareErrorWrapper(getResourcesOverview));


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
            router.get(mapping.type + '/schema', middlewareErrorWrapper(getSchema));
            
            //register docs for this type
            router.get(mapping.type + '/docs', middlewareErrorWrapper(getDocs));
            router.use(mapping.type + '/docs/static', express.static(__dirname + '/js/docs/static'));                    
          }

          // batch route
          router.put(mapping.type + '/batch', expressWrapper(db, batch.batchOperation, mapping, false, true));
          router.post(mapping.type + '/batch', expressWrapper(db, batch.batchOperation, mapping, false, true));
        }, {concurrency: 1})

      // temporarilty allow a global /batch via config option for samenscholing
      if (config.enableGlobalBatch) {
        router.put('/batch', expressWrapper(db, batch.batchOperation, null, false, true));
        router.post('/batch', expressWrapper(db, batch.batchOperation, null, false, true));
      }

      // map with urls which can be called within a batch 
      const batchHandlerMap = config.resources.reduce( (acc, mapping) => {

        const crudRoutes = 
          [ [ mapping.type + '/:key', 'GET', regularResource.getRegularResource, mapping, false]
          , [ mapping.type + '/:key', 'PUT', regularResource.createOrUpdate, mapping, false]
          , [ mapping.type + '/:key', 'DELETE', regularResource.deleteResource, mapping, false]
          , [ mapping.type, 'GET', listResource.getListResource, mapping, false]
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
                          , async (phaseSyncer, tx, sriRequest, mapping, req, res) => {
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
                                  headers.forEach( ([k, v]) => res.set(k, v) )
                                  res.status(status)                                  
                                }
                              }

                              let keepAliveTimer = null;
                              let streamingHandlerPromise;
                              let stream;
                              if (cr.binaryStream) {
                                const {PassThrough} = require('stream')
                                stream = new PassThrough()
                                stream.pipe(res)
                                sriRequest.resultStream = stream
                                streamingHandlerPromise = cr.streamingHandler(tx, sriRequest, stream)
                              } else {
                                res.set('Content-Type', 'application/json; charset=utf-8')
                                stream = createReadableStream()
                                jsonArrayStream(stream).pipe(res)
                                sriRequest.resultStream = stream
                                keepAliveTimer = setInterval(() => { stream.push('') }, 20000)
                                streamingHandlerPromise = cr.streamingHandler(tx, sriRequest, stream)
                              }

                              // Wait till busboy handler are in place (can be done in beforeStreamingHandler 
                              // or streamingHandler) before piping request to busBoy (otherwise events might get lost).
                              if (cr.busBoy) {
                                req.pipe(sriRequest.busBoy);
                              }

                              await streamingHandlerPromise;
                              // push null to stream to signal we are done
                              stream.push(null);

                              // wait until stream is ended
                              const streamEndEmitter = new EventEmitter()
                              stream.on('end', () => streamEndEmitter.emit('done'));
                              await pEvent(streamEndEmitter, 'done')

                              if (keepAliveTimer !== null) {
                                clearInterval(keepAliveTimer) 
                              }
                            }
                          , customMapping
                          , true ] )
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
                                return result
                              }
                          , customMapping
                          , false ] )

              }              
            })
          })

        if (!mapping.onlyCustom) {
          acc.push(...crudRoutes)
        }

        return acc        
      }, [])


      // register indivual routes in express
      batchHandlerMap.forEach( ([path, verb, func, mapping, streaming]) => {
        // Also use phaseSyncedSettle like in batch to use same shared code,
        // has no direct added value in case of single request.
        router[verb.toLowerCase()]( path, 
                                 emt.instrument(expressWrapper(db, func, mapping, streaming, false), 'func') )
      })

      // transform map with 'routes' to be usable in batch
      config.batchHandlerMap = batchHandlerMap.map( ([path, verb, func, mapping]) => {
        return { route: new route(path), verb, func, mapping }
      })

      router.get('/', (req, res) => res.redirect('/resources'))

      app.use(config.routePrefix !== undefined ? config.routePrefix : '/', router)  

      console.log('___________________________ SRI4NODE INITIALIZATION DONE _____________________________')
    } catch (err) {
      console.log('___________________________ SRI4NODE INITIALIZATION ERROR _____________________________')
      console.log(err)
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
  transformObjectToRow: transformObjectToRow
};
