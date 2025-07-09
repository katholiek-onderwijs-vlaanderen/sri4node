"use strict";
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
exports.isPartOf = exports.getSQLFromListResource = exports.getListResource = void 0;
const lodash_1 = __importDefault(require("lodash"));
const p_map_1 = __importDefault(require("p-map"));
const p_filter_1 = __importDefault(require("p-filter"));
const url_1 = __importDefault(require("url"));
const common_1 = require("./common");
const typeDefinitions_1 = require("./typeDefinitions");
const queryObject_1 = require("./queryObject");
const hooks_1 = require("./hooks");
const expand_1 = require("./expand");
const queryUtils = __importStar(require("./queryUtils"));
// Constants
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 500;
// apply extra parameters on request URL for a list-resource to a select.
function applyRequestParameters(mapping, query, urlparameters, tx, doCount) {
    return __awaiter(this, void 0, void 0, function* () {
        const standardParameters = [
            "orderBy",
            "descending",
            "limit",
            "keyOffset",
            "expand",
            "hrefs",
            "modifiedSince",
            "$$includeCount",
            "offset",
        ];
        if (mapping.query) {
            yield (0, p_map_1.default)(Object.keys(urlparameters), (key) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                const currentUrlParam = urlparameters[key];
                const keyAsString = typeof currentUrlParam === "string" ? currentUrlParam : (currentUrlParam || []).join(",");
                if (!standardParameters.includes(key)) {
                    if (((_a = mapping.query) === null || _a === void 0 ? void 0 : _a[key]) || ((_b = mapping.query) === null || _b === void 0 ? void 0 : _b.defaultFilter)) {
                        // Execute the configured function that will apply this URL parameter
                        // to the SELECT statement
                        if (!mapping.query[key] && mapping.query.defaultFilter) {
                            yield mapping.query.defaultFilter(keyAsString, query, key, tx, doCount, mapping, urlparameters);
                        }
                        else {
                            yield mapping.query[key](keyAsString, query, key, tx, doCount, mapping, urlparameters);
                        }
                    }
                    else {
                        throw new typeDefinitions_1.SriError({
                            status: 404,
                            errors: [{ code: "unknown.query.parameter", parameter: key }],
                        }); // this is small API change (previous: errors: [{code: 'invalid.query.parameter', parameter: key}])
                    }
                }
                else if (key === "hrefs" && urlparameters.hrefs) {
                    // queryUtils.filterHrefs(urlparameters.hrefs, query, key, tx, count, mapping);
                    queryUtils.filterHrefs(keyAsString, query, key, tx, doCount, mapping, urlparameters);
                }
                else if (key === "modifiedSince") {
                    queryUtils.modifiedSince(keyAsString, query, key, tx, doCount, mapping, urlparameters);
                }
            }), { concurrency: 1 });
        }
    });
}
function getSQLFromListResource(mapping, parameters, doCount, tx, query) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const table = (0, common_1.tableFromMapping)(mapping);
        let sql;
        let columns;
        if (((_a = parameters.expand) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "none") {
            if (parameters.orderBy) {
                columns = parameters.orderBy
                    .split(",")
                    .map((v) => `"${v}"`)
                    .join(",");
            }
            else {
                // this should become obsolete when we have a separate query parser that builds a fully deterministic parseTree
                // because
                columns = '"key","$$meta.created"';
            }
            // what if orderby is specified in a list query with expand=NONE?
        }
        else {
            columns = (0, common_1.sqlColumnNames)(mapping, ((_b = parameters.expand) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === "summary");
        }
        if (doCount) {
            if (parameters["$$meta.deleted"] === "true") {
                sql = `select count(*) from "${table}" where "${table}"."$$meta.deleted" = true `;
            }
            else if (parameters["$$meta.deleted"] === "any") {
                sql = `select count(*) from "${table}" where 1=1 `;
            }
            else {
                sql = `select count(*) from "${table}" where "${table}"."$$meta.deleted" = false `;
            }
            query.sql(sql);
        }
        else {
            if (parameters["$$meta.deleted"] === "true") {
                sql = `select ${columns} from "`;
                sql += `${table}" where "${table}"."$$meta.deleted" = true `;
            }
            else if (parameters["$$meta.deleted"] === "any") {
                sql = `select ${columns} from "`;
                sql += `${table}" where 1=1 `;
            }
            else {
                sql = `select ${columns} from "`;
                sql += `${table}" where "${table}"."$$meta.deleted" = false `;
            }
            query.sql(sql);
        }
        (0, common_1.debug)("trace", "listResource - applying URL parameters to WHERE clause");
        yield applyRequestParameters(mapping, query, parameters, tx, doCount);
    });
}
exports.getSQLFromListResource = getSQLFromListResource;
const applyOrderAndPagingParameters = (query, queryParams, mapping, queryLimit, maxlimit, keyOffset, offset) => {
    // All list resources support orderBy, limit and offset.
    // Order parameters
    const { orderBy, descending } = queryParams;
    let orderKeys = ["$$meta.created", "key"]; // default
    if (orderBy !== undefined) {
        orderKeys = orderBy.split(",");
        const invalidOrderByKeys = orderKeys.filter((k) => k !== "$$meta.created" && k !== "$$meta.modified" && !mapping.map[k]);
        if (invalidOrderByKeys.length !== 0) {
            throw new typeDefinitions_1.SriError({
                status: 400,
                errors: [
                    {
                        code: "invalid.orderby.parameter",
                        message: `Can not order by [${orderBy}]. Unknown properties: ${invalidOrderByKeys.join(", ")}.`,
                    },
                ],
            });
        }
    }
    // add paging to where clause
    if (keyOffset) {
        const keyValues = keyOffset.split(",").map((o) => decodeURIComponent(o));
        if (keyValues.length !== orderKeys.length) {
            throw new typeDefinitions_1.SriError({
                status: 400,
                errors: [
                    {
                        code: "invalid.keyoffset",
                        message: `Number of offset key values (${keyValues.length}) does not match number of order keys (${orderKeys.length}).`,
                    },
                ],
            });
        }
        const table = (0, common_1.tableFromMapping)(mapping);
        const orderKeyOp = descending === "true" ? "<" : ">";
        query.sql(` AND (${orderKeys.map((k) => `"${table}"."${k}"`).join()}) ${orderKeyOp} (`);
        orderKeys.forEach((_k, idx) => {
            if (idx > 0) {
                query.sql(",");
            }
            query.param(keyValues[idx]);
        });
        query.sql(")");
    }
    // add order parameter
    query.sql(` order by ${orderKeys
        .map((k) => `"${k}" ${descending === "true" ? "desc" : "asc"}`)
        .join(",")}`);
    // add limit parameter
    const isGetAllExpandNone = queryLimit === "*" &&
        queryParams.expand !== undefined &&
        queryParams.expand.toLowerCase() === "none";
    if (!isGetAllExpandNone) {
        if (queryLimit > maxlimit || queryLimit === "*") {
            throw new typeDefinitions_1.SriError({
                status: 409,
                errors: [
                    {
                        code: "invalid.limit.parameter",
                        type: "ERROR",
                        message: `The maximum allowed limit is ${maxlimit}`,
                    },
                ],
            });
        }
        // limit condition is always added except special case where the parameter limit=* and expand is NONE (#104)
        query.sql(" limit ").param(queryLimit);
    }
    if (offset) {
        if (keyOffset) {
            throw new typeDefinitions_1.SriError({
                status: 409,
                errors: [
                    {
                        code: "offset.and.keyoffset.incompatible",
                        type: "ERROR",
                        message: 'The parameters "offset" and "keyOffset" cannot be used together',
                    },
                ],
            });
        }
        else {
            query.sql(" offset ").param(offset);
        }
    }
    return orderKeys;
};
// sriRequest
const handleListQueryResult = (sriRequest, rows, count, mapping, queryLimit, orderKeys) => {
    const results = [];
    const { originalUrl } = sriRequest;
    const queryParams = sriRequest.query;
    const tableInformation = global.sri4node_configuration.informationSchema[mapping.type];
    // const elements = [];
    rows.forEach((currentrow) => {
        const element = {
            href: `${mapping.type}/${currentrow.key}`,
        };
        // full, or any set of expansion values that must
        // all start with "results.href" or "results.href.*" will result in inclusion
        // of the regular resources in the list resources.
        if (!queryParams.expand ||
            queryParams.expand.toLowerCase() === "full" ||
            queryParams.expand.toLowerCase() === "summary" ||
            queryParams.expand.indexOf("results") === 0) {
            element.$$expanded = (0, common_1.transformRowToObject)(currentrow, mapping);
            element.$$expanded.$$meta.type = mapping.metaType;
        }
        else if (queryParams.expand && queryParams.expand.toLowerCase() === "none") {
            // Intentionally left blank.
        }
        else if (queryParams.expand) {
            // Error expand must be either 'full','none' or start with 'href'
            const msg = `listResource - expand value unknown : ${queryParams.expand}`;
            (0, common_1.debug)("trace", msg);
            throw new typeDefinitions_1.SriError({
                status: 400,
                errors: [
                    {
                        code: "parameter.value.unknown",
                        msg: `Unknown value [${queryParams.expand}] for 'expand' parameter. The possible values are 'NONE', 'SUMMARY' and 'FULL'.`,
                        parameter: "expand",
                        value: queryParams.expand,
                        possibleValues: ["NONE", "SUMMARY", "FULL"],
                    },
                ],
            });
        }
        results.push(element);
    });
    const output = {
        $$meta: {
            schema: `${mapping.type}/schema`,
            docs: `${mapping.type}/docs`,
        },
        results,
    };
    if (count != null) {
        output.$$meta.count = count;
    }
    const addOrReplaceParameter = (url, parameter, value) => {
        if (url.indexOf(parameter) > 0) {
            return url.replace(new RegExp(`${parameter}[^&]*`), `${parameter}=${encodeURIComponent(value)}`);
        }
        return `${url + (url.indexOf("?") > 0 ? "&" : "?") + parameter}=${encodeURIComponent(value)}`;
    };
    if (results.length === parseInt(queryLimit, 10) && results.length > 0) {
        const lastElement = queryParams.expand && queryParams.expand.toLowerCase() === "none"
            ? rows[queryLimit - 1]
            : results[queryLimit - 1].$$expanded;
        const keyOffset = orderKeys
            .map((k) => {
            // !!! _.get supports a dotted notation path { 'my.key': 'value' } as well as { my: { key: 'value' } }
            const o = lodash_1.default.get(lastElement, k);
            if (tableInformation[k].type === "timestamp with time zone") {
                return encodeURIComponent(o);
            }
            else if (o === null) {
                return null;
            }
            return encodeURIComponent(o.toString());
        })
            .join(",");
        output.$$meta.next = addOrReplaceParameter(originalUrl, "keyOffset", keyOffset);
    }
    return output;
};
function getListResource(phaseSyncer, tx, sriRequest, mapping) {
    return __awaiter(this, void 0, void 0, function* () {
        const queryParams = sriRequest.query;
        const { type } = mapping;
        const defaultlimit = mapping.defaultlimit || DEFAULT_LIMIT;
        const maxlimit = mapping.maxlimit || MAX_LIMIT;
        const queryLimit = queryParams.limit || defaultlimit;
        const keyOffset = queryParams.keyOffset || "";
        const { offset } = queryParams;
        yield phaseSyncer.phase(); // step 0
        yield phaseSyncer.phase(); // step 1
        yield phaseSyncer.phase(); // step 2
        yield (0, hooks_1.applyHooks)("before read", mapping.beforeRead || [], (f) => f(tx, sriRequest), sriRequest);
        yield phaseSyncer.phase();
        (0, common_1.debug)("trace", `listResource - GET list resource starting${type}`);
        let count = null;
        let rows;
        let orderKeys;
        try {
            let includeCount = mapping.listResultDefaultIncludeCount;
            if (queryParams.$$includeCount !== undefined) {
                includeCount = queryParams.$$includeCount === "true";
            }
            if (includeCount) {
                const countquery = (0, queryObject_1.prepareSQL)();
                yield getSQLFromListResource(mapping, queryParams, true, tx, countquery);
                (0, common_1.debug)("trace", "listResource - executing SELECT COUNT query on tx");
                count = yield (0, common_1.getCountResult)(tx, countquery, sriRequest);
            }
            const query = (0, queryObject_1.prepareSQL)();
            yield getSQLFromListResource(mapping, queryParams, false, tx, query);
            orderKeys = applyOrderAndPagingParameters(query, queryParams, mapping, queryLimit, maxlimit, keyOffset, offset);
            (0, common_1.debug)("trace", "listResource - executing SELECT query on tx");
            rows = yield (0, common_1.pgExec)(tx, query, sriRequest);
        }
        catch (error) {
            if (error.code === "42703") {
                // UNDEFINED COLUMN
                throw new typeDefinitions_1.SriError({ status: 409, errors: [{ code: "invalid.query.parameter" }] });
            }
            else {
                throw error;
            }
        }
        sriRequest.containsDeleted = rows.some((r) => r["$$meta.deleted"] === true);
        const output = handleListQueryResult(sriRequest, rows, count, mapping, queryLimit, orderKeys);
        yield phaseSyncer.phase();
        yield phaseSyncer.phase();
        (0, common_1.debug)("trace", "listResource - executing afterRead functions on results");
        yield (0, hooks_1.applyHooks)("after read", mapping.afterRead || [], (f) => f(tx, sriRequest, output.results.map((e) => {
            if (e.$$expanded) {
                return {
                    permalink: e.href,
                    incoming: null,
                    stored: e.$$expanded,
                };
            }
            return {
                permalink: e.href,
                incoming: null,
                stored: null,
            };
        })), sriRequest);
        yield phaseSyncer.phase();
        (0, common_1.debug)("trace", `listResource - executing expansion : ${queryParams.expand}`);
        yield (0, expand_1.executeExpansion)(tx, sriRequest, output.results, mapping);
        return { status: 200, body: output };
    });
}
exports.getListResource = getListResource;
/// ================
const matchUrl = (url, mapping) => {
    if (url.match(mapping.listResourceRegex) !== null) {
        return { type: "list" };
    }
    const matchResult = url.match(mapping.singleResourceRegex);
    if (matchResult !== null) {
        const key = matchResult[1];
        return { type: "single", key };
    }
    throw new typeDefinitions_1.SriError({ status: 400, errors: [{ code: "unknown.resource.type", url }] });
};
// Check if a given raw url A is a subset of the given raw urls in list B
// POST /[resource]/isPartOf
// {
//  "a": { "href": [urlA] }
//  "b": { "hrefs": [ [urlB1], [urlB2], [urlB3] ] }
// }
// ==> [ [urlB2] ]  (all raw urls from list B for which url A is a subset)
function isPartOf(phaseSyncer, tx, sriRequest, mapping) {
    return __awaiter(this, void 0, void 0, function* () {
        yield phaseSyncer.phase();
        yield phaseSyncer.phase();
        yield phaseSyncer.phase();
        yield phaseSyncer.phase();
        yield phaseSyncer.phase();
        if (sriRequest.body.a === undefined ||
            sriRequest.body.a.href === undefined ||
            sriRequest.body.b === undefined ||
            sriRequest.body.b.hrefs === undefined) {
            throw new typeDefinitions_1.SriError({
                status: 400,
                errors: [{ code: "a.href.and.b.hrefs.needs.to.specified" }],
            });
        }
        if (Array.isArray(sriRequest.body.a.href)) {
            throw new typeDefinitions_1.SriError({ status: 400, errors: [{ code: "a.href.must.be.single.value" }] });
        }
        if (!Array.isArray(sriRequest.body.b.hrefs)) {
            throw new typeDefinitions_1.SriError({ status: 400, errors: [{ code: "b.hrefs.must.be.array" }] });
        }
        const urlA = sriRequest.body.a.href;
        const typeA = matchUrl(urlA, mapping);
        const resultList = yield (0, p_filter_1.default)(sriRequest.body.b.hrefs, (urlB) => __awaiter(this, void 0, void 0, function* () {
            const typeB = matchUrl(urlB, mapping);
            if (typeB.type === "single") {
                if (typeA.type === "single") {
                    return typeA.key === typeB.key;
                }
                return false;
            }
            const { query: paramsB } = url_1.default.parse(urlB, true);
            const queryB = (0, queryObject_1.prepareSQL)();
            try {
                yield getSQLFromListResource(mapping, paramsB, false, tx, queryB);
            }
            catch (err) {
                throw new typeDefinitions_1.SriError({
                    status: 400,
                    errors: [{ code: "resource.b.raised.error", url: urlB, err }],
                });
            }
            const sqlB = queryB.text;
            const valuesB = queryB.params;
            const query = (0, queryObject_1.prepareSQL)();
            if (typeA.type === "single") {
                query.sql(`SELECT EXISTS ( SELECT key from (${sqlB}) as temp WHERE key='${typeA.key}' )  as result;`);
                query.params.push(...valuesB);
            }
            else {
                const { query: paramsA } = url_1.default.parse(urlA, true);
                const queryA = (0, queryObject_1.prepareSQL)();
                try {
                    yield getSQLFromListResource(mapping, paramsA, false, tx, queryA);
                }
                catch (err) {
                    throw new typeDefinitions_1.SriError({
                        status: 400,
                        errors: [{ code: "resource.a.raised.error", url: urlA, err }],
                    });
                }
                const sqlA = queryA.text;
                const valuesA = queryA.params;
                query.sql(`SELECT NOT EXISTS ( SELECT key from (${sqlA}) as a WHERE NOT EXISTS (SELECT 1 FROM (${sqlB}) as b WHERE a.key = b.key)) as result;`);
                query.params.push(...valuesA);
                query.params.push(...valuesB);
            }
            const [{ result }] = yield (0, common_1.pgExec)(tx, query, sriRequest);
            return result;
        }));
        yield phaseSyncer.phase();
        yield phaseSyncer.phase();
        return { status: 200, body: resultList };
    });
}
exports.isPartOf = isPartOf;
//# sourceMappingURL=listResource.js.map