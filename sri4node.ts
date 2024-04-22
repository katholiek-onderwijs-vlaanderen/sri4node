/* eslint-disable import/first */
/*
  The core server for the REST api.
  It is configurable, and provides a simple framework for creating REST interfaces.
*/

import { Application, Request, Response } from "express";
import _ from "lodash";
import * as util from "util";

// import Ajv from "ajv";
// import addFormats from "ajv-formats";
import pgPromise from "pg-promise";

// External dependencies.
import compression from "compression";
import bodyParser from "body-parser";
import Route from "route-parser";
import pMap from "p-map";
import busboy from "busboy";
import EventEmitter from "events";
import pEvent from "p-event";
import httpContext from "express-http-context";
import shortid from "shortid";

import {
  generateSriRequest,
  sqlColumnNames,
  debug,
  error,
  pgInit,
  pgConnect,
  handleRequestDebugLog,
  checkSriConfigWithDbInformationSchema,
  tableFromMapping,
  typeToMapping,
  createDebugLogConfigObject,
  transformObjectToRow,
  pgExec,
  generatePgColumnSet,
  checkRequiredFields,
  installExpressMiddlewareTimer,
  resourceDefToResourceDefInternal,
  toArray,
  hrtimeToMilliseconds,
  addReferencingResources,
  transformRowToObject,
  urlToTypeAndKey,
  parseResource,
  installVersionIncTriggerOnTable,
  debugAnyChannelAllowed,
  createReadableStream,
  stringifyError,
  setServerTimingHdr,
  startTask,
  startTransaction,
  expressMiddlewareTimerReportToServerTiming,
  isLogChannelEnabled,
  typeToConfig,
  settleResultsToSriResults,
  isSriError,
} from "./js/common";
// import * as batch from "./js/batch";
import { prepareSQL } from "./js/queryObject";
import {
  TSriConfig,
  TSriRequestExternal,
  TSriRequestInternal,
  TSriRequestHandler,
  SriError,
  TBatchHandlerRecord,
  THttpMethod,
  TSriServerInstance,
  isLikeCustomRouteDefinition,
  isStreamingCustomRouteDefinition,
  TSriResult,
  TSriRequestHandlerForBatch,
  TSriInternalUtils,
  TSriRequestHandlerForPhaseSyncer,
  TPluginConfig,
  TSriInternalConfig,
  TResourceDefinitionInternal,
} from "./js/typeDefinitions";
import * as queryUtils from "./js/queryUtils";
import * as schemaUtils from "./js/schemaUtils";
import * as mapUtils from "./js/mapUtils";
import { getInformationSchema } from "./js/informationSchema";

import { phaseSyncedSettle } from "./js/phaseSyncedSettle";
import { applyHooks } from "./js/hooks";

import * as listResource from "./js/listResource";
import * as regularResource from "./js/regularResource";
import { overloadProtectionFactory } from "./js/overloadProtection";
import * as relationFilters from "./js/relationsFilter";
import { ServerResponse } from "http";

import { JsonStreamStringify } from "json-stream-stringify";

import * as pugTpl from "./js/docs/pugTemplates";
import { batchFactory } from "./js/batch";

/**
 * Force https in production
 */
function forceSecureSockets(req, res: Response, next) {
  const isHttps = req.headers["x-forwarded-proto"] === "https";
  if (
    !isHttps &&
    req.get("Host").indexOf("localhost") < 0 &&
    req.get("Host").indexOf("127.0.0.1") < 0
  ) {
    res.redirect(`https://${req.get("Host")}${req.url}`);
  } else {
    next();
  }
}

process.on("unhandledRejection", (err) => {
  console.log(err);
  throw err;
});

/**
 * Exposes a bunch of utility functions.
 */
const utils: TSriInternalConfig["utils"] = {
  // Utilities to run arbitrary SQL in validation, beforeupdate, afterupdate, etc..
  executeSQL: pgExec,
  prepareSQL,
  convertListResourceURLToSQL: listResource.getSQLFromListResource,
  addReferencingResources,

  // removed pgInit and pgResult, but kept pgConnect for now (in case someone wants to use the
  // db, dbW and/or dbR properties)
  // pgInit,
  pgConnect,

  // still here for backwards compatibility, in most cases we assume that using an
  // internalSriRequest would be sufficient
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
 * @param sriInternalConfig the config object
 */
async function configure(app: Application, sriConfig: TSriConfig): Promise<TSriServerInstance> {
  // make sure no x-powered-by header is being sent
  app.disable("x-powered-by");

  try {
    const extraOptions = {
      schema: sriConfig.databaseConnectionParameters.schema,
      monitor: sriConfig.enablePgMonitor === true,
      connectionInitSql: sriConfig.databaseConnectionParameters.connectionInitSql,
    };
    const pgp = pgInit(sriConfig.databaseLibraryInitOptions, extraOptions);

    const db = await pgConnect(pgp, sriConfig);
    const currentInformationSchema = await getInformationSchema(db, sriConfig);

    // if the db does not match, we can bail out early
    checkSriConfigWithDbInformationSchema(sriConfig, currentInformationSchema);

    /** An extension of the sriConfig object, with some added information that we need to use internally */
    const sriInternalConfig: TSriInternalConfig = {
      // some DEFAULTS, that may be overridden by sriConfig
      batchConcurrency: 4,
      bodyParserLimit: "5mb",
      // the actual sriConfig
      ...(_.cloneDeep(sriConfig) as TSriConfig),
      // properties that have a more specific format in the internal config
      resources: sriConfig.resources.map(resourceDefToResourceDefInternal),
      beforePhase: [
        ...toArray(sriConfig.beforePhase),
        regularResource.beforePhaseQueryByKey,
        regularResource.beforePhaseInsertUpdateDelete,
      ],
      // initialize undefined global hooks with empty list
      transformRequest: toArray(sriConfig.transformRequest),
      transformInternalRequest: toArray(sriConfig.transformInternalRequest),
      logdebug: createDebugLogConfigObject(sriConfig.logdebug),
      // and extra properties that are only valid for the internal config
      utils,
      db,
      // in future we'd want to support a separate read and write database by adding another
      // connection paramaters object to the config, and if it is filled in that can be the
      // separate read database
      dbR: db,
      dbW: db,
      informationSchema: currentInformationSchema,
      pgColumns: Object.fromEntries(
        sriConfig.resources
          .filter((resource) => !resource.onlyCustom)
          .map((resource) => {
            const { type } = resource;
            const table = tableFromMapping(typeToMapping(type, sriConfig.resources));
            const columns = JSON.parse(
              `[${sqlColumnNames(typeToMapping(type, sriConfig.resources))}]`,
            ).filter((cname) => !cname.startsWith("$$meta."));
            const dummyUpdateRow = transformObjectToRow(
              {},
              resource,
              false,
              currentInformationSchema,
            );

            const ret: TSriInternalConfig["pgColumns"]["/things"] = {
              insert: new pgp.helpers.ColumnSet(columns, { table }),
              update: generatePgColumnSet(
                [...new Set(["key", "$$meta.modified", ...Object.keys(dummyUpdateRow)])],
                type,
                table,
                currentInformationSchema,
                pgp,
              ),
              delete: generatePgColumnSet(
                ["key", "$$meta.modified", "$$meta.deleted"],
                type,
                table,
                currentInformationSchema,
                pgp,
              ),
            };

            return [table, ret];
          }),
      ),
      // will be filled in later (after some async operations to the DB)
      batchHandlerMap: { GET: [], POST: [], PUT: [], PATCH: [], DELETE: [] },
    };

    // before registering routes in express, call startUp hook
    await applyHooks("start up", sriInternalConfig.startUp || [], (f) => f(db, pgp));

    // Do automatic DB updates that are part of sri4node's standard behavior (like adding version triggers)
    await pMap(
      sriInternalConfig.resources,
      async (mapping) => {
        if (!mapping.onlyCustom) {
          const schema =
            sriInternalConfig.databaseConnectionParameters?.schema ||
            sriInternalConfig.databaseLibraryInitOptions?.schema;
          const schemaName = Array.isArray(schema) ? schema[0] : schema?.toString();
          await installVersionIncTriggerOnTable(
            sriInternalConfig.dbW,
            tableFromMapping(mapping),
            schemaName,
          );
        }
      },
      { concurrency: 1 },
    );

    const sri4node_loaded_plugins = new Map();

    const sri4nodeInstallPlugin = async (plugin: TPluginConfig) => {
      console.log(`Installing plugin ${util.inspect(plugin)}`);
      // load plugins with a uuid only once; backwards compatible with old system without uuid
      if (plugin.uuid !== undefined && sri4node_loaded_plugins.has(plugin.uuid)) {
        return;
      }

      await plugin.install(sriInternalConfig, sriInternalConfig.dbW);

      if (plugin.uuid !== undefined) {
        debug("general", `Loaded plugin ${plugin.uuid}.`, sriInternalConfig.logdebug);
        sri4node_loaded_plugins.set(plugin.uuid, plugin);
      }
    };

    if (sriInternalConfig.plugins !== undefined) {
      await pMap(
        sriInternalConfig.plugins,
        async (plugin) => {
          await sri4nodeInstallPlugin(plugin);
        },
        { concurrency: 1 },
      );
    }

    // set the overload protection as first middleware to drop requests as soon as possible
    const overloadProtection = overloadProtectionFactory(sriInternalConfig.overloadProtection);
    app.use(async (_req, res, next) => {
      if (overloadProtection.canAccept()) {
        next();
      } else {
        debug("overloadProtection", "DROPPED REQ", sriInternalConfig.logdebug);
        if (sriInternalConfig.overloadProtection?.retryAfter !== undefined) {
          res.set("Retry-After", sriInternalConfig.overloadProtection?.retryAfter.toString());
        }
        res.status(503).send([
          {
            code: "too.busy",
            msg: "The request could not be processed as the server is too busy right now. Try again later.",
          },
        ]);
      }
    });

    const emt = installExpressMiddlewareTimer(app);

    if (sriInternalConfig.forceSecureSockets) {
      // All URLs force SSL and allow cross origin access.
      app.use(forceSecureSockets);
    }

    app.use(emt.instrument(compression(), "mw-compression"));
    app.use(
      emt.instrument(
        bodyParser.json({ limit: sriInternalConfig.bodyParserLimit, strict: false }),
        "mw-bodyparser",
      ),
    );
    // use option 'strict: false' to allow also valid JSON like a single boolean

    /// 2023: docs were broken because __dirname does not exist in ESM modules,
    /// and we used pwd which is incorrect.
    /// In order to fix this, we stopped using static files stored relative to this file
    /// and instead hardcoded the few files (.pug and .css) we need for the docs
    /// inside the docs/pugTemplates.ts module
    const returnFileFromDocsStatic = (_req: Request, res: Response) => {
      res.write(pugTpl.staticFiles[_req.params.file]);
      res.end();
    };

    app.get("/docs/static/:file", returnFileFromDocsStatic);

    const middlewareErrorWrapper = (fun) => async (req, resp) => {
      try {
        await fun(req, resp);
      } catch (err) {
        error(
          "____________________________ E R R O R (middlewareErrorWrapper) ___________________________",
        );
        error(err);
        error("STACK:");
        error(err.stack);
        error(
          "___________________________________________________________________________________________",
        );
        resp.status(500).send(`Internal Server Error. [${stringifyError(err)}]`);
      }
    };

    app.put(
      "/log",
      middlewareErrorWrapper((req, resp) => {
        const err = req.body;
        console.log("Client side error :");
        err.stack.split("\n").forEach((line) => console.log(line));
        resp.end();
      }),
    );

    const getDocsExpressHandler = (req: Request, resp: Response) => {
      const typeToMappingMap = typeToConfig(sriInternalConfig.resources);
      const type = req.route.path
        .split("/")
        .slice(0, req.route.path.split("/").length - 1)
        .join("/");
      if (type in typeToMappingMap) {
        const mapping = typeToMappingMap[type];
        resp.locals.path = (req as Record<string, any>)._parsedUrl.pathname;
        // resp.render('resource', { resource: mapping, queryUtils });
        resp.write(pugTpl.resource({ resource: mapping, queryUtils }));
        resp.end();
      } else if (req.route.path === "/docs") {
        resp.write(pugTpl.index({ config: sriInternalConfig }));
        resp.end();
      } else {
        resp.status(404).send("Not Found");
      }
    };

    app.get("/docs", middlewareErrorWrapper(getDocsExpressHandler));
    app.get(
      "/resources",
      middlewareErrorWrapper((_req, resp) => {
        resp.set("Content-Type", "application/json");
        const resourcesToSend = {};
        sriInternalConfig.resources.forEach((resource) => {
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
      }),
    );

    /** An endpoint that allows us to overwrite the logging settings while the api is running */
    app.post("/setlogdebug", (req, resp, _next) => {
      sriInternalConfig.logdebug = createDebugLogConfigObject(req.body);
      resp.send("OK");
    });

    app.use(httpContext.middleware);
    // Run the context for each request. Assign a unique identifier to each request
    // also add the logdebug config
    app.use((req, res, next) => {
      // cfr. https://github.com/Jeff-Lewis/cls-hooked?tab=readme-ov-file#namespacebindemitteremitter
      httpContext.ns.bindEmitter(req);
      httpContext.ns.bindEmitter(res);
      let reqId: string | string[];
      if (req.headers["x-request-id"] !== undefined) {
        // if present use the id provided by heroku
        reqId = req.headers["x-request-id"];
      } else if (req.headers["x-amz-cf-id"] !== undefined) {
        // if present use the id provided by cloudfront
        reqId = req.headers["x-amz-cf-id"];
      } else {
        reqId = shortid.generate();
      }
      if (sriInternalConfig.id !== undefined) {
        reqId = `${sriInternalConfig.id}#${reqId}`;
      }
      httpContext.set("reqId", reqId);
      httpContext.set("logdebug", sriInternalConfig.logdebug);
      next();
    });

    sriInternalConfig.resources.map((mapping) => {
      if (!mapping.onlyCustom) {
        if (mapping.map?.key === undefined) {
          // add key if missing, needed for key offset paging
          mapping.map = {
            ...mapping.map,
            key: {} as any,
          };
        }
        checkRequiredFields(mapping, sriInternalConfig.informationSchema);

        if (mapping.query === undefined) {
          mapping.query = {};
        }

        // append relation filters if auto-detected a relation resource
        if (mapping.map.from && mapping.map.to) {
          // mapping.query.relationsFilter = mapping.query.relationsFilter(mapping.map.from, mapping.map.to);
          mapping.query = {
            ...mapping.query,
            ...relationFilters,
          };
        }

        /**
         * Handle GET /{type}/schema
         */
        const getSchema = (req, resp) => {
          const type = req.route.path
            .split("/")
            .slice(0, req.route.path.split("/").length - 1)
            .join("/");
          const mapping = typeToMapping(type, sriInternalConfig.resources);

          resp.set("Content-Type", "application/json");
          resp.send(mapping.schema);
        };

        // register schema for external usage. public.
        app.get(`${mapping.type}/schema`, middlewareErrorWrapper(getSchema));

        // register docs for this type
        app.get(`${mapping.type}/docs`, middlewareErrorWrapper(getDocsExpressHandler));
        app.get(`${mapping.type}/docs/static/:file`, returnFileFromDocsStatic);
      }
    });

    const batch = batchFactory(sriInternalConfig);

    const handleRequest = async (
      sriRequest: TSriRequestExternal | TSriRequestInternal,
      func: TSriRequestHandler,
      mapping: TResourceDefinitionInternal | null,
    ): Promise<TSriResult> => {
      const { dbT } = sriRequest;
      let result;
      if ((sriRequest as TSriRequestExternal).isBatchRequest) {
        result = await (func as TSriRequestHandlerForBatch)(
          sriRequest,
          sriInternalUtils,
          sriInternalConfig.informationSchema,
          overloadProtection,
        );
      } else {
        const job = [func as TSriRequestHandlerForPhaseSyncer, [dbT, sriRequest, mapping]] as const;

        [result] = settleResultsToSriResults(
          await phaseSyncedSettle(
            [job],
            {
              beforePhaseHooks: sriInternalConfig.beforePhase,
            },
            sriInternalConfig,
            sriInternalUtils,
          ),
        );
        if (isSriError(result)) {
          throw result;
        }

        if (sriRequest.streamStarted === undefined || !sriRequest.streamStarted()) {
          await applyHooks(
            "transform response",
            mapping?.transformResponse,
            (f) => f(dbT, sriRequest, result, sriInternalUtils),
            sriRequest,
          );
        }
      }
      return result;
    };

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
    const internalSriRequest = async (
      internalReq: Omit<TSriRequestInternal, "protocol" | "serverTiming">,
    ): Promise<TSriResult> => {
      const match = batch.matchHref(internalReq.href, internalReq.verb);

      const sriRequest: TSriRequestInternal = generateSriRequest(
        undefined,
        undefined,
        undefined,
        match,
        undefined,
        undefined,
        internalReq,
      ) as TSriRequestInternal;

      await applyHooks(
        "transform internal sriRequest",
        match.handler.config.transformInternalRequest || [],
        (f) => f(internalReq.dbT, sriRequest, internalReq.parentSriRequest),
        sriRequest,
      );

      const result = await handleRequest(sriRequest, match.handler.func, match.handler.mapping);
      // we do a JSON stringify/parse cycle because certain fields like Date fields are expected
      // in string format instead of Date objects
      return JSON.parse(JSON.stringify(result));
    };

    // so we can add it to every sriRequest via expressRequest.app.get('sriInternalRequest')
    const sriInternalUtils: TSriInternalUtils = {
      internalSriRequest,
    };

    const handleServerTiming = async (req, resp, sriRequest: TSriRequestExternal) => {
      const logEnabled = isLogChannelEnabled("server-timing", sriInternalConfig.logdebug);
      const hdrEnable = sriRequest.headers?.["request-server-timing"] !== undefined;
      let serverTiming = "";
      if ((logEnabled || hdrEnable) && sriRequest.serverTiming !== undefined) {
        expressMiddlewareTimerReportToServerTiming(req, resp, sriRequest);
        const notNullEntries = Object.entries(sriRequest.serverTiming).filter(
          ([_property, value]) => (value as number) > 0,
        );

        if (notNullEntries.length > 0) {
          serverTiming = notNullEntries
            .map(
              ([property, value]) =>
                `${property};dur=${(Math.round((value as number) * 100) / 100).toFixed(2)}`,
            )
            .join(", ");
          if (logEnabled) {
            debug("server-timing", serverTiming, sriInternalConfig.logdebug);
          }
          if (hdrEnable) {
            if (resp.headersSent) {
              // streaming mode
              (sriRequest.outStream as any).addTrailers({
                "Server-Timing": serverTiming,
              });
            } else {
              resp.set("Server-Timing", serverTiming);
            }
          }
        }
      }
    };

    /**
     * Inside the expressWrapper, we could use debug() without the need to pass the logdebug config.
     *
     * @param dbR
     * @param dbW
     * @param func
     * @param sriConfig
     * @param mapping
     * @param isStreamingRequest
     * @param isBatchRequest
     * @param readOnly0
     * @returns
     */
    const expressWrapper = (
      dbR,
      dbW,
      func: TSriRequestHandler,
      sriConfig: TSriInternalConfig,
      mapping: TResourceDefinitionInternal | null,
      isStreamingRequest: boolean,
      isBatchRequest: boolean,
      readOnly0: boolean,
    ) =>
      async function (req: Request, resp: Response, _next) {
        let t; //: IDatabase<unknown, pg.IClient> | ITask<unknown> | undefined = undefined;
        let endTask;
        let resolveTx;
        let rejectTx;
        let readOnly;
        const reqMsgStart = `${req.method} ${req.path}`;
        debug("requests", `${reqMsgStart} starting.`, sriInternalConfig.logdebug);

        const hrstart = process.hrtime();
        resp.on("finish", () => {
          const hrend = process.hrtime(hrstart);
          debug(
            "requests",
            `${reqMsgStart} took ${hrend[0] * 1000 + hrend[1] / 1000000} ms`,
            sriInternalConfig.logdebug,
          );
        });
        debug("trace", "Starting express wrapper", sriInternalConfig.logdebug);
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
          overloadProtection.startPipeline();

          const reqId = httpContext.get("reqId");
          if (reqId !== undefined) {
            resp.set("vsko-req-id", reqId);
          } else {
            console.log("no reqId ???");
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
            isBatchRequest,
            readOnly,
            mapping: mapping || undefined,
            isStreamingRequest,
            dbT: t,
            pgp,
          });
          setServerTimingHdr(
            sriRequest,
            "db-starttask",
            hrtimeToMilliseconds(hrElapsedStartTransaction),
          );

          req.on("close", (_err) => {
            sriRequest.reqCancelled = true;
          });

          if (t === undefined) {
            throw new SriError({
              status: 500,
              errors: ["Error during startTask/startTransaction"],
            });
          } else {
            await applyHooks(
              "transform request",
              sriConfig.transformRequest || [],
              (f) => f(req, sriRequest, t, sriInternalUtils),
              sriRequest,
            );

            setServerTimingHdr(sriRequest, "batch-routing", batchRoutingDuration);

            const result = await handleRequest(sriRequest, func, mapping);

            const terminateDb = async (error1, readOnly1) => {
              if (readOnly1 === true) {
                debug(
                  "db",
                  "++ Processing went OK. Closing database task. ++",
                  sriInternalConfig.logdebug,
                );
                await endTask();
              } else if (error1) {
                if (req.query.dryRun === "true") {
                  debug(
                    "db",
                    "++ Error during processing in dryRun mode. Rolling back database transaction.",
                    sriInternalConfig.logdebug,
                  );
                } else {
                  debug(
                    "db",
                    "++ Error during processing. Rolling back database transaction.",
                    sriInternalConfig.logdebug,
                  );
                }
                await rejectTx();
              } else if (req.query.dryRun === "true") {
                debug(
                  "db",
                  "++ Processing went OK in dryRun mode. Rolling back database transaction.",
                  sriInternalConfig.logdebug,
                );
                await rejectTx();
              } else {
                debug(
                  "db",
                  "++ Processing went OK. Committing database transaction.",
                  sriInternalConfig.logdebug,
                );
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
                resp.setHeader("Content-Type", "application/json; charset=utf-8");
                // VERSION WITH JSON STREAM
                // const writableJsonsStream = JSONStream.stringify(`{"$$meta": ${JSON.stringify(result.body.$$meta)}, "results":\n`, ',', '\n}');
                // writableJsonsStream.pipe(resp);
                // writableJsonsStream.write(result.body.results);
                // writableJsonsStream.end();

                // VERSION WHERE I SIMPLY PUT EACH ARRAY ITEM ON THE STREAM MYSELF (is this faster than JSONStream.striingify which seems slow looking at my first tests)
                if (result.body.$$meta) {
                  resp.write(`{"$$meta": ${JSON.stringify(result.body.$$meta)}, "results": [\n`);
                }
                const total = result.body.results.length;
                result.body.results.forEach((record, index) =>
                  resp.write(`${JSON.stringify(record)}${index + 1 < total ? "," : ""}\n`),
                );
                resp.write("]");
                // if result.body contains other properties, add them to the response as well
                Object.entries(result.body)
                  .filter(([key]) => !["$$meta", "results"].includes(key))
                  .forEach(([key, value]) => resp.write(`,\n"${key}": ${JSON.stringify(value)}`));
                resp.write("\n}");
                resp.end();
              } else if (result.body !== undefined) {
                resp.send(result.body);
              } else {
                resp.send();
              }
            }
            await applyHooks(
              "afterRequest",
              sriConfig.afterRequest || [],
              (f) => f(sriRequest),
              sriRequest,
            );
            if (sriConfig.logdebug && sriConfig.logdebug.statuses !== undefined) {
              setImmediate(() => {
                // use setImmediate to make sure also the last log messages are buffered before calling handleRequestDebugLog
                handleRequestDebugLog(result.status, sriInternalConfig.logdebug.statuses);
              });
            }
          }
        } catch (err) {
          await applyHooks(
            "errorHandler",
            sriConfig.errorHandler || [],
            (f) => f(sriRequest, err, sriInternalUtils),
            sriRequest,
          );

          // TODO: what with streaming errors
          if (t !== undefined) {
            // t will be null in case of error during startTask/startTransaction
            if (readOnly === true) {
              debug(
                "db",
                `++ Exception caught. Closing database task. ++\n${isSriError(err) ? JSON.stringify(err.body, null, 2) : err}`,
                sriInternalConfig.logdebug,
              );
              await endTask();
            } else {
              debug(
                "db",
                `++ Exception caught. Rolling back database transaction. ++\n${isSriError(err) ? JSON.stringify(err.body, null, 2) : err}`,
                sriInternalConfig.logdebug,
              );
              await rejectTx();
            }
          }

          if (resp.headersSent) {
            error(
              "____________________________ E R R O R (expressWrapper)____________________________________",
            );
            error(err);
            error(JSON.stringify(err, null, 2));
            error("STACK:");
            error(err.stack);
            error(
              "___________________________________________________________________________________________",
            );
            error("NEED TO DESTROY STREAMING REQ");
            resp.on("drain", async () => {
              await resp.destroy();
              error("[drain event] Stream is destroyed.");
            });
            resp.on("finish", async () => {
              await resp.destroy();
              error("[finish event] Stream is destroyed.");
            });
            resp.write(
              "\n\n\n____________________________ E R R O R (expressWrapper)____________________________________\n",
            );
            resp.write(err.toString());
            resp.write(JSON.stringify(err, null, 2));
            resp.write(
              "\n___________________________________________________________________________________________\n",
            );

            // keep sending data until the buffer is full, which will trigger a drain event,
            // at which point the stream will be destroyed instead of closing it gracefully
            // (because we want tosignal to the user that something went wrong, even if a
            // 200 OK header has already been sent)
            while (resp.write("       ")) {
              // do nothing besides writing some more
            }
          } else if (isSriError(err)) {
            if (err.status > 0) {
              const reqId = httpContext.get("reqId") as string;
              if (reqId !== undefined) {
                err.body.vskoReqId = reqId;
                err.headers["vsko-req-id"] = reqId;
              }
              resp.set(err.headers).status(err.status).send(err.body);
            }
          } else {
            error(
              "____________________________ E R R O R (expressWrapper)____________________________________",
            );
            error(err);
            error("STACK:");
            error(err.stack);
            error(
              "___________________________________________________________________________________________",
            );
            resp.status(500).send(`Internal Server Error. [${stringifyError(err)}]`);
          }
          if (sriConfig.logdebug && sriConfig.logdebug.statuses !== undefined) {
            setImmediate(() => {
              // use setImmediate to make sure also the last log messages are buffered before calling handleRequestDebugLog
              console.log("GOING TO CALL handleRequestDebugLog");
              handleRequestDebugLog(
                err.status ? err.status : 500,
                sriInternalConfig.logdebug.statuses,
              );
            });
          }
        } finally {
          overloadProtection.endPipeline();
        }
      };

    // temporarilty allow a global /batch via config option for samenscholing
    if (sriInternalConfig.enableGlobalBatch) {
      const globalBatchPath = `${
        sriInternalConfig.globalBatchRoutePrefix !== undefined
          ? sriInternalConfig.globalBatchRoutePrefix
          : ""
      }/batch`;
      debug(
        "general",
        `registering route ${globalBatchPath} - PUT/POST`,
        sriInternalConfig.logdebug,
      );
      debug(
        "general",
        `registering route ${`${globalBatchPath}_streaming`} - PUT/POST`,
        sriInternalConfig.logdebug,
      );
      app.put(
        globalBatchPath,
        expressWrapper(
          sriInternalConfig.dbR,
          sriInternalConfig.dbW,
          batch.batchOperation,
          sriInternalConfig,
          null,
          false,
          true,
          false,
        ),
      );
      app.post(
        globalBatchPath,
        expressWrapper(
          sriInternalConfig.dbR,
          sriInternalConfig.dbW,
          batch.batchOperation,
          sriInternalConfig,
          null,
          false,
          true,
          false,
        ),
      );

      app.put(
        `${globalBatchPath}_streaming`,
        expressWrapper(
          sriInternalConfig.dbR,
          sriInternalConfig.dbW,
          batch.batchOperationStreaming,
          sriInternalConfig,
          null,
          true,
          true,
          false,
        ),
      );
      app.post(
        `${globalBatchPath}_streaming`,
        expressWrapper(
          sriInternalConfig.dbR,
          sriInternalConfig.dbW,
          batch.batchOperationStreaming,
          sriInternalConfig,
          null,
          true,
          true,
          false,
        ),
      );
    }

    /**
     * array of objects with url, verb, handler and some other options
     * which can be called within a batch
     */
    const batchHandlerMap: Array<TBatchHandlerRecord> = sriInternalConfig.resources.reduce(
      (acc: Array<TBatchHandlerRecord>, mapping) => {
        // [path, verb, func, mapping, streaming, readOnly, isBatch]
        const crudRoutes: Array<TBatchHandlerRecord> = [
          {
            route: `${mapping.type}/:key`,
            verb: "GET" as THttpMethod,
            func: regularResource.getRegularResource,
            config: sriInternalConfig,
            mapping,
            streaming: false,
            readOnly: true,
            isBatch: false,
          },
          {
            route: `${mapping.type}/:key`,
            verb: "PUT",
            func: regularResource.createOrUpdateRegularResource,
            config: sriInternalConfig,
            mapping,
            streaming: false,
            readOnly: false,
            isBatch: false,
          },
          {
            route: `${mapping.type}/:key`,
            verb: "PATCH",
            func: regularResource.patchRegularResource,
            config: sriInternalConfig,
            mapping,
            streaming: false,
            readOnly: false,
            isBatch: false,
          },
          {
            route: `${mapping.type}/:key`,
            verb: "DELETE",
            func: regularResource.deleteRegularResource,
            config: sriInternalConfig,
            mapping,
            streaming: false,
            readOnly: false,
            isBatch: false,
          },
          {
            route: mapping.type,
            verb: "GET",
            func: listResource.getListResource,
            config: sriInternalConfig,
            mapping,
            streaming: false,
            readOnly: true,
            isBatch: false,
          },
          // // a check operation to determine wether lists A is part of list B
          {
            route: `${mapping.type}/isPartOf`,
            verb: "POST",
            func: listResource.isPartOf,
            config: sriInternalConfig,
            mapping,
            streaming: false,
            readOnly: true,
            isBatch: false,
          },
        ];

        const batchRoutes: Array<TBatchHandlerRecord> = [
          // [`${mapping.type}/batch`, 'PUT', batch.batchOperation, sriConfig, mapping, false, false, true],
          {
            route: `${mapping.type}/batch`,
            verb: "PUT",
            func: batch.batchOperation,
            config: sriInternalConfig,
            mapping,
            streaming: false,
            readOnly: false,
            isBatch: true,
          },
          // [`${mapping.type}/batch`, 'POST', batch.batchOperation, sriConfig, mapping, false, false, true],
          {
            route: `${mapping.type}/batch`,
            verb: "POST",
            func: batch.batchOperation,
            config: sriInternalConfig,
            mapping,
            streaming: false,
            readOnly: false,
            isBatch: true,
          },
          // [`${mapping.type}/batch_streaming`, 'PUT', batch.batchOperationStreaming, sriConfig, mapping, true, false, true],
          {
            route: `${mapping.type}/batch_streaming`,
            verb: "PUT",
            func: batch.batchOperationStreaming,
            config: sriInternalConfig,
            mapping,
            streaming: true,
            readOnly: false,
            isBatch: true,
          },
          // [`${mapping.type}/batch_streaming`, 'POST', batch.batchOperationStreaming, sriConfig, mapping, true, false, true],
          {
            route: `${mapping.type}/batch_streaming`,
            verb: "POST",
            func: batch.batchOperationStreaming,
            config: sriInternalConfig,
            mapping,
            streaming: true,
            readOnly: false,
            isBatch: true,
          },
        ];

        // TODO: check customRoutes have required fields and make sense ==> use json schema for validation

        mapping.customRoutes?.forEach((cr) => {
          const customMapping: TResourceDefinitionInternal = _.cloneDeep(mapping);
          if (
            isLikeCustomRouteDefinition(cr) &&
            "alterMapping" in cr &&
            cr.alterMapping !== undefined
          ) {
            cr.alterMapping(customMapping);
          } else if ("transformResponse" in cr && cr.transformResponse) {
            customMapping.transformResponse = [
              ...(customMapping.transformResponse || []),
              cr.transformResponse,
            ];
          }

          cr.httpMethods.forEach((method) => {
            if (isLikeCustomRouteDefinition(cr)) {
              const crudPath = mapping.type + cr.like;
              customMapping.query = {
                ...customMapping.query,
                ...cr.query,
              };

              const likeMatches: TBatchHandlerRecord[] = crudRoutes.filter(
                ({ route, verb }) => route === crudPath && verb === method.toUpperCase(),
              );
              if (likeMatches.length === 0) {
                console.log(
                  `\nWARNING: customRoute like ${crudPath} - ${method} not found => ignored.\n`,
                );
              } else {
                const { verb, func, streaming, readOnly } = likeMatches[0];
                acc.push({
                  route: crudPath + cr.routePostfix,
                  verb,
                  func,
                  config: sriInternalConfig,
                  mapping: customMapping,
                  streaming,
                  readOnly,
                  isBatch: false,
                });
              }
            } else if (isStreamingCustomRouteDefinition(cr)) {
              const { streamingHandler } = cr;
              acc.push({
                route: mapping.type + cr.routePostfix,
                verb: method.toUpperCase() as THttpMethod,
                func: async (
                  _phaseSyncer,
                  tx: pgPromise.IDatabase<unknown>,
                  sriRequest: TSriRequestExternal,
                  _mapping1,
                ) => {
                  if (sriRequest.isBatchPart) {
                    throw new SriError({
                      status: 400,
                      errors: [
                        {
                          code: "streaming.not.allowed.in.batch",
                          msg: "Streaming mode cannot be used inside a batch.",
                        },
                      ],
                    });
                  }
                  if (cr.busBoy) {
                    try {
                      sriRequest.busBoy = busboy({
                        ...cr.busBoyConfig,
                        headers: sriRequest.headers,
                      });
                    } catch (err) {
                      throw new SriError({
                        status: 400,
                        errors: [
                          {
                            code: "error.initialising.busboy",
                            msg: `Error during initialisation of busboy: ${err}`,
                          },
                        ],
                      });
                    }
                  }

                  if (cr.beforeStreamingHandler !== undefined) {
                    try {
                      const result = await cr.beforeStreamingHandler(
                        tx,
                        sriRequest,
                        customMapping,
                        sriInternalUtils,
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
                      if (isSriError(err)) {
                        throw err;
                      } else {
                        throw new SriError({ status: 500, errors: [`${util.format(err)}`] });
                      }
                    }
                  }

                  let keepAliveTimer: NodeJS.Timer | null = null;
                  let stream;
                  const streamEndEmitter = new EventEmitter();
                  const streamDonePromise = pEvent(streamEndEmitter, "done");

                  if (cr.binaryStream) {
                    stream = sriRequest.outStream;
                  } else {
                    if (sriRequest.setHeader) {
                      sriRequest.setHeader("Content-Type", "application/json; charset=utf-8");
                    }
                    stream = createReadableStream(true);
                    const JsonStream = new JsonStreamStringify(stream);
                    JsonStream.pipe(sriRequest.outStream);
                    // after an upgrade of JsonStreamStringify, we seem to have to call this
                    // to make sure the headers will be sent already (even if nothing is
                    // written to the stream yet)
                    sriRequest.outStream.write("");

                    keepAliveTimer = setInterval(() => {
                      sriRequest.outStream.write(" ");
                      // flush outstream, otherwise an intermediate layer such as gzip compression
                      // might keep the keep-alive write in buffer and break the keep-alive mechanism
                      // A cast to 'any' is needed to make typescript accept this; 'flush' is defined
                      // and added to ServerResponse by the 'compression' middleware:
                      // http://expressjs.com/en/resources/middleware/compression.html
                      if (sriRequest.outStream instanceof ServerResponse) {
                        (sriRequest.outStream as any).flush();
                      }
                    }, sriInternalConfig.streamingKeepAliveTimeoutMillis || 20000);
                  }

                  sriRequest.outStream.on("close", () => streamEndEmitter.emit("done"));

                  const streamingHandlerPromise = streamingHandler(
                    tx,
                    sriRequest,
                    stream,
                    sriInternalUtils,
                  );

                  // Wait till busboy handler are in place (can be done in
                  // beforeStreamingHandler or streamingHandler) before piping request
                  // to busBoy (otherwise events might get lost).
                  if (cr.busBoy && sriRequest.busBoy) {
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
                config: sriInternalConfig,
                mapping: customMapping,
                streaming: true,
                readOnly: method.toUpperCase() === "GET" ? true : !!cr.readOnly,
                isBatch: false,
              });
            } else if (cr.handler !== undefined) {
              const { handler } = cr;
              acc.push({
                route: mapping.type + cr.routePostfix,
                verb: method.toUpperCase() as THttpMethod,
                func: async (phaseSyncer, tx, sriRequest: TSriRequestExternal, _mapping) => {
                  await phaseSyncer.phase();
                  await phaseSyncer.phase();
                  await phaseSyncer.phase();
                  if (cr.beforeHandler !== undefined) {
                    await cr.beforeHandler(tx, sriRequest, customMapping, sriInternalUtils);
                  }
                  await phaseSyncer.phase();
                  const result = await handler(tx, sriRequest, customMapping, sriInternalUtils);
                  await phaseSyncer.phase();
                  await phaseSyncer.phase();
                  if (cr.afterHandler !== undefined) {
                    await cr.afterHandler(tx, sriRequest, customMapping, result, sriInternalUtils);
                  }
                  await phaseSyncer.phase();
                  return result;
                },
                config: sriInternalConfig,
                mapping: customMapping,
                streaming: false,
                readOnly: method.toUpperCase() === "GET" ? true : !!cr.readOnly,
                isBatch: false,
              });
            } else {
              throw new Error("No handlers defined");
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

    /** THIS WILL BE THE RETURN VALUE !!! */
    const sriServerInstance = {
      pgp,
      db,
      app,
      // informationSchema: currentInformationSchema, // maybe later

      close: async () => {
        // we don't install plugins with the same uuid twice, so we also don't close them twice!
        if (Array.isArray(sriInternalConfig.plugins)) {
          const alreadyClosed = new Set<string>();
          await pMap(
            sriInternalConfig.plugins,
            async (plugin) => {
              if (plugin.close) {
                try {
                  if (!plugin.uuid || !alreadyClosed.has(plugin.uuid)) {
                    await plugin.close(sriInternalConfig, sriInternalConfig.dbW);
                  }
                } catch (err) {
                  console.error(`Error closing plugin ${plugin.uuid}: ${err}`);
                } finally {
                  if (plugin.uuid) {
                    alreadyClosed.add(plugin.uuid);
                  }
                }
              }
            },
            { concurrency: 1 },
          );
        }

        db && (await db.$pool.end());
      },
    };

    // register individual routes in express
    batchHandlerMap.forEach(
      ({ route, verb, func, config, mapping, streaming, readOnly, isBatch }) => {
        // Also use phaseSyncedSettle like in batch to use same shared code,
        // has no direct added value in case of single request.
        debug(
          "general",
          `registering route ${route} - ${verb} - ${readOnly}`,
          sriInternalConfig.logdebug,
        );
        app[verb.toLowerCase()](
          route,
          emt.instrument(
            expressWrapper(
              sriInternalConfig.dbR,
              sriInternalConfig.dbW,
              func,
              config,
              mapping,
              streaming,
              isBatch,
              readOnly,
            ),
            "express-wrapper",
          ),
        );
      },
    );

    // transform map with 'routes' to be usable in batch (translate and group by verb)
    // TODO: do not modify the sriConfig provided to us by the user!
    sriInternalConfig.batchHandlerMap = _.groupBy(
      batchHandlerMap.map(
        ({ route, verb, func, config, mapping, streaming, readOnly, isBatch }) => ({
          route: new Route(route),
          verb,
          func,
          config,
          mapping,
          streaming,
          readOnly,
          isBatch,
        }),
      ),
      ({ verb }) => verb,
    ) as unknown as TSriInternalConfig["batchHandlerMap"];

    app.get("/", (_req: Request, res: Response) => res.redirect("/resources"));

    console.log(
      "___________________________ SRI4NODE INITIALIZATION DONE _____________________________",
    );
    return sriServerInstance;
  } catch (err) {
    console.error(
      "___________________________ SRI4NODE INITIALIZATION ERROR _____________________________",
    );
    console.error(err);
    process.exit(1);
  }
}

/* express.js application, configuration for roa4node */
// export = // for typescript
export {
  configure,
  /**
   * @deprecated
   * This function depends on the configuration object, which is not available before
   * configure() has been called. Hence it should be removed here, and put in the
   * sri4nodeServerInstance object that is returned by configure() or passed
   * as part of every sriRequest, so it can be called whenever needed.
   */
  debugAnyChannelAllowed as debug,
  /** @deprecated
   * Similar to debug, this function should be removed from here and put in the
   * sri4nodeServerInstance object that is returned by configure() or passed
   * as part of every sriRequest, so it can be called whenever needed.
   * It uses express-http-context in order to get the request id, which also feels like
   * magic that should be avoided.
   */
  error,
  queryUtils,
  mapUtils,
  schemaUtils,
  utils,
};

export * from "./js/typeDefinitions";
