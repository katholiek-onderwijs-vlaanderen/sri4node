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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPropertyInJsonSchema = exports.checkSriConfigWithDb = exports.generateSriRequest = exports.getPgp = exports.getParentSriRequestFromRequestMap = exports.createReadableStream = exports.settleResultsToSriResults = exports.stringifyError = exports.isEqualSriObject = exports.tableFromMapping = exports.getCountResult = exports.installVersionIncTriggerOnTable = exports.startTask = exports.startTransaction = exports.createPreparedStatement = exports.pgResult = exports.pgExec = exports.pgConnect = exports.pgInit = exports.transformRowToObject = exports.transformObjectToRow = exports.sqlColumnNames = exports.typeToMapping = exports.typeToConfig = exports.errorAsCode = exports.parseResource = exports.isUuid = exports.urlToTypeAndKey = exports.handleRequestDebugLog = exports.createDebugLogConfigObject = exports.emtReportToServerTiming = exports.setServerTimingHdr = exports.installEMT = exports.getParentSriRequest = exports.hrefToParsedObjectFactory = exports.sortUrlQueryParamParseTree = exports.error = exports.debug = exports.debugAnyChannelAllowed = exports.isLogChannelEnabled = exports.hrtimeToMilliseconds = void 0;
/* Internal utilities for sri4node */
const url_1 = require("url");
const pg_promise_1 = __importDefault(require("pg-promise"));
const pg_monitor_1 = __importDefault(require("pg-monitor"));
const uuid_1 = require("uuid");
const stream_1 = require("stream");
// import { DEFAULT_MAX_VERSION } from 'tls';
// import { generateFlatQueryStringParserGrammar } from './url_parsing/flat_url_parser';
const lodash_1 = __importDefault(require("lodash"));
const flatUrlParser = __importStar(require("./url_parsing/flat_url_parser"));
const schemaUtils = __importStar(require("./schemaUtils"));
const typeDefinitions_1 = require("./typeDefinitions");
const non_flat_url_parser_1 = require("./url_parsing/non_flat_url_parser");
const url_2 = __importDefault(require("url"));
const events_1 = __importDefault(require("events"));
const p_event_1 = __importDefault(require("p-event"));
const path_1 = __importDefault(require("path"));
const stream_2 = __importDefault(require("stream"));
const peggy_1 = __importDefault(require("peggy"));
const express_http_context_1 = __importDefault(require("express-http-context"));
const emt = __importStar(require("./express-middleware-timer"));
let pgp; // will be initialized at pgConnect
const logBuffer = {};
/**
 * Base class for every error that is being thrown throughout the lifetime of an sri request
 */
/**
 * process.hrtime() method can be used to measure execution time, but returns an array
 *
 * @param {Array<Integer>} hrtime tuple [seconds, nanoseconds]
 * @returns the input translated to milliseconds
 */
function hrtimeToMilliseconds([seconds, nanoseconds]) {
    return seconds * 1000 + nanoseconds / 1000000;
}
exports.hrtimeToMilliseconds = hrtimeToMilliseconds;
const isLogChannelEnabled = (channel) => {
    return (global.sri4node_configuration === undefined ||
        (global.sri4node_configuration.logdebug &&
            (global.sri4node_configuration.logdebug.channels === "all" ||
                global.sri4node_configuration.logdebug.channels.has(channel))));
};
exports.isLogChannelEnabled = isLogChannelEnabled;
/**
 * Logging output: each debug call is 'tagged' with a 'channel' (first parameter).
 * If the 'channel' of a debug call is in the selected set of debug channels in the
 * sri4node configuration (logdebug.channels), output (second parameter) is logged.
 * Otherwise output is discared.
 * (see https://github.com/katholiek-onderwijs-vlaanderen/sri4node#logging for more
 * information).
 *
 * This function is available for sri4node plugins and applications using sri4, which
 * are allowed to use logchannels of their own.
 *
 * @param channel one of the predefined log channels
 * @param output string or string generating function to log
 */
const debugAnyChannelAllowed = (channel, output) => {
    if (isLogChannelEnabled(channel)) {
        const reqId = express_http_context_1.default.get("reqId");
        const msg = `${new Date().toISOString()} ${reqId ? `[reqId:${reqId}]` : ""}[${channel}] ${typeof output === "function" ? output() : output}`;
        if (reqId !== undefined) {
            if (global.sri4node_configuration.logdebug.statuses !== undefined) {
                if (!logBuffer[reqId]) {
                    logBuffer[reqId] = [msg];
                }
                else {
                    logBuffer[reqId].push(msg);
                }
            }
            else {
                console.log(msg);
            }
        }
        else {
            console.log(msg);
        }
    }
};
exports.debugAnyChannelAllowed = debugAnyChannelAllowed;
/**
 * Logging output: each debug call is 'tagged' with a 'channel' (first parameter).
 * If the 'channel' of a debug call is in the selected set of debug channels in the
 * sri4node configuration (logdebug.channels), output (second parameter) is logged.
 * Otherwise output is discared.
 * (see https://github.com/katholiek-onderwijs-vlaanderen/sri4node#logging for more
 * information).
 *
 * This function is for internal (sri4node) usage where logchannels are restricted
 * to pre-defined debug channels. Restricting channels avoids errors and will make
 * it possible for vscode to do auto-completion.
 * @param channel one of the predefined log channels
 * @param output string or string generating function to log
 */
const debug = (channel, output) => {
    debugAnyChannelAllowed(channel, output);
};
exports.debug = debug;
const error = function (...args) {
    const reqId = express_http_context_1.default.get("reqId");
    if (reqId) {
        console.error(`[reqId:${reqId}]`, ...args);
    }
    else {
        console.error(...args);
    }
};
exports.error = error;
/**
 * Given the generated grammar, generate and return the parser
 *
 * @param {*} grammar
 * @returns
 */
function generateQueryStringParser(grammar, allowedStartRules = undefined) {
    const pegConf = allowedStartRules
        ? {
            // Array of rules the parser will be allowed to start parsing from (default: the first rule in the grammar).
            allowedStartRules,
        }
        : {};
    return peggy_1.default.generate(grammar, pegConf);
}
/**
 *
 * @param {pegSyntaxError} e
 * @param {String} input
 * @returns a string
 */
function pegSyntaxErrorToErrorMessage(e, input = "") {
    if (e.location) {
        const searchParams = input;
        // const markedPart = ' >> ' + searchParams.slice(e.location.start.offset, e.location.end.offset) + ' << ' +
        // Since we can expect to be in a UTF-8 environment we can use some UTF-8 niftyness
        //   https://www.fileformat.info/info/unicode/block/combining_diacritical_marks/index.htm
        //   a character that modifies the previous one (like adding underline or something)
        //   try them all with for (let i = 0x0300; i < 0x036F; i ++) { console.log( "hello".split('').map(c => `${c}${String.fromCharCode(i)}`).join('') + ' = 0x' + i.toString(16)); }
        const markedPart = searchParams
            .slice(e.location.start.offset, e.location.end.offset)
            .split("")
            .map((c) => `${c}\u0333`) // \u0330 (tilde below) \u0332 (underline) \u0333 (double underline) \u0347 (also double underline)
            .join("");
        const markedErrorString = (searchParams.slice(0, e.location.start.offset) +
            markedPart +
            searchParams.slice(e.location.end.offset))
            .split("\n")
            .map((l, lineNr) => `${`0000${lineNr}`.slice(-3)} ${l}`)
            .filter((_l, lineNr) => lineNr > e.location.start.line - 3 && lineNr < e.location.start.line + 3)
            .join("\n");
        return `${e.message} at line ${e.location.start.line}, column ${e.location.start.column}\n\n${markedErrorString}`;
    }
    return e.toString(); // not recognized as pegSyntaxError
}
/**
 * If the url object has been parsed, it's easy to check if some filters that
 * have implicit values, are missing from the 'normalized' url.
 *
 * This function just generates a list of missing properties, so they can easily
 * be added to an existing parsed url object.
 *
 * Examples: _LIMIT=30&_EXPANSION=FULL&$$meta.deleted_IN=false
 * (but in parseTree format = an array of objects)
 *
 * @param {UrlQueryParamsParseTree} parseTree
 * @param {} mapping
 * @returns {UrlQueryParamsParseTree}
 */
function generateMissingDefaultsForParseTree(parseTree, mapping) {
    const DEFAULT_LIMIT = 30; // if not configured in mapping file
    const DEFAULT_MAX_LIMIT = 500; // if not configured in mapping file
    const DEFAULT_EXPANSION = "FULL";
    const DEFAULT_INCLUDECOUNT = false;
    const DEFAULT_LIST_ORDER_BY = ["$$meta.created", "key"];
    const DEFAULT_LIST_ORDER_DESCENDING = false;
    const retVal = [];
    if (!parseTree.find((f) => f.operator === "LIST_LIMIT")) {
        retVal.push({
            operator: "LIST_LIMIT",
            value: Math.min(mapping.defaultlimit || DEFAULT_LIMIT, mapping.maxlimit || DEFAULT_MAX_LIMIT),
        });
    }
    if (!parseTree.find((f) => f.operator === "EXPANSION")) {
        retVal.push({
            operator: "EXPANSION",
            value: mapping.defaultexpansion || DEFAULT_EXPANSION,
        });
    }
    if (!parseTree.find((f) => f.operator === "LIST_META_INCLUDE_COUNT")) {
        retVal.push({
            operator: "LIST_META_INCLUDE_COUNT",
            value: DEFAULT_INCLUDECOUNT,
        });
    }
    if (!parseTree.find((f) => f.property === "$$meta.deleted" && f.operator === "IN")) {
        retVal.push({
            property: "$$meta.deleted",
            operator: "IN",
            value: [false],
            caseInsensitive: true,
            invertOperator: false,
        });
    }
    if (!parseTree.find((f) => f.operator === "LIST_ORDER_BY")) {
        retVal.push({
            operator: "LIST_ORDER_BY",
            value: DEFAULT_LIST_ORDER_BY,
        });
    }
    if (!parseTree.find((f) => f.operator === "LIST_ORDER_DESCENDING")) {
        retVal.push({
            operator: "LIST_ORDER_DESCENDING",
            value: DEFAULT_LIST_ORDER_DESCENDING,
        });
    }
    return retVal;
}
/**
 * Will modify the parameter array into a sorted param array.
 *
 * @param {*} parseTree
 * @returns the in-place sorted parseTree
 */
function sortUrlQueryParamParseTree(parseTree) {
    const compareProperties = (a, b, properties) => properties.reduce((acc, cur) => {
        if (acc !== 0)
            return acc;
        if (a[cur] === b[cur])
            return acc;
        if ((a[cur] || "") > (b[cur] || "")) {
            // console.log(a[cur], '>', b[cur], ' => return 1', a, b);
            return 1;
        }
        // console.log(a[cur], '<', b[cur], ' => return -1', a, b);
        return -1;
    }, 0);
    return parseTree.sort((a, b) => compareProperties(a, b, ["property", "operator", "invertOperator", "caseInsensitive", "value"]));
}
exports.sortUrlQueryParamParseTree = sortUrlQueryParamParseTree;
const hrefToParsedObjectFactoryThis = {};
/**
 * This factory function will return a function that can parse an href
 * into an object containing the parseTree, and a normalizedUrl.
 *
 * This function should change the given href into an object
 * - that contains the "parse tree" (a translation of the url into a data structure
 *   that expresses what it does)
 * - [MAYBE] that also contains a translated URL object that should be easier to handle
 *   later on in all the processes because all the defaults have been explicitly
 *   applied, and all the 'stupid' url prameters have been translated into parameters
 *   more closely aligned with what sri4node and sri-query spec should support by default.
 *
 * Examples:
 *  * /persons would become /persons?$$meta.deleted_IN=false&_LIMIT=30
 *  * /persons?hrefs=1,2,3 would become
 *    /persons?$$meta.deleted_IN=false&$$meta.permalink_IN=1,2,3&_LIMIT=30
 *  * /persons?$$meta.deleted=any would become /persons?$$meta.deleted_IN=false,true&_LIMIT=30
 *  * and maybe also sort the query params + for 'lists' (href_IN=B,C,A) we could even sort the list itself
 *    tag_IN=B,C,A => tag_IN=A,B,C
 *  * limit=* and expand is NONE => _EXPAND=NONE (and no limit clause as we want all the results)
 *  * froms => from.href_IN
 *  * fromTypes => (from.href).type_IN ??? can we invent a proper default for this?
 *  * orderBy is by default on key I think (needed to make keyOffset work properly)
 *  * we could imagine that booleanPropGreater=false and booleanPropGreaterOrEqual=false could be
 *    rewritten to booleanProp_IN=true (and a lot of other variations)
 *  * should omit be rewritten to _OMIT, or to a positive selector like _INCLUDEFIELDS=...
 *
 * This way, there is no other place in the code where we should take into account
 * default values for certain parameters (like limit & $$meta.deleted).
 * Also: everything is translated into a format that we'd like to support in the futere
 * where all the 'operators' are visually more clearly separated from the property names.
 * key_IN is easier to understand than keys or keyIn
 * birthDate_GT is easier to understand than birthDateGreater
 *
 * This also makes things easier to optimize (for example sri4node security plugin would become
 * easier with less exceptions, especially for $$meta.deleted=any) because after nomalisation
 * /persons and /persons?$$meta.deleted=false will be the same.
 *
 * But the good thing is that all the 'old' stuff is still supported, so we stay backwards
 * compatible, while allowing the API's to evolve into a more mature way of querying.
 * Also, by prefixing all 'non-filtering' query params with an _ like _LIMIT or _OFFSET,
 * it is more clear that these are no filters related to a specific property like the other ones.
 *
 * What to do with things like rootWithContextContains?
 * Do we think they should start with an underscore (because root is no property)?
 * We could forbid the user to configure filters with arbitrary names and say:
 *  * your filter has to start with an underscore
 *  * OR it has to start with a property name, followed by an underscore and then some capitals
 *    to help 'custom filters' to also follow the '<property>_<operator>' spec.
 *
 * It could be that we'll provide more options in the mapping section of sri4node config
 * to control aliases and default values maybe (if they don't exist already)
 *
 * With rewriting, can we support easy-to-use params for everything with a start- and an enddate?
 * like _ACTIVE=true&_DATE=2021-09-07
 * can/should this be translated in (default date would be 'now') startDate_LTE=<now>&endDate_GTE=now
 * (in the case of dates we mstly assume that null means an open-ended period, so it's still running)
 * so endDate_GTEN (greater than or equal to or null)
 * (normalizing it to ?(startDate_GTE=...;startDate_ISNULL) is no option I guess)
 *
 * Why I use the term 'normalized url':
 * https://en.wikipedia.org/wiki/Canonical_form#Computing
 * "In computing, the reduction of data to any kind of canonical form is commonly called data normalization."
 * also check: https://en.wikipedia.org/wiki/Canonical_form
 *
 * @param {object} sri4nodeConfigObject the sri4node config (and mainly the mapping section)
 *                                      holds most info we need to know
 * @param {boolean} flat if true, will generate a 'flat' parseTree, otherwise a non-flat parseTree
 *                       (filters grouped per type) will be generated
 */
function hrefToParsedObjectFactory(sriConfig = { resources: [], databaseConnectionParameters: {} }, flat = false) {
    const parseQueryStringPartByPart = "PART_BY_PART"; // 'PARTBYPART';
    // assuming sriConfig will always be the same, we optimize with
    // some simple memoization of a few calculated helper data structures
    if (hrefToParsedObjectFactoryThis.sriConfig !== sriConfig) {
        try {
            hrefToParsedObjectFactoryThis.sriConfig = sriConfig;
            hrefToParsedObjectFactoryThis.mappingByPathMap = Object.fromEntries(sriConfig.resources.map((r) => [r.type, r]));
            hrefToParsedObjectFactoryThis.flattenedJsonSchemaByPathMap = Object.fromEntries(sriConfig.resources.map((r) => [r.type, schemaUtils.flattenJsonSchema(r.schema)]));
            hrefToParsedObjectFactoryThis.flatQueryStringParserByPathMap = Object.fromEntries(sriConfig.resources.map((r) => {
                const grammar = flatUrlParser.generateFlatQueryStringParserGrammar(hrefToParsedObjectFactoryThis.flattenedJsonSchemaByPathMap[r.type]);
                try {
                    // console.log(`${r.type} GRAMMAR`);
                    // console.log(`=================`);
                    // console.log(grammar);
                    switch (parseQueryStringPartByPart) {
                        case "NORMAL":
                            return [r.type, generateQueryStringParser(grammar)];
                        case "PART_BY_PART":
                            return [r.type, generateQueryStringParser(grammar, ["QueryStringPart"])];
                        case "VALUES_APART":
                            return [
                                r.type,
                                {
                                    filterParser: generateQueryStringParser(grammar, ["FilterName"]),
                                    singleValueParser: generateQueryStringParser(grammar, ["SingleValue"]),
                                    multiValueParser: generateQueryStringParser(grammar, ["MultiValue"]),
                                },
                            ];
                        default:
                            throw new Error(`parseQueryStringPartByPart has an unsupported value (${parseQueryStringPartByPart})`);
                    }
                }
                catch (e) {
                    console.log(pegSyntaxErrorToErrorMessage(e, grammar));
                    throw e;
                }
            }));
            hrefToParsedObjectFactoryThis.nonFlatQueryStringParserByPathMap = Object.fromEntries(sriConfig.resources.map((r) => {
                // const grammar = generateNonFlatQueryStringParserGrammar(hrefToParsedObjectFactoryThis.flattenedJsonSchemaByPathMap[r.type], sriConfig);
                try {
                    // return [r.type, generateQueryStringParser(grammar)];
                    // sriConfigDefaults?:{ defaultlimit: number, [k:string]: any }, sriConfigResourceDefinition?:ResourceDefinition, allowedStartRules
                    return [r.type, (0, non_flat_url_parser_1.generateNonFlatQueryStringParser)(sriConfig, r)];
                }
                catch (e) {
                    // console.log(pegSyntaxErrorToErrorMessage(e, grammar));
                    console.log(pegSyntaxErrorToErrorMessage(e));
                    throw e;
                }
            }));
        }
        catch (e) {
            delete hrefToParsedObjectFactoryThis.sriConfig;
            console.log("Uh oh, something went wrong while setting up flattenedJsonSchema and parsers");
            console.log(pegSyntaxErrorToErrorMessage(e));
            throw e;
        }
    }
    if (flat) {
        return function hrefToFlatParsedObject(href) {
            const urlToWorkOn = new url_1.URL(`https://domain.com${href}`);
            const searchParamsToWorkOn = urlToWorkOn.searchParams;
            const flatQueryStringParser = hrefToParsedObjectFactoryThis.flatQueryStringParserByPathMap[urlToWorkOn.pathname];
            try {
                const parseTree = {
                    NORMAL: () => flatQueryStringParser.parse(searchParamsToWorkOn.toString()),
                    PART_BY_PART: () => [...searchParamsToWorkOn.entries()].map(([k, v]) => flatQueryStringParser.parse(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`)),
                    // TODO !!!
                    VALUES_APART: () => [...searchParamsToWorkOn.entries()].map(([k, v]) => {
                        const _a = flatQueryStringParser.filterParser.parse(encodeURIComponent(k)), { expectedValue } = _a, parsedFilter = __rest(_a, ["expectedValue"]);
                        // now that we know if the expected input is an array or not, we can parse it as such
                        const value = flatQueryStringParser.valueParser.parse(encodeURIComponent(v), [
                            expectedValue.inputShouldBeArray ? "MultiValue" : "SingleValue",
                        ]);
                        return Object.assign(Object.assign({}, parsedFilter), { value });
                    }),
                }[parseQueryStringPartByPart]();
                const missingDefaultsParseTree = generateMissingDefaultsForParseTree(parseTree, hrefToParsedObjectFactoryThis.mappingByPathMap[urlToWorkOn.pathname]);
                // validateQueryParam(
                //   '_LIMIT',
                //   limit => limit < (mapping.maxlimit || MAX_LIMIT),
                //   limit => `Limit of ${limit} is higher than configured max limit of ${mapping.maxlimit}`
                // );
                // validateQueryParam(
                //   '_EXPANSION',
                //   expansion => ['NONE','FULL','SUMMARY'].includes(expansion),
                //   expansion => `_EXPAND=${expansion} is not one of 'NONE','FULL','SUMMARY'`,
                // );
                const normalizedParseTree = sortUrlQueryParamParseTree([
                    ...parseTree,
                    ...missingDefaultsParseTree,
                ])
                    // remove 'expectedValue' to make sure tests still work
                    .map((x) => {
                    const { expectedValue: _expectedValue } = x, rest = __rest(x, ["expectedValue"]);
                    return rest;
                });
                const parsedUrlObject = {
                    parseTree: normalizedParseTree,
                    // TODO normalizedUrl: urlQueryStringParseTreeToNormalizedURLSearchParams(parseTree),
                };
                return parsedUrlObject;
            }
            catch (e) {
                // console.log('href parse error', e.message, e);
                console.log(pegSyntaxErrorToErrorMessage(e, searchParamsToWorkOn.toString()));
                throw e;
            }
        };
    }
    return function hrefToNonFlatParsedObject(href) {
        const urlToWorkOn = new url_1.URL(href, "https://domain.com");
        const searchParamsToWorkOn = urlToWorkOn.searchParams;
        const nonFlatQueryStringParser = hrefToParsedObjectFactoryThis.nonFlatQueryStringParserByPathMap[urlToWorkOn.pathname];
        try {
            const parseTree = nonFlatQueryStringParser.parse(searchParamsToWorkOn.toString());
            // validateQueryParam(
            //   '_LIMIT',
            //   limit => limit < (mapping.maxlimit || MAX_LIMIT),
            //   limit => `Limit of ${limit} is higher than configured max limit of ${mapping.maxlimit}`
            // );
            // validateQueryParam(
            //   '_EXPANSION',
            //   expansion => ['NONE','FULL','SUMMARY'].includes(expansion),
            //   expansion => `_EXPAND=${expansion} is not one of 'NONE','FULL','SUMMARY'`,
            // );
            const parsedUrlObject = {
                parseTree,
                // TODO normalizedUrl: urlQueryStringParseTreeToNormalizedURLSearchParams(parseTree),
            };
            return parsedUrlObject;
        }
        catch (e) {
            // console.log('href parse error', e.message, e);
            console.log(pegSyntaxErrorToErrorMessage(e, searchParamsToWorkOn.toString()));
            throw e;
        }
    };
}
exports.hrefToParsedObjectFactory = hrefToParsedObjectFactory;
/**
 * @param sriRequest
 * @param recurse if set, return top sriRequest
 * @returns the parent sri request if it exists (otherwise the same request is returned!)
 */
function getParentSriRequest(sriRequest, recurse = false) {
    return sriRequest.parentSriRequest
        ? recurse
            ? getParentSriRequest(sriRequest.parentSriRequest)
            : sriRequest.parentSriRequest
        : sriRequest;
}
exports.getParentSriRequest = getParentSriRequest;
function installEMT(app) {
    app.use(emt.init((_req, _res) => {
        // Do nothing (empty function provided to avoid stdout logging for each request)
    }));
    return emt;
}
exports.installEMT = installEMT;
function setServerTimingHdr(sriRequest, property, value) {
    const parentSriRequest = getParentSriRequest(sriRequest);
    if (parentSriRequest.serverTiming === undefined) {
        parentSriRequest.serverTiming = {};
    }
    if (parentSriRequest.serverTiming[property] === undefined) {
        parentSriRequest.serverTiming[property] = value;
    }
    else {
        parentSriRequest.serverTiming[property] += value;
    }
}
exports.setServerTimingHdr = setServerTimingHdr;
function emtReportToServerTiming(req, res, sriRequest) {
    try {
        const report = emt.calculate(req, res);
        Object.keys(report.timers).forEach((timer) => {
            const duration = report.timers[timer].took;
            if (duration > 0 && timer !== "express-wrapper") {
                setServerTimingHdr(sriRequest, timer, duration);
            }
        });
    }
    catch (err) {
        error("[emtReportToServerTiming] it does not work anymore but why???", err);
        throw err;
    }
}
exports.emtReportToServerTiming = emtReportToServerTiming;
function createDebugLogConfigObject(logdebug) {
    if (logdebug === true) {
        // for backwards compability
        console.warn("\n\n\n------------------------------------------------------------------------------------------------------------------\n" +
            "The logdebug parameter has changed format. Before, debug logging was enabled by specifying the boolean value 'true'.\n" +
            "Now you need to provide a string with all the logchannels for which you want to receive debug logging (see the\n" +
            'sri4node documentation for more details ). For now "general,trace,requests,server-timing" is set as sensible default, \n' +
            "but please specify the preferred channels for which logging is requested.\n" +
            "------------------------------------------------------------------------------------------------------------------\n\n\n");
        return {
            channels: new Set(["general", "trace", "requests", "server-timing"]),
        };
    }
    if (logdebug === false) {
        return { channels: new Set() };
    }
    const tempLogDebug = {
        channels: logdebug.channels === "all" ? "all" : new Set(logdebug.channels),
    };
    if (logdebug.statuses) {
        tempLogDebug.statuses = new Set(logdebug.statuses);
    }
    return tempLogDebug;
}
exports.createDebugLogConfigObject = createDebugLogConfigObject;
function handleRequestDebugLog(status) {
    const reqId = express_http_context_1.default.get("reqId");
    if (global.sri4node_configuration.logdebug.statuses.has(status)) {
        logBuffer[reqId].forEach((e) => console.log(e));
    }
    delete logBuffer[reqId];
}
exports.handleRequestDebugLog = handleRequestDebugLog;
function urlToTypeAndKey(urlToParse) {
    var _a;
    if (typeof urlToParse !== "string") {
        throw new Error(`urlToTypeAndKey requires a string argument instead of ${urlToParse}`);
    }
    const parsedUrl = url_2.default.parse(urlToParse);
    const pathName = (_a = parsedUrl.pathname) === null || _a === void 0 ? void 0 : _a.replace(/\/$/, "");
    const parts = pathName === null || pathName === void 0 ? void 0 : pathName.split("/");
    const type = lodash_1.default.initial(parts).join("/");
    const key = lodash_1.default.last(parts);
    return { type, key };
}
exports.urlToTypeAndKey = urlToTypeAndKey;
// 2 functions below are COPIED FROM beveiliging_nodejs --> TODO: remove them there and use the version here
/**
 * Unfortunatly we seems to have generated invalid UUIDs in the past.
 * (we even have uuids with invalid version like /organisations/efeb7119-60e4-8bd7-e040-fd0a059a2c55)
 * Therefore we cannot use a strict uuid checker like the npm module 'uuid-validate' but do we have to be less strict.
 *
 * @param uuid
 * @returns true or false
 */
function isUuid(uuid) {
    return uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/) != null;
}
exports.isUuid = isUuid;
/**
 * @deprecated
 *
 * It is being used nowhere (maybe in some plugin?)
 *
 * Translates an href into an object containing base, id, query, comment
 * example: /things/<guid>?expand=subthings#somehash will become
 * { base: '/things', id: '<guid>', query: 'expand=subthing', comment: 'somehash' }
 * @param u: an href
 * @returns the parsed url
 */
function parseResource(u) {
    if (!u) {
        return null;
    }
    const [u1, comment] = u.includes("#") ? u.split("#/") : [u, null];
    if (u1.includes("?")) {
        const splittedUrl = u1.split("?");
        return {
            base: splittedUrl[0],
            id: null,
            query: splittedUrl[1],
            comment,
        };
    }
    const pp = path_1.default.parse(u1);
    if (isUuid(pp.name)) {
        return {
            base: pp.dir,
            id: pp.name,
            query: null,
            comment,
        };
    }
    return {
        base: `${pp.dir !== "/" ? pp.dir : ""}/${pp.name}`,
        id: null,
        query: null,
        comment,
    };
}
exports.parseResource = parseResource;
function errorAsCode(s) {
    // return any string as code for REST API error object.
    let ret = s;
    ret = ret.replace(/".*"/, "");
    ret = ret.toLowerCase().trim();
    ret = ret.replace(/[^a-z0-9 ]/gim, "");
    ret = ret.replace(/ /gim, ".");
    return ret;
}
exports.errorAsCode = errorAsCode;
/**
 * Converts the configuration object for sri4node into an array per resource type
 */
function typeToConfig(config) {
    return config.reduce((acc, c) => {
        acc[c.type] = c;
        return acc;
    }, {});
}
exports.typeToConfig = typeToConfig;
/**
 * @param type the string used as 'type' in the sriConfig resources
 * @returns the resource definition record from the active sriConfig
 */
function typeToMapping(type) {
    return typeToConfig(global.sri4node_configuration.resources)[type];
}
exports.typeToMapping = typeToMapping;
function sqlColumnNames(mapping, summary = false) {
    const columnNames = summary
        ? Object.keys(mapping.map).filter((c) => !(mapping.map[c].excludeOn !== undefined &&
            mapping.map[c].excludeOn.toLowerCase() === "summary"))
        : Object.keys(mapping.map);
    return `${(columnNames.includes("key") ? "" : '"key",') + columnNames.map((c) => `"${c}"`).join(",")}, "$$meta.deleted", "$$meta.created", "$$meta.modified", "$$meta.version"`;
}
exports.sqlColumnNames = sqlColumnNames;
/**
 * @param row the database row
 * @param resourceMapping the applicable resource definition from the sriConfig object
 * @returns the json object as returned by the api
 */
function transformRowToObject(row, resourceMapping) {
    const map = resourceMapping.map || {};
    const element = {};
    element.$$meta = {};
    Object.keys(map).forEach((key) => {
        var _a, _b;
        if (map[key].references) {
            const referencedType = map[key].references;
            if (row[key] !== null) {
                element[key] = {
                    href: `${referencedType}/${row[key]}`,
                };
            }
            else {
                element[key] = null;
            }
        }
        else if (key.startsWith("$$meta.")) {
            element.$$meta[key.split("$$meta.")[1]] = row[key];
        }
        else {
            element[key] = row[key];
        }
        (_b = (_a = map[key]) === null || _a === void 0 ? void 0 : _a.columnToField) === null || _b === void 0 ? void 0 : _b.forEach((f) => f(key, element));
    });
    Object.assign(element.$$meta, lodash_1.default.pickBy({
        // keep only properties with defined non-null value (requires lodash - behaves different as underscores _.pick())
        deleted: row["$$meta.deleted"],
        created: row["$$meta.created"],
        modified: row["$$meta.modified"],
    }));
    element.$$meta.permalink = `${resourceMapping.type}/${row.key}`;
    element.$$meta.version = row["$$meta.version"];
    return element;
}
exports.transformRowToObject = transformRowToObject;
/**
 * Function which verifies wether for all properties specified in the sri4node configuration
 * there exists a column in the database.
 * An improvement might be to also check if the types
 * @param sriConfig sri4node configuration object
 * @returns nothing, throw an error in case something is wrong
 */
function checkSriConfigWithDb(sriConfig, informationSchema) {
    sriConfig.resources.forEach((resourceMapping) => {
        const map = resourceMapping.map || {};
        Object.keys(map).forEach((key) => {
            if (informationSchema[resourceMapping.type][key] === undefined) {
                const dbFields = Object.keys(informationSchema[resourceMapping.type]).sort();
                const caseInsensitiveIndex = dbFields
                    .map((c) => c.toLowerCase())
                    .indexOf(key.toLowerCase());
                if (caseInsensitiveIndex >= 0) {
                    console.error(`\n[CONFIGURATION PROBLEM] No database column found for property '${key}' as specified in sriConfig of resource '${resourceMapping.type}'. It is probably a case mismatch because we did find a column named '${dbFields[caseInsensitiveIndex]}'instead.`);
                }
                else {
                    console.error(`\n[CONFIGURATION PROBLEM] No database column found for property '${key}' as specified in sriConfig of resource '${resourceMapping.type}'. All available column names are ${dbFields.join(", ")}`);
                }
                throw new Error("mismatch.between.sri.config.and.database");
            }
        });
    });
}
exports.checkSriConfigWithDb = checkSriConfigWithDb;
/**
 * @param obj the api object
 * @param resourceMapping the applicable resource definition from the sriConfig object
 * @param isNewResource boolean indicating that the resource doesn't exist yet
 * @returns a row to be saved on the database
 */
function transformObjectToRow(obj, resourceMapping, isNewResource) {
    const map = resourceMapping.map || {};
    const row = {};
    Object.keys(map).forEach((key) => {
        if (map[key].references && obj[key] !== undefined) {
            const permalink = obj[key].href;
            if (!permalink) {
                throw new typeDefinitions_1.SriError({
                    status: 409,
                    errors: [
                        {
                            code: "no.href.inside.reference",
                            msg: `No href found inside reference ${key}`,
                        },
                    ],
                });
            }
            const expectedType = map[key].references;
            const { type: refType, key: refKey } = urlToTypeAndKey(permalink);
            if (refType === expectedType) {
                row[key] = refKey;
            }
            else {
                const msg = `Faulty reference detected [${permalink}], detected [${refType}] expected [${expectedType}].`;
                console.log(msg);
                throw new typeDefinitions_1.SriError({
                    status: 409,
                    errors: [{ code: "faulty.reference", msg }],
                });
            }
        }
        else if (obj[key] !== undefined) {
            row[key] = obj[key];
        }
        else {
            // explicitly set missing properties to null (https://github.com/katholiek-onderwijs-vlaanderen/sri4node/issues/118)
            row[key] = null;
        }
        if (map[key].fieldToColumn) {
            map[key].fieldToColumn.forEach((f) => f(key, row, isNewResource));
        }
        const fieldTypeDb = global.sri4node_configuration.informationSchema[resourceMapping.type][key].type;
        if (fieldTypeDb === "jsonb") {
            if (row[key] !== null) {
                // do not stringify null, it ends up in the db as 'null'
                row[key] = JSON.stringify(row[key]);
            }
        }
    });
    return row;
}
exports.transformObjectToRow = transformObjectToRow;
/**
 * Here we initalize the instance of the pgPromise LIBRARY.
 *
 * For some reason, setting the default schema is done on the library level
 * instead of the connection level...
 *
 * @param pgpInitOptions
 * @param extraOptions
 */
function pgInit(pgpInitOptions = {}, extraOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        const pgpInitOptionsUpdated = Object.assign(Object.assign({ schema: extraOptions.schema }, pgpInitOptions), { connect: extraOptions.connectionInitSql === undefined
                ? pgpInitOptions.connect
                : (client, dc, useCount) => {
                    if (useCount === 0) {
                        client.query(extraOptions.connectionInitSql);
                    }
                    if (pgpInitOptions.connect) {
                        pgpInitOptions.connect(client, dc, useCount);
                    }
                } });
        pgp = (0, pg_promise_1.default)(pgpInitOptionsUpdated);
        // const pgMonitor = process.env.PGP_MONITOR === 'true' || (global.sri4node_configuration && global.sri4node_configuration.pgMonitor===true);
        if (extraOptions.monitor) {
            pg_monitor_1.default.attach(pgpInitOptionsUpdated);
        }
        // The node pg library assumes by default that values of type 'timestamp without time zone' are in local time.
        //   (a deliberate choice, see https://github.com/brianc/node-postgres/issues/429)
        // In the case of sri4node storing in UTC makes more sense as input data arrives in UTC format. Therefore we
        // override the pg handler for type 'timestamp without time zone' with one that appends a 'Z' before conversion
        // to a JS Date object to indicate UTC.
        if (pgp) {
            pgp.pg.types.setTypeParser(1114, (s) => new Date(`${s}Z`));
            pgp.pg.types.setTypeParser(1184, (s) => {
                const match = s.match(/\.\d\d\d(\d{0,3})\+/);
                let microseconds = "";
                if (match !== null) {
                    microseconds = match[1];
                }
                const isoWithoutMicroseconds = new Date(s).toISOString();
                const isoWithMicroseconds = `${isoWithoutMicroseconds.substring(0, isoWithoutMicroseconds.length - 1) + microseconds}Z`;
                return isoWithMicroseconds;
            });
            pgp.pg.types.setTypeParser(20, BigInt);
            pgp.pg.types.setTypeParser(1700, (val) => parseFloat(val));
            BigInt.prototype.toJSON = function () {
                return this.toString();
            };
        }
        else {
            throw "pgPromise not initialized!";
        }
    });
}
exports.pgInit = pgInit;
/**
 * The mechanism to know how to connect to the DB used to be messy,
 * with one config property called defaultdatabaseurl,
 * next to another mechanism that read the databaseurl from the environment variables
 * but the only way to pass a schema being through environment variables.
 *
 * We want a single mechanism to configure sri4node, and that is through a json-object.
 *
 * Also: sri4node only supported a connection string, whereas the underlying node-postgres
 * library also supports a connection object.
 *
 * So the new mechanism will simply pass the section about the database from the config-object
 * (maybe filling in a few defaults where properties are missing) to the pg library.
 * This way we not only support a connection string but also other ways of connecting to the database.
 *
 * What about schema? Shouldn't that simply be running 'set search_path=...'
 * on any new connection before handing it over to someone to use it?
 *
 * @param sriConfig sriConfig object
 * @returns {pgPromise.IDatabase} the database connection
 */
function pgConnect(sri4nodeConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        // WARN WHEN USING OBSOLETE PROPETIES IN THE CONFIG
        if (sri4nodeConfig.defaultdatabaseurl !== undefined) {
            console.warn("defaultdatabaseurl config property has been deprecated, use databaseConnectionParameters.connectionString instead");
            // throw new Error('defaultdatabaseurl config property has been deprecated, use databaseConnectionParameters.connectionString instead');
        }
        if (sri4nodeConfig.maxConnections) {
            // maximum size of the connection pool: sri4nodeConfig.databaseConnectionParameters.max
            console.warn("maxConnections config property has been deprecated, use databaseConnectionParameters.max instead");
        }
        if (sri4nodeConfig.dbConnectionInitSql) {
            // maximum size of the connection pool: sri4nodeConfig.databaseConnectionParameters.max
            console.warn("dbConnectionInitSql config property has been deprecated, use databaseConnectionParameters.connectionInitSql instead");
        }
        if (process.env.PGP_MONITOR) {
            // maximum size of the connection pool: sri4nodeConfig.databaseConnectionParameters.max
            console.warn("environemtn variable PGP_MONITOR has been deprecated, set config property databaseLibraryInitOptions.pgMonitor to true instead");
        }
        // FIRST INITIALIZE THE LIBRARY IF IT HASN'T BEEN INITIALIZED BEFORE
        if (!pgp) {
            const extraOptions = {
                schema: sri4nodeConfig.databaseConnectionParameters.schema,
                monitor: sri4nodeConfig.enablePgMonitor === true,
                connectionInitSql: sri4nodeConfig.databaseConnectionParameters.connectionInitSql,
            };
            pgInit(sri4nodeConfig.databaseLibraryInitOptions, extraOptions);
        }
        // this should ideally be be a simple clone of sri4nodeConfig.databaseConnectionParameters but
        // there is a bit of messing about going on afterwards to turn it into the actual connection object
        const cn = Object.assign({ 
            // first some defaults, but override them with whatever is in the config
            max: 16, connectionTimeoutMillis: 2000, idleTimeoutMillis: 14400000 }, sri4nodeConfig.databaseConnectionParameters);
        console.log(`Using database connection object : [${JSON.stringify(cn)}]`);
        return pgp(cn);
    });
}
exports.pgConnect = pgConnect;
/**
 * @type {{ name: string, text: string }} details
 * @returns a prepared statement that can be used with tx.any() or similar functions
 */
function createPreparedStatement(details) {
    return new pgp.PreparedStatement(details);
}
exports.createPreparedStatement = createPreparedStatement;
// Q wrapper for executing SQL statement on a node-postgres client.
//
// Instead the db object is a node-postgres Query config object.
// See : https://github.com/brianc/node-postgres/wiki/Client#method-query-prepared.
//
// name : the name for caching as prepared statement, if desired.
// text : The SQL statement, use $1,$2, etc.. for adding parameters.
// values : An array of java values to be inserted in $1,$2, etc..
//
// It returns a Q promise to allow chaining, error handling, etc.. in Q-style.
function pgExec(db, query, sriRequest) {
    return __awaiter(this, void 0, void 0, function* () {
        const { sql, values } = query.toParameterizedSql();
        debug("sql", () => pgp === null || pgp === void 0 ? void 0 : pgp.as.format(sql, values));
        const hrstart = process.hrtime();
        const result = yield db.query(sql, values);
        const hrElapsed = process.hrtime(hrstart);
        if (sriRequest) {
            setServerTimingHdr(sriRequest, "db", hrtimeToMilliseconds(hrElapsed));
        }
        return result;
    });
}
exports.pgExec = pgExec;
function pgResult(db, query, sriRequest) {
    return __awaiter(this, void 0, void 0, function* () {
        const { sql, values } = query.toParameterizedSql();
        debug("sql", () => pgp === null || pgp === void 0 ? void 0 : pgp.as.format(sql, values));
        const hrstart = process.hrtime();
        const result = yield db.result(sql, values);
        const hrElapsed = process.hrtime(hrstart);
        if (sriRequest) {
            setServerTimingHdr(sriRequest, "db", hrtimeToMilliseconds(hrElapsed));
        }
        return result;
    });
}
exports.pgResult = pgResult;
function startTransaction(db, mode = new pgp.txMode.TransactionMode()) {
    return __awaiter(this, void 0, void 0, function* () {
        debug("db", "++ Starting database transaction.");
        const eventEmitter = new events_1.default();
        const txWrapper = (emitter) => __awaiter(this, void 0, void 0, function* () {
            // This wrapper run async without being awaited. This has some consequences:
            //   * errors are not passed the usual way, but via the 'tDone' event
            //   * debug() does not log the correct reqId
            try {
                yield db.tx({ mode }, (tx) => __awaiter(this, void 0, void 0, function* () {
                    emitter.emit("txEvent", tx);
                    const how = yield (0, p_event_1.default)(emitter, "terminate");
                    if (how === "reject") {
                        throw "txRejected";
                    }
                }));
                emitter.emit("txDone");
            }
            catch (err) {
                // 'txRejected' as err is expected behaviour in case rejectTx is called
                //
                // Other possible "expected" error is the error which occurs after a db
                // connection error (which already resulted in error for the current
                // request). In that case the transaction rollback also generates
                // an error, which we will ignore (unfortunatly pg-promise does nog use
                // an error code so we need to check on the error message).
                if (err === "txRejected" ||
                    (err.message === "Client has encountered a connection error and is not queryable" &&
                        err.query === "rollback")) {
                    emitter.emit("txDone");
                }
                else {
                    emitter.emit("txDone", err);
                }
            }
        });
        try {
            const tx = yield new Promise((resolve, reject) => {
                let resolved = false;
                eventEmitter.on("txEvent", (tx) => {
                    resolve(tx);
                    resolved = true;
                });
                eventEmitter.on("txDone", (err) => {
                    // ignore undefined error, happens at
                    if (!resolved) {
                        console.log("GOT ERROR:");
                        console.log(err);
                        console.log(JSON.stringify(err));
                        reject(err);
                    }
                });
                txWrapper(eventEmitter);
            });
            debug("db", "Got db tx object.");
            yield tx.none("SET CONSTRAINTS ALL DEFERRED;");
            const terminateTx = (how) => () => __awaiter(this, void 0, void 0, function* () {
                if (how !== "reject") {
                    yield tx.none("SET CONSTRAINTS ALL IMMEDIATE;");
                }
                eventEmitter.emit("terminate", how);
                const res = yield (0, p_event_1.default)(eventEmitter, "txDone");
                if (res !== undefined) {
                    throw res;
                }
            });
            return {
                tx,
                resolveTx: terminateTx("resolve"),
                rejectTx: terminateTx("reject"),
            };
        }
        catch (err) {
            error("CAUGHT ERROR: ");
            error(JSON.stringify(err), err);
            throw new typeDefinitions_1.SriError({
                status: 503,
                errors: [
                    {
                        code: "too.busy",
                        msg: "The request could not be processed as the database is too busy right now. Try again later.",
                    },
                ],
            });
        }
    });
}
exports.startTransaction = startTransaction;
function startTask(db) {
    return __awaiter(this, void 0, void 0, function* () {
        debug("db", "++ Starting database task.");
        const emitter = new events_1.default();
        const taskWrapper = (emitter) => __awaiter(this, void 0, void 0, function* () {
            // This wrapper run async without being awaited. This has some consequences:
            //   * errors are not passed the usual way, but via the 'tDone' event
            //   * debug() does not log the correct reqId
            try {
                yield db.task((t) => __awaiter(this, void 0, void 0, function* () {
                    emitter.emit("tEvent", t);
                    yield (0, p_event_1.default)(emitter, "terminate");
                }));
                emitter.emit("tDone");
            }
            catch (err) {
                emitter.emit("tDone", err);
            }
        });
        try {
            const t = yield new Promise((resolve, reject) => {
                emitter.on("tEvent", (t) => {
                    resolve(t);
                });
                emitter.on("tDone", (err) => {
                    reject(err);
                });
                taskWrapper(emitter);
            });
            debug("db", "Got db t object.");
            const endTask = () => __awaiter(this, void 0, void 0, function* () {
                emitter.emit("terminate");
                const res = yield (0, p_event_1.default)(emitter, "tDone");
                debug("db", "db task done.");
                if (res !== undefined) {
                    throw res;
                }
            });
            return { t, endTask };
        }
        catch (err) {
            error("CAUGHT ERROR: ");
            error(JSON.stringify(err));
            throw new typeDefinitions_1.SriError({
                status: 503,
                errors: [
                    {
                        code: "too.busy",
                        msg: "The request could not be processed as the database is too busy right now. Try again later.",
                    },
                ],
            });
        }
    });
}
exports.startTask = startTask;
function installVersionIncTriggerOnTable(db, tableName, schemaName) {
    return __awaiter(this, void 0, void 0, function* () {
        // 2023-09: at a certain point we added the schemaname to the triggername which causes problems when
        // copying a database to another schema (trigger gets created twice), so we'll use the
        const tgNameToBeDropped = `vsko_resource_version_trigger_${schemaName !== undefined ? schemaName : ""}_${tableName}`;
        const tgname = `vsko_resource_version_trigger_${tableName}`;
        // we should respect the search_path I guess instead of assuming 'public', but for now...
        const schemaNameOrPublic = schemaName !== undefined ? schemaName : "public";
        const plpgsql = `
    DO $___$
    BEGIN
      -- 1. add column '$$meta.version' if not yet present
      IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
          AND column_name = '$$meta.version'
          AND table_schema = '${schemaNameOrPublic}'
          -- ${schemaName !== undefined ? `AND table_schema = '${schemaName}'` : ""}
      ) THEN
        ALTER TABLE "${schemaNameOrPublic}"."${tableName}" ADD "$$meta.version" integer DEFAULT 0;
      END IF;

      -- 2. create func vsko_resource_version_inc_function if not yet present
      IF NOT EXISTS (SELECT proname from pg_proc p INNER JOIN pg_namespace ns ON (p.pronamespace = ns.oid)
                      WHERE proname = 'vsko_resource_version_inc_function'
                        AND nspname = '${schemaNameOrPublic}'
                    ) THEN
        CREATE FUNCTION "${schemaNameOrPublic}".vsko_resource_version_inc_function() RETURNS TRIGGER AS '
        BEGIN
          NEW."$$meta.version" := OLD."$$meta.version" + 1;
          RETURN NEW;
        END' LANGUAGE 'plpgsql';
      END IF;

      -- 3. drop old triggers if they exist
      DROP TRIGGER IF EXISTS "${tgNameToBeDropped}" on "${schemaNameOrPublic}"."${tableName}";

      -- 4. create trigger 'vsko_resource_version_trigger_${tableName}' if not yet present
      IF NOT EXISTS (
          SELECT 1 FROM information_schema.triggers
          WHERE trigger_name = '${tgname}'
	          AND trigger_schema = '${schemaNameOrPublic}'
            AND event_object_table = '${tableName}'
          -- OBSOLETE (does not check for schema and tablenam): SELECT 1 FROM pg_trigger WHERE tgname = '${tgname}'
        ) THEN
          CREATE TRIGGER ${tgname} BEFORE UPDATE ON "${schemaNameOrPublic}"."${tableName}"
          FOR EACH ROW EXECUTE PROCEDURE "${schemaNameOrPublic}".vsko_resource_version_inc_function();
      END IF;
    END
    $___$
    LANGUAGE 'plpgsql';
  `;
        yield db.query(plpgsql);
    });
}
exports.installVersionIncTriggerOnTable = installVersionIncTriggerOnTable;
function getCountResult(tx, countquery, sriRequest) {
    return __awaiter(this, void 0, void 0, function* () {
        const [{ count }] = yield pgExec(tx, countquery, sriRequest);
        return parseInt(count, 10);
    });
}
exports.getCountResult = getCountResult;
/**
 * Given a single resource definition from sriConfig.resources
 * returns the corresponding database table.
 * @param mapping
 * @returns the correponding database table name
 */
function tableFromMapping(mapping) {
    return mapping.table || lodash_1.default.last(mapping.type.split("/"));
}
exports.tableFromMapping = tableFromMapping;
function isEqualSriObject(obj1, obj2, mapping) {
    const relevantProperties = Object.keys(mapping.map);
    function customizer(val, key, _obj) {
        var _a;
        if (((_a = findPropertyInJsonSchema(mapping.schema, key)) === null || _a === void 0 ? void 0 : _a.format) === "date-time") {
            return new Date(val).getTime();
        }
        if (global.sri4node_configuration.informationSchema[mapping.type][key] &&
            global.sri4node_configuration.informationSchema[mapping.type][key].type === "bigint") {
            return BigInt(val);
        }
    }
    const o1 = lodash_1.default.cloneDeepWith(lodash_1.default.pickBy(obj1, (val, key) => val !== null && val != undefined && relevantProperties.includes(key)), customizer);
    const o2 = lodash_1.default.cloneDeepWith(lodash_1.default.pickBy(obj2, (val, key) => val !== null && val != undefined && relevantProperties.includes(key)), customizer);
    return lodash_1.default.isEqualWith(o1, o2);
}
exports.isEqualSriObject = isEqualSriObject;
function stringifyError(e) {
    if (e instanceof Error) {
        return e.toString();
    }
    return JSON.stringify(e);
}
exports.stringifyError = stringifyError;
function settleResultsToSriResults(results) {
    return results.map((res) => {
        var _a, _b;
        if (res.isFulfilled) {
            return res.value;
        }
        const err = res.reason;
        if (err instanceof typeDefinitions_1.SriError || ((_b = (_a = err === null || err === void 0 ? void 0 : err.__proto__) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name) === "SriError") {
            return err;
        }
        error("____________________________ E R R O R (settleResultsToSriResults)_________________________");
        error(stringifyError(err));
        if (err && err.stack) {
            error("STACK:");
            error(err.stack);
        }
        error("___________________________________________________________________________________________");
        return new typeDefinitions_1.SriError({
            status: 500,
            errors: [
                {
                    code: "internal.server.error",
                    msg: `Internal Server Error. [${stringifyError(err)}}]`,
                },
            ],
        });
    });
}
exports.settleResultsToSriResults = settleResultsToSriResults;
function createReadableStream(objectMode = true) {
    const s = new stream_1.Readable({ objectMode });
    s._read = function () {
        // Do nothing
    };
    return s;
}
exports.createReadableStream = createReadableStream;
function getParentSriRequestFromRequestMap(sriRequestMap, recurse = false) {
    const sriRequest = Array.from(sriRequestMap.values())[0];
    return getParentSriRequest(sriRequest, recurse);
}
exports.getParentSriRequestFromRequestMap = getParentSriRequestFromRequestMap;
function getPgp() {
    return pgp;
}
exports.getPgp = getPgp;
/**
 * This function will generate a new SriRequest object, based on some parameters.
 * Since the SriRequest is some kind of 'abstraction' over the express request,
 * which was introduced in order to be able to reuse the same code for operations
 * that would run from inside a batch request for example, this method will be called
 * from multiple places: once when a regular api request gets initated, but in case of
 * a batch, also once per every 'inner request' inside that batch.
 * There is also the possibility for plugins for example to do something like a
 * 'regular API request' but from within an already running request (imagine one update
 * would also trigger an update on another resource) but withint the same transaction.
 *
 * All these different use-cases produce different SriRequest objects, and need different input,
 * but I wanted to bring everything together in 1 function to make it easier to have an overview +
 * to make it easier to manage the stuff that is the same regardless of the mechanism.
 *
 * @param {object} expressRequest: needed for creating a basic SriRequest object
 * @param {object} expressResponse: needed for creating a basic SriRequest object
 *                  (if streaming mode = true)
 * @param {object} config: needed for creating a basic SriRequest object, of the form
 *                 { isBatchRequest: boolean, readOnly: boolean,
 *                   mapping: <single element from sri4node config 'mappings' section>}
 * @param {object} batchHandlerAndParams: an object as returned by batch/matchHref of the form
 *                 { path, routeParams, queryParams,
 *                   handler: [path, verb, func, config, mapping, streaming, readOnly, isBatch] }
 * @param {TSriRequest} parentSriRequest: needed when inside a batch or when called as
 *                     sri4node_internal_interface
 * @param {BatchElement} batchElement: needed when creating a 'virtual' SriRequest that represents
 *                       1 request from inside a batch
 *
 * @returns {TSriRequest}
 */
function generateSriRequest(expressRequest = undefined, expressResponse = undefined, basicConfig = undefined, batchHandlerAndParams = undefined, parentSriRequest = undefined, batchElement = undefined, internalSriRequest = undefined) {
    var _a;
    const baseSriRequest = {
        id: (0, uuid_1.v4)(),
        logDebug: debug,
        logError: error,
        SriError: typeDefinitions_1.SriError,
        // context: {},
        parentSriRequest: parentSriRequest || (internalSriRequest === null || internalSriRequest === void 0 ? void 0 : internalSriRequest.parentSriRequest),
        path: "",
        query: {},
        params: {},
        sriType: undefined,
        isBatchRequest: undefined,
        readOnly: undefined,
        originalUrl: undefined,
        httpMethod: undefined,
        headers: {},
        body: undefined,
        dbT: (basicConfig === null || basicConfig === void 0 ? void 0 : basicConfig.dbT) || (internalSriRequest === null || internalSriRequest === void 0 ? void 0 : internalSriRequest.dbT) || (parentSriRequest === null || parentSriRequest === void 0 ? void 0 : parentSriRequest.dbT),
        inStream: new stream_2.default.Readable(),
        outStream: new stream_2.default.Writable(),
        setHeader: undefined,
        setStatus: undefined,
        streamStarted: undefined,
        protocol: undefined,
        isBatchPart: undefined,
        /**
         * serverTiming is an object used to accumulate timing data which is passed to the client in the response
         * as Server-Timing header (see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing).
         */
        serverTiming: {},
        /**
         * userData is an object which can be used by applications using sri4node to store information associated with
         * a request. It is initialized as an empty object.
         */
        userData: {},
    };
    if (internalSriRequest && !batchElement) {
        // internal interface
        // const batchHandlerAndParams = batch.matchHref(parentSriRequest.href, parentSriRequest.verb);
        return Object.assign(Object.assign({}, baseSriRequest), { 
            // parentSriRequest: parentSriRequest,
            originalUrl: internalSriRequest.href, path: batchHandlerAndParams.path, query: batchHandlerAndParams.queryParams, params: batchHandlerAndParams.routeParams, sriType: batchHandlerAndParams.handler.mapping.type, isBatchRequest: batchHandlerAndParams.handler.isBatch, readOnly: batchHandlerAndParams.handler.readOnly, httpMethod: internalSriRequest.verb, headers: internalSriRequest.headers ? internalSriRequest.headers : {}, body: internalSriRequest.body, dbT: internalSriRequest.dbT, inStream: internalSriRequest.inStream, outStream: internalSriRequest.outStream, setHeader: internalSriRequest.setHeader, setStatus: internalSriRequest.setStatus, streamStarted: internalSriRequest.streamStarted, protocol: "_internal_", isBatchPart: false, parentSriRequest: internalSriRequest.parentSriRequest });
    }
    if (parentSriRequest && batchElement) {
        // batch item
        // const batchHandlerAndParams = batchElement.match;
        return Object.assign(Object.assign(Object.assign({}, parentSriRequest), baseSriRequest), { dbT: parentSriRequest.dbT, originalUrl: batchElement.href, path: batchHandlerAndParams.path, query: batchHandlerAndParams.queryParams, params: batchHandlerAndParams.routeParams, httpMethod: batchElement.verb, body: batchElement.body == null
                ? null
                : lodash_1.default.isObject(batchElement.body)
                    ? batchElement.body
                    : JSON.parse(batchElement.body), sriType: batchHandlerAndParams.handler.mapping.type, isBatchPart: true });
    }
    if (expressRequest) {
        // a 'normal' request
        const generatedSriRequest = Object.assign(Object.assign({}, baseSriRequest), { path: expressRequest.path, originalUrl: expressRequest.originalUrl, query: expressRequest.query, params: expressRequest.params, httpMethod: expressRequest.method, headers: expressRequest.headers, protocol: expressRequest.protocol, body: expressRequest.body, isBatchPart: false, isBatchRequest: basicConfig === null || basicConfig === void 0 ? void 0 : basicConfig.isBatchRequest, readOnly: basicConfig === null || basicConfig === void 0 ? void 0 : basicConfig.readOnly, 
            // the batch code will set sriType for batch elements
            sriType: !(basicConfig === null || basicConfig === void 0 ? void 0 : basicConfig.isBatchRequest) ? (_a = basicConfig === null || basicConfig === void 0 ? void 0 : basicConfig.mapping) === null || _a === void 0 ? void 0 : _a.type : undefined });
        // adding sriRequest.dbT should still be done in code after this function
        // because for the normal case it is asynchronous, and I wanted to keep
        // this function synchronous as long as possible
        // ======================================================================
        if (basicConfig === null || basicConfig === void 0 ? void 0 : basicConfig.isStreamingRequest) {
            if (!expressResponse) {
                throw Error("[generateSriRequest] basicConfig.isStreamingRequest is true, but expressResponse argument is missing");
            }
            // use passthrough streams to avoid passing req and resp in sriRequest
            const inStream = new stream_2.default.PassThrough({
                allowHalfOpen: false,
                emitClose: true,
                highWaterMark: 64 << 20,
            });
            const outStream = new stream_2.default.PassThrough({
                allowHalfOpen: false,
                emitClose: true,
            });
            generatedSriRequest.inStream = expressRequest.pipe(inStream);
            generatedSriRequest.outStream = outStream.pipe(expressResponse);
            generatedSriRequest.setHeader = (k, v) => expressResponse.set(k, v);
            generatedSriRequest.setStatus = (s) => expressResponse.status(s);
            generatedSriRequest.streamStarted = () => expressResponse.headersSent;
            inStream.on("pause", () => debug("general", `uploads - [pause]  buffer full – ${expressRequest.originalUrl}`));
            inStream.on("resume", () => debug("general", `uploads - [resume] flow resumes – ${expressRequest.originalUrl}`));
            inStream.on("error", (err) => error("general", `uploads -[error]  ${expressRequest.originalUrl}: ${err}`));
            expressRequest.once("aborted", () => {
                debug("general", `uploads - [abort]  client dropped – ${expressRequest.originalUrl}`);
                inStream.destroy(new Error("client aborted"));
            });
        }
        return generatedSriRequest;
    }
    if (parentSriRequest && !batchElement) {
        // internal interface
        // const batchHandlerAndParams = batch.matchHref(parentSriRequest.href, parentSriRequest.verb);
        return Object.assign(Object.assign({}, baseSriRequest), { originalUrl: parentSriRequest.href, path: batchHandlerAndParams.path, query: batchHandlerAndParams.queryParams, params: batchHandlerAndParams.routeParams, sriType: batchHandlerAndParams.handler.mapping.type, isBatchRequest: batchHandlerAndParams.handler.isBatch, readOnly: batchHandlerAndParams.handler.readOnly, httpMethod: parentSriRequest.verb, headers: parentSriRequest.headers ? parentSriRequest.headers : {}, body: parentSriRequest.body, dbT: parentSriRequest.dbT, inStream: parentSriRequest.inStream, outStream: parentSriRequest.outStream, setHeader: parentSriRequest.setHeader, setStatus: parentSriRequest.setStatus, streamStarted: parentSriRequest.streamStarted, protocol: "_internal_", isBatchPart: false, parentSriRequest: parentSriRequest.parentSriRequest });
    }
    if (parentSriRequest && batchElement) {
        // batch item
        // const batchHandlerAndParams = batchElement.match;
        return Object.assign(Object.assign(Object.assign({}, parentSriRequest), baseSriRequest), { originalUrl: batchElement.href, path: batchHandlerAndParams.path, query: batchHandlerAndParams.queryParams, params: batchHandlerAndParams.routeParams, httpMethod: batchElement.verb, body: batchElement.body == null
                ? null
                : lodash_1.default.isObject(batchElement.body)
                    ? batchElement.body
                    : JSON.parse(batchElement.body), sriType: batchHandlerAndParams.handler.mapping.type, isBatchPart: true });
    }
    throw Error("[generateSriRequest] Unable to generate an SriRequest based on the given combination of parameters");
}
exports.generateSriRequest = generateSriRequest;
/**
 * This is a recursive function that can find a property definition in a json schema definition.
 * This will also work when you have oneOf or anyOf sections in your schema definition.
 *
 * @param schema
 * @param propertyName
 * @returns the part of the json schema where the requested property is defined or null
 *  if the property is not found
 */
function findPropertyInJsonSchema(schema, propertyName) {
    var _a;
    if ((_a = schema === null || schema === void 0 ? void 0 : schema.properties) === null || _a === void 0 ? void 0 : _a[propertyName]) {
        return schema.properties[propertyName];
    }
    const subSchemas = schema.anyOf || schema.allOf || schema.oneOf;
    if (subSchemas) {
        for (const subSchema of subSchemas) {
            const found = findPropertyInJsonSchema(subSchema, propertyName);
            if (found) {
                return found;
            }
        }
    }
    return null;
}
exports.findPropertyInJsonSchema = findPropertyInJsonSchema;
//# sourceMappingURL=common.js.map