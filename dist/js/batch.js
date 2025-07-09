"use strict";
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
exports.batchOperationStreaming = exports.batchOperation = exports.matchBatch = exports.matchHref = void 0;
const lodash_1 = __importDefault(require("lodash"));
const p_map_1 = __importDefault(require("p-map"));
const p_each_series_1 = __importDefault(require("p-each-series"));
const url_1 = __importDefault(require("url"));
const JSONStream_1 = __importDefault(require("JSONStream"));
const events_1 = __importDefault(require("events"));
const p_event_1 = __importDefault(require("p-event"));
const express_http_context_1 = __importDefault(require("express-http-context"));
const hooks_1 = require("./hooks");
const phaseSyncedSettle_1 = require("./phaseSyncedSettle");
const common_1 = require("./common");
const typeDefinitions_1 = require("./typeDefinitions");
const maxSubListLen = (a) => 
// this code works as long as a batch array contain either all objects or all (sub)arrays
// (which is required by batchOpertation, otherwise a 'batch.invalid.type.mix' error is sent)
a.reduce((max, e, _idx, arr) => {
    if (Array.isArray(e)) {
        return Math.max(maxSubListLen(e), max);
    }
    return Math.max(arr.length, max);
}, 0);
/**
 * Tries to find the proper record in the global batchHandlerMap
 * and then returns the handler found + some extras
 * like path, routeParams (example /resources/:id) and queryParams (?key=value)
 *
 * @param {String} href
 * @param {THttpMethod} verb: GET,PUT,PATCH,DELETE,POST
 * @returns an object of the form { path, routeParams, queryParams, handler: [path, verb, func, config, mapping, streaming, readOnly, isBatch] }
 */
function matchHref(href, verb) {
    if (!verb) {
        console.log(`No VERB stated for ${href}.`);
        throw new typeDefinitions_1.SriError({
            status: 400,
            errors: [{ code: "no.verb", msg: `No VERB stated for ${href}.` }],
        });
    }
    const parsedUrl = url_1.default.parse(href, true);
    const queryParams = parsedUrl.query;
    const path = (parsedUrl.pathname || "").replace(/\/$/, ""); // replace eventual trailing slash
    const batchHandlerMap = global.sri4node_configuration.batchHandlerMap;
    const matches = batchHandlerMap[verb]
        .map((handler) => ({ handler, match: handler.route.match(path) }))
        .filter(({ match }) => match !== false);
    if (matches.length > 1) {
        console.log(`WARNING: multiple handler functions match for batch request ${path}. Only first will be used. Check configuration.`);
    }
    else if (matches.length === 0) {
        throw new typeDefinitions_1.SriError({
            status: 404,
            errors: [{ code: "no.matching.route", msg: `No route found for ${verb} on ${path}.` }],
        });
    }
    const { handler } = lodash_1.default.first(matches);
    const routeParams = lodash_1.default.first(matches).match;
    return {
        handler,
        path,
        routeParams,
        queryParams,
    };
}
exports.matchHref = matchHref;
/**
 * This will add a 'match' property to every batch element that already contains
 * which handler will be needed for each operation (and throws SriErrors if necessary)
 *
 * Used to detect early (without executing a lot of stuff on the DB first)
 * if a batch is going to fail anyway along the way because of invalid urls etc.
 *
 * @param {TSriRequest} req
 */
function matchBatch(req) {
    // Body of request is an array of objects with 'href', 'verb' and 'body' (see sri spec)
    const reqBody = req.body;
    const batchBase = req.path.split("/batch")[0];
    if (!Array.isArray(reqBody)) {
        throw new typeDefinitions_1.SriError({
            status: 400,
            errors: [
                {
                    code: "batch.body.invalid",
                    msg: "Batch body should be JSON array.",
                    body: reqBody,
                },
            ],
        });
    }
    const handleBatchForMatchBatch = (batch) => {
        if (batch.every((element) => Array.isArray(element))) {
            batch.forEach(handleBatchForMatchBatch);
        }
        else if (batch.every((element) => typeof element === "object" && !Array.isArray(element))) {
            batch.forEach((element) => {
                var _a;
                const match = matchHref(element.href, element.verb);
                if (match.handler.isBatch === true) {
                    throw new typeDefinitions_1.SriError({
                        status: 400,
                        errors: [
                            {
                                code: "batch.not.allowed.in.batch",
                                msg: "Nested /batch requests are not allowed, use 1 batch with sublists inside the batch JSON.",
                            },
                        ],
                    });
                }
                // only allow batch operations within the same resource
                // (will be extended later with 'boundaries')
                if (!((_a = match.path) === null || _a === void 0 ? void 0 : _a.startsWith(batchBase))) {
                    throw new typeDefinitions_1.SriError({
                        status: 400,
                        errors: [
                            {
                                code: "href.across.boundary",
                                msg: "Only requests within (sub) path of /batch request are allowed.",
                            },
                        ],
                    });
                }
                if (match.queryParams.dryRun === "true") {
                    throw new typeDefinitions_1.SriError({
                        status: 400,
                        errors: [
                            {
                                code: "dry.run.not.allowed.in.batch",
                                msg: "The dryRun query parameter is only allowed for the batch url itself (/batch?dryRun=true), not for hrefs inside a batch request.",
                            },
                        ],
                    });
                }
                element.match = match;
            });
        }
        else {
            throw new typeDefinitions_1.SriError({
                status: 400,
                errors: [
                    {
                        code: "batch.invalid.type.mix",
                        msg: "A batch array should contain either all objects or all (sub)arrays.",
                    },
                ],
            });
        }
    };
    handleBatchForMatchBatch(reqBody);
}
exports.matchBatch = matchBatch;
const batchOperation = function batchOperation(sriRequest, internalUtils) {
    return __awaiter(this, void 0, void 0, function* () {
        const reqBody = sriRequest.body || [];
        const batchConcurrency = Math.min(maxSubListLen(reqBody), global.sri4node_configuration.batchConcurrency);
        global.overloadProtection.startPipeline(batchConcurrency);
        try {
            let batchFailed = false;
            const handleBatchInBatchOperation = (batch, tx) => __awaiter(this, void 0, void 0, function* () {
                if (batch.every((element) => Array.isArray(element))) {
                    (0, common_1.debug)("batch", "┌──────────────────────────────────────────────────────────────────────────────");
                    (0, common_1.debug)("batch", "| Handling batch list");
                    (0, common_1.debug)("batch", "└──────────────────────────────────────────────────────────────────────────────");
                    return (0, p_map_1.default)(batch, (element) => __awaiter(this, void 0, void 0, function* () {
                        const { tx: tx1, resolveTx, rejectTx } = yield (0, common_1.startTransaction)(tx);
                        const result = yield handleBatchInBatchOperation(element, tx1);
                        if (result.every((e) => e.status < 300)) {
                            yield resolveTx();
                        }
                        else {
                            yield rejectTx();
                        }
                        return result;
                    }), { concurrency: 1 });
                }
                if (batch.every((element) => typeof element === "object" && !Array.isArray(element))) {
                    if (!batchFailed) {
                        const batchJobs = yield (0, p_map_1.default)(batch, (batchElement) => __awaiter(this, void 0, void 0, function* () {
                            var _a;
                            if (!batchElement.verb) {
                                throw new typeDefinitions_1.SriError({
                                    status: 400,
                                    errors: [{ code: "verb.missing", msg: "VERB is not specified." }],
                                });
                            }
                            (0, common_1.debug)("batch", "┌──────────────────────────────────────────────────────────────────────────────");
                            (0, common_1.debug)("batch", `| Executing /batch section ${batchElement.verb} - ${batchElement.href} `);
                            (0, common_1.debug)("batch", "└──────────────────────────────────────────────────────────────────────────────");
                            const { match } = batchElement;
                            const innerSriRequest = (0, common_1.generateSriRequest)(undefined, undefined, undefined, match, sriRequest, batchElement);
                            if (!((_a = match === null || match === void 0 ? void 0 : match.handler) === null || _a === void 0 ? void 0 : _a.func))
                                throw new Error("match.handler.func is undefined");
                            // WARNING: using "as TSriRequestHandlerForPhaseSyncer" assumes that they will be correct without proper type checking!
                            return [
                                match.handler.func,
                                [tx, innerSriRequest, match.handler.mapping, internalUtils],
                            ];
                        }), { concurrency: 1 });
                        const results = (0, common_1.settleResultsToSriResults)(yield (0, phaseSyncedSettle_1.phaseSyncedSettle)(batchJobs, {
                            concurrency: batchConcurrency,
                            beforePhaseHooks: global.sri4node_configuration.beforePhase,
                        }));
                        if (results.some((e) => { var _a, _b; return e instanceof typeDefinitions_1.SriError || ((_b = (_a = e === null || e === void 0 ? void 0 : e.__proto__) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name) === "SriError"; }) &&
                            sriRequest.readOnly === false) {
                            batchFailed = true;
                        }
                        yield (0, p_each_series_1.default)(results, (res, idx) => __awaiter(this, void 0, void 0, function* () {
                            var _b, _c;
                            const [_tx, innerSriRequest, mapping, internalUtils] = batchJobs[idx][1];
                            if (!(res instanceof typeDefinitions_1.SriError || ((_c = (_b = res === null || res === void 0 ? void 0 : res.__proto__) === null || _b === void 0 ? void 0 : _b.constructor) === null || _c === void 0 ? void 0 : _c.name) === "SriError")) {
                                yield (0, hooks_1.applyHooks)("transform response", mapping.transformResponse || [], (f) => f(tx, innerSriRequest, res, internalUtils));
                            }
                        }));
                        return results.map((res, idx) => {
                            const [_tx, innerSriRequest, _mapping] = batchJobs[idx][1];
                            res.href = innerSriRequest.originalUrl;
                            res.verb = innerSriRequest.httpMethod;
                            delete res.sriRequestID;
                            return res;
                        });
                    }
                    // TODO: generate correct error json with refering element in it!
                    return batch.map((_e) => new typeDefinitions_1.SriError({
                        status: 202,
                        errors: [
                            {
                                code: "cancelled",
                                msg: "Request cancelled due to failure in accompanying request in batch.",
                            },
                        ],
                    }));
                }
                batchFailed = true;
                throw new typeDefinitions_1.SriError({
                    status: 400,
                    errors: [
                        {
                            code: "batch.invalid.type.mix",
                            msg: "A batch array should contain either all objects or all (sub)arrays.",
                        },
                    ],
                });
            });
            const batchResults = lodash_1.default.flatten(yield handleBatchInBatchOperation(reqBody, sriRequest.dbT));
            // spec: The HTTP status code of the response must be the highest values of the responses
            // of the operations inside of the original batch, unless at least one 403 Forbidden response
            // is present in the batch response, then the server MUST respond with 403 Forbidden.
            const status = batchResults.some((e) => e.status === 403)
                ? 403
                : Math.max(200, ...batchResults.map((e) => e.status));
            return { status, body: batchResults };
        }
        finally {
            global.overloadProtection.endPipeline(batchConcurrency);
        }
    });
};
exports.batchOperation = batchOperation;
/**
 * It will return an object only containing status and no body, because the body is being streamed.
 */
const batchOperationStreaming = (sriRequest, internalUtils) => __awaiter(void 0, void 0, void 0, function* () {
    let keepAliveTimer = null;
    const reqBody = sriRequest.body;
    const batchConcurrency = global.overloadProtection.startPipeline(Math.min(maxSubListLen(reqBody), global.sri4node_configuration.batchConcurrency));
    try {
        let batchFailed = false;
        const handleBatchStreaming = (batch, tx) => __awaiter(void 0, void 0, void 0, function* () {
            if (batch.every((element) => Array.isArray(element))) {
                (0, common_1.debug)("batch", "┌──────────────────────────────────────────────────────────────────────────────");
                (0, common_1.debug)("batch", "| Handling batch list");
                (0, common_1.debug)("batch", "└──────────────────────────────────────────────────────────────────────────────");
                return (0, p_map_1.default)(batch, (element) => __awaiter(void 0, void 0, void 0, function* () {
                    const result = yield handleBatchStreaming(element, tx);
                    return result;
                }), { concurrency: 1 });
            }
            if (batch.every((element) => typeof element === "object" && !Array.isArray(element))) {
                if (!batchFailed) {
                    const batchJobs = yield (0, p_map_1.default)(batch, (batchElement) => __awaiter(void 0, void 0, void 0, function* () {
                        var _a;
                        if (!batchElement.verb) {
                            throw new typeDefinitions_1.SriError({
                                status: 400,
                                errors: [{ code: "verb.missing", msg: "VERB is not specified." }],
                            });
                        }
                        (0, common_1.debug)("batch", "┌──────────────────────────────────────────────────────────────────────────────");
                        (0, common_1.debug)("batch", `| Executing /batch section ${batchElement.verb} - ${batchElement.href} `);
                        (0, common_1.debug)("batch", "└──────────────────────────────────────────────────────────────────────────────");
                        const { match } = batchElement;
                        if (match) {
                            const innerSriRequest = Object.assign(Object.assign({}, sriRequest), { parentSriRequest: sriRequest, path: match.path || "", originalUrl: batchElement.href, query: match.queryParams, params: match.routeParams, httpMethod: batchElement.verb, body: batchElement.body, 
                                // element.body === undefined || _.isObject(element.body)
                                //   ? element.body
                                //   : JSON.parse(element.body),
                                sriType: match.handler.mapping.type, isBatchPart: true });
                            // const innerSriRequest:TSriRequest = generateSriRequest(
                            //   undefined, undefined, undefined, match, sriRequest, batchElement,
                            // );
                            if (!((_a = match === null || match === void 0 ? void 0 : match.handler) === null || _a === void 0 ? void 0 : _a.func))
                                throw new Error("match.handler.func is undefined");
                            // WARNING: using "as TSriRequestHandlerForPhaseSyncer" assumes that they will be correct without proper type checking!
                            return [
                                match.handler.func,
                                [tx, innerSriRequest, match.handler.mapping, internalUtils],
                            ];
                        }
                        else {
                            // should not occur
                            throw new typeDefinitions_1.SriError({
                                status: 500,
                                errors: [{ code: "batch.missing.match", msg: "" }],
                            });
                        }
                    }), { concurrency: 1 });
                    const results = (0, common_1.settleResultsToSriResults)(yield (0, phaseSyncedSettle_1.phaseSyncedSettle)(batchJobs, {
                        concurrency: batchConcurrency,
                        beforePhaseHooks: global.sri4node_configuration.beforePhase,
                    }));
                    if (results.some((e) => { var _a, _b; return e instanceof typeDefinitions_1.SriError || ((_b = (_a = e === null || e === void 0 ? void 0 : e.__proto__) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name) === "SriError"; })) {
                        batchFailed = true;
                    }
                    yield (0, p_each_series_1.default)(results, (res, idx) => __awaiter(void 0, void 0, void 0, function* () {
                        var _b, _c;
                        const [_tx, innerSriRequest, mapping] = batchJobs[idx][1];
                        if (!(res instanceof typeDefinitions_1.SriError || ((_c = (_b = res === null || res === void 0 ? void 0 : res.__proto__) === null || _b === void 0 ? void 0 : _b.constructor) === null || _c === void 0 ? void 0 : _c.name) === "SriError")) {
                            yield (0, hooks_1.applyHooks)("transform response", mapping.transformResponse || [], (f) => f(tx, innerSriRequest, res));
                        }
                    }));
                    return results.map((res, idx) => {
                        const [_tx, innerSriRequest, _mapping] = batchJobs[idx][1];
                        res.href = innerSriRequest.originalUrl;
                        res.verb = innerSriRequest.httpMethod;
                        delete res.sriRequestID;
                        stream2.push(res);
                        return res.status;
                    });
                }
                //   const l = batch.map( e =>  new SriError({ status: 202, errors: [{ code: 'cancelled', msg: 'Request cancelled due to failure in accompanying request in batch.' }] })  );
                // TODO: generate correct error json with refering element in it!
                batch.forEach((_e) => stream2.push({
                    status: 202,
                    errors: [
                        {
                            code: "cancelled",
                            msg: "Request cancelled due to failure in accompanying request in batch.",
                        },
                    ],
                }));
                return 202;
            }
            batchFailed = true;
            throw new typeDefinitions_1.SriError({
                status: 400,
                errors: [
                    {
                        code: "batch.invalid.type.mix",
                        msg: "A batch array should contain either all objects or all (sub)arrays.",
                    },
                ],
            });
        });
        if (sriRequest.setHeader) {
            const reqId = express_http_context_1.default.get("reqId");
            if (reqId !== undefined) {
                sriRequest.setHeader("vsko-req-id", reqId);
            }
            if (sriRequest.headers["request-server-timing"]) {
                sriRequest.setHeader("Trailer", "Server-Timing");
            }
            sriRequest.setHeader("Content-Type", "application/json; charset=utf-8");
        }
        const stream2 = (0, common_1.createReadableStream)(true);
        stream2.pipe(JSONStream_1.default.stringify()).pipe(sriRequest.outStream, { end: false });
        keepAliveTimer = setInterval(() => {
            sriRequest.outStream.write("");
        }, 15000);
        const streamEndEmitter = new events_1.default();
        const streamDonePromise = (0, p_event_1.default)(streamEndEmitter, "done");
        stream2.on("end", () => streamEndEmitter.emit("done"));
        sriRequest.outStream.write("{");
        sriRequest.outStream.write('"results":');
        if (!sriRequest.dbT)
            throw new Error("sriRequest containsno db transaction to work on");
        const batchResults = lodash_1.default.flatten(yield handleBatchStreaming(reqBody, sriRequest.dbT));
        // spec: The HTTP status code of the response must be the highest values of the responses of the operations inside
        // of the original batch, unless at least one 403 Forbidden response is present in the batch response, then the
        // server MUST respond with 403 Forbidden.
        const status = batchResults.some((e) => e === 403) ? 403 : Math.max(200, ...batchResults);
        // signal end to JSON stream
        stream2.push(null);
        // Removed stream2.destroy() here. It was not needed and there was a potentially very bad interaction between
        // stream2.push(null) and stream2.destroy(): in case enough data has been written on the stream, the destroy()
        // call destroyed the stream before all data could have been consumed. In that case the 'end' event was never
        // emitted (from the nodejs docs:
        //      The 'end' event is emitted when there is no more data to be consumed from the stream.
        //      The 'end' event will not be emitted unless the data is completely consumed.
        // ) and so 'await streamDonePromise' was hanging forever.
        //
        // The newly added test case "'big' batch_streaming" seemed to generate enough response data to always
        // trigger the bad interaction between push(null) and destroy().
        // wait until JSON stream is ended
        yield streamDonePromise;
        sriRequest.outStream.write(`, "status": ${status}`);
        sriRequest.outStream.write("}\n");
        return { status };
    }
    finally {
        if (keepAliveTimer !== null) {
            clearInterval(keepAliveTimer);
        }
        global.overloadProtection.endPipeline(batchConcurrency);
    }
});
exports.batchOperationStreaming = batchOperationStreaming;
//# sourceMappingURL=batch.js.map