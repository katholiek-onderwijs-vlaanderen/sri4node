/* eslint-disable import/first */
/*
  The core server for the REST api.
  It is configurable, and provides a simple framework for creating REST interfaces.
*/

// needed for express-middleware-timer to actually do something !!!
// And it must be set before importing ./js/common !!!
process.env.TIMER = 'true';

import { Application, Request, Response } from 'express';
import { Stream } from 'stream';
import * as _ from 'lodash';
import * as util from 'util';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { IDatabase } from 'pg-promise';

// External dependencies.
import compression = require('compression');
import bodyParser = require('body-parser');
import express = require('express');
import Route = require('route-parser');
import pMap = require('p-map');
import Busboy = require('busboy');
import EventEmitter = require('events');
import pEvent = require('p-event');
import httpContext = require('express-http-context');
import shortid = require('shortid');
import pug = require('pug');

import {
  debug, error, pgConnect, pgExec, typeToConfig, installVersionIncTriggerOnTable, stringifyError,
  settleResultsToSriResults, tableFromMapping, transformRowToObject, transformObjectToRow,
  startTransaction, startTask, typeToMapping, setServerTimingHdr, sqlColumnNames, getPgp,
  handleRequestDebugLog, createDebugLogConfigObject, installEMT, emtReportToServerTiming,
  generateSriRequest, urlToTypeAndKey, parseResource, hrtimeToMilliseconds, isLogChannelEnabled,
} from './js/common';
import * as batch from './js/batch';
import { prepareSQL } from './js/queryObject';
import {
  TResourceDefinition, TSriConfig, TSriRequest, TInternalSriRequest, TSriRequestHandler, SriError,
  TBatchHandlerRecord, THttpMethod, TSriServerInstance,
} from './js/typeDefinitions';
import * as queryUtils from './js/queryUtils';
import * as schemaUtils from './js/schemaUtils';
import * as mapUtils from './js/mapUtils';
import { informationSchema } from './js/informationSchema';

import { phaseSyncedSettle } from './js/phaseSyncedSettle';
import { applyHooks } from './js/hooks';

// const listResource = require('./js/listResource')
import * as listResource from './js/listResource';
import * as regularResource from './js/regularResource';
import utilLib = require('./js/utilLib');
import { overloadProtectionFactory } from './js/overloadProtection';
import * as relationFilters from './js/relationsFilter';

const JsonStreamStringify = require('json-stream-stringify'); // not working with import?

const ajv = new Ajv({ coerceTypes: true }); // options can be passed, e.g. {allErrors: true}
addFormats(ajv);

/**
 * Force https in production
 */
function forceSecureSockets(req, res:Response, next) {
  const isHttps = req.headers['x-forwarded-proto'] === 'https';
  if (!isHttps && req.get('Host').indexOf('localhost') < 0 && req.get('Host').indexOf('127.0.0.1') < 0) {
    res.redirect(`https://${req.get('Host')}${req.url}`);
  } else {
    next();
  }
}

/**
 * Handle GET /{type}/schema
 */
function getSchema(req, resp) {
  const type = req.route.path.split('/').slice(0, req.route.path.split('/').length - 1).join('/');
  const mapping = typeToMapping(type);

  resp.set('Content-Type', 'application/json');
  resp.send(mapping.schema);
}

/**
 * Handle GET /docs and /{type}/docs
 */
function getDocs(req, resp) {
  const typeToMappingMap = typeToConfig(global.sri4node_configuration.resources);
  const type = req.route.path.split('/').slice(0, req.route.path.split('/').length - 1).join('/');
  if (type in typeToMappingMap) {
    const mapping = typeToMappingMap[type];
    resp.locals.path = req._parsedUrl.pathname;
    resp.render('resource', { resource: mapping, queryUtils });
  } else if (req.route.path === '/docs') {
    resp.render('index', { config: global.sri4node_configuration });
  } else {
    resp.status(404).send('Not Found');
  }
}

const getResourcesOverview = (req, resp) => {
  resp.set('Content-Type', 'application/json');
  const resourcesToSend = {};
  global.sri4node_configuration.resources.forEach((resource) => {
    const resourceName = resource.type.substring(1); // strip leading slash
    resourcesToSend[resourceName] = {
      docs: `${resource.type}/docs`,
      schema: `${resource.type}/schema`,
      href: resource.type,
    };

    if (resource.schema) {
      resourcesToSend[resourceName].description = resource.schema.title;
    }
  });
  resp.send(resourcesToSend);
};

function checkRequiredFields(mapping, information) {
  const table = tableFromMapping(mapping);
  const idx = mapping.type;
  if (!information[idx]) {
    throw new Error(`Table '${table}' seems to be missing in the database.`);
  }
  const mandatoryFields = ['key', '$$meta.created', '$$meta.modified', '$$meta.deleted'];
  mandatoryFields.forEach((field: string) => {
    if (!(field in information[idx])) {
      throw new Error(`Mapping '${mapping.type}' lacks mandatory field '${field}'`);
    }
  });
}

const middlewareErrorWrapper = (fun) => async (req, resp) => {
  try {
    await fun(req, resp);
  } catch (err) {
    error('____________________________ E R R O R (middlewareErrorWrapper) ___________________________');
    error(err);
    error('STACK:');
    error(err.stack);
    error('___________________________________________________________________________________________');
    resp.status(500).send(`Internal Server Error. [${stringifyError(err)}]`);
  }
};

process.on('unhandledRejection', (err) => { console.log(err); throw err; });

const handleRequest = async (sriRequest:TSriRequest, func:TSriRequestHandler, mapping) => {
  const { dbT } = sriRequest;
  let result;
  if (sriRequest.isBatchRequest) {
    result = await (func as ((r:TSriRequest) => unknown))(sriRequest);
  } else {
    const jobs = [[func, [dbT, sriRequest, mapping]]];

    [result] = settleResultsToSriResults(
      await phaseSyncedSettle(
        jobs, { beforePhaseHooks: global.sri4node_configuration.beforePhase },
      ),
    );
    if (result instanceof SriError || result?.__proto__?.constructor?.name === 'SriError') {
      throw result;
    }

    if (sriRequest.streamStarted === undefined || !sriRequest.streamStarted()) {
      await applyHooks('transform response',
        mapping.transformResponse,
        (f) => f(dbT, sriRequest, result),
        sriRequest);
    }
  }
  return result;
};

const handleServerTiming = async (req, resp, sriRequest: TSriRequest) => {
  const logEnabled = isLogChannelEnabled('server-timing');
  const hdrEnable = sriRequest.headers?.['request-server-timing'] !== undefined;
  let serverTiming = '';
  if ((logEnabled || hdrEnable) && (sriRequest.serverTiming !== undefined)) {
    emtReportToServerTiming(req, resp, sriRequest);
    const notNullEntries = Object.entries(sriRequest.serverTiming)
      .filter(([property, value]) => value as number > 0);

    if (notNullEntries.length > 0) {
      serverTiming = notNullEntries.map(([property, value]) => `${property};dur=${(Math.round(value as number * 100) / 100).toFixed(2)}`).join(', ');
      if (logEnabled) {
        debug('server-timing', serverTiming);
      }
      if (hdrEnable) {
        if (resp.headersSent) {
          // streaming mode
          (sriRequest.outStream as any).addTrailers({
            'Server-Timing': serverTiming,
          });
        } else {
          resp.set('Server-Timing', serverTiming);
        }
      }
    }
  }
};

const expressWrapper = (
  dbR, dbW, func:TSriRequestHandler, sriConfig:TSriConfig, mapping:TResourceDefinition | null,
  isStreamingRequest:boolean, isBatchRequest:boolean, readOnly0:boolean,
) => async function (req:Request, resp:Response, next) {
  let t: any = null; let endTask; let resolveTx; let rejectTx; let
    readOnly;
  const reqMsgStart = `${req.method} ${req.path}`;
  debug('requests', `${reqMsgStart} starting.`);

  const hrstart = process.hrtime();
  resp.on('finish', () => {
    const hrend = process.hrtime(hrstart);
    debug('requests', `${reqMsgStart} took ${hrend[0] * 1000 + hrend[1] / 1000000} ms`);
  });
  debug('trace', 'Starting express wrapper');
  let sriRequest;
  try {
    let batchRoutingDuration = 0;
    if (isBatchRequest) {
      // evaluate batch body now to know wether the batch is completetly read-only
      // and do early error detecion

      const hrStart2 = process.hrtime();
      batch.matchBatch(req);
      const hrDuration = process.hrtime(hrStart2);
      batchRoutingDuration = hrtimeToMilliseconds(hrDuration);

      const mapReadOnly = (a) => {
        if (Array.isArray(a)) {
          return a.map(mapReadOnly);
        }
        return a.match.handler.readOnly;
      };
      readOnly = _.flatten(req.body?.map(mapReadOnly)).every((e) => e);
    } else {
      readOnly = readOnly0;
    }
    global.overloadProtection.startPipeline();

    const reqId = httpContext.get('reqId');
    if (reqId !== undefined) {
      resp.set('vsko-req-id', reqId);
    } else {
      console.log('no reqId ???');
    }

    // Before creating the inital SriRequest object, we need to generate a task/transaction !!!
    const hrStartStartTransaction = process.hrtime();
    if (readOnly === true) {
      ({ t, endTask } = await startTask(dbR));
    } else {
      ({ tx: t, resolveTx, rejectTx } = await startTransaction(dbW));
    }
    const hrElapsedStartTransaction = process.hrtime(hrStartStartTransaction);

    sriRequest = generateSriRequest(req, resp, {
      isBatchRequest, readOnly, mapping: mapping || undefined, isStreamingRequest, dbT: t,
    });
    setServerTimingHdr(sriRequest, 'db-starttask', hrtimeToMilliseconds(hrElapsedStartTransaction));

    req.on('close', (err) => {
      sriRequest.reqCancelled = true;
    });

    await applyHooks(
      'transform request',
      sriConfig.transformRequest || [],
      (f) => f(req, sriRequest, t),
      // () => sriConfig.transformRequest(req, sriRequest, t),
      sriRequest,
    );

    setServerTimingHdr(sriRequest, 'batch-routing', batchRoutingDuration);

    const result = await handleRequest(sriRequest, func, mapping);

    const terminateDb = async (error1, readOnly1) => {
      if (readOnly1 === true) {
        debug('db', '++ Processing went OK. Closing database task. ++');
        await endTask();
      } else if (error1) {
        if (req.query.dryRun === 'true') {
          debug('db', '++ Error during processing in dryRun mode. Rolling back database transaction.');
        } else {
          debug('db', '++ Error during processing. Rolling back database transaction.');
        }
        await rejectTx();
      } else if (req.query.dryRun === 'true') {
        debug('db', '++ Processing went OK in dryRun mode. Rolling back database transaction.');
        await rejectTx();
      } else {
        debug('db', '++ Processing went OK. Committing database transaction.');
        await resolveTx();
      }
    };

    if (resp.headersSent) {
      // we are in streaming mode
      if (result.status < 300) {
        await terminateDb(false, readOnly);
      } else {
        await terminateDb(true, readOnly);
      }
      await handleServerTiming(req, resp, sriRequest);
      sriRequest.outStream?.end();
    } else {
      if (result.status < 300) {
        await terminateDb(false, readOnly);
      } else {
        await terminateDb(true, readOnly);
      }

      await handleServerTiming(req, resp, sriRequest);
      if (result.headers) {
        resp.set(result.headers);
      }
      // resp.status(result.status).send(result.body) // OLD VERSION, now streaming JSON stringify for list resources
      resp.status(result.status);
      // now stream result.body to the express response
      // TODO: fix bad test to know if it's a list resource, but the code below that also adds
      // all other fields besides $$meta and results, should avoid that this is a disaster
      if (result.body && Array.isArray(result.body.results)) {
        resp.setHeader('Content-Type', 'application/json; charset=utf-8');
        // VERSION WITH JSON STREAM
        // const writableJsonsStream = JSONStream.stringify(`{"$$meta": ${JSON.stringify(result.body.$$meta)}, "results":\n`, ',', '\n}');
        // writableJsonsStream.pipe(resp);
        // writableJsonsStream.write(result.body.results);
        // writableJsonsStream.end();

        // VERSION WHERE I SIMPLY PUT EACH ARRAY ITEM ON THE STREAM MYSELF (is this faster than JSONStream.striingify which seems slow looking at my first tests)
        resp.write(`{"$$meta": ${JSON.stringify(result.body.$$meta)}, "results": [\n`);
        const total = result.body.results.length;
        result.body.results.forEach(
          (record, index) => resp.write(`${JSON.stringify(record)}${index + 1 < total ? ',' : ''}\n`),
        );
        resp.write(']');
        // if result.body contains other properties, add them to the response as well
        Object.entries(result.body)
          .filter(([key]) => !['$$meta', 'results'].includes(key))
          .forEach(([key, value]) => resp.write(`,\n"${key}": ${JSON.stringify(value)}`));
        resp.write('\n}');
        resp.end();
      } else {
        resp.send(result.body);
      }
    }
    await applyHooks('afterRequest',
      sriConfig.afterRequest || [],
      (f) => f(sriRequest),
      sriRequest);
    if (global.sri4node_configuration.logdebug.statuses !== undefined) {
      setImmediate(() => {
        // use setImmediate to make sure also the last log messages are buffered before calling handleRequestDebugLog
        handleRequestDebugLog(result.status);
      });
    }
  } catch (err) {
    await applyHooks('errorHandler',
      sriConfig.errorHandler || [],
      (f) => f(sriRequest, err),
      sriRequest);

    // TODO: what with streaming errors
    if (t != null) { // t will be null in case of error during startTask/startTransaction
      if (readOnly === true) {
        debug('db', '++ Exception caught. Closing database task. ++');
        await endTask();
      } else {
        debug('db', '++ Exception caught. Rolling back database transaction. ++');
        await rejectTx();
      }
    }

    if (resp.headersSent) {
      error('____________________________ E R R O R (expressWrapper)____________________________________');
      error(err);
      error('STACK:');
      error(err.stack);
      error('___________________________________________________________________________________________');
      error('NEED TO DESTROY STREAMING REQ');
      // TODO: HTTP trailer
      // next(err)
      req.destroy();
    } else if (err instanceof SriError || err?.__proto__?.constructor?.name === 'SriError') {
      if (err.status > 0) {
        const reqId = httpContext.get('reqId');
        if (reqId !== undefined) {
          err.body.vskoReqId = reqId;
          err.headers['vsko-req-id'] = reqId;
        }
        resp.set(err.headers).status(err.status).send(err.body);
      }
    } else {
      error('____________________________ E R R O R (expressWrapper)____________________________________');
      error(err);
      error('STACK:');
      error(err.stack);
      error('___________________________________________________________________________________________');
      resp.status(500).send(`Internal Server Error. [${stringifyError(err)}]`);
    }
    if (global.sri4node_configuration.logdebug.statuses !== undefined) {
      setImmediate(() => {
        // use setImmediate to make sure also the last log messages are buffered before calling handleRequestDebugLog
        console.log('GOING TO CALL handleRequestDebugLog');
        handleRequestDebugLog(err.status ? err.status : 500);
      });
    }
  } finally {
    global.overloadProtection.endPipeline();
  }
};

const toArray = (resource, name) => {
  // makes the property <name> of object <resource> an array
  if (resource[name] === undefined) {
    resource[name] = [];
  } else if (resource[name] === null) {
    console.log(`WARNING: handler '${name}' was set to 'null' -> assume []`);
    resource[name] = [];
  } else if (!Array.isArray(resource[name])) {
    resource[name] = [resource[name]];
  }
};

/**
 * Exposes a bunch of utility functions.
 */
const utils = { // Utilities to run arbitrary SQL in validation, beforeupdate, afterupdate, etc..
  executeSQL: pgExec,
  prepareSQL,
  convertListResourceURLToSQL: listResource.getSQLFromListResource,
  addReferencingResources: utilLib.addReferencingResources,

  // removed pgInit and pgResult, but kept pgConnect for now (in case someoine wants to use the
  // db, dbW and/or dbR properties)
  pgConnect,

  // still here for backwards compatibility, in most cases we assume that using an
  // internalSriRerquest would be sufficient
  transformRowToObject,
  transformObjectToRow,

  typeToMapping,
  tableFromMapping,
  urlToTypeAndKey,
  parseResource, // should be deprecated in favour of a decent url parsing mechanism
};

/**
 * The main function that configures an sri4node api on top of an existing express app,
 * and based on an sriConfig object
 * @param app express application
 * @param sriConfig the config object
 */
async function configure(app: Application, sriConfig: TSriConfig) : Promise<TSriServerInstance> {
  // make sure no x-powered-by header is being sent
  app.disable('x-powered-by');

  // 2022-03-08 REMOVE gc-stats as the project is abandoned and will cause problems with node versions > 12
  // let maxHeapUsage = 0;
  // if (sriConfig.trackHeapMax === true) {
  //   const gc = (require('gc-stats'))();
  //   gc.on('stats', (stats) => {
  //     const heapUsage = (stats.before.usedHeapSize / 1024 / 1024);
  //     if (heapUsage > maxHeapUsage) {
  //       maxHeapUsage = heapUsage;
  //     }
  //   });
  // }

  try {
    sriConfig.resources.forEach((resource) => {
      // initialize undefined hooks in all resources with empty list
      ['beforeRead', 'afterRead', 'beforeUpdate', 'afterUpdate', 'beforeInsert',
        'afterInsert', 'beforeDelete', 'afterDelete', 'customRoutes', 'transformResponse']
        .forEach((name) => toArray(resource, name));
      // for backwards compability set listResultDefaultIncludeCount default to true
      if (resource.listResultDefaultIncludeCount === undefined) {
        resource.listResultDefaultIncludeCount = true;
      }
    });

    // initialize undefined global hooks with empty list
    (['beforePhase', 'transformRequest', 'transformInternalRequest'])
      .forEach((name) => toArray(sriConfig, name));
    sriConfig.beforePhase = [
      ...(sriConfig.beforePhase || []),
      regularResource.beforePhaseQueryByKey,
    ];
    sriConfig.beforePhase = [
      ...(sriConfig.beforePhase || []),
      regularResource.beforePhaseInsertUpdateDelete,
    ];

    if (sriConfig.bodyParserLimit === undefined) {
      sriConfig.bodyParserLimit = '5mb';
    }

    sriConfig.resources.forEach((resourceDefinition) => {
      if (!resourceDefinition.onlyCustom) {
        // In case query is not defied -> use defaultFilter
        if (resourceDefinition.query === undefined) {
          resourceDefinition.query = { defaultFilter: queryUtils.defaultFilter };
        }
        // In case of 'referencing' fields -> add expected filterReferencedType query
        // if not defined.
        if (resourceDefinition.map) {
          Object.keys(resourceDefinition.map).forEach((key) => {
            if (resourceDefinition.map?.[key]?.references !== undefined
                && resourceDefinition.query
                && resourceDefinition.query?.[key] === undefined
            ) {
              resourceDefinition.query[key] = queryUtils.filterReferencedType(
                resourceDefinition.map[key].references, key,
              );
            }
          });
        }

        // TODO: what with custom stuff ?
        //  e.g content-api with attachments / security/query
        // TODO: implement a better way to determine key type!!
        if (resourceDefinition.schema === undefined) {
          throw new Error(`Schema definition is missing for '${resourceDefinition.type}' !`);
        }
        // TODO: use json-schema to validate if it is valid json schema
        if (resourceDefinition.schema.properties === undefined) {
          throw new Error(`Schema definition invalid for '${resourceDefinition.type}' !`);
        }
        if (resourceDefinition.schema.properties.key === undefined) {
          throw new Error(`Key is not defined in the schema of '${resourceDefinition.type}' !`);
        }
        if (resourceDefinition.schema.properties.key.pattern === schemaUtils.guid('foo').pattern) {
          resourceDefinition.singleResourceRegex = new RegExp(`^${resourceDefinition.type}/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$`);
        } else if (resourceDefinition.schema.properties.key.type === schemaUtils.numeric('foo').type) {
          resourceDefinition.singleResourceRegex = new RegExp(`^${resourceDefinition.type}/([0-9]+)$`);
        } else if (resourceDefinition.schema.properties.key.type === schemaUtils.string('foo').type) {
          resourceDefinition.singleResourceRegex = new RegExp(`^${resourceDefinition.type}/(\\w+)$`);
        } else {
          throw new Error(`Key type of resource ${resourceDefinition.type} unknown!`);
        }
        resourceDefinition.listResourceRegex = new RegExp(`^${resourceDefinition.type}(?:[?#]\\S*)?$`);
        resourceDefinition.validateKey = ajv.compile(resourceDefinition.schema.properties.key);
      }
    });

    sriConfig.resources.forEach((mapping) => {
      if (mapping.metaType === undefined) {
        error(`WARNING: metaType missing for resource ${mapping.type}`);
        mapping.metaType = 'not specified';
      }
    });

    sriConfig.utils = utils;

    if (sriConfig.batchConcurrency === undefined) {
      sriConfig.batchConcurrency = 4;
    }

    if (sriConfig.logdebug !== undefined) {
      sriConfig.logdebug = createDebugLogConfigObject(sriConfig.logdebug);
    }

    global.sri4node_configuration = sriConfig; // share configuration with other modules

    // in futre we'd want to support a separate read and write datrabase by adding another
    // connection paramaters object toi the config, and if it is filled in that can be the
    // separate read database
    const db = await pgConnect(sriConfig);
    const dbR = db;
    const dbW = db;

    await pMap(
      sriConfig.resources,
      async (mapping) => {
        if (!mapping.onlyCustom) {
          const schema = sriConfig.databaseConnectionParameters?.schema
                      || sriConfig.databaseLibraryInitOptions?.schema;
          const schemaName = Array.isArray(schema)
            ? schema[0]
            : schema?.toString();
          await installVersionIncTriggerOnTable(dbW, tableFromMapping(mapping), schemaName);
        }
      }, { concurrency: 1 },
    );

    global.sri4node_configuration.informationSchema = await informationSchema(dbR, sriConfig);

    // Prepare pg-promise columnsets for multi insert/update & delete
    const pgp = getPgp();

    const generatePgColumnSet = (columnNames, type, table) => {
      const columns = columnNames.map((cname) => {
        const col: any = { name: cname };
        if (cname.includes('.')) {
          // popertynames with dot like $$meta.* are problematic with default pg-promise
          // see https://github.com/vitaly-t/pg-promise/issues/494  ==> workaround with .init() fun
          col.prop = `_${cname.replace(/\./g, '_')}`; // if prop is not unique multiple $$meta.* will get the same value!
          col.init = (c) => c.source[cname];
        }
        const cType = global.sri4node_configuration.informationSchema[type][cname].type;
        const cElementType = global.sri4node_configuration
          .informationSchema[type][cname].element_type;
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
    };

    global.sri4node_configuration.pgColumns = Object.fromEntries(
      sriConfig.resources
        .filter((resource) => !resource.onlyCustom)
        .map((resource) => {
          const { type } = resource;
          const table = tableFromMapping(typeToMapping(type));
          const columns = JSON.parse(`[${sqlColumnNames(typeToMapping(type))}]`)
            .filter((cname) => !cname.startsWith('$$meta.'));
          const ret: any = {};
          ret.insert = new pgp.helpers.ColumnSet(columns, { table });

          const dummyUpdateRow = transformObjectToRow({}, resource, false);
          ret.update = generatePgColumnSet([...new Set(['key', '$$meta.modified', ...Object.keys(dummyUpdateRow)])], type, table);
          ret.delete = generatePgColumnSet(['key', '$$meta.modified', '$$meta.deleted'], type, table);

          return [table, ret];
        }),
    );

    global.sri4node_loaded_plugins = new Map();

    global.sri4node_install_plugin = async (plugin) => {
      console.log(`Installing plugin ${util.inspect(plugin)}`);
      // load plugins with a uuid only once; backwards compatible with old system without uuid
      if ((plugin.uuid !== undefined) && global.sri4node_loaded_plugins.has(plugin.uuid)) {
        return;
      }

      await plugin.install(global.sri4node_configuration, dbW);

      if (plugin.uuid !== undefined) {
        debug('general', `Loaded plugin ${plugin.uuid}.`);
        global.sri4node_loaded_plugins.set(plugin.uuid, plugin);
      }
    };

    if (sriConfig.plugins !== undefined) {
      await pMap(sriConfig.plugins, async (plugin) => {
        await global.sri4node_install_plugin(plugin);
      }, { concurrency: 1 });
    }

    // set the overload protection as first middleware to drop requests as soon as possible
    global.overloadProtection = overloadProtectionFactory(sriConfig.overloadProtection);
    app.use(async (req, res, next) => {
      if (global.overloadProtection.canAccept()) {
        next();
      } else {
        debug('overloadProtection', 'DROPPED REQ');
        if (sriConfig.overloadProtection?.retryAfter !== undefined) {
          res.set('Retry-After', sriConfig.overloadProtection?.retryAfter.toString());
        }
        res.status(503).send([{ code: 'too.busy', msg: 'The request could not be processed as the server is too busy right now. Try again later.' }]);
      }
    });

    const emt = installEMT(app);

    if (global.sri4node_configuration.forceSecureSockets) {
      // All URLs force SSL and allow cross origin access.
      app.use(forceSecureSockets);
    }

    app.use(emt.instrument(compression(), 'mw-compression'));
    app.use(emt.instrument(bodyParser.json({ limit: sriConfig.bodyParserLimit, strict: false }), 'mw-bodyparser'));
    // use option 'strict: false' to allow also valid JSON like a single boolean

    // to parse html pages
    app.use('/docs/static', express.static(`${__dirname}/js/docs/static`));
    app.engine('.pug', pug.__express);
    app.set('view engine', 'pug');
    app.set('views', `${__dirname}/js/docs`);

    app.put('/log', middlewareErrorWrapper((req, resp) => {
      const err = req.body;
      console.log('Client side error :');
      err.stack.split('\n').forEach((line) => console.log(line));
      resp.end();
    }));

    app.get('/docs', middlewareErrorWrapper(getDocs));
    app.get('/resources', middlewareErrorWrapper(getResourcesOverview));

    app.post('/setlogdebug', (req, resp, next) => {
      global.sri4node_configuration.logdebug = createDebugLogConfigObject(req.body);
      resp.send('OK');
    });

    app.use(httpContext.middleware);
    // Run the context for each request. Assign a unique identifier to each request
    app.use((req, res, next) => {
      httpContext.ns.bindEmitter(req);
      httpContext.ns.bindEmitter(res);
      let reqId:string | string[];
      if (req.headers['x-request-id'] !== undefined) {
        // if present use the id provided by heroku
        reqId = req.headers['x-request-id'];
      } else if (req.headers['x-amz-cf-id'] !== undefined) {
        // if present use the id provided by cloudfront
        reqId = req.headers['x-amz-cf-id'];
      } else {
        reqId = shortid.generate();
      }
      if (sriConfig.id !== undefined) {
        reqId = `${sriConfig.id}#${reqId}`;
      }
      httpContext.set('reqId', reqId);
      next();
    });

    await pMap(
      sriConfig.resources,
      async (mapping) => {
        if (!mapping.onlyCustom) {
          if (mapping.map?.key === undefined) {
            // add key if missing, needed for key offset paging
            mapping.map = {
              ...mapping.map,
              key: {} as any,
            };
          }
          checkRequiredFields(mapping, sriConfig.informationSchema);

          // append relation filters if auto-detected a relation resource
          if (mapping.map.from && mapping.map.to) {
            // mapping.query.relationsFilter = mapping.query.relationsFilter(mapping.map.from, mapping.map.to);
            //const relationFilters = require('./js/relationsFilter');
            mapping.query = {
              ...relationFilters,
            };
          }

          // register schema for external usage. public.
          app.get(`${mapping.type}/schema`, middlewareErrorWrapper(getSchema));

          // register docs for this type
          app.get(`${mapping.type}/docs`, middlewareErrorWrapper(getDocs));
          app.use(`${mapping.type}/docs/static`, express.static(`${__dirname}/js/docs/static`));
        }
      }, { concurrency: 1 },
    );

    // temporarilty allow a global /batch via config option for samenscholing
    if (sriConfig.enableGlobalBatch) {
      const globalBatchPath = `${(sriConfig.globalBatchRoutePrefix !== undefined) ? sriConfig.globalBatchRoutePrefix : ''}/batch`;
      debug('general', `registering route ${globalBatchPath} - PUT/POST`);
      debug('general', `registering route ${`${globalBatchPath}_streaming`} - PUT/POST`);
      app.put(
        globalBatchPath,
        expressWrapper(dbR, dbW, batch.batchOperation, sriConfig, null, false, true, false),
      );
      app.post(
        globalBatchPath,
        expressWrapper(dbR, dbW, batch.batchOperation, sriConfig, null, false, true, false),
      );

      app.put(
        `${globalBatchPath}_streaming`,
        expressWrapper(dbR, dbW, batch.batchOperationStreaming, sriConfig, null, true, true, false),
      );
      app.post(
        `${globalBatchPath}_streaming`,
        expressWrapper(dbR, dbW, batch.batchOperationStreaming, sriConfig, null, true, true, false),
      );
    }

    /**
     * array of objects with url, verb, handler and some other options
     * which can be called within a batch
     */
    const batchHandlerMap:Array<TBatchHandlerRecord> = sriConfig.resources
      .reduce(
        (acc:Array<TBatchHandlerRecord>, mapping) => {
          // [path, verb, func, mapping, streaming, readOnly, isBatch]
          const crudRoutes:Array<TBatchHandlerRecord> = [
            {
              route: `${mapping.type}/:key`,
              verb: 'GET' as THttpMethod,
              func: regularResource.getRegularResource,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: true,
              isBatch: false,
            },
            {
              route: `${mapping.type}/:key`,
              verb: 'PUT',
              func: regularResource.createOrUpdateRegularResource,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: false,
              isBatch: false,
            },
            {
              route: `${mapping.type}/:key`,
              verb: 'PATCH',
              func: regularResource.patchRegularResource,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: false,
              isBatch: false,
            },
            {
              route: `${mapping.type}/:key`,
              verb: 'DELETE',
              func: regularResource.deleteRegularResource,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: false,
              isBatch: false,
            },
            {
              route: mapping.type,
              verb: 'GET',
              func: listResource.getListResource,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: true,
              isBatch: false,
            },
            // // a check operation to determine wether lists A is part of list B
            {
              route: `${mapping.type}/isPartOf`,
              verb: 'POST',
              func: listResource.isPartOf,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: true,
              isBatch: false,
            },
          ];

          const batchRoutes:Array<TBatchHandlerRecord> = [
            // [`${mapping.type}/batch`, 'PUT', batch.batchOperation, sriConfig, mapping, false, false, true],
            {
              route: `${mapping.type}/batch`,
              verb: 'PUT',
              func: batch.batchOperation,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: false,
              isBatch: true,
            },
            // [`${mapping.type}/batch`, 'POST', batch.batchOperation, sriConfig, mapping, false, false, true],
            {
              route: `${mapping.type}/batch`,
              verb: 'POST',
              func: batch.batchOperation,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: false,
              isBatch: true,
            },
            // [`${mapping.type}/batch_streaming`, 'PUT', batch.batchOperationStreaming, sriConfig, mapping, true, false, true],
            {
              route: `${mapping.type}/batch_streaming`,
              verb: 'PUT',
              func: batch.batchOperationStreaming,
              config: sriConfig,
              mapping,
              streaming: true,
              readOnly: false,
              isBatch: true,
            },
            // [`${mapping.type}/batch_streaming`, 'POST', batch.batchOperationStreaming, sriConfig, mapping, true, false, true],
            {
              route: `${mapping.type}/batch_streaming`,
              verb: 'POST',
              func: batch.batchOperationStreaming,
              config: sriConfig,
              mapping,
              streaming: true,
              readOnly: false,
              isBatch: true,
            },
          ];

          // TODO: check customRoutes have required fields and make sense ==> use json schema for validation

          mapping.customRoutes?.forEach((cr) => {
            const customMapping = _.cloneDeep(mapping);
            if (cr.alterMapping !== undefined) {
              cr.alterMapping(customMapping);
            } else {
              if (cr.transformRequest !== undefined) {
                customMapping.transformRequest.push(cr.transformRequest);
              }
              if (cr.transformResponse !== undefined) {
                customMapping.transformResponse.push(cr.transformResponse);
              }
            }

            cr.httpMethods.forEach((method) => {
              if (cr.like !== undefined) {
                const crudPath = mapping.type + cr.like;
                Object.assign(customMapping.query, cr.query);

                const likeMatches: TBatchHandlerRecord[] = crudRoutes.filter(
                  ({ route, verb }) => (route === crudPath && verb === method.toUpperCase()),
                );
                if (likeMatches.length === 0) {
                  console.log(`\nWARNING: customRoute like ${crudPath} - ${method} not found => ignored.\n`);
                } else {
                  const {
                    verb, func, streaming, readOnly,
                  } = likeMatches[0];
                  acc.push({
                    route: crudPath + cr.routePostfix,
                    verb,
                    func,
                    config: sriConfig,
                    mapping: customMapping,
                    streaming,
                    readOnly,
                    isBatch: false,
                  });
                }
              } else if (cr.streamingHandler !== undefined) {
                const { streamingHandler } = cr;
                acc.push({
                  route: mapping.type + cr.routePostfix,
                  verb: method.toUpperCase() as THttpMethod,
                  func:
                    async (phaseSyncer, tx:IDatabase<unknown>, sriRequest:TSriRequest,
                      mapping1) => {
                      if (sriRequest.isBatchPart) {
                        throw new SriError({ status: 400, errors: [{ code: 'streaming.not.allowed.in.batch', msg: 'Streaming mode cannot be used inside a batch.' }] });
                      }
                      if (cr.busBoy) {
                        try {
                          let busBoyConfig: any = {};
                          if (cr.busBoyConfig) {
                            busBoyConfig = _.cloneDeep(cr.busBoyConfig);
                          }
                          busBoyConfig.headers = sriRequest.headers;
                          const busBoy = new Busboy(busBoyConfig);
                          sriRequest.busBoy = busBoy;
                        } catch (err) {
                          throw new SriError({ status: 400, errors: [{ code: 'error.initialising.busboy', msg: `Error during initialisation of busboy: ${err}` }] });
                        }
                      }

                      if (cr.beforeStreamingHandler !== undefined) {
                        try {
                          const result = await cr.beforeStreamingHandler(
                            tx, sriRequest, customMapping,
                          );
                          if (result !== undefined) {
                            const { status, headers } = result;
                            headers.forEach(([k, v]) => {
                              if (sriRequest.setHeader) {
                                sriRequest.setHeader(k, v);
                              }
                            });
                            if (sriRequest.setStatus) {
                              sriRequest.setStatus(status);
                            }
                          }
                        } catch (err) {
                          if (err instanceof SriError || err?.__proto__?.constructor?.name === 'SriError') {
                            throw err;
                          } else {
                            throw new SriError({ status: 500, errors: [`${util.format(err)}`] });
                          }
                        }
                      }

                      let keepAliveTimer: NodeJS.Timer | null = null;
                      let stream;
                      const streamEndEmitter = new EventEmitter();
                      const streamDonePromise = pEvent(streamEndEmitter, 'done');

                      if (cr.binaryStream) {
                        stream = sriRequest.outStream;
                      } else {
                        if (sriRequest.setHeader) {
                          sriRequest.setHeader('Content-Type', 'application/json; charset=utf-8');
                        }
                        stream = new Stream.Readable({ objectMode: true });
                        stream._read = function () { };
                        const JsonStream = new JsonStreamStringify(stream);
                        JsonStream.pipe(sriRequest.outStream);
                        keepAliveTimer = setInterval(() => {
                          sriRequest.outStream.write(' ');
                          // flush outstream, otherwise an intermediate layer such as gzip compression
                          // might keep the keep-alive write in buffer and break the keep-alive mechanism
                          sriRequest.outStream.flush();
                        }, sriConfig.streamingKeepAliveTimeoutMillis || 20000);
                      }

                      sriRequest.outStream.on('close', () => streamEndEmitter.emit('done'));

                      const streamingHandlerPromise = streamingHandler(tx, sriRequest, stream);

                      // Wait till busboy handler are in place (can be done in
                      // beforeStreamingHandler or streamingHandler) before piping request
                      // to busBoy (otherwise events might get lost).
                      if (cr.busBoy) {
                        sriRequest.inStream.pipe(sriRequest.busBoy);
                      }

                      try {
                        await streamingHandlerPromise;
                      } finally {
                        if (keepAliveTimer !== null) {
                          clearInterval(keepAliveTimer);
                        }
                      }

                      if (cr.binaryStream) {
                        stream.end();
                      } else {
                        stream.push(null);
                      }

                      // wait until stream is ended
                      await streamDonePromise;

                      return { status: 200 };
                    },
                  config: sriConfig,
                  mapping: customMapping,
                  streaming: true,
                  readOnly: !!cr.readOnly,
                  isBatch: false,
                });
              } else if (cr.handler !== undefined) {
                const { handler } = cr;
                acc.push({
                  route: mapping.type + cr.routePostfix,
                  verb: method.toUpperCase() as THttpMethod,
                  func:
                    async (phaseSyncer, tx, sriRequest:TSriRequest, mapping) => {
                      await phaseSyncer.phase();
                      await phaseSyncer.phase();
                      await phaseSyncer.phase();
                      if (cr.beforeHandler !== undefined) {
                        await cr.beforeHandler(tx, sriRequest, customMapping);
                      }
                      await phaseSyncer.phase();
                      const result = await handler(tx, sriRequest, customMapping);
                      await phaseSyncer.phase();
                      await phaseSyncer.phase();
                      if (cr.afterHandler !== undefined) {
                        await cr.afterHandler(tx, sriRequest, customMapping, result);
                      }
                      await phaseSyncer.phase();
                      return result;
                    },
                  config: sriConfig,
                  mapping: customMapping,
                  streaming: false,
                  readOnly: !!cr.readOnly,
                  isBatch: false,
                });
              } else {
                throw new Error('No handlers defined');
              }
            });
          });

          acc.push(...batchRoutes);

          if (!mapping.onlyCustom) {
            acc.push(...crudRoutes);
          }

          return acc;
        },
        [] as Array<TBatchHandlerRecord>,
      );

    const sriServerInstance = {
        pgp,
        db,
        app,
    }

    // before registering routes in express, call startUp hook
    await applyHooks('start up', sriConfig.startUp || [], (f) => f(db, sriServerInstance) );

    // register individual routes in express
    batchHandlerMap.forEach(
      ({
        route, verb, func, config, mapping, streaming, readOnly, isBatch,
      }) => {
        // Also use phaseSyncedSettle like in batch to use same shared code,
        // has no direct added value in case of single request.
        debug('general', `registering route ${route} - ${verb} - ${readOnly}`);
        app[verb.toLowerCase()](route,
          emt.instrument(expressWrapper(dbR, dbW, func, config, mapping, streaming, isBatch, readOnly), 'express-wrapper'));
      },
    );

    // transform map with 'routes' to be usable in batch (translate and group by verb)
    sriConfig.batchHandlerMap = _.groupBy(
      batchHandlerMap.map(
        ({
          route, verb, func, config, mapping, streaming, readOnly, isBatch,
        }) => ({
          route: new Route(route), verb, func, config, mapping, streaming, readOnly, isBatch,
        }),
      ),
      (e) => e.verb,
    );

    app.get('/', (_req: Request, res: Response) => res.redirect('/resources'));

    /**
     * Sometimes one wants to do sri4node operations on its own API, but within the state
     * of the current transaction. Internal requests can be used for this purpose.
     * You provide similar input as a http request in a javascript object with the
     * database transaction to execute it on. The internal calls follow the same code path
     * as http requests (inclusive plugins like for example security checks or version tracking).
     *
     * @param internalReq
     * @returns
     */
    global.sri4node_internal_interface = async (internalReq: TInternalSriRequest) => {
      const match = batch.matchHref(internalReq.href, internalReq.verb);

      const sriRequest = generateSriRequest(
        undefined, undefined, undefined, match, undefined, undefined, internalReq,
      );

      await applyHooks('transform internal sriRequest',
        match.handler.config.transformInternalRequest || [],
        (f) => f(internalReq.dbT, sriRequest, internalReq.parentSriRequest),
        sriRequest);

      const result = await handleRequest(sriRequest, match.handler.func, match.handler.mapping);
      // we do a JSON stringify/parse cycle because certain fields like Date fields are expected
      // in string format instead of Date objects
      return JSON.parse(JSON.stringify(result));
    };

    // 2022-03-08 REMOVE gc-stats as the project is abandoned and will cause problems with node versions > 12
    // if (sriConfig.trackHeapMax === true) {
    //   app.get('/heap_max', (req, res) => {
    //     res.set('Content-Type', 'application/json');
    //     res.send({ maxHeapUsage });
    //   });
    // }

    console.log('___________________________ SRI4NODE INITIALIZATION DONE _____________________________');
    return sriServerInstance;
  } catch (err) {
    console.error('___________________________ SRI4NODE INITIALIZATION ERROR _____________________________');
    console.error(err);
    process.exit(1);
  }
}

/* express.js application, configuration for roa4node */
// export = // for typescript
export {
  configure,

  debug,
  error,
  SriError,

  queryUtils,
  mapUtils,
  schemaUtils,

  utils,
};

export * from './js/typeDefinitions';
