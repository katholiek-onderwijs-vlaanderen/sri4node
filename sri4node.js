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

const informationSchema = require('./js/informationSchema.js');
const { cl, debug, pgConnect, pgExec, typeToConfig, SriError, installVersionIncTriggerOnTable, stringifyError, settleResultsToSriResults,
        mapColumnsToObject, executeOnFunctions, tableFromMapping, transformRowToObject, transformObjectToRow, startTransaction } = require('./js/common.js');
const queryobject = require('./js/queryObject.js');
const $q = require('./js/queryUtils.js');
const phaseSyncedSettle = require('./js/phaseSyncedSettle.js')
const hooks = require('./js/hooks.js');

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
  const typeToMapping = typeToConfig(global.sri4node_configuration.resources);
  const type = req.route.path.split('/').slice(0, req.route.path.split('/').length - 1).join('/');
  const mapping = typeToMapping[type];

  resp.set('Content-Type', 'application/json');
  resp.send(mapping.schema);
}

/* Handle GET /docs and /{type}/docs */
function getDocs(req, resp) {
  'use strict';
  const typeToMapping = typeToConfig(global.sri4node_configuration.resources);
  const type = req.route.path.split('/').slice(0, req.route.path.split('/').length - 1).join('/');
  if (type in typeToMapping) {
    const mapping = typeToMapping[type];
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

const expressWrapper = (db, func, mapping, isBatchRequest) => {
  return async function (req, resp) {
    try {
      const {tx, resolveTx, rejectTx} = await startTransaction(db)

      let result
      if (isBatchRequest) {
        result = await func(db, req)
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
          SriError: SriError
        }

        await hooks.applyHooks('transform request'
                              , mapping.transformRequest
                              , f => f(req, sriRequest))


        const jobs = [ [func, [tx, sriRequest, mapping]] ];
        [ result ] = settleResultsToSriResults(await phaseSyncedSettle(jobs))  
        if (! (result instanceof SriError) ) {
          await hooks.applyHooks('transform response'
                                , mapping.transformResponse
                                , f => f(db, sriRequest, result))
        }
      }

      if (result.status < 300) {
        if (req.query.dryRun === 'true') {
          debug('++ Processing went OK in dryRun mode. Rolling back database transaction.');
          rejectTx()   
        } else {
          debug('++ Processing went OK. Committing database transaction.');  
          resolveTx()   
        }
      } else {
        if (req.query.dryRun === 'true') {
          debug('++ Error during processing in dryRun mode. Rolling back database transaction.');
        } else {
          debug('++ Error during processing. Rolling back database transaction.');
        }
        rejectTx()          
      }

      if (result.headers) {
        resp.set(result.headers)
      }
      resp.status(result.status).send(result.body)

    } catch (err) {
      if (err instanceof SriError) {
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


/* express.js application, configuration for roa4node */
exports = module.exports = {
  configure: async function (app, config) {
    'use strict';
    try {

      // initialize undefined hooks in all resources with empty list
      config.resources.forEach( (resource) => 
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
      )
      if (config.bodyParserLimit === undefined) {
        config.bodyParserLimit = '5mb'
      }
      
      config.resources.forEach( (mapping) => {
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
      })

      global.sri4node_configuration = config // share configuration with other modules

      const db = await pgConnect(config)

      global.sri4node_configuration.informationSchema = await require('./js/informationSchema.js')(db, config)

      const listResource = require('./js/listResource.js')
      const regularResource = require('./js/regularResource.js')
      const batch = require('./js/batch.js')
      const utilLib = require('./js/utilLib.js')

      global.sri4node_configuration.utils = {
        // Utility to run arbitrary SQL in validation, beforeupdate, afterupdate, etc..
        executeSQL: pgExec,
        prepareSQL: queryobject.prepareSQL,
        convertListResourceURLToSQL: listResource.getSQLFromListResource,
        addReferencingResources: utilLib.addReferencingResources,
      } //utils

      if (config.plugins !== undefined) {
        await pMap(config.plugins, async (plugin) => await plugin.install(global.sri4node_configuration, db), {concurrency: 1}  )
      }

      const emt = installEMT()

      if (global.sri4node_configuration.forceSecureSockets) {
        // All URLs force SSL and allow cross origin access.
        app.use(forceSecureSockets);
      }

      app.use(emt.instrument(compression()))
      app.use(emt.instrument(logRequests))
      app.use(emt.instrument(bodyParser.json({limit: config.bodyParserLimit, extended: true})));

      app.use('/pathfinder', function(req, res, next){
        pathfinderUI(app)
        next()
      }, pathfinderUI.router)


      //to parse html pages
      app.use('/docs/static', express.static(__dirname + '/js/docs/static'));
      app.engine('.jade', require('jade').__express);
      app.set('view engine', 'jade');
      app.set('views', __dirname + '/js/docs');

      app.put('/log', middlewareErrorWrapper(function (req, resp) {
        const err = req.body;
        cl('Client side error :');
        err.stack.split('\n').forEach( (line) => cl(line) )
        resp.end();
      }));

      app.get('/docs', middlewareErrorWrapper(getDocs));
      app.get('/resources', middlewareErrorWrapper(getResourcesOverview));


      config.resources.forEach( (mapping) => {
        checkRequiredFields(mapping, config.informationSchema);

        installVersionIncTriggerOnTable(db, tableFromMapping(mapping))

        // register schema for external usage. public.
        app.get(mapping.type + '/schema', middlewareErrorWrapper(getSchema));
        
        //register docs for this type
        app.get(mapping.type + '/docs', middlewareErrorWrapper(getDocs));
        app.use(mapping.type + '/docs/static', express.static(__dirname + '/js/docs/static'));

        // batch route
        app.put(mapping.type + '/batch', expressWrapper(db, batch.batchOperation, mapping, true));
        app.post(mapping.type + '/batch', expressWrapper(db, batch.batchOperation, mapping, true));

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
      })

      // map with urls which can be called within a batch 
      const batchHandlerMap = config.resources.reduce( (acc, mapping) => {

        const crudRoutes = 
          [ [ mapping.type + '/:key', 'GET', regularResource.getRegularResource, mapping]
          , [ mapping.type + '/:key', 'PUT', regularResource.createOrUpdate, mapping]
          , [ mapping.type + '/:key', 'DELETE', regularResource.deleteResource, mapping]
          , [ mapping.type, 'GET', listResource.getListResource, mapping]
          ]

// TODO: check customRoutes have required fields and make sense

        mapping.customRoutes.forEach( cr => {
            const customMapping = _.cloneDeep(mapping);
            if (cr.transformRequest !== undefined) {
              customMapping.transformRequest.push(cr.transformRequest)
            }
            if (cr.transformResponse !== undefined) {
              customMapping.transformResponse.push(cr.transformResponse)
            }

            cr.httpMethods.forEach( method => {
              if (cr.handler === undefined) {
                const crudPath = mapping.type + cr.like;
                Object.assign(customMapping.query, cr.query);

                const likeMatches = crudRoutes.filter( ([path, verb]) => (path === crudPath && verb === method.toUpperCase()) )
                if (likeMatches.length === 0) {
                  console.log(`\nWARNING: customRoute like ${crudPath} - ${method} not found => ignored.\n`)
                } else {
                  const [path, verb, handler] = likeMatches[0]
                  acc.push([ crudPath + cr.routePostfix, verb, handler, customMapping ])                  
                }
              } else {
                acc.push([ mapping.type + cr.routePostfix, method.toUpperCase(), cr.handler, customMapping ])
              }              
            })
          })

        acc.push(...crudRoutes)

        return acc        
      }, [])


      // register indivual routes in express
      batchHandlerMap.forEach( ([path, verb, func, mapping]) => {
        // Also use phaseSyncedSettle like in batch to use same shared code,
        // has no direct added value in case of single request.
        app[verb.toLowerCase()]( path, 
                                 emt.instrument(expressWrapper(db, func, mapping, false), 'func') )
      })

      // transform map with 'routes' to be usable in batch
      config.batchHandlerMap = batchHandlerMap.map( ([path, verb, func, mapping]) => {
        return { route: new route(path), verb, func, mapping }
      })


      // does not seem to work anymore?
      // app.get('/', lsRoutes(app), function (req, res) {
      //   res.json(200, req.routes)
      // })
      app.get('/', (req, res) => res.redirect('/resources'))

      console.log('___________________________ SRI4NODE INITIALIZATION DONE _____________________________')
    } catch (err) {
      console.log('___________________________ SRI4NODE INITIALIZATION ERROR _____________________________')
      console.log(err)
    }
  }, // configure

  utils: null,
  queryUtils: require('./js/queryUtils.js'),
  mapUtils: require('./js/mapUtils.js'),
  schemaUtils: require('./js/schemaUtils.js'),
  SriError: SriError,
  transformRowToObject: transformRowToObject,
  transformObjectToRow: transformObjectToRow
};
