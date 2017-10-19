/*
  The core server for the REST api.
  It is configurable, and provides a simple framework for creating REST interfaces.
*/


// External dependencies.
const compression = require('compression');
const bodyParser = require('body-parser');
const Q = require('q');
const express = require('express');
const route = require('route-parser');
const lsRoutes = require('express-ls-routes')
var pathfinderUI = require('pathfinder-ui')

const informationSchema = require('./js/informationSchema.js');
const { cl, debug, pgConnect, pgExec, typeToConfig, SriError,
        mapColumnsToObject, executeOnFunctions, tableFromMapping } = require('./js/common.js');
const queryobject = require('./js/queryObject.js');



function error(x) {
  'use strict';
  cl(x);
}



// Force https in production.
function forceSecureSockets(req, res, next) {
  'use strict';
  var isHttps = req.headers['x-forwarded-proto'] === 'https';
  if (!isHttps && req.get('Host').indexOf('localhost') < 0 && req.get('Host').indexOf('127.0.0.1') < 0) {
    return res.redirect('https://' + req.get('Host') + req.url);
  }

  next();
}


const logRequests = (req, res, next) => {
  'use strict';
  var start;
  if (global.configuration.logrequests) {
    debug(req.method + ' ' + req.path + ' starting.'
              + (req.headers['x-request-id'] ? ' req_id: ' + req.headers['x-request-id'] : '') + ' ');
    start = Date.now();
    res.on('finish', function () {
      var duration = Date.now() - start;
      debug(req.method + ' ' + req.path + ' took ' + duration + ' ms. '
                + (req.headers['x-request-id'] ? ' req_id: ' + req.headers['x-request-id'] : '') + ' ');
    });
  }
  next();
}

/* Handle GET /{type}/schema */
function getSchema(req, resp) {
  'use strict';
  var typeToMapping = typeToConfig(global.configuration.resources);
  var type = req.route.path.split('/').slice(0, req.route.path.split('/').length - 1).join('/');
  var mapping = typeToMapping[type];

  resp.set('Content-Type', 'application/json');
  resp.send(mapping.schema);
}

/* Handle GET /docs and /{type}/docs */
function getDocs(req, resp) {
  'use strict';
  var typeToMapping = typeToConfig(global.configuration.resources);
  var type = req.route.path.split('/').slice(0, req.route.path.split('/').length - 1).join('/');
  var mapping;
  if (type in typeToMapping) {
    mapping = typeToMapping[type];
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
  var resourcesToSend = {};
  resources.forEach( (resource) => {
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
  var mandatoryFields = ['key', '$$meta.created', '$$meta.modified', '$$meta.deleted'];
  var i;
  var table, idx;
  for (i = 0; i < mandatoryFields.length; i++) {
    const table = tableFromMapping(mapping)
    idx = '/' + table;
    if (!information[idx]) {
      throw new Error('Table \'' + table + '\' seems to be missing in the database.');
    }
    if (!information[idx].hasOwnProperty(mandatoryFields[i])) {
      throw new Error('Mapping ' + mapping.type + ' lacks mandatory field ' + mandatoryFields[i]);
    }
  }

}

const installEMT = () => {
  if (global.configuration.logmiddleware) {
    process.env.TIMER = true; //eslint-disable-line
    const emt = require('express-middleware-timer');
    // init timer
    app.use(emt.init(function emtReporter(req, res) {
      // Write report to file.
      var report = emt.calculate(req, res);
      var out = 'middleware timing: ';
      var timer;
      var timers = [];

      for (timer in report.timers) {
        if (report.timers.hasOwnProperty(timer)) {
          timers.push('[' + timer + ' took ' + report.timers[timer].took + ']');
        }
      }

      console.log(out + timers.join(',')); //eslint-disable-line

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
        resp.status(500).send('Internal Server Error. [' + err.toString() + ']');
      }
    }
}



const expressWrapper = (db, func) => {
  return async function (req, resp) {
    try {
      const result = await func(db, req.me, req.originalUrl, req.query, req.body)
      resp.status(result.status).send(result.body)
    } catch (err) {
      if (err instanceof SriError) {
        resp.status(err.obj.status).send(err.obj.body);
      } else {      
        console.log('____________________________ E R R O R ____________________________________________________') 
        console.log(err)
        console.log('___________________________________________________________________________________________') 
        resp.status(500).send('Internal Server Error. [' + err.toString() + ']');
      }
    }    
  }
}
/* express.js application, configuration for roa4node */
exports = module.exports = {
  configure: async function (app, pg, config) {
    'use strict';
    try {
      global.configuration = config // share configuration with other modules

      const db = await pgConnect(config)
      global.configuration.informationSchema = await require('./js/informationSchema.js')(db, config)

      const auth  = require('./js/auth.js')
      const listResource = require('./js/listResource.js')
      const regularResource = require('./js/regularResource.js')
      const batch = require('./js/batch.js')
      const utilLib = require('./js/utilLib.js')

      const emt = installEMT()

      if (global.configuration.forceSecureSockets) {
        // All URLs force SSL and allow cross origin access.
        app.use(forceSecureSockets);
      }

      app.use(emt.instrument(compression()))
      app.use(emt.instrument(logRequests))
      app.use(emt.instrument(bodyParser.json()));

      app.use('/pathfinder', function(req, res, next){
        pathfinderUI(app)
        next()
      }, pathfinderUI.router)


      //to parse html pages
      app.use('/docs/static', express.static(__dirname + '/js/docs/static'));
      app.engine('.jade', require('jade').__express);
      app.set('view engine', 'jade');
      app.set('views', __dirname + '/js/docs');


      if (!config.authenticate) {
        msg = 'No authenticate function installed !';
        cl(msg);
        throw new Error(msg);
      }
      if (!config.identify) {
        msg = 'No identify function installed !';
        cl(msg);
        throw new Error(msg);
      }

      app.get('/me', config.authenticate, middlewareErrorWrapper(async function (req, resp) {
        const id = await config.identify(req, db) 
        resp.set('Content-Type', 'application/json');
        resp.send(id);
        resp.end();
      }))

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

        // register schema for external usage. public.
        app.get(mapping.type + '/schema', middlewareErrorWrapper(getSchema));
        
        //register docs for this type
        app.get(mapping.type + '/docs', middlewareErrorWrapper(getDocs));
        app.use(mapping.type + '/docs/static', express.static(__dirname + '/js/docs/static'));

        // batch route
        app.get(mapping.type + '/batch',  expressWrapper(db, batch.batchOperation));
        app.put(mapping.type + '/batch',  expressWrapper(db, batch.batchOperation));

        // app.get(mapping.type + '/batch',  () => console.log('FOO'));
        // app.put(mapping.type + '/batch',  () => console.log('BAR'));

        // app.get(mapping.type + '/batch', config.authenticate, batch.batchOperation);
        // app.put(mapping.type + '/batch', config.authenticate, batch.batchOperation);

        // append relation filters if auto-detected a relation resource
        if (mapping.map.from && mapping.map.to) {

          //mapping.query.relationsFilter = mapping.query.relationsFilter(mapping.map.from, mapping.map.to);
          const relationFilters = require('./js/relationsFilter.js');
          if (!mapping.query) {
            mapping.query = {};
          }

          for (var key in relationFilters) {
            if (relationFilters.hasOwnProperty(key)) {
              mapping.query[key] = relationFilters[key];
            }
          }
        }
      })

      const checkAuthentication = config.checkAuthentication ? config.checkAuthentication : config.authenticate;

      // map with urls which can be called within a batch 
      const batchHandlerMap = config.resources.reduce( (acc, mapping) => {
        acc.push([ mapping.type + '/:key', 'GET', checkAuthentication, regularResource.getRegularResource])
        acc.push([ mapping.type + '/:key', 'PUT', config.authenticate, regularResource.createOrUpdate])
        acc.push([ mapping.type + '/:key', 'DELETE', config.authenticate, regularResource.deleteResource])
        acc.push([ mapping.type, 'GET', checkAuthentication, listResource.getListResource])
        // validation route
//TODO        app.post(mapping.type + '/validate',  config.authenticate, middlewareErrorWrapper(validate));
        // TODO: check spec -> probably instead of own route detect trailing /validate behind /batch and /:key
//     TODO: strip trailing /validate earlier !!!
//     // special case for validate
//     if (path.indexOf('validate') != -1) {
//       path = path.replace('validate', body.key);
//     }

        return acc        
      }, [])

      // register indivual routes in express
      batchHandlerMap.forEach( ([path, verb, authFunc, func]) => {
        app[verb.toLowerCase()]( path, 
                                 authFunc, 
                                 emt.instrument(expressWrapper(db, func), 'func') )
      })

      // transform map with 'routes' to be usable in batch
      config.batchHandlerMap = batchHandlerMap.map( ([path, verb, auth, func]) => {
        return [ new route(path), verb, func ]
      })


      this.utils = {
        // Utility to run arbitrary SQL in validation, beforeupdate, afterupdate, etc..
        executeSQL: pgExec,
        prepareSQL: queryobject.prepareSQL,
        // generateError: generateError,
        convertListResourceURLToSQL: listResource.getSQLFromListResource,
        addReferencingResources: utilLib.addReferencingResources,
        basicAuthentication: auth.doBasicAuthentication,
        checkBasicAuthentication: auth.checkBasicAuthentication,
        postAuthenticationFailed: auth.postAuthenticationFailed
      } //utils



      app.get('/', lsRoutes(app), function (req, res) {
        res.json(200, req.routes)
      })
      console.log('___________________________ SRI4NODE INITIALIZATION DONE _____________________________')
    } catch (err) {
      console.log('___________________________ SRI4NODE INITIALIZATION ERROR _____________________________')
      console.log(err)
    }
  }, // configure

  utils: null,
  queryUtils: require('./js/queryUtils.js'),
  mapUtils: require('./js/mapUtils.js'),
  schemaUtils: require('./js/schemaUtils.js')    
};
