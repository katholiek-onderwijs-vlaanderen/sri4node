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
        mapColumnsToObject, executeOnFunctions, tableFromMapping, transformRowToObject, transformObjectToRow } = require('./js/common.js');
const queryobject = require('./js/queryObject.js');
const $q = require('./js/queryUtils.js');
const phaseSyncedSettle = require('./js/phaseSyncedSettle.js')


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
  if (global.configuration.logrequests) {
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
  const typeToMapping = typeToConfig(global.configuration.resources);
  const type = req.route.path.split('/').slice(0, req.route.path.split('/').length - 1).join('/');
  const mapping = typeToMapping[type];

  resp.set('Content-Type', 'application/json');
  resp.send(mapping.schema);
}

/* Handle GET /docs and /{type}/docs */
function getDocs(req, resp) {
  'use strict';
  const typeToMapping = typeToConfig(global.configuration.resources);
  const type = req.route.path.split('/').slice(0, req.route.path.split('/').length - 1).join('/');
  if (type in typeToMapping) {
    const mapping = typeToMapping[type];
    resp.locals.path = req._parsedUrl.pathname;
    resp.render('resource', {resource: mapping, queryUtils: exports.queryUtils});
  } else if (req.route.path === '/docs') {
    resp.render('index', {config: global.configuration});
  } else {
    resp.status(404).send('Not Found');
  }
}

const getResourcesOverview = (req, resp) => {
  resp.set('Content-Type', 'application/json');
  const resourcesToSend = {};
  global.configuration.resources.forEach( (resource) => {
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
  if (global.configuration.logmiddleware) {
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

const expressWrapper = (db, func, isBatch) => {
  return async function (req, resp) {
    try {
      const type = req.route.path.replace(/\/validate$/g, '')
                                 .replace(/\/batch$/g, '')
                                 .replace(/\/:[^\/]*/g, '')

      const mapping = typeToConfig(global.configuration.resources)[type]

      const sriRequest  = {
        path: req.path,
        originalUrl: req.originalUrl,
        query: req.query,
        params: req.params,
        httpMethod: req.method,
        headers: req.headers,
        protocol: req.protocol,
        body: req.body,
        sriType: type,
        // isListRequest: 'uuid' in req.params
        SriError: SriError
      }

      await pMap(mapping.transformRequest, (func) => func(req, sriRequest), {concurrency: 1}  )

      let result
      if (isBatch) {
        result = await func(db, sriRequest)
      } else {
        // Also use phaseSyncedSettle like in batch to use same shared code,
        // has no direct added value in case of single request.
        const jobs = [ [func, [db, sriRequest]] ];
        [ result ] = settleResultsToSriResults(await phaseSyncedSettle(jobs))
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
          'afterInsert', 'beforeDelete', 'afterDelete', 'transformRequest', 'transformBatchRequest'  ]
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
      
      // In case of 'referencing' fields -> add expected filterReferencedType query if not defined.
      config.resources.forEach( (mapping) => {
        Object.keys(mapping.map).forEach( (key) => {
          if (mapping.map.key === 'references' && mapping.query.key === undefined) {
            mapping.query.key = $q.filterReferencedType(map.key.references, key)
          }
        })
      })

      global.configuration = config // share configuration with other modules

      const db = await pgConnect(config)

      global.configuration.informationSchema = await require('./js/informationSchema.js')(db, config)

      const listResource = require('./js/listResource.js')
      const regularResource = require('./js/regularResource.js')
      const batch = require('./js/batch.js')
      const utilLib = require('./js/utilLib.js')

      global.configuration.utils = {
        // Utility to run arbitrary SQL in validation, beforeupdate, afterupdate, etc..
        executeSQL: pgExec,
        prepareSQL: queryobject.prepareSQL,
        convertListResourceURLToSQL: listResource.getSQLFromListResource,
        addReferencingResources: utilLib.addReferencingResources,
      } //utils

      if (config.plugins !== undefined) {
        await pMap(config.plugins, async (plugin) => await plugin.install(global.configuration, db), {concurrency: 1}  )
      }
      
      const emt = installEMT()

      if (global.configuration.forceSecureSockets) {
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
        app.put(mapping.type + '/batch', expressWrapper(db, batch.batchOperation, true));
        app.post(mapping.type + '/batch', expressWrapper(db, batch.batchOperation, true));

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
        acc.push([ mapping.type + '/:key', 'GET', regularResource.getRegularResource, mapping.type])
        acc.push([ mapping.type + '/:key', 'PUT', regularResource.createOrUpdate, mapping.type])
        acc.push([ mapping.type + '/:key', 'DELETE', regularResource.deleteResource, mapping.type])
        acc.push([ mapping.type, 'GET', listResource.getListResource, mapping.type])

        // validation route
        acc.push([ mapping.type + '/validate', 'POST', regularResource.validate, mapping.type])
        //  REMARK: this is according sri4node spec; persons-api validate is implemented differently; to be discussed!

        return acc        
      }, [])

      // register indivual routes in express
      batchHandlerMap.forEach( ([path, verb, func, type]) => {
        app[verb.toLowerCase()]( path, 
                                 emt.instrument(expressWrapper(db, func, false), 'func') )
      })

      // transform map with 'routes' to be usable in batch
      config.batchHandlerMap = batchHandlerMap.map( ([path, verb, func, type]) => {
        return { route: new route(path), verb, func, type }
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
