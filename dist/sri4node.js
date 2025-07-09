"use strict";
/* eslint-disable import/first */
/*
  The core server for the REST api.
  It is configurable, and provides a simple framework for creating REST interfaces.
*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = exports.schemaUtils = exports.mapUtils = exports.queryUtils = exports.error = exports.debug = exports.configure = void 0;
const lodash_1 = __importDefault(require("lodash"));
const util = __importStar(require("util"));
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
// External dependencies.
const compression_1 = __importDefault(require("compression"));
const body_parser_1 = __importDefault(require("body-parser"));
const route_parser_1 = __importDefault(require("route-parser"));
const p_map_1 = __importDefault(require("p-map"));
const busboy_1 = __importDefault(require("busboy"));
const events_1 = __importDefault(require("events"));
const p_event_1 = __importDefault(require("p-event"));
const express_http_context_1 = __importDefault(require("express-http-context"));
const shortid_1 = __importDefault(require("shortid"));
const common_1 = require("./js/common");
Object.defineProperty(exports, "error", { enumerable: true, get: function () { return common_1.error; } });
Object.defineProperty(exports, "debug", { enumerable: true, get: function () { return common_1.debugAnyChannelAllowed; } });
const batch = __importStar(require("./js/batch"));
const queryObject_1 = require("./js/queryObject");
const typeDefinitions_1 = require("./js/typeDefinitions");
const queryUtils = __importStar(require("./js/queryUtils"));
exports.queryUtils = queryUtils;
const schemaUtils = __importStar(require("./js/schemaUtils"));
exports.schemaUtils = schemaUtils;
const mapUtils = __importStar(require("./js/mapUtils"));
exports.mapUtils = mapUtils;
const informationSchema_1 = require("./js/informationSchema");
const phaseSyncedSettle_1 = require("./js/phaseSyncedSettle");
const hooks_1 = require("./js/hooks");
const listResource = __importStar(require("./js/listResource"));
const regularResource = __importStar(require("./js/regularResource"));
const utilLib = __importStar(require("./js/utilLib"));
const overloadProtection_1 = require("./js/overloadProtection");
const relationFilters = __importStar(require("./js/relationsFilter"));
const http_1 = require("http");
const json_stream_stringify_1 = require("json-stream-stringify");
const pugTpl = __importStar(require("./js/docs/pugTemplates"));
const ajv = new ajv_1.default({
    // 2023-10: do not enable strict yet as it might break existing api's
    // (for example: an object with 'properties' & 'required', but missing type: 'object'
    // would suddenly fail because it is strictly speaking invalid json-schema)
    // strict: true,
    logger: {
        log: (output) => {
            (0, common_1.debug)("general", output);
        },
        warn: (output) => {
            (0, common_1.debug)("general", output);
        },
        error: console.error,
    },
});
(0, ajv_formats_1.default)(ajv);
/**
 * 'coerceTypes' will not care about the type if it can be cast to the type in the schema
 * (for example a number can be cast to a string)
 * This is currently used to check the query parameter values in a url, because we don't
 * have the proper url parser (that creates a parse tree) yet, which would allow us to
 * actually parse a url into the right types.
 * So as long as that is not finished, we need to be less strict about the query params.
 */
const ajvWithCoerceTypes = new ajv_1.default({
    strict: true,
    coerceTypes: true,
});
(0, ajv_formats_1.default)(ajvWithCoerceTypes);
/**
 * Force https in production
 */
function forceSecureSockets(req, res, next) {
    const isHttps = req.headers["x-forwarded-proto"] === "https";
    if (!isHttps &&
        req.get("Host").indexOf("localhost") < 0 &&
        req.get("Host").indexOf("127.0.0.1") < 0) {
        res.redirect(`https://${req.get("Host")}${req.url}`);
    }
    else {
        next();
    }
}
/**
 * Handle GET /{type}/schema
 */
function getSchema(req, resp) {
    const type = req.route.path
        .split("/")
        .slice(0, req.route.path.split("/").length - 1)
        .join("/");
    const mapping = (0, common_1.typeToMapping)(type);
    resp.set("Content-Type", "application/json");
    resp.send(mapping.schema);
}
/**
 * Handle GET /docs and /{type}/docs
 */
function getDocs(req, resp) {
    const typeToMappingMap = (0, common_1.typeToConfig)(global.sri4node_configuration.resources);
    const type = req.route.path
        .split("/")
        .slice(0, req.route.path.split("/").length - 1)
        .join("/");
    if (type in typeToMappingMap) {
        const mapping = typeToMappingMap[type];
        resp.locals.path = req._parsedUrl.pathname;
        // resp.render('resource', { resource: mapping, queryUtils });
        resp.write(pugTpl.resource({ resource: mapping, queryUtils }));
        resp.end();
    }
    else if (req.route.path === "/docs") {
        // resp.render('index', { config: global.sri4node_configuration });
        resp.write(pugTpl.index({ config: global.sri4node_configuration }));
        resp.end();
    }
    else {
        resp.status(404).send("Not Found");
    }
}
const getResourcesOverview = (_req, resp) => {
    resp.set("Content-Type", "application/json");
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
    const table = (0, common_1.tableFromMapping)(mapping);
    const idx = mapping.type;
    if (!information[idx]) {
        throw new Error(`Table '${table}' seems to be missing in the database.`);
    }
    const mandatoryFields = ["key", "$$meta.created", "$$meta.modified", "$$meta.deleted"];
    mandatoryFields.forEach((field) => {
        if (!(field in information[idx])) {
            throw new Error(`Mapping '${mapping.type}' lacks mandatory field '${field}'`);
        }
    });
}
const middlewareErrorWrapper = (fun) => (req, resp) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield fun(req, resp);
    }
    catch (err) {
        (0, common_1.error)("____________________________ E R R O R (middlewareErrorWrapper) ___________________________");
        (0, common_1.error)(err);
        (0, common_1.error)("STACK:");
        (0, common_1.error)(err.stack);
        (0, common_1.error)("___________________________________________________________________________________________");
        resp.status(500).send(`Internal Server Error. [${(0, common_1.stringifyError)(err)}]`);
    }
});
process.on("unhandledRejection", (err) => {
    console.log(err);
    throw err;
});
const handleRequest = (sriRequest, func, mapping) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { dbT } = sriRequest;
    let result;
    if (sriRequest.isBatchRequest) {
        result = yield func(sriRequest, global.sriInternalUtils);
    }
    else {
        const job = [
            func,
            [dbT, sriRequest, mapping, global.sriInternalUtils],
        ];
        [result] = (0, common_1.settleResultsToSriResults)(yield (0, phaseSyncedSettle_1.phaseSyncedSettle)([job], {
            beforePhaseHooks: global.sri4node_configuration.beforePhase,
        }));
        if (result instanceof typeDefinitions_1.SriError || ((_b = (_a = result === null || result === void 0 ? void 0 : result.__proto__) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name) === "SriError") {
            throw result;
        }
        if (sriRequest.streamStarted === undefined || !sriRequest.streamStarted()) {
            yield (0, hooks_1.applyHooks)("transform response", mapping === null || mapping === void 0 ? void 0 : mapping.transformResponse, (f) => f(dbT, sriRequest, result), sriRequest);
        }
    }
    return result;
});
const handleServerTiming = (req, resp, sriRequest) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    const logEnabled = (0, common_1.isLogChannelEnabled)("server-timing");
    const hdrEnable = ((_c = sriRequest.headers) === null || _c === void 0 ? void 0 : _c["request-server-timing"]) !== undefined;
    let serverTiming = "";
    if ((logEnabled || hdrEnable) && sriRequest.serverTiming !== undefined) {
        (0, common_1.emtReportToServerTiming)(req, resp, sriRequest);
        const notNullEntries = Object.entries(sriRequest.serverTiming).filter(([_property, value]) => value > 0);
        if (notNullEntries.length > 0) {
            serverTiming = notNullEntries
                .map(([property, value]) => `${property};dur=${(Math.round(value * 100) / 100).toFixed(2)}`)
                .join(", ");
            if (logEnabled) {
                (0, common_1.debug)("server-timing", serverTiming);
            }
            if (hdrEnable) {
                if (resp.headersSent) {
                    // streaming mode
                    sriRequest.outStream.addTrailers({
                        "Server-Timing": serverTiming,
                    });
                }
                else {
                    resp.set("Server-Timing", serverTiming);
                }
            }
        }
    }
});
const expressWrapper = (dbR, dbW, func, sriConfig, mapping, isStreamingRequest, isBatchRequest, readOnly0) => function (req, resp, _next) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        let t = null;
        let endTask;
        let resolveTx;
        let rejectTx;
        let readOnly;
        const reqMsgStart = `${req.method} ${req.originalUrl}`;
        (0, common_1.debug)("requests", `${reqMsgStart} starting.`);
        const hrstart = process.hrtime();
        resp.on("finish", () => {
            const hrend = process.hrtime(hrstart);
            const ms = hrend[0] * 1000 + hrend[1] / 1e6;
            (0, common_1.debug)("requests", `${reqMsgStart} took ${ms.toFixed(2)} ms`);
        });
        (0, common_1.debug)("trace", "Starting express wrapper");
        let sriRequest;
        try {
            let batchRoutingDuration = 0;
            if (isBatchRequest) {
                // evaluate batch body now to know wether the batch is completetly read-only
                // and do early error detecion
                const hrStart2 = process.hrtime();
                batch.matchBatch(req);
                const hrDuration = process.hrtime(hrStart2);
                batchRoutingDuration = (0, common_1.hrtimeToMilliseconds)(hrDuration);
                const mapReadOnly = (a) => {
                    if (Array.isArray(a)) {
                        return a.map(mapReadOnly);
                    }
                    return a.match.handler.readOnly;
                };
                readOnly = lodash_1.default.flatten((_a = req.body) === null || _a === void 0 ? void 0 : _a.map(mapReadOnly)).every((e) => e);
            }
            else {
                readOnly = readOnly0;
            }
            global.overloadProtection.startPipeline();
            const reqId = express_http_context_1.default.get("reqId");
            if (reqId !== undefined) {
                resp.set("vsko-req-id", reqId);
            }
            else {
                console.log("no reqId ???");
            }
            // Before creating the inital SriRequest object, we need to generate a task/transaction !!!
            const hrStartStartTransaction = process.hrtime();
            if (readOnly === true) {
                ({ t, endTask } = yield (0, common_1.startTask)(dbR));
            }
            else {
                ({ tx: t, resolveTx, rejectTx } = yield (0, common_1.startTransaction)(dbW));
            }
            const hrElapsedStartTransaction = process.hrtime(hrStartStartTransaction);
            sriRequest = (0, common_1.generateSriRequest)(req, resp, {
                isBatchRequest,
                readOnly,
                mapping: mapping || undefined,
                isStreamingRequest,
                dbT: t,
            });
            (0, common_1.setServerTimingHdr)(sriRequest, "db-starttask", (0, common_1.hrtimeToMilliseconds)(hrElapsedStartTransaction));
            req.on("close", (_err) => {
                sriRequest.reqCancelled = true;
            });
            yield (0, hooks_1.applyHooks)("transform request", sriConfig.transformRequest || [], (f) => f(req, sriRequest, t), sriRequest);
            (0, common_1.setServerTimingHdr)(sriRequest, "batch-routing", batchRoutingDuration);
            const result = yield handleRequest(sriRequest, func, mapping);
            const terminateDb = (error1, readOnly1) => __awaiter(this, void 0, void 0, function* () {
                if (readOnly1 === true) {
                    (0, common_1.debug)("db", "++ Processing went OK. Closing database task. ++");
                    yield endTask();
                }
                else if (error1) {
                    if (req.query.dryRun === "true") {
                        (0, common_1.debug)("db", "++ Error during processing in dryRun mode. Rolling back database transaction.");
                    }
                    else {
                        (0, common_1.debug)("db", "++ Error during processing. Rolling back database transaction.");
                    }
                    yield rejectTx();
                }
                else if (req.query.dryRun === "true") {
                    (0, common_1.debug)("db", "++ Processing went OK in dryRun mode. Rolling back database transaction.");
                    yield rejectTx();
                }
                else {
                    (0, common_1.debug)("db", "++ Processing went OK. Committing database transaction.");
                    yield resolveTx();
                }
            });
            if (resp.headersSent) {
                // we are in streaming mode
                if (result.status < 300) {
                    yield terminateDb(false, readOnly);
                }
                else {
                    yield terminateDb(true, readOnly);
                }
                yield handleServerTiming(req, resp, sriRequest);
                (_b = sriRequest.outStream) === null || _b === void 0 ? void 0 : _b.end();
            }
            else {
                if (result.status < 300) {
                    yield terminateDb(false, readOnly);
                }
                else {
                    yield terminateDb(true, readOnly);
                }
                yield handleServerTiming(req, resp, sriRequest);
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
                    result.body.results.forEach((record, index) => resp.write(`${JSON.stringify(record)}${index + 1 < total ? "," : ""}\n`));
                    resp.write("]");
                    // if result.body contains other properties, add them to the response as well
                    Object.entries(result.body)
                        .filter(([key]) => !["$$meta", "results"].includes(key))
                        .forEach(([key, value]) => resp.write(`,\n"${key}": ${JSON.stringify(value)}`));
                    resp.write("\n}");
                    resp.end();
                }
                else if (result.body !== undefined) {
                    resp.send(result.body);
                }
                else {
                    resp.send();
                }
            }
            yield (0, hooks_1.applyHooks)("afterRequest", sriConfig.afterRequest || [], (f) => f(sriRequest), sriRequest);
            if (global.sri4node_configuration.logdebug &&
                global.sri4node_configuration.logdebug.statuses !== undefined) {
                setImmediate(() => {
                    // use setImmediate to make sure also the last log messages are buffered before calling handleRequestDebugLog
                    (0, common_1.handleRequestDebugLog)(result.status);
                });
            }
        }
        catch (err) {
            yield (0, hooks_1.applyHooks)("errorHandler", sriConfig.errorHandler || [], (f) => f(sriRequest, err), sriRequest);
            // TODO: what with streaming errors
            if (t != null) {
                // t will be null in case of error during startTask/startTransaction
                if (readOnly === true) {
                    (0, common_1.debug)("db", "++ Exception caught. Closing database task. ++");
                    yield endTask();
                }
                else {
                    (0, common_1.debug)("db", "++ Exception caught. Rolling back database transaction. ++");
                    yield rejectTx();
                }
            }
            if (resp.headersSent) {
                (0, common_1.error)("____________________________ E R R O R (expressWrapper)____________________________________");
                (0, common_1.error)(err);
                (0, common_1.error)(JSON.stringify(err, null, 2));
                (0, common_1.error)("STACK:");
                (0, common_1.error)(err.stack);
                (0, common_1.error)("___________________________________________________________________________________________");
                (0, common_1.error)("NEED TO DESTROY STREAMING REQ");
                resp.on("drain", () => __awaiter(this, void 0, void 0, function* () {
                    yield resp.destroy();
                    (0, common_1.error)("[drain event] Stream is destroyed.");
                }));
                resp.on("finish", () => __awaiter(this, void 0, void 0, function* () {
                    yield resp.destroy();
                    (0, common_1.error)("[finish event] Stream is destroyed.");
                }));
                resp.write("\n\n\n____________________________ E R R O R (expressWrapper)____________________________________\n");
                resp.write(err.toString());
                resp.write(JSON.stringify(err, null, 2));
                resp.write("\n___________________________________________________________________________________________\n");
                // keep sending data until the buffer is full, which will trigger a drain event,
                // at which point the stream will be destroyed instead of closing it gracefully
                // (because we want tosignal to the user that something went wrong, even if a
                // 200 OK header has already been sent)
                while (resp.write("       ")) {
                    // do nothing besides writing some more
                }
            }
            else if (err instanceof typeDefinitions_1.SriError || ((_d = (_c = err === null || err === void 0 ? void 0 : err.__proto__) === null || _c === void 0 ? void 0 : _c.constructor) === null || _d === void 0 ? void 0 : _d.name) === "SriError") {
                if (err.status > 0) {
                    const reqId = express_http_context_1.default.get("reqId");
                    if (reqId !== undefined) {
                        err.body.vskoReqId = reqId;
                        err.headers["vsko-req-id"] = reqId;
                    }
                    resp.set(err.headers).status(err.status).send(err.body);
                }
            }
            else {
                (0, common_1.error)("____________________________ E R R O R (expressWrapper)____________________________________");
                (0, common_1.error)(err);
                (0, common_1.error)("STACK:");
                (0, common_1.error)(err.stack);
                (0, common_1.error)("___________________________________________________________________________________________");
                resp.status(500).send(`Internal Server Error. [${(0, common_1.stringifyError)(err)}]`);
            }
            if (global.sri4node_configuration.logdebug &&
                global.sri4node_configuration.logdebug.statuses !== undefined) {
                setImmediate(() => {
                    // use setImmediate to make sure also the last log messages are buffered before calling handleRequestDebugLog
                    console.log("GOING TO CALL handleRequestDebugLog");
                    (0, common_1.handleRequestDebugLog)(err.status ? err.status : 500);
                });
            }
        }
        finally {
            global.overloadProtection.endPipeline();
        }
    });
};
const toArray = (resource, name) => {
    // makes the property <name> of object <resource> an array
    if (resource[name] === undefined) {
        resource[name] = [];
    }
    else if (resource[name] === null) {
        console.log(`WARNING: handler '${name}' was set to 'null' -> assume []`);
        resource[name] = [];
    }
    else if (!Array.isArray(resource[name])) {
        resource[name] = [resource[name]];
    }
};
/**
 * Exposes a bunch of utility functions.
 */
const utils = {
    // Utilities to run arbitrary SQL in validation, beforeupdate, afterupdate, etc..
    executeSQL: common_1.pgExec,
    prepareSQL: queryObject_1.prepareSQL,
    convertListResourceURLToSQL: listResource.getSQLFromListResource,
    addReferencingResources: utilLib.addReferencingResources,
    // removed pgInit and pgResult, but kept pgConnect for now (in case someoine wants to use the
    // db, dbW and/or dbR properties)
    pgConnect: common_1.pgConnect,
    // still here for backwards compatibility, in most cases we assume that using an
    // internalSriRerquest would be sufficient
    transformRowToObject: common_1.transformRowToObject,
    transformObjectToRow: common_1.transformObjectToRow,
    typeToMapping: common_1.typeToMapping,
    tableFromMapping: common_1.tableFromMapping,
    urlToTypeAndKey: common_1.urlToTypeAndKey,
    parseResource: common_1.parseResource, // should be deprecated in favour of a decent url parsing mechanism
};
exports.utils = utils;
/**
 * The main function that configures an sri4node api on top of an existing express app,
 * and based on an sriConfig object
 * @param app express application
 * @param sriConfig the config object
 */
function configure(app, sriConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        // make sure no x-powered-by header is being sent
        app.disable("x-powered-by");
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
                [
                    "beforeRead",
                    "afterRead",
                    "beforeUpdate",
                    "afterUpdate",
                    "beforeInsert",
                    "afterInsert",
                    "beforeDelete",
                    "afterDelete",
                    "customRoutes",
                    "transformResponse",
                ].forEach((name) => toArray(resource, name));
                // for backwards compability set listResultDefaultIncludeCount default to true
                if (resource.listResultDefaultIncludeCount === undefined) {
                    resource.listResultDefaultIncludeCount = true;
                }
            });
            // initialize undefined global hooks with empty list
            ["beforePhase", "transformRequest", "transformInternalRequest"].forEach((name) => toArray(sriConfig, name));
            sriConfig.beforePhase = [
                ...(sriConfig.beforePhase || []),
                regularResource.beforePhaseQueryByKey,
            ];
            sriConfig.beforePhase = [
                ...(sriConfig.beforePhase || []),
                regularResource.beforePhaseInsertUpdateDelete,
            ];
            if (sriConfig.bodyParserLimit === undefined) {
                sriConfig.bodyParserLimit = "5mb";
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
                            var _a, _b, _c;
                            if (((_b = (_a = resourceDefinition.map) === null || _a === void 0 ? void 0 : _a[key]) === null || _b === void 0 ? void 0 : _b.references) !== undefined &&
                                resourceDefinition.query &&
                                ((_c = resourceDefinition.query) === null || _c === void 0 ? void 0 : _c[key]) === undefined) {
                                resourceDefinition.query[key] = queryUtils.filterReferencedType(resourceDefinition.map[key].references, key);
                            }
                        });
                    }
                    // TODO: what with custom stuff ?
                    //  e.g content-api with attachments / security/query
                    // TODO: implement a better way to determine key type!!
                    if (resourceDefinition.schema === undefined) {
                        throw new Error(`Schema definition is missing for '${resourceDefinition.type}' !`);
                    }
                    const keyPropertyDefinition = (0, common_1.findPropertyInJsonSchema)(resourceDefinition.schema, "key");
                    if (keyPropertyDefinition === null) {
                        throw new Error(`Key is not defined in the schema of '${resourceDefinition.type}' !`);
                    }
                    if (keyPropertyDefinition.pattern === schemaUtils.guid("foo").pattern) {
                        resourceDefinition.singleResourceRegex = new RegExp(`^${resourceDefinition.type}/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$`);
                    }
                    else if (keyPropertyDefinition.type === schemaUtils.numeric("foo").type) {
                        resourceDefinition.singleResourceRegex = new RegExp(`^${resourceDefinition.type}/([0-9]+)$`);
                    }
                    else if (keyPropertyDefinition.type === schemaUtils.string("foo").type) {
                        resourceDefinition.singleResourceRegex = new RegExp(`^${resourceDefinition.type}/(\\w+)$`);
                    }
                    else {
                        throw new Error(`Key type of resource ${resourceDefinition.type} unknown!`);
                    }
                    resourceDefinition.listResourceRegex = new RegExp(`^${resourceDefinition.type}(?:[?#]\\S*)?$`);
                    // TODO: add descent type!
                    try {
                        // Compile the JSON schema to see if there are errors + store it for later usage
                        (0, common_1.debug)("general", `Going to compile JSON schema of ${resourceDefinition.type}`);
                        // validateKey is used with express request params which are always strings,
                        // so the schema needs to be checked without complaining about the fact that
                        // it is a string, even when key is defined asa number for example
                        resourceDefinition.validateKey = ajvWithCoerceTypes.compile(keyPropertyDefinition);
                        resourceDefinition.validateSchema = ajv.compile(resourceDefinition.schema);
                    }
                    catch (err) {
                        console.error("===============================================================");
                        console.error(`Compiling JSON schema of ${resourceDefinition.type} failed:`);
                        console.error("");
                        console.error(`Schema: ${JSON.stringify(resourceDefinition.schema, null, 2)}`);
                        console.error("");
                        console.error(`Error: ${err.message}`);
                        console.error("===============================================================");
                        process.exit(1);
                    }
                }
            });
            sriConfig.resources.forEach((mapping) => {
                if (mapping.metaType === undefined) {
                    (0, common_1.error)(`WARNING: metaType missing for resource ${mapping.type}`);
                    mapping.metaType = "NOT SPECIFIED";
                }
            });
            sriConfig.utils = utils;
            if (sriConfig.batchConcurrency === undefined) {
                sriConfig.batchConcurrency = 4;
            }
            if (sriConfig.logdebug !== undefined) {
                sriConfig.logdebug = (0, common_1.createDebugLogConfigObject)(sriConfig.logdebug);
            }
            global.sri4node_configuration = sriConfig; // share configuration with other modules
            // in futre we'd want to support a separate read and write datrabase by adding another
            // connection paramaters object toi the config, and if it is filled in that can be the
            // separate read database
            const db = yield (0, common_1.pgConnect)(sriConfig);
            const dbR = db;
            const dbW = db;
            const pgp = (0, common_1.getPgp)();
            // before registering routes in express, call startUp hook
            yield (0, hooks_1.applyHooks)("start up", sriConfig.startUp || [], (f) => f(db, pgp));
            const currentInformationSchema = yield (0, informationSchema_1.informationSchema)(dbR, sriConfig);
            global.sri4node_configuration.informationSchema = currentInformationSchema;
            // Do automatic DB updates that are part of sri4node's standard behavior (like adding version triggers)
            yield (0, p_map_1.default)(sriConfig.resources, (mapping) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                if (!mapping.onlyCustom) {
                    const schema = ((_a = sriConfig.databaseConnectionParameters) === null || _a === void 0 ? void 0 : _a.schema) ||
                        ((_b = sriConfig.databaseLibraryInitOptions) === null || _b === void 0 ? void 0 : _b.schema);
                    const schemaName = Array.isArray(schema) ? schema[0] : schema === null || schema === void 0 ? void 0 : schema.toString();
                    yield (0, common_1.installVersionIncTriggerOnTable)(dbW, (0, common_1.tableFromMapping)(mapping), schemaName);
                }
            }), { concurrency: 1 });
            (0, common_1.checkSriConfigWithDb)(sriConfig, currentInformationSchema);
            // Prepare pg-promise columnsets for multi insert/update & delete
            const generatePgColumnSet = (columnNames, type, table) => {
                const columns = columnNames.map((cname) => {
                    const cConf = {
                        name: cname,
                    };
                    if (cname.includes(".")) {
                        // popertynames with dot like $$meta.* are problematic with default pg-promise
                        // see https://github.com/vitaly-t/pg-promise/issues/494  ==> workaround with .init() fun
                        cConf.prop = `_${cname.replace(/\./g, "_")}`; // if prop is not unique multiple $$meta.* will get the same value!
                        cConf.init = (c) => c.source[cname];
                    }
                    const cType = global.sri4node_configuration.informationSchema[type][cname].type;
                    const cElementType = global.sri4node_configuration.informationSchema[type][cname].element_type;
                    if (cType !== "text") {
                        if (cType === "ARRAY") {
                            cConf.cast = `${cElementType}[]`;
                            // } else if (cType.toLowerCase() === "jsonb") {
                            //   cConf.mod = ':json';
                        }
                        else {
                            cConf.cast = cType;
                        }
                    }
                    if (cname === "key") {
                        cConf.cnd = true;
                    }
                    return new pgp.helpers.Column(cConf);
                });
                return new pgp.helpers.ColumnSet(columns, { table });
            };
            global.sri4node_configuration.pgColumns = Object.fromEntries(sriConfig.resources
                .filter((resource) => !resource.onlyCustom)
                .map((resource) => {
                const { type } = resource;
                const table = (0, common_1.tableFromMapping)((0, common_1.typeToMapping)(type));
                const columns = JSON.parse(`[${(0, common_1.sqlColumnNames)((0, common_1.typeToMapping)(type))}]`).filter((cname) => !cname.startsWith("$$meta."));
                const ret = {};
                ret.insert = new pgp.helpers.ColumnSet(columns, { table });
                const dummyUpdateRow = (0, common_1.transformObjectToRow)({}, resource, false);
                ret.update = generatePgColumnSet([...new Set(["key", "$$meta.modified", ...Object.keys(dummyUpdateRow)])], type, table);
                ret.delete = generatePgColumnSet(["key", "$$meta.modified", "$$meta.deleted"], type, table);
                return [table, ret];
            }));
            global.sri4node_loaded_plugins = new Map();
            global.sri4node_install_plugin = (plugin) => __awaiter(this, void 0, void 0, function* () {
                console.log(`Installing plugin ${util.inspect(plugin)}`);
                // load plugins with a uuid only once; backwards compatible with old system without uuid
                if (plugin.uuid !== undefined && global.sri4node_loaded_plugins.has(plugin.uuid)) {
                    return;
                }
                yield plugin.install(global.sri4node_configuration, dbW);
                if (plugin.uuid !== undefined) {
                    (0, common_1.debug)("general", `Loaded plugin ${plugin.uuid}.`);
                    global.sri4node_loaded_plugins.set(plugin.uuid, plugin);
                }
            });
            if (sriConfig.plugins !== undefined) {
                yield (0, p_map_1.default)(sriConfig.plugins, (plugin) => __awaiter(this, void 0, void 0, function* () {
                    yield global.sri4node_install_plugin(plugin);
                }), { concurrency: 1 });
            }
            // set the overload protection as first middleware to drop requests as soon as possible
            global.overloadProtection = (0, overloadProtection_1.overloadProtectionFactory)(sriConfig.overloadProtection);
            app.use((_req, res, next) => __awaiter(this, void 0, void 0, function* () {
                var _c, _d;
                if (global.overloadProtection.canAccept()) {
                    next();
                }
                else {
                    (0, common_1.debug)("overloadProtection", "DROPPED REQ");
                    if (((_c = sriConfig.overloadProtection) === null || _c === void 0 ? void 0 : _c.retryAfter) !== undefined) {
                        res.set("Retry-After", (_d = sriConfig.overloadProtection) === null || _d === void 0 ? void 0 : _d.retryAfter.toString());
                    }
                    res.status(503).send([
                        {
                            code: "too.busy",
                            msg: "The request could not be processed as the server is too busy right now. Try again later.",
                        },
                    ]);
                }
            }));
            const emt = (0, common_1.installEMT)(app);
            if (global.sri4node_configuration.forceSecureSockets) {
                // All URLs force SSL and allow cross origin access.
                app.use(forceSecureSockets);
            }
            app.use(emt.instrument((0, compression_1.default)(), "mw-compression"));
            app.use(emt.instrument(body_parser_1.default.json({ limit: sriConfig.bodyParserLimit, strict: false }), "mw-bodyparser"));
            // use option 'strict: false' to allow also valid JSON like a single boolean
            /// 2023: docs were broken because __dirname does not exist in ESM modules,
            /// and we used pwd which is incorrect.
            /// In order to fix this, we stopped using static files stored relative to this file
            /// and instead hardcoded the few files (.pug and .css) we need for the docs
            /// inside the docs/pugTemplates.ts module
            const returnFileFromDocsStatic = (_req, res) => {
                res.write(pugTpl.staticFiles[_req.params.file]);
                res.end();
            };
            app.get("/docs/static/:file", returnFileFromDocsStatic);
            app.put("/log", middlewareErrorWrapper((req, resp) => {
                const err = req.body;
                console.log("Client side error :");
                err.stack.split("\n").forEach((line) => console.log(line));
                resp.end();
            }));
            app.get("/docs", middlewareErrorWrapper(getDocs));
            app.get("/resources", middlewareErrorWrapper(getResourcesOverview));
            app.post("/setlogdebug", (req, resp, _next) => {
                global.sri4node_configuration.logdebug = (0, common_1.createDebugLogConfigObject)(req.body);
                resp.send("OK");
            });
            app.use(express_http_context_1.default.middleware);
            // Run the context for each request. Assign a unique identifier to each request
            app.use((req, res, next) => {
                express_http_context_1.default.ns.bindEmitter(req);
                express_http_context_1.default.ns.bindEmitter(res);
                let reqId;
                if (req.headers["x-request-id"] !== undefined) {
                    // if present use the id provided by heroku
                    reqId = req.headers["x-request-id"];
                }
                else if (req.headers["x-amz-cf-id"] !== undefined) {
                    // if present use the id provided by cloudfront
                    reqId = req.headers["x-amz-cf-id"];
                }
                else {
                    reqId = shortid_1.default.generate();
                }
                if (sriConfig.id !== undefined) {
                    reqId = `${sriConfig.id}#${reqId}`;
                }
                express_http_context_1.default.set("reqId", reqId);
                next();
            });
            yield (0, p_map_1.default)(sriConfig.resources, (mapping) => __awaiter(this, void 0, void 0, function* () {
                var _e;
                if (!mapping.onlyCustom) {
                    if (((_e = mapping.map) === null || _e === void 0 ? void 0 : _e.key) === undefined) {
                        // add key if missing, needed for key offset paging
                        mapping.map = Object.assign(Object.assign({}, mapping.map), { key: {} });
                    }
                    checkRequiredFields(mapping, sriConfig.informationSchema);
                    if (mapping.query === undefined) {
                        mapping.query = {};
                    }
                    // append relation filters if auto-detected a relation resource
                    if (mapping.map.from && mapping.map.to) {
                        // mapping.query.relationsFilter = mapping.query.relationsFilter(mapping.map.from, mapping.map.to);
                        mapping.query = Object.assign(Object.assign({}, mapping.query), relationFilters);
                    }
                    // register schema for external usage. public.
                    app.get(`${mapping.type}/schema`, middlewareErrorWrapper(getSchema));
                    // register docs for this type
                    app.get(`${mapping.type}/docs`, middlewareErrorWrapper(getDocs));
                    app.get(`${mapping.type}/docs/static/:file`, returnFileFromDocsStatic);
                }
            }), { concurrency: 1 });
            // temporarilty allow a global /batch via config option for samenscholing
            if (sriConfig.enableGlobalBatch) {
                const globalBatchPath = `${sriConfig.globalBatchRoutePrefix !== undefined ? sriConfig.globalBatchRoutePrefix : ""}/batch`;
                (0, common_1.debug)("general", `registering route ${globalBatchPath} - PUT/POST`);
                (0, common_1.debug)("general", `registering route ${`${globalBatchPath}_streaming`} - PUT/POST`);
                app.put(globalBatchPath, expressWrapper(dbR, dbW, batch.batchOperation, sriConfig, null, false, true, false));
                app.post(globalBatchPath, expressWrapper(dbR, dbW, batch.batchOperation, sriConfig, null, false, true, false));
                app.put(`${globalBatchPath}_streaming`, expressWrapper(dbR, dbW, batch.batchOperationStreaming, sriConfig, null, true, true, false));
                app.post(`${globalBatchPath}_streaming`, expressWrapper(dbR, dbW, batch.batchOperationStreaming, sriConfig, null, true, true, false));
            }
            /**
             * array of objects with url, verb, handler and some other options
             * which can be called within a batch
             */
            const batchHandlerMap = sriConfig.resources.reduce((acc, mapping) => {
                var _a;
                // [path, verb, func, mapping, streaming, readOnly, isBatch]
                const crudRoutes = [
                    {
                        route: `${mapping.type}/:key`,
                        verb: "GET",
                        func: regularResource.getRegularResource,
                        config: sriConfig,
                        mapping,
                        streaming: false,
                        readOnly: true,
                        isBatch: false,
                    },
                    {
                        route: `${mapping.type}/:key`,
                        verb: "PUT",
                        func: regularResource.createOrUpdateRegularResource,
                        config: sriConfig,
                        mapping,
                        streaming: false,
                        readOnly: false,
                        isBatch: false,
                    },
                    {
                        route: `${mapping.type}/:key`,
                        verb: "PATCH",
                        func: regularResource.patchRegularResource,
                        config: sriConfig,
                        mapping,
                        streaming: false,
                        readOnly: false,
                        isBatch: false,
                    },
                    {
                        route: `${mapping.type}/:key`,
                        verb: "DELETE",
                        func: regularResource.deleteRegularResource,
                        config: sriConfig,
                        mapping,
                        streaming: false,
                        readOnly: false,
                        isBatch: false,
                    },
                    {
                        route: mapping.type,
                        verb: "GET",
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
                        verb: "POST",
                        func: listResource.isPartOf,
                        config: sriConfig,
                        mapping,
                        streaming: false,
                        readOnly: true,
                        isBatch: false,
                    },
                ];
                const batchRoutes = [
                    // [`${mapping.type}/batch`, 'PUT', batch.batchOperation, sriConfig, mapping, false, false, true],
                    {
                        route: `${mapping.type}/batch`,
                        verb: "PUT",
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
                        verb: "POST",
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
                        verb: "PUT",
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
                        verb: "POST",
                        func: batch.batchOperationStreaming,
                        config: sriConfig,
                        mapping,
                        streaming: true,
                        readOnly: false,
                        isBatch: true,
                    },
                ];
                // TODO: check customRoutes have required fields and make sense ==> use json schema for validation
                (_a = mapping.customRoutes) === null || _a === void 0 ? void 0 : _a.forEach((cr) => {
                    const customMapping = lodash_1.default.cloneDeep(mapping);
                    if ((0, typeDefinitions_1.isLikeCustomRouteDefinition)(cr) &&
                        "alterMapping" in cr &&
                        cr.alterMapping !== undefined) {
                        cr.alterMapping(customMapping);
                    }
                    else if ("transformResponse" in cr && cr.transformResponse) {
                        customMapping.transformResponse = [
                            ...(customMapping.transformResponse || []),
                            cr.transformResponse,
                        ];
                    }
                    cr.httpMethods.forEach((method) => {
                        if ((0, typeDefinitions_1.isLikeCustomRouteDefinition)(cr)) {
                            const crudPath = mapping.type + cr.like;
                            customMapping.query = Object.assign(Object.assign({}, customMapping.query), cr.query);
                            const likeMatches = crudRoutes.filter(({ route, verb }) => route === crudPath && verb === method.toUpperCase());
                            if (likeMatches.length === 0) {
                                console.log(`\nWARNING: customRoute like ${crudPath} - ${method} not found => ignored.\n`);
                            }
                            else {
                                const { verb, func, streaming, readOnly } = likeMatches[0];
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
                        }
                        else if ((0, typeDefinitions_1.isStreamingCustomRouteDefinition)(cr)) {
                            const { streamingHandler } = cr;
                            acc.push({
                                route: mapping.type + cr.routePostfix,
                                verb: method.toUpperCase(),
                                func: (_phaseSyncer, tx, sriRequest, _mapping1) => __awaiter(this, void 0, void 0, function* () {
                                    var _a, _b;
                                    if (sriRequest.isBatchPart) {
                                        throw new typeDefinitions_1.SriError({
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
                                            sriRequest.busBoy = (0, busboy_1.default)(Object.assign(Object.assign({}, cr.busBoyConfig), { headers: sriRequest.headers }));
                                        }
                                        catch (err) {
                                            throw new typeDefinitions_1.SriError({
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
                                            const result = yield cr.beforeStreamingHandler(tx, sriRequest, customMapping, global.sriInternalUtils);
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
                                        }
                                        catch (err) {
                                            if (err instanceof typeDefinitions_1.SriError ||
                                                ((_b = (_a = err === null || err === void 0 ? void 0 : err.__proto__) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name) === "SriError") {
                                                throw err;
                                            }
                                            else {
                                                throw new typeDefinitions_1.SriError({ status: 500, errors: [`${util.format(err)}`] });
                                            }
                                        }
                                    }
                                    let keepAliveTimer = null;
                                    let stream;
                                    const streamEndEmitter = new events_1.default();
                                    const streamDonePromise = (0, p_event_1.default)(streamEndEmitter, "done");
                                    if (cr.binaryStream) {
                                        stream = sriRequest.outStream;
                                    }
                                    else {
                                        if (sriRequest.setHeader) {
                                            sriRequest.setHeader("Content-Type", "application/json; charset=utf-8");
                                        }
                                        stream = (0, common_1.createReadableStream)(true);
                                        const JsonStream = new json_stream_stringify_1.JsonStreamStringify(stream);
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
                                            if (sriRequest.outStream instanceof http_1.ServerResponse) {
                                                sriRequest.outStream.flush();
                                            }
                                        }, sriConfig.streamingKeepAliveTimeoutMillis || 20000);
                                    }
                                    sriRequest.outStream.on("close", () => streamEndEmitter.emit("done"));
                                    const streamingHandlerPromise = streamingHandler(tx, sriRequest, stream, global.sriInternalUtils);
                                    // Wait till busboy handler are in place (can be done in
                                    // beforeStreamingHandler or streamingHandler) before piping request
                                    // to busBoy (otherwise events might get lost).
                                    if (cr.busBoy && sriRequest.busBoy) {
                                        sriRequest.inStream.pipe(sriRequest.busBoy);
                                    }
                                    try {
                                        yield streamingHandlerPromise;
                                    }
                                    finally {
                                        if (keepAliveTimer !== null) {
                                            clearInterval(keepAliveTimer);
                                        }
                                    }
                                    if (cr.binaryStream) {
                                        stream.end();
                                    }
                                    else {
                                        stream.push(null);
                                    }
                                    // wait until stream is ended
                                    yield streamDonePromise;
                                    return { status: 200 };
                                }),
                                config: sriConfig,
                                mapping: customMapping,
                                streaming: true,
                                readOnly: method.toUpperCase() === "GET" ? true : !!cr.readOnly,
                                isBatch: false,
                            });
                        }
                        else if (cr.handler !== undefined) {
                            const { handler } = cr;
                            acc.push({
                                route: mapping.type + cr.routePostfix,
                                verb: method.toUpperCase(),
                                func: (phaseSyncer, tx, sriRequest, _mapping) => __awaiter(this, void 0, void 0, function* () {
                                    yield phaseSyncer.phase();
                                    yield phaseSyncer.phase();
                                    yield phaseSyncer.phase();
                                    if (cr.beforeHandler !== undefined) {
                                        yield cr.beforeHandler(tx, sriRequest, customMapping, global.sriInternalUtils);
                                    }
                                    yield phaseSyncer.phase();
                                    const result = yield handler(tx, sriRequest, customMapping, global.sriInternalUtils);
                                    yield phaseSyncer.phase();
                                    yield phaseSyncer.phase();
                                    if (cr.afterHandler !== undefined) {
                                        yield cr.afterHandler(tx, sriRequest, customMapping, result, global.sriInternalUtils);
                                    }
                                    yield phaseSyncer.phase();
                                    return result;
                                }),
                                config: sriConfig,
                                mapping: customMapping,
                                streaming: false,
                                readOnly: method.toUpperCase() === "GET" ? true : !!cr.readOnly,
                                isBatch: false,
                            });
                        }
                        else {
                            throw new Error("No handlers defined");
                        }
                    });
                });
                acc.push(...batchRoutes);
                if (!mapping.onlyCustom) {
                    acc.push(...crudRoutes);
                }
                return acc;
            }, []);
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
            const internalSriRequest = (internalReq) => __awaiter(this, void 0, void 0, function* () {
                const match = batch.matchHref(internalReq.href, internalReq.verb);
                const sriRequest = (0, common_1.generateSriRequest)(undefined, undefined, undefined, match, undefined, undefined, internalReq);
                yield (0, hooks_1.applyHooks)("transform internal sriRequest", match.handler.config.transformInternalRequest || [], (f) => f(internalReq.dbT, sriRequest, internalReq.parentSriRequest), sriRequest);
                const result = yield handleRequest(sriRequest, match.handler.func, match.handler.mapping);
                // we do a JSON stringify/parse cycle because certain fields like Date fields are expected
                // in string format instead of Date objects
                return JSON.parse(JSON.stringify(result));
            });
            global.sri4node_internal_interface = internalSriRequest;
            // so we can add it to every sriRequest via expressRequest.app.get('sriInternalRequest')
            const sriInternalUtils = {
                internalSriRequest,
            };
            // we don't like passing this around via the global object (we also lose the typing)
            // but for now we'll stick with it because there are plenty of other cases where the global
            // has been used
            // so where we want to pass this object to a hook or handler function we'll need to use
            //  global.sriInternalUtils as TSriInternalUtils
            global.sriInternalUtils = sriInternalUtils;
            /** THIS WILL BE THE RETURN VALUE !!! */
            const sriServerInstance = {
                pgp,
                db,
                app,
                // informationSchema: currentInformationSchema, // maybe later
                close: () => __awaiter(this, void 0, void 0, function* () {
                    // we don't install plugins with the same uuid twice, so we also don't close them twice!
                    if (Array.isArray(sriConfig.plugins)) {
                        const alreadyClosed = new Set();
                        yield (0, p_map_1.default)(sriConfig.plugins, (plugin) => __awaiter(this, void 0, void 0, function* () {
                            if (plugin.close) {
                                try {
                                    if (!plugin.uuid || !alreadyClosed.has(plugin.uuid)) {
                                        yield plugin.close(global.sri4node_configuration, dbW);
                                    }
                                }
                                catch (err) {
                                    console.error(`Error closing plugin ${plugin.uuid}: ${err}`);
                                }
                                finally {
                                    if (plugin.uuid) {
                                        alreadyClosed.add(plugin.uuid);
                                    }
                                }
                            }
                        }), { concurrency: 1 });
                    }
                    db && (yield db.$pool.end());
                }),
            };
            // register individual routes in express
            batchHandlerMap.forEach(({ route, verb, func, config, mapping, streaming, readOnly, isBatch }) => {
                // Also use phaseSyncedSettle like in batch to use same shared code,
                // has no direct added value in case of single request.
                (0, common_1.debug)("general", `registering route ${route} - ${verb} - ${readOnly}`);
                app[verb.toLowerCase()](route, emt.instrument(expressWrapper(dbR, dbW, func, config, mapping, streaming, isBatch, readOnly), "express-wrapper"));
            });
            // transform map with 'routes' to be usable in batch (translate and group by verb)
            // TODO: do not modify the sriConfig provided to us by the user!
            sriConfig.batchHandlerMap = lodash_1.default.groupBy(batchHandlerMap.map(({ route, verb, func, config, mapping, streaming, readOnly, isBatch }) => ({
                route: new route_parser_1.default(route),
                verb,
                func,
                config,
                mapping,
                streaming,
                readOnly,
                isBatch,
            })), (e) => e.verb);
            app.get("/", (_req, res) => res.redirect("/resources"));
            console.log("___________________________ SRI4NODE INITIALIZATION DONE _____________________________");
            return sriServerInstance;
        }
        catch (err) {
            console.error("___________________________ SRI4NODE INITIALIZATION ERROR _____________________________");
            console.error(err);
            process.exit(1);
        }
    });
}
exports.configure = configure;
__exportStar(require("./js/typeDefinitions"), exports);
//# sourceMappingURL=sri4node.js.map