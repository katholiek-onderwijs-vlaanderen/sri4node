/* Internal utilities for sri4node */
import { URL } from "url";
import pgPromise, { IDatabase, IMain, ITask } from "pg-promise";
import monitor from "pg-monitor";
import { Application, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import ajvAddFormats from "ajv-formats";

// import { DEFAULT_MAX_VERSION } from 'tls';
// import { generateFlatQueryStringParserGrammar } from './url_parsing/flat_url_parser';

import _ from "lodash";

import * as flatUrlParser from "./url_parsing/flat_url_parser";
import * as schemaUtils from "./schemaUtils";
import {
  TResourceDefinition,
  TSriConfig,
  TSriRequestExternal,
  IExtendedDatabaseConnectionParameters,
  TDebugChannel,
  TSriRequestInternal,
  THttpMethod,
  TDebugLogFunction,
  TErrorLogFunction,
  SriError,
  TLogDebugExternal,
  TInformationSchema,
  TSriInternalConfig,
  TLogDebugInternal,
  TResourceDefinitionInternal,
  RequiredExtra,
  TAfterReadHook,
  TSriInternalUtils,
  TSriRequest,
  TPgColumns,
} from "./typeDefinitions";
import { generateNonFlatQueryStringParser } from "./url_parsing/non_flat_url_parser";
import EventEmitter from "events";
import pEvent from "p-event";
import path from "path";
import stream from "stream";
import peggy from "peggy";
import httpContext from "express-http-context";
import * as emt from "./express-middleware-timer";
import { JSONSchema4 } from "json-schema";
import { IClient } from "pg-promise/typescript/pg-subset";
import { queryUtils } from "../sri4node";
import Ajv from "ajv";
import { prepareSQL } from "./queryObject";
import pMap from "p-map";
import pSettle from "p-settle";

/**
 * process.hrtime() method can be used to measure execution time, but returns an array
 *
 * @param {Array<Integer>} hrtime tuple [seconds, nanoseconds]
 * @returns the input translated to milliseconds
 */
function hrtimeToMilliseconds([seconds, nanoseconds]: [number, number]): number {
  return seconds * 1000 + nanoseconds / 1000000;
}

/**
 *
 * @param channel name of the channel
 * @param logdebug optional. If not set, we will always return true.
 * @returns true if the channel is enabled in the logdebug config, or if logdebug is not set
 */
const isLogChannelEnabled = (
  channel: TDebugChannel | string,
  logdebug: TLogDebugInternal = { channels: "all" },
): boolean => {
  return logdebug.channels === "all" || logdebug.channels?.has(channel) || false;
};

/**
 * @todo
 * Change this so that each httpContext will have its own logBuffer, so we can just
 * call httpContext.get("logBuffer") or something, and output that to the console at the end
 * of the request.
 * Another weird thing: the README says that logdebug.statuses means that we will only log
 * for the given statuses, but if I look at the current implementation, it feels like we will only
 * BUFFER the logs for the given statuses, and only output them at the end of the request.
 * In all otehr cases the logs will be output to the console rightaway.
 * The implementation of handleRequestDebugLog is also weird, because it will only output the logs
 * if the status is in the logdebug.statuses set, and do nothing at all if statuses is undefined.
 * Maybe we broke the implementation somewhere in the past, or maybe the README is wrong.
 *
 * Logging output: each debug call is 'tagged' with a 'channel' (first parameter).
 * If the 'channel' of a debug call is in the selected set of debug channels in the
 * sri4node configuration (logdebug.channels), output (second parameter) is logged.
 * Otherwise output is discared.
 * (see https://github.com/katholiek-onderwijs-vlaanderen/sri4node#logging for more
 * information).
 *
 * This function is available for sri4node plugins and applications using sri4node, which
 * are allowed to use logchannels of their own.
 *
 * @param channel one of the predefined log channels
 * @param output string or string generating function to log
 * @param logdebugConfig optional. If not set, we will always log the output.
 */
const debugAnyChannelAllowed: TDebugLogFunction = (
  channel,
  output,
  logdebugConfig?: TLogDebugInternal,
) => {
  if (isLogChannelEnabled(channel, logdebugConfig)) {
    const reqId: string = httpContext.get("reqId");
    const msg = `${new Date().toISOString()} ${reqId ? `[reqId:${reqId}]` : ""}[${channel}] ${
      typeof output === "function" ? output() : output
    }`;
    if (reqId !== undefined) {
      const logdebugConfigFromContext = httpContext.get("logdebug") as TLogDebugInternal;
      if (isLogChannelEnabled(channel, logdebugConfigFromContext)) {
        // in case we are in an express request context, we will buffer the log messages, inside the same httpContext
        const logBufferFromHttpContext = httpContext.get("logBuffer");
        const logBuffer = logBufferFromHttpContext || [];
        // if we created a new logBuffer, we will set it in the httpContext
        if (!logBufferFromHttpContext) {
          httpContext.set("logBuffer", logBuffer);
        }

        // if logDebugConfig contains a list of statuses, we will buffer the log messages
        // (and only print the logs if the status is found in the list of statuses)
        if (logdebugConfigFromContext?.statuses !== undefined) {
          logBuffer.push(msg);
        } else {
          console.log(msg);
        }
      }
    } else {
      console.log(msg);
    }
  }
};

/**
 * Logging output: each debug call is 'tagged' with a 'channel' (first parameter).
 * If the 'channel' of a debug call is in the selected set of debug channels in the
 * sri4node configuration (logdebug.channels), output (second parameter) is logged.
 * Otherwise output is discarded.
 * (see https://github.com/katholiek-onderwijs-vlaanderen/sri4node#logging for more
 * information).
 *
 * This function is for internal (sri4node) usage where logchannels are restricted
 * to pre-defined debug channels. Restricting channels avoids errors and will make
 * it possible for vscode to do auto-completion.
 *
 * If logdebugConfig is not passed in as an argument, the output will always be logged,
 * unless we are in an express request context, in which case the output will be buffered,
 * and we will try to get the logdebug settings from the express context.
 *
 * @see debugAnyChannelAllowed for info on exacvtly how this works from within or outside
 *  of an express request context
 * @param channel one of the predefined log channels
 * @param output string or string generating function to log
 * @param logdebugConfig optional. If not set, we will always log the output.
 */
const debug = (
  channel: TDebugChannel,
  output: (() => string) | string,
  logdebugConfig?: TSriInternalConfig["logdebug"],
) => {
  debugAnyChannelAllowed(channel, output, logdebugConfig);
};

/**
 * Logs errors to the console, but tries to prefix with reqId if it can be found with httpContext
 * in some express 'session' info linked to the current 'thread'.
 *
 * @param args
 */
const error: TErrorLogFunction = function (...args) {
  const reqId = httpContext.get("reqId");
  if (reqId) {
    console.error(`[reqId:${reqId}]`, ...args);
  } else {
    console.error(...args);
  }
};

/**
 * Given the generated grammar, generate and return the parser
 *
 * @param grammar
 * @returns a parser
 */
function generateQueryStringParser(
  grammar: string,
  allowedStartRules: string[] | undefined = undefined,
): peggy.Parser {
  const pegConf = allowedStartRules
    ? {
        // Array of rules the parser will be allowed to start parsing from (default: the first rule in the grammar).
        allowedStartRules,
      }
    : {};
  return peggy.generate(grammar, pegConf);
}

/**
 * Turns a pggy parser syntax error into a more readable error message
 *
 * @param {pegSyntaxError} e
 * @param {String} input
 * @returns a string
 */
function pegSyntaxErrorToErrorMessage(e: { [prop: string]: any }, input = "") {
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

    const markedErrorString = (
      searchParams.slice(0, e.location.start.offset) +
      markedPart +
      searchParams.slice(e.location.end.offset)
    )
      .split("\n")
      .map((l, lineNr) => `${`0000${lineNr}`.slice(-3)} ${l}`)
      .filter(
        (_l, lineNr) => lineNr > e.location.start.line - 3 && lineNr < e.location.start.line + 3,
      )
      .join("\n");

    return `${e.message} at line ${e.location.start.line}, column ${e.location.start.column}\n\n${markedErrorString}`;
  }
  return e.toString(); // not recognized as pegSyntaxError
}

type TUrlQueryParamsParseTree = Array<
  | {
      property: string;
      operator: "GT" | "GTE" | "LT" | "LTE" | "EQ" | "LIKE" | "ILIKE" | "MATCH";
      value: string | number | boolean;
      caseInsensitive: boolean;
      invertOperator: boolean;
    }
  | {
      property: string;
      operator: "IN";
      value: Array<unknown>;
      caseInsensitive: boolean;
      invertOperator: boolean;
    }
  | {
      property: string;
      operator: "ISNULL";
      invertOperator: boolean;
    }
  | {
      operator: "LIST_LIMIT";
      value: number;
    }
  | {
      operator: "EXPANSION";
      value: "none" | "full" | "summary";
    }
  | {
      operator: "LIST_META_INCLUDE_COUNT" | "LIST_ORDER_BY" | "LIST_ORDER_DESCENDING";
      value: boolean;
    }
  | {
      operator: "LIST_ORDER_BY";
      value: Array<string>;
    }
>;

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
 * @param parseTree
 * @param {} mapping
 * @returns an altered parseTree with defaults filled in
 */
function generateMissingDefaultsForParseTree(
  parseTree: TUrlQueryParamsParseTree,
  mapping: TResourceDefinitionInternal,
): TUrlQueryParamsParseTree {
  const DEFAULT_LIMIT = 30; // if not configured in mapping file
  const DEFAULT_MAX_LIMIT = 500; // if not configured in mapping file
  const DEFAULT_EXPANSION = "FULL";
  const DEFAULT_INCLUDECOUNT = false;
  const DEFAULT_LIST_ORDER_BY = ["$$meta.created", "key"];
  const DEFAULT_LIST_ORDER_DESCENDING = false;

  const retVal: any[] = [];

  if (!parseTree.find((f: any) => f.operator === "LIST_LIMIT")) {
    retVal.push({
      operator: "LIST_LIMIT",
      value: Math.min(mapping.defaultlimit || DEFAULT_LIMIT, mapping.maxlimit || DEFAULT_MAX_LIMIT),
    });
  }
  if (!parseTree.find((f: any) => f.operator === "EXPANSION")) {
    retVal.push({
      operator: "EXPANSION",
      value: mapping.defaultexpansion || DEFAULT_EXPANSION,
    });
  }
  if (!parseTree.find((f: any) => f.operator === "LIST_META_INCLUDE_COUNT")) {
    retVal.push({
      operator: "LIST_META_INCLUDE_COUNT",
      value: DEFAULT_INCLUDECOUNT,
    });
  }
  if (!parseTree.find((f: any) => f.property === "$$meta.deleted" && f.operator === "IN")) {
    retVal.push({
      property: "$$meta.deleted",
      operator: "IN",
      value: [false],
      caseInsensitive: true,
      invertOperator: false,
    });
  }
  if (!parseTree.find((f: any) => f.operator === "LIST_ORDER_BY")) {
    retVal.push({
      operator: "LIST_ORDER_BY",
      value: DEFAULT_LIST_ORDER_BY,
    });
  }
  if (!parseTree.find((f: any) => f.operator === "LIST_ORDER_DESCENDING")) {
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
 * @param parseTree
 * @returns the in-place sorted parseTree
 */
function sortUrlQueryParamParseTree(parseTree: Array<any>) {
  const compareProperties = (a: any, b: any, properties: string[]) =>
    properties.reduce((acc, cur) => {
      if (acc !== 0) return acc;
      if (a[cur] === b[cur]) return acc;
      if ((a[cur] || "") > (b[cur] || "")) {
        // console.log(a[cur], '>', b[cur], ' => return 1', a, b);
        return 1;
      }
      // console.log(a[cur], '<', b[cur], ' => return -1', a, b);
      return -1;
    }, 0);

  return parseTree.sort((a, b) =>
    compareProperties(a, b, ["property", "operator", "invertOperator", "caseInsensitive", "value"]),
  );
}

const hrefToParsedObjectFactoryThis: any = {};

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
function hrefToParsedObjectFactory(
  sriConfig: TSriConfig = { resources: [], databaseConnectionParameters: {} },
  flat = false,
) {
  const parseQueryStringPartByPart = "PART_BY_PART" as "NORMAL" | "PART_BY_PART" | "VALUES_APART"; // 'PARTBYPART';

  // assuming sriConfig will always be the same, we optimize with
  // some simple memoization of a few calculated helper data structures
  const updateCache = () => {
    if (hrefToParsedObjectFactoryThis.sriConfig !== sriConfig) {
      try {
        hrefToParsedObjectFactoryThis.sriConfig = sriConfig;
        hrefToParsedObjectFactoryThis.mappingByPathMap = Object.fromEntries(
          sriConfig.resources.map((r) => [r.type, r]),
        );
        hrefToParsedObjectFactoryThis.flattenedJsonSchemaByPathMap = Object.fromEntries(
          sriConfig.resources.map((r) => [r.type, schemaUtils.flattenJsonSchema(r.schema)]),
        );
        hrefToParsedObjectFactoryThis.flatQueryStringParserByPathMap = Object.fromEntries(
          sriConfig.resources.map((r) => {
            const grammar = flatUrlParser.generateFlatQueryStringParserGrammar(
              hrefToParsedObjectFactoryThis.flattenedJsonSchemaByPathMap[r.type],
            );
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
                  throw new Error(
                    `parseQueryStringPartByPart has an unsupported value (${parseQueryStringPartByPart})`,
                  );
              }
            } catch (e) {
              console.log(pegSyntaxErrorToErrorMessage(e, grammar));
              throw e;
            }
          }),
        );
        hrefToParsedObjectFactoryThis.nonFlatQueryStringParserByPathMap = Object.fromEntries(
          sriConfig.resources.map((r) => {
            // const grammar = generateNonFlatQueryStringParserGrammar(hrefToParsedObjectFactoryThis.flattenedJsonSchemaByPathMap[r.type], sriConfig);
            try {
              // return [r.type, generateQueryStringParser(grammar)];
              // sriConfigDefaults?:{ defaultlimit: number, [k:string]: any }, sriConfigResourceDefinition?:ResourceDefinition, allowedStartRules
              return [r.type, generateNonFlatQueryStringParser(sriConfig, r)];
            } catch (e) {
              // console.log(pegSyntaxErrorToErrorMessage(e, grammar));
              console.log(pegSyntaxErrorToErrorMessage(e));
              throw e;
            }
          }),
        );
      } catch (e) {
        delete hrefToParsedObjectFactoryThis.sriConfig;
        console.log("Uh oh, something went wrong while setting up flattenedJsonSchema and parsers");
        console.log(pegSyntaxErrorToErrorMessage(e));
        throw e;
      }
    }
  };

  updateCache();

  if (flat) {
    return function hrefToFlatParsedObject(href: string) {
      const urlToWorkOn = new URL(`https://domain.com${href}`);
      const searchParamsToWorkOn = urlToWorkOn.searchParams;

      const flatQueryStringParser =
        hrefToParsedObjectFactoryThis.flatQueryStringParserByPathMap[urlToWorkOn.pathname];
      try {
        const parseTree = {
          NORMAL: () => flatQueryStringParser.parse(searchParamsToWorkOn.toString()),
          PART_BY_PART: () =>
            [...searchParamsToWorkOn.entries()].map(([k, v]) =>
              flatQueryStringParser.parse(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`),
            ),
          // TODO !!!
          VALUES_APART: () =>
            [...searchParamsToWorkOn.entries()].map(([k, v]) => {
              const { expectedValue, ...parsedFilter } = flatQueryStringParser.filterParser.parse(
                encodeURIComponent(k),
              );
              // now that we know if the expected input is an array or not, we can parse it as such
              const value = flatQueryStringParser.valueParser.parse(encodeURIComponent(v), [
                expectedValue.inputShouldBeArray ? "MultiValue" : "SingleValue",
              ]);
              return { ...parsedFilter, value };
            }),
        }[parseQueryStringPartByPart]();

        const missingDefaultsParseTree = generateMissingDefaultsForParseTree(
          parseTree,
          hrefToParsedObjectFactoryThis.mappingByPathMap[urlToWorkOn.pathname],
        );

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
            const { expectedValue: _expectedValue, ...rest } = x;
            return rest;
          });

        const parsedUrlObject = {
          parseTree: normalizedParseTree,
          // TODO normalizedUrl: urlQueryStringParseTreeToNormalizedURLSearchParams(parseTree),
        };

        return parsedUrlObject;
      } catch (e) {
        // console.log('href parse error', e.message, e);
        console.log(pegSyntaxErrorToErrorMessage(e, searchParamsToWorkOn.toString()));
        throw e;
      }
    };
  }

  return function hrefToNonFlatParsedObject(href: string) {
    const urlToWorkOn = new URL(href, "https://domain.com");
    const searchParamsToWorkOn = urlToWorkOn.searchParams;

    const nonFlatQueryStringParser =
      hrefToParsedObjectFactoryThis.nonFlatQueryStringParserByPathMap[urlToWorkOn.pathname];
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
    } catch (e) {
      // console.log('href parse error', e.message, e);
      console.log(pegSyntaxErrorToErrorMessage(e, searchParamsToWorkOn.toString()));
      throw e;
    }
  };
}

/**
 * @param sriRequest
 * @param recurse if set, return top sriRequest
 * @returns the parent sri request if it exists (otherwise the same request is returned!)
 */
function getParentSriRequest(sriRequest: TSriRequest, recurse = false) {
  return sriRequest.parentSriRequest
    ? recurse
      ? getParentSriRequest(sriRequest.parentSriRequest)
      : sriRequest.parentSriRequest
    : sriRequest;
}

/**
 * Make sure the express app uses the express-middleware-timer.
 *
 * @param app
 * @returns
 */
function installExpressMiddlewareTimer(app: Application) {
  app.use(
    emt.init((_req: Request, _res: Response) => {
      // Do nothing (empty function provided to avoid stdout logging for each request)
    }),
  );
  return emt;
}

/**
 * Will add the duration of 'property' to the serverTiming object of the parentSriRequest
 * (so parentSriRequest WILL BE MODIFIED IN PLACE!)
 * @param sriRequest
 * @param property
 * @param value
 */
function setServerTimingHdr(sriRequest: TSriRequest, property, value) {
  const parentSriRequest = getParentSriRequest(sriRequest);
  if ((parentSriRequest as TSriRequestExternal).serverTiming === undefined) {
    parentSriRequest.serverTiming = {};
  }
  if (parentSriRequest.serverTiming[property] === undefined) {
    parentSriRequest.serverTiming[property] = value;
  } else {
    parentSriRequest.serverTiming[property] += value;
  }
}

function expressMiddlewareTimerReportToServerTiming(
  req: Request,
  res: Response,
  sriRequest: TSriRequestExternal,
) {
  try {
    const report = emt.calculate(req, res);
    Object.keys(report.timers).forEach((timer) => {
      const duration = report.timers[timer].took;
      if (duration > 0 && timer !== "express-wrapper") {
        setServerTimingHdr(sriRequest, timer, duration);
      }
    });
  } catch (err) {
    error("[expressMiddlewareTimerReportToServerTiming] it does not work anymore but why???", err);
    throw err;
  }
}

/**
 * Turns the config object passed to sri4node into an object that can be used internally.
 *
 * @param logdebug
 * @returns
 */
function createDebugLogConfigObject(logdebug?: TLogDebugExternal | boolean): TLogDebugInternal {
  if (logdebug === true) {
    // for backwards compability
    console.warn(
      "\n\n\n------------------------------------------------------------------------------------------------------------------\n" +
        "The logdebug parameter has changed format. Before, debug logging was enabled by specifying the boolean value 'true'.\n" +
        "Now you need to provide a string with all the logchannels for which you want to receive debug logging (see the\n" +
        'sri4node documentation for more details ). For now "general,trace,requests,server-timing" is set as sensible default, \n' +
        "but please specify the preferred channels for which logging is requested.\n" +
        "------------------------------------------------------------------------------------------------------------------\n\n\n",
    );
    return {
      channels: new Set(["general", "trace", "requests", "server-timing"]),
    };
  }
  if (logdebug === false || logdebug === undefined || logdebug === null) {
    return { channels: new Set() };
  }
  const tempLogDebug: TLogDebugInternal = {
    channels: logdebug.channels === "all" ? "all" : new Set(logdebug.channels),
  };
  if (logdebug.statuses) {
    tempLogDebug.statuses = new Set(logdebug.statuses);
  }
  return tempLogDebug;
}

/**
 * @todo
 * change this, so that each httpContext will have its own logBuffer, so we can just
 * call httpContext.get("logBuffer") or something, and output that to the console.
 * That would avoid having the single 'global' logBuffer.
 *
 * It will print eveything that has been accumulated in the logBuffer for the current request
 * to the console if it has the right status.
 * After this, the logBuffer of this request will be emptied.
 *
 * @param status a number that indicates it should be printed if that number can be found in the
 *                logdebug.statuses set
 * @param logdebug configuration object that contains the logdebug settings
 */
function handleRequestDebugLog(status: number, statuses: TLogDebugInternal["statuses"]) {
  const logBuffer = httpContext.get("logBuffer") as Array<string>;
  if (statuses?.has(status)) {
    logBuffer.forEach((e) => console.log(e));
  }
  httpContext.set("logBuffer", []);
}

function urlToTypeAndKey(urlToParse: string) {
  if (typeof urlToParse !== "string") {
    throw new Error(`urlToTypeAndKey requires a string argument instead of ${urlToParse}`);
  }
  const parsedUrl = new URL(urlToParse, "https://domain.com");
  const pathName = parsedUrl.pathname?.replace(/\/$/, "");
  const parts = pathName?.split("/");
  const type = _.initial(parts).join("/");
  const key = _.last(parts);

  return { type, key };
}

/**
 * Unfortunatly we seems to have generated invalid UUIDs in the past.
 * (we even have uuids with invalid version like /organisations/efeb7119-60e4-8bd7-e040-fd0a059a2c55)
 * Therefore we cannot use a strict uuid checker like the npm module 'uuid-validate' but do we have to be less strict.
 *
 * @param uuid
 * @returns true or false
 */
function isUuid(uuid: string): boolean {
  return uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/) != null;
}

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
function parseResource(u: string) {
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
  const pp = path.parse(u1);
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

/**
 * return any string as code for REST API error object
 *
 * @param s
 * @returns
 */
function errorAsCode(s: string) {
  let ret = s;

  ret = ret.replace(/".*"/, "");

  ret = ret.toLowerCase().trim();
  ret = ret.replace(/[^a-z0-9 ]/gim, "");
  ret = ret.replace(/ /gim, ".");

  return ret;
}

/**
 * Converts the configuration object for sri4node into an array per resource type
 */
function typeToConfig<T extends TResourceDefinition | TResourceDefinitionInternal>(
  config: Array<T>,
): T {
  return config.reduce((acc, c) => {
    acc[c.type] = c;
    return acc;
  }, {} as T);
}

/**
 * @param type the string used as 'type' in the sriConfig resources
 * @param resources the array of resource definitions from the sriConfig
 * @returns the resource definition record from the active sriConfig
 */
function typeToMapping(
  type: string,
  resources: Array<TResourceDefinition> | Array<TResourceDefinitionInternal>,
): TResourceDefinitionInternal {
  return typeToConfig(resources)[type];
}

function sqlColumnNames(mapping: TResourceDefinitionInternal, summary = false) {
  const columnNames = summary
    ? Object.keys(mapping.map ?? {}).filter(
        (c) => !(mapping.map?.[c].excludeOn?.toLowerCase() === "summary"),
      )
    : Object.keys(mapping.map ?? {});

  return `${
    (columnNames.includes("key") ? "" : '"key",') + columnNames.map((c) => `"${c}"`).join(",")
  }, "$$meta.deleted", "$$meta.created", "$$meta.modified", "$$meta.version"`;
}

/**
 * @param row the database row
 * @param resourceMapping the applicable resource definition from the sriConfig object
 * @returns the json object as returned by the api
 */
function transformRowToObject(row: any, resourceMapping: TResourceDefinitionInternal) {
  const map = resourceMapping.map || {};
  const element: any = {};
  element.$$meta = {};
  Object.keys(map).forEach((key) => {
    if (map[key].references) {
      const referencedType = map[key].references;
      if (row[key] !== null) {
        element[key] = {
          href: `${referencedType}/${row[key]}`,
        };
      } else {
        element[key] = null;
      }
    } else if (key.startsWith("$$meta.")) {
      element.$$meta[key.split("$$meta.")[1]] = row[key];
    } else {
      element[key] = row[key];
    }

    map[key]?.columnToField?.forEach((f) => f(key, element));
  });

  Object.assign(
    element.$$meta,
    _.pickBy({
      // keep only properties with defined non-null value (requires lodash - behaves different as underscores _.pick())
      deleted: row["$$meta.deleted"],
      created: row["$$meta.created"],
      modified: row["$$meta.modified"],
    }),
  );
  element.$$meta.permalink = `${resourceMapping.type}/${row.key}`;
  element.$$meta.version = row["$$meta.version"];

  return element;
}

/**
 * Function which verifies wether for all properties specified in the sri4node configuration
 * there exists a column in the database.
 * An improvement might be to also check if the types match.
 *
 * @param sriConfig sri4node configuration object
 * @param informationSchema the information schema of the database
 * @returns nothing, throw an error in case something is wrong
 */
function checkSriConfigWithDbInformationSchema(
  sriConfig: TSriConfig,
  informationSchema: TInformationSchema,
) {
  sriConfig.resources.forEach((resourceMapping) => {
    const map = resourceMapping.map || {};
    Object.keys(map).forEach((key) => {
      if (informationSchema[resourceMapping.type][key] === undefined) {
        const dbFields = Object.keys(informationSchema[resourceMapping.type]).sort();
        const caseInsensitiveIndex = dbFields
          .map((c) => c.toLowerCase())
          .indexOf(key.toLowerCase());
        if (caseInsensitiveIndex >= 0) {
          console.error(
            `\n[CONFIGURATION PROBLEM] No database column found for property '${key}' as specified in sriConfig of resource '${resourceMapping.type}'. It is probably a case mismatch because we did find a column named '${dbFields[caseInsensitiveIndex]}' instead.`,
          );
        } else {
          console.error(
            `\n[CONFIGURATION PROBLEM] No database column found for property '${key}' as specified in sriConfig of resource '${
              resourceMapping.type
            }'. All available column names are ${dbFields.join(", ")}`,
          );
        }
        throw new Error("mismatch.between.sri.config.and.database");
      }
    });
  });
}

/**
 * @param obj the api object
 * @param resourceMapping the applicable resource definition from the sriConfig object
 * @param isNewResource boolean indicating that the resource doesn't exist yet
 * @returns a row to be saved on the database
 */
function transformObjectToRow(
  obj: Record<string, any>,
  resourceMapping: TResourceDefinition | TResourceDefinitionInternal,
  isNewResource: boolean,
  informationSchema: TInformationSchema,
): Record<string, unknown> {
  const map = resourceMapping.map || {};
  const row = {};
  Object.keys(map).forEach((key) => {
    if (map[key].references && obj[key] !== undefined) {
      const permalink = obj[key].href;
      if (!permalink) {
        throw new SriError({
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
      } else {
        const msg = `Faulty reference detected [${permalink}], detected [${refType}] expected [${expectedType}].`;
        console.log(msg);
        throw new SriError({
          status: 409,
          errors: [{ code: "faulty.reference", msg }],
        });
      }
    } else if (obj[key] !== undefined) {
      row[key] = obj[key];
    } else {
      // explicitly set missing properties to null (https://github.com/katholiek-onderwijs-vlaanderen/sri4node/issues/118)
      row[key] = null;
    }

    if (map[key].fieldToColumn) {
      map[key].fieldToColumn.forEach((f) => f(key, row, isNewResource));
    }

    const fieldTypeDb = informationSchema[resourceMapping.type][key].type;
    if (fieldTypeDb === "jsonb") {
      /// ALWAYS stringify the json !!!
      row[key] = JSON.stringify(row[key]);
    }
  });

  return row;
}

/**
 * Here we initalize the instance of the pgPromise LIBRARY.
 *
 * For some reason, setting the default schema is done on the library level
 * instead of the connection level...
 *
 * @param pgpInitOptions
 * @param extraOptions
 * @returns the pgPromise instance
 */
function pgInit(
  pgpInitOptions: pgPromise.IInitOptions = {},
  extraOptions: {
    schema?: pgPromise.ValidSchema | ((dc: any) => pgPromise.ValidSchema) | undefined;
    connectionInitSql?: string;
    monitor: boolean;
  },
): pgPromise.IMain {
  const pgpInitOptionsUpdated: pgPromise.IInitOptions = {
    schema: extraOptions.schema,
    ...pgpInitOptions,
    connect:
      extraOptions.connectionInitSql === undefined
        ? pgpInitOptions.connect
        : (client, dc, useCount) => {
            if (useCount === 0) {
              client.query(extraOptions.connectionInitSql);
            }
            if (pgpInitOptions.connect) {
              pgpInitOptions.connect(client, dc, useCount);
            }
          },
  };

  const pgp = pgPromise(pgpInitOptionsUpdated);

  // const pgMonitor = process.env.PGP_MONITOR === 'true' || (sriInternalConfig?.pgMonitor===true);
  if (extraOptions.monitor) {
    monitor.attach(pgpInitOptionsUpdated);
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
      const isoWithMicroseconds = `${
        isoWithoutMicroseconds.substring(0, isoWithoutMicroseconds.length - 1) + microseconds
      }Z`;
      return isoWithMicroseconds;
    });

    pgp.pg.types.setTypeParser(20, BigInt);
    pgp.pg.types.setTypeParser(1700, (val) => parseFloat(val));
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };
  } else {
    throw "pgPromise not initialized!";
  }

  return pgp;
}

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
 * @param pgp pgPromise instance (use pgInit(...) to generate one based on TSriConfig)
 * @param sriConfig sriConfig object
 * @returns {pgPromise.IDatabase} the database connection
 */
async function pgConnect(pgp: pgPromise.IMain, sri4nodeConfig: TSriConfig) {
  // WARN WHEN USING OBSOLETE PROPETIES IN THE CONFIG
  if (sri4nodeConfig.defaultdatabaseurl !== undefined) {
    console.warn(
      "defaultdatabaseurl config property has been deprecated, use databaseConnectionParameters.connectionString instead",
    );
    // throw new Error('defaultdatabaseurl config property has been deprecated, use databaseConnectionParameters.connectionString instead');
  }
  if (sri4nodeConfig.maxConnections) {
    // maximum size of the connection pool: sri4nodeConfig.databaseConnectionParameters.max
    console.warn(
      "maxConnections config property has been deprecated, use databaseConnectionParameters.max instead",
    );
  }
  if (sri4nodeConfig.dbConnectionInitSql) {
    // maximum size of the connection pool: sri4nodeConfig.databaseConnectionParameters.max
    console.warn(
      "dbConnectionInitSql config property has been deprecated, use databaseConnectionParameters.connectionInitSql instead",
    );
  }
  if (process.env.PGP_MONITOR) {
    // maximum size of the connection pool: sri4nodeConfig.databaseConnectionParameters.max
    console.warn(
      "environemtn variable PGP_MONITOR has been deprecated, set config property databaseLibraryInitOptions.pgMonitor to true instead",
    );
  }

  // this should ideally be be a simple clone of sri4nodeConfig.databaseConnectionParameters but
  // there is a bit of messing about going on afterwards to turn it into the actual connection object
  const cn: IExtendedDatabaseConnectionParameters = {
    // first some defaults, but override them with whatever is in the config
    max: 16,
    connectionTimeoutMillis: 2_000, // 2 seconds
    idleTimeoutMillis: 14_400_000, // 4 hours
    ...sri4nodeConfig.databaseConnectionParameters,
  };

  console.log(`Using database connection object : [${JSON.stringify(cn)}]`);

  return pgp(cn);
}

/**
 * @type {{ name: string, text: string }} details
 * @returns a prepared statement that can be used with tx.any() or similar functions
 */
function createPreparedStatement(details: pgPromise.IPreparedStatement | undefined) {
  return new pgPromise.PreparedStatement(details);
}

// wrapper for executing SQL statement on a node-postgres client.
//
// Instead the db object is a node-postgres Query config object.
// See : https://github.com/brianc/node-postgres/wiki/Client#method-query-prepared.
//
// name : the name for caching as prepared statement, if desired.
// text : The SQL statement, use $1,$2, etc.. for adding parameters.
// values : An array of java values to be inserted in $1,$2, etc..
//
// It returns a Q promise to allow chaining, error handling, etc.. in Q-style.
async function pgExec(
  db: pgPromise.IDatabase<unknown, IClient> | ITask<unknown>,
  query,
  sriRequest?: TSriRequestExternal,
) {
  const { sql, values } = query.toParameterizedSql();

  debug("sql", () => pgPromise.as.format(sql, values));

  const hrstart = process.hrtime();
  const result = await db.query(sql, values);
  const hrElapsed = process.hrtime(hrstart);
  if (sriRequest) {
    setServerTimingHdr(sriRequest, "db", hrtimeToMilliseconds(hrElapsed));
  }

  return result;
}

async function pgResult(
  db: pgPromise.IDatabase<unknown, IClient> | ITask<unknown>,
  query,
  sriRequest?: TSriRequestExternal,
) {
  const { sql, values } = query.toParameterizedSql();

  debug("sql", () => pgPromise.as.format(sql, values));

  const hrstart = process.hrtime();
  const result = await db.result(sql, values);
  const hrElapsed = process.hrtime(hrstart);
  if (sriRequest) {
    setServerTimingHdr(sriRequest, "db", hrtimeToMilliseconds(hrElapsed));
  }

  return result;
}

async function startTransaction(
  db: pgPromise.IDatabase<unknown, IClient> | ITask<unknown>,
  mode = new pgPromise.txMode.TransactionMode(),
): Promise<{
  tx: pgPromise.ITask<unknown>;
  resolveTx: () => Promise<void>;
  rejectTx: () => Promise<void>;
}> {
  debug("db", "++ Starting database transaction.");

  const eventEmitter = new EventEmitter();

  const txWrapper = async (emitter: EventEmitter) => {
    // This wrapper run async without being awaited. This has some consequences:
    //   * errors are not passed the usual way, but via the 'tDone' event
    //   * debug() does not log the correct reqId
    try {
      await db.tx({ mode }, async (tx) => {
        emitter.emit("txEvent", tx);
        const how = await pEvent(emitter, "terminate");
        if (how === "reject") {
          throw "txRejected";
        }
      });
      emitter.emit("txDone");
    } catch (err) {
      // 'txRejected' as err is expected behaviour in case rejectTx is called
      //
      // Other possible "expected" error is the error which occurs after a db
      // connection error (which already resulted in error for the current
      // request). In that case the transaction rollback also generates
      // an error, which we will ignore (unfortunatly pg-promise does nog use
      // an error code so we need to check on the error message).
      if (
        err === "txRejected" ||
        (err.message === "Client has encountered a connection error and is not queryable" &&
          err.query === "rollback")
      ) {
        emitter.emit("txDone");
      } else {
        emitter.emit("txDone", err);
      }
    }
  };

  try {
    const tx: pgPromise.ITask<any> = await new Promise((resolve, reject) => {
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

    await tx.none("SET CONSTRAINTS ALL DEFERRED;");

    const terminateTx = (how) => async () => {
      if (how !== "reject") {
        await tx.none("SET CONSTRAINTS ALL IMMEDIATE;");
      }
      eventEmitter.emit("terminate", how);
      const res = await pEvent(eventEmitter, "txDone");
      if (res !== undefined) {
        throw res;
      }
    };

    return {
      tx,
      resolveTx: terminateTx("resolve"),
      rejectTx: terminateTx("reject"),
    };
  } catch (err) {
    error("CAUGHT ERROR: ");
    error(JSON.stringify(err), err);
    throw new SriError({
      status: 503,
      errors: [
        {
          code: "too.busy",
          msg: "The request could not be processed as the database is too busy right now. Try again later.",
        },
      ],
    });
  }
}

async function startTask(
  db: pgPromise.IDatabase<unknown, IClient> | ITask<unknown>,
): Promise<{ t: pgPromise.IDatabase<unknown, IClient> | ITask<unknown>; endTask: () => void }> {
  debug("db", "++ Starting database task.");

  const emitter = new EventEmitter();

  const taskWrapper = async (emitter) => {
    // This wrapper run async without being awaited. This has some consequences:
    //   * errors are not passed the usual way, but via the 'tDone' event
    //   * debug() does not log the correct reqId
    try {
      await db.task(async (t) => {
        emitter.emit("tEvent", t);
        await pEvent(emitter, "terminate");
      });
      emitter.emit("tDone");
    } catch (err) {
      emitter.emit("tDone", err);
    }
  };

  try {
    const t: IDatabase<unknown, IClient> | ITask<unknown> = await new Promise((resolve, reject) => {
      emitter.on("tEvent", (t) => {
        resolve(t);
      });
      emitter.on("tDone", (err) => {
        reject(err);
      });
      taskWrapper(emitter);
    });
    debug("db", "Got db t object.");

    const endTask = async () => {
      emitter.emit("terminate");
      const res = await pEvent(emitter, "tDone");
      debug("db", "db task done.");
      if (res !== undefined) {
        throw res;
      }
    };

    return { t, endTask };
  } catch (err) {
    error("CAUGHT ERROR: ");
    error(JSON.stringify(err));
    throw new SriError({
      status: 503,
      errors: [
        {
          code: "too.busy",
          msg: "The request could not be processed as the database is too busy right now. Try again later.",
        },
      ],
    });
  }
}

async function installVersionIncTriggerOnTable(
  db: pgPromise.IDatabase<unknown, IClient>,
  tableName: string,
  schemaName?: string,
) {
  // 2023-09: at a certain point we added the schemaname to the triggername which causes problems when
  // copying a database to another schema (trigger gets created twice), so we'll use the
  const tgNameToBeDropped = `vsko_resource_version_trigger_${
    schemaName !== undefined ? schemaName : ""
  }_${tableName}`;
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
  await db.query(plpgsql);
}

async function getCountResult(tx, countquery, sriRequest) {
  const [{ count }] = await pgExec(tx, countquery, sriRequest);
  return parseInt(count, 10);
}

/**
 * Given a single resource definition from sriConfig.resources
 * returns the corresponding database table.
 * @param mapping
 * @returns the correponding database table name
 */
function tableFromMapping(mapping: TResourceDefinition | TResourceDefinitionInternal) {
  return mapping.table || (_.last(mapping.type.split("/")) as string);
}

function isEqualSriObject(
  obj1,
  obj2,
  mapping: TResourceDefinitionInternal,
  informationSchema: TInformationSchema,
) {
  const relevantProperties = Object.keys(mapping.map ?? {});

  function customizer(val, key, _obj) {
    if (findPropertyInJsonSchema(mapping.schema, key)?.format === "date-time") {
      return new Date(val).getTime();
    }

    if (informationSchema[mapping.type][key]?.type === "bigint") {
      return BigInt(val);
    }
  }

  const o1 = _.cloneDeepWith(
    _.pickBy(
      obj1,
      (val, key) => val !== null && val != undefined && relevantProperties.includes(key),
    ),
    customizer,
  );
  const o2 = _.cloneDeepWith(
    _.pickBy(
      obj2,
      (val, key) => val !== null && val != undefined && relevantProperties.includes(key),
    ),
    customizer,
  );

  return _.isEqualWith(o1, o2);
}

function stringifyError(e) {
  if (e instanceof Error) {
    return e.toString();
  }
  return JSON.stringify(e);
}

/**
 * Transforms the results of a call to pSettle into an array of 'sri' results.
 *
 * @param results
 * @returns
 */
function settleResultsToSriResults<T>(
  results: Array<pSettle.PromiseResult<T>>,
): Array<T | SriError> {
  return results.map((res) => {
    if (res.isFulfilled) {
      return res.value;
    }
    const err = res.reason;
    if (err instanceof SriError || (err as any)?.__proto__?.constructor?.name === "SriError") {
      return err as SriError;
    }
    error(
      "____________________________ E R R O R (settleResultsToSriResults)_________________________",
    );
    error(stringifyError(err));
    if (err && (err as Record<string, unknown>).stack) {
      error("STACK:");
      error((err as Record<string, unknown>).stack);
    }
    error(
      "___________________________________________________________________________________________",
    );
    return new SriError({
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

function createReadableStream(objectMode = true) {
  const s = new stream.Readable({ objectMode });
  s._read = function () {
    // Do nothing
  };
  return s;
}

function getParentSriRequestFromRequestMap(
  sriRequestMap: Map<string, TSriRequest>,
  recurse = false,
) {
  const sriRequest = Array.from(sriRequestMap.values())[0];
  return getParentSriRequest(sriRequest, recurse);
}

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
 * @param {TSriRequestExternal} parentSriRequest: needed when inside a batch or when called as
 *                     sri4node_internal_interface
 * @param {BatchElement} batchElement: needed when creating a 'virtual' SriRequest that represents
 *                       1 request from inside a batch
 *
 * @returns {TSriRequestExternal}
 */
function generateSriRequest(
  expressRequest: Request | undefined = undefined,
  expressResponse: Response | any | undefined = undefined,
  basicConfig:
    | {
        isBatchRequest: boolean;
        isStreamingRequest: boolean;
        readOnly: boolean;
        mapping?: TResourceDefinitionInternal;
        dbT: IDatabase<unknown, IClient> | ITask<unknown>;
        pgp: IMain;
      }
    | undefined = undefined,
  batchHandlerAndParams: any = undefined,
  parentSriRequest: TSriRequestExternal | undefined = undefined,
  batchElement: any = undefined,
  internalSriRequest:
    | Omit<TSriRequestInternal, "protocol" | "serverTiming">
    | undefined = undefined,
): TSriRequestExternal {
  if (
    basicConfig === undefined &&
    internalSriRequest === undefined &&
    parentSriRequest === undefined
  ) {
    throw new Error(
      "generateSriRequest: at least one of basicConfig, internalSriRequest or parentSriRequest should be defined",
    );
  }

  const baseSriRequest: TSriRequestExternal = {
    id: uuidv4(),
    logDebug: debug, // (ch, message) => debug(requestId, ch, message)
    logError: error,
    SriError,
    // context: {},
    parentSriRequest: parentSriRequest || internalSriRequest?.parentSriRequest,

    path: "",
    query: new URLSearchParams(),
    params: {},
    sriType: undefined,
    isBatchRequest: undefined,
    readOnly: undefined,

    originalUrl: undefined,
    httpMethod: undefined,
    headers: {},
    body: undefined,
    dbT:
      basicConfig?.dbT ||
      internalSriRequest?.dbT ||
      (parentSriRequest?.dbT as IDatabase<unknown, IClient> | ITask<unknown>),
    pgp: basicConfig?.pgp || internalSriRequest?.pgp || (parentSriRequest?.pgp as IMain),
    inStream: new stream.Readable(),
    outStream: new stream.Writable(),
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

    return {
      ...baseSriRequest,

      // parentSriRequest: parentSriRequest,

      originalUrl: internalSriRequest.href,

      path: batchHandlerAndParams.path,
      query: batchHandlerAndParams.queryParams,
      params: batchHandlerAndParams.routeParams,

      sriType: batchHandlerAndParams.handler.mapping.type,
      isBatchRequest: batchHandlerAndParams.handler.isBatch,
      readOnly: batchHandlerAndParams.handler.readOnly,

      httpMethod: internalSriRequest.verb,
      headers: internalSriRequest.headers ? internalSriRequest.headers : {},
      body: internalSriRequest.body,
      dbT: internalSriRequest.dbT,
      inStream: internalSriRequest.inStream,
      outStream: internalSriRequest.outStream,
      setHeader: internalSriRequest.setHeader,
      setStatus: internalSriRequest.setStatus,
      streamStarted: internalSriRequest.streamStarted,

      protocol: "_internal_",
      isBatchPart: false,

      parentSriRequest: internalSriRequest.parentSriRequest,
    };
  }
  if (parentSriRequest && batchElement) {
    // batch item
    // const batchHandlerAndParams = batchElement.match;

    return {
      ...parentSriRequest,
      ...baseSriRequest,

      dbT: parentSriRequest.dbT,

      originalUrl: batchElement.href,

      path: batchHandlerAndParams.path,
      query: batchHandlerAndParams.queryParams,
      params: batchHandlerAndParams.routeParams,
      httpMethod: batchElement.verb,

      body:
        batchElement.body == null
          ? null
          : _.isObject(batchElement.body)
            ? batchElement.body
            : JSON.parse(batchElement.body),
      sriType: batchHandlerAndParams.handler.mapping.type,
      isBatchPart: true,
    };
  }
  if (expressRequest) {
    const query = new URLSearchParams();
    Object.entries(expressRequest.query).forEach(([k, v]) => {
      query.append(k, v as string);
    });

    // a 'normal' request
    const generatedSriRequest: TSriRequestExternal = {
      ...baseSriRequest,

      path: expressRequest.path,
      originalUrl: expressRequest.originalUrl,
      query,
      params: expressRequest.params ?? {},
      httpMethod: expressRequest.method as THttpMethod,

      headers: expressRequest.headers,
      protocol: expressRequest.protocol,
      body: expressRequest.body,
      isBatchPart: false,
      isBatchRequest: basicConfig?.isBatchRequest,
      readOnly: basicConfig?.readOnly,

      // the batch code will set sriType for batch elements
      sriType: !basicConfig?.isBatchRequest ? basicConfig?.mapping?.type : undefined,
    };

    // adding sriRequest.dbT should still be done in code after this function
    // because for the normal case it is asynchronous, and I wanted to keep
    // this function synchronous as long as possible
    // ======================================================================

    if (basicConfig?.isStreamingRequest) {
      if (!expressResponse) {
        throw Error(
          "[generateSriRequest] basicConfig.isStreamingRequest is true, but expressResponse argument is missing",
        );
      }
      // use passthrough streams to avoid passing req and resp in sriRequest
      const inStream = new stream.PassThrough({
        allowHalfOpen: false,
        emitClose: true,
      });
      const outStream = new stream.PassThrough({
        allowHalfOpen: false,
        emitClose: true,
      });
      generatedSriRequest.inStream = expressRequest.pipe(inStream);
      generatedSriRequest.outStream = outStream.pipe(expressResponse);
      generatedSriRequest.setHeader = (k, v) => expressResponse.set(k, v);
      generatedSriRequest.setStatus = (s) => expressResponse.status(s);
      generatedSriRequest.streamStarted = () => expressResponse.headersSent;
    }
    return generatedSriRequest;
  }

  if (parentSriRequest && !batchElement) {
    // internal interface
    // const batchHandlerAndParams = batch.matchHref(parentSriRequest.href, parentSriRequest.verb);

    return {
      ...baseSriRequest,

      originalUrl: parentSriRequest.href,

      path: batchHandlerAndParams.path,
      query: batchHandlerAndParams.queryParams,
      params: batchHandlerAndParams.routeParams,

      sriType: batchHandlerAndParams.handler.mapping.type,
      isBatchRequest: batchHandlerAndParams.handler.isBatch,
      readOnly: batchHandlerAndParams.handler.readOnly,

      httpMethod: parentSriRequest.verb,
      headers: parentSriRequest.headers ? parentSriRequest.headers : {},
      body: parentSriRequest.body,
      dbT: parentSriRequest.dbT,
      inStream: parentSriRequest.inStream,
      outStream: parentSriRequest.outStream,
      setHeader: parentSriRequest.setHeader,
      setStatus: parentSriRequest.setStatus,
      streamStarted: parentSriRequest.streamStarted,

      protocol: "_internal_",
      isBatchPart: false,

      parentSriRequest: parentSriRequest.parentSriRequest, // ??? || parentSriRequest,
    };
  }
  if (parentSriRequest && batchElement) {
    // batch item
    // const batchHandlerAndParams = batchElement.match;

    return {
      ...parentSriRequest,
      ...baseSriRequest,

      originalUrl: batchElement.href,

      path: batchHandlerAndParams.path,
      query: batchHandlerAndParams.queryParams,
      params: batchHandlerAndParams.routeParams,
      httpMethod: batchElement.verb,

      body:
        batchElement.body == null
          ? null
          : _.isObject(batchElement.body)
            ? batchElement.body
            : JSON.parse(batchElement.body),
      sriType: batchHandlerAndParams.handler.mapping.type,
      isBatchPart: true,
    };
  }

  throw Error(
    "[generateSriRequest] Unable to generate an SriRequest based on the given combination of parameters",
  );
}

/**
 * This is a recursive function that can find a property definition in a json schema definition.
 * This will also work when you have oneOf or anyOf sections in your schema definition.
 *
 * @param schema
 * @param propertyName
 * @returns the part of the json schema where the requested property is defined or null
 *  if the property is not found
 */
function findPropertyInJsonSchema(schema: JSONSchema4, propertyName: string) {
  if (schema?.properties?.[propertyName]) {
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

/**
 * Prepare pg-promise columnsets for a set of column names, for multi insert/update & delete,
 * based on the informationSchema
 *
 * @param columnNames
 * @param type
 * @param table
 * @param informationSchema
 * @param pgp
 * @returns a pgPromise.IColumnConfig object
 */
const generatePgColumnSet = (
  columnNames: Array<string>,
  type: string,
  table: string,
  informationSchema: TInformationSchema,
  pgp: pgPromise.IMain,
) => {
  const columns = columnNames.map((cname) => {
    const cConf: pgPromise.IColumnConfig<Record<string, string>> = {
      name: cname,
    };

    if (cname.includes(".")) {
      // popertynames with dot like $$meta.* are problematic with default pg-promise
      // see https://github.com/vitaly-t/pg-promise/issues/494  ==> workaround with .init() fun
      cConf.prop = `_${cname.replace(/\./g, "_")}`; // if prop is not unique multiple $$meta.* will get the same value!
      cConf.init = (c) => c.source[cname];
    }
    const cType = informationSchema?.[type][cname].type;
    const cElementType = informationSchema?.[type][cname].element_type;
    if (cType !== "text") {
      if (cType === "ARRAY") {
        cConf.cast = `${cElementType}[]`;
        // } else if (cType.toLowerCase() === "jsonb") {
        //   cConf.mod = ':json';
      } else {
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

/**
 * Given the resource definition and the db information schema, check
 * if the database contains all the required fields (like key, $$meta.created etc.).
 *
 * @param mapping
 * @param informationSchema
 * @throws Error if a required field is missing
 */
function checkRequiredFields(
  mapping: TResourceDefinitionInternal,
  informationSchema: TInformationSchema,
) {
  const table = tableFromMapping(mapping);
  if (!informationSchema[mapping.type]) {
    throw new Error(`Table '${table}' seems to be missing in the database.`);
  }
  const mandatoryFields = ["key", "$$meta.created", "$$meta.modified", "$$meta.deleted"];
  mandatoryFields.forEach((field: string) => {
    if (!(field in informationSchema[mapping.type])) {
      throw new Error(`Mapping '${mapping.type}' lacks mandatory field '${field}'`);
    }
  });
}

/**
 * Translates a resource definition to a resource definition that is used internally.
 * This one is more strict, as more properties are required, which makes it easier later on to work
 * with.
 *
 * Next to doing a few checks, it will also compile the json schema, which can also throw errors
 * if the schema is invalid.
 *
 * @param resourceDefinition the resource definition as provided by the user
 * @throws Error in some cases if the resource definition is obviously not valid, but does not check everything
 *
 */
function resourceDefToResourceDefInternal(
  resourceDefinition: TResourceDefinition,
): TResourceDefinitionInternal {
  // a few checks
  if (resourceDefinition.schema === undefined)
    throw new Error(`Schema definition is missing for '${resourceDefinition.type}' !`);

  // Apparently, the metaType is not required, but we will add a warning if it is missing
  if (resourceDefinition.metaType === undefined) {
    error(`WARNING: metaType missing for resource ${resourceDefinition.type}`);
  }

  const additionalProperties: RequiredExtra<
    Partial<TResourceDefinitionInternal>,
    "query" | "singleResourceRegex" | "listResourceRegex" | "validateKey" | "validateSchema"
  > = {
    singleResourceRegex: new RegExp(""),
    listResourceRegex: new RegExp(`^${resourceDefinition.type}(?:[?#]\\S*)?$`),
    query: _.cloneDeep(resourceDefinition.query) ?? { defaultFilter: queryUtils.defaultFilter },
    validateKey: new Ajv().compile({ type: "string" }), // can be overwritten below
    validateSchema: new Ajv().compile({ type: "string" }), // can be overwritten below
  };

  if (!resourceDefinition.onlyCustom) {
    // In case query is not defined -> use defaultFilter
    // if (resourceDefinition.query === undefined) {
    //   additionalProperties.query = { defaultFilter: queryUtils.defaultFilter };
    // }

    // In case of 'referencing' fields -> add expected filterReferencedType query
    // if not defined.
    if (resourceDefinition.map) {
      Object.keys(resourceDefinition.map).forEach((key) => {
        if (
          resourceDefinition.map?.[key]?.references !== undefined &&
          resourceDefinition.query &&
          resourceDefinition.query?.[key] === undefined
        ) {
          additionalProperties.query[key] = queryUtils.filterReferencedType(
            resourceDefinition.map[key].references,
            key,
          );
        }
      });
    }

    // TODO: what with custom stuff ?
    //  e.g content-api with attachments / security/query
    // TODO: implement a better way to determine key type!!
    const keyPropertyDefinition = findPropertyInJsonSchema(resourceDefinition.schema, "key");
    if (keyPropertyDefinition === null) {
      throw new Error(`Key is not defined in the schema of '${resourceDefinition.type}' !`);
    }

    if (keyPropertyDefinition.pattern === schemaUtils.guid("foo").pattern) {
      additionalProperties.singleResourceRegex = new RegExp(
        `^${resourceDefinition.type}/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$`,
      );
    } else if (keyPropertyDefinition.type === schemaUtils.numeric("foo").type) {
      additionalProperties.singleResourceRegex = new RegExp(
        `^${resourceDefinition.type}/([0-9]+)$`,
      );
    } else if (keyPropertyDefinition.type === schemaUtils.string("foo").type) {
      additionalProperties.singleResourceRegex = new RegExp(`^${resourceDefinition.type}/(\\w+)$`);
    } else {
      throw new Error(`Key type of resource ${resourceDefinition.type} unknown!`);
    }

    // TODO: add decent type!
    try {
      // Compile the JSON schema to see if there are errors + store it for later usage
      debug("general", `Going to compile JSON schema of ${resourceDefinition.type}`);

      /**
       * 'coerceTypes' will not care about the type if it can be cast to the type in the schema
       * (for example a number can be cast to a string)
       * This is currently used to check the query parameter values in a url, because we don't
       * have the proper url parser (that creates a parse tree) yet, which would allow us to
       * actually parse a url into the right types.
       * So as long as that is not finished, we need to be less strict about the query params.
       */
      const ajvWithCoerceTypes = new Ajv({
        strict: true,
        coerceTypes: true,
      });
      ajvAddFormats(ajvWithCoerceTypes);

      const ajv = new Ajv({
        // 2023-10: do not enable strict yet as it might break existing api's
        // (for example: an object with 'properties' & 'required', but missing type: 'object'
        // would suddenly fail because it is strictly speaking invalid json-schema)
        // strict: true,
        logger: {
          log: (output: string) => {
            debug("general", output);
          },
          warn: (output: string) => {
            debug("general", output);
          },
          error: console.error,
        },
      });
      ajvAddFormats(ajv);

      // validateKey is used with express request params which are always strings,
      // so the schema needs to be checked without complaining about the fact that
      // it is a string, even when key is defined asa number for example
      additionalProperties.validateKey = ajvWithCoerceTypes.compile(keyPropertyDefinition);
      additionalProperties.validateSchema = ajv.compile(resourceDefinition.schema);
    } catch (err) {
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

  return {
    ...resourceDefinition,
    metaType: resourceDefinition.metaType ?? "NOT SPECIFIED",
    beforeRead: toArray(resourceDefinition.beforeRead),
    afterRead: toArray(resourceDefinition.afterRead),
    beforeUpdate: toArray(resourceDefinition.beforeUpdate),
    afterUpdate: toArray(resourceDefinition.afterUpdate),
    beforeInsert: toArray(resourceDefinition.beforeInsert),
    afterInsert: toArray(resourceDefinition.afterInsert),
    beforeDelete: toArray(resourceDefinition.beforeDelete),
    afterDelete: toArray(resourceDefinition.afterDelete),
    customRoutes: toArray(resourceDefinition.customRoutes),
    transformResponse: toArray(resourceDefinition.transformResponse),
    listResultDefaultIncludeCount: resourceDefinition.listResultDefaultIncludeCount ?? true,

    // these actually make sense only if !resourceDefinition.onlyCustom
    ...additionalProperties,
  };
}

/**
 * @todo IMPLEMENT THIS
 *
 * Turns the sriConfig into a sriConfigInternal object.
 * The function is asynchronous because it needs to do various things on the database before
 * being able to populate the internalConfig object.
 *
 * @param sriConfig
 */
async function sriConfigToSriInternalConfig(_sriConfig: TSriConfig): Promise<TSriInternalConfig> {
  throw new Error("Not implemented yet");
}

/*
  Add references from a different resource to this resource.
  * type : the resource type that has a reference to the retrieved elements.
  * column : the database column that contains the foreign key.
  * key : the name of the key to add to the retrieved elements.
  */
// TODO: refactor in v2.1 together with the whole expand story
function addReferencingResources(
  type: string,
  column: string,
  targetkey: string | number,
  excludeOnExpand: string | string[],
): TAfterReadHook {
  return async function (
    tx: pgPromise.IDatabase<unknown>,
    sriRequest: TSriRequestExternal,
    elements: Array<{ permalink: string; incoming: null; stored: Record<string, any> }>,
    _sriInternalUtils: TSriInternalUtils,
    resources: Array<TResourceDefinitionInternal>,
  ) {
    const typeToMapping = typeToConfig(resources);
    const mapping = typeToMapping[type];

    if (Array.isArray(sriRequest.query.get("expand"))) {
      throw new SriError({
        status: 500,
        errors: [
          {
            code: "multiple.expand.query.parameters.not.allowed",
            msg: 'Only one "expand" query parameter value can be specified.',
          },
        ],
      });
    }

    const expand = sriRequest.query.get("expand")?.toLowerCase() ?? "full";

    if (
      elements &&
      elements.length &&
      elements.length > 0 &&
      expand !== "none" &&
      ((Array.isArray(excludeOnExpand) && !excludeOnExpand.includes(expand)) ||
        !Array.isArray(excludeOnExpand))
    ) {
      const tablename = type.split("/")[type.split("/").length - 1];
      const query = prepareSQL();
      const elementKeys: string[] = [];
      const elementKeysToElement = {};
      elements.forEach(({ stored: element }) => {
        const { permalink } = element.$$meta;
        const elementKey = permalink.split("/")[2];
        elementKeys.push(elementKey);
        elementKeysToElement[elementKey] = element;
        element[targetkey] = [];
      });

      query
        .sql(`select *, "${column}" as fkey from ${tablename} where `)
        .valueIn(column, elementKeys, "uuid")
        .sql(' and "$$meta.deleted" = false');
      const rows = await pgExec(tx, query);
      await pMap(rows, async (row: Record<string, any>) => {
        const element = elementKeysToElement[row.fkey];
        const target = {
          href: `${type}/${row.key}`,
          $$expanded: await transformRowToObject(row, mapping),
        };

        element[targetkey].push(target);
      });
    }
  };
}

/**
 * Will always return an array, given a certain argument.
 * null and undefined will be converted to an empty array.
 * If the argument is already an array, it will be returned as is.
 * Anything else will be wrapped inside an array.
 *
 * @example
 * ```javascript
 * toArray(undefined); // will return []
 * toArray(null); // will return []
 * toArray('simple string'); // will return ['simple string']
 * toArray(['already an array']); // will return ['already an array']
 * ```
 * @param thing
 */
const toArray = (thing) => {
  if (thing === undefined || thing === null) {
    return [];
  } else if (!Array.isArray(thing)) {
    return [thing];
  }
  return thing;
};

/*
 * @deprecated
 *
 * Makes the property <name> of object <resource> an array.
 * This function will alter the resource object so it is advised NOT to use it!
 *
 * @example
 * ```javascript
 * objPropertyToArray({}, foo); // will ALTER RESOURCE into { foo: [] }
 * objPropertyToArray({ foo: null }, foo); // will produce { foo: [] }
 * objPropertyToArray({ foo: 'bar' }, foo); // will produce { foo: ['bar'] }
 * ```
 * @param resource
 * @param name
 */
// const objPropertyToArray = (resource, name) => {
//   resource[name] = toArray(resource[name]);
// };

/**
 * Helper function to type check if something is an SriError
 * @param x
 * @returns
 */
function isSriError(x): x is SriError {
  return x instanceof SriError || x?.__proto__?.constructor?.name === "SriError";
}

function generatePgColumns(
  sriConfig: TSriConfig,
  currentInformationSchema: TInformationSchema,
  pgp: IMain,
): TPgColumns {
  return Object.fromEntries(
    sriConfig.resources
      .filter((resource) => !resource.onlyCustom)
      .map((resource) => {
        const { type } = resource;
        const table = tableFromMapping(typeToMapping(type, sriConfig.resources));
        const columns = JSON.parse(
          `[${sqlColumnNames(typeToMapping(type, sriConfig.resources))}]`,
        ).filter((cname) => !cname.startsWith("$$meta."));
        const dummyUpdateRow = transformObjectToRow({}, resource, false, currentInformationSchema);

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
  );
}

export {
  hrtimeToMilliseconds,
  isLogChannelEnabled,
  debugAnyChannelAllowed,
  debug,
  error,
  sortUrlQueryParamParseTree,
  hrefToParsedObjectFactory,
  getParentSriRequest,
  installExpressMiddlewareTimer,
  setServerTimingHdr,
  expressMiddlewareTimerReportToServerTiming,
  createDebugLogConfigObject,
  handleRequestDebugLog,
  urlToTypeAndKey,
  isUuid,
  parseResource,
  errorAsCode,
  typeToConfig,
  typeToMapping,
  sqlColumnNames,
  transformObjectToRow,
  transformRowToObject,
  pgInit,
  pgConnect,
  pgExec,
  pgResult,
  createPreparedStatement,
  startTransaction,
  startTask,
  installVersionIncTriggerOnTable,
  getCountResult,
  tableFromMapping,
  isEqualSriObject,
  stringifyError,
  settleResultsToSriResults,
  createReadableStream,
  getParentSriRequestFromRequestMap,
  generateSriRequest,
  checkSriConfigWithDbInformationSchema,
  findPropertyInJsonSchema,
  generatePgColumnSet,
  checkRequiredFields,
  addReferencingResources,
  toArray,
  resourceDefToResourceDefInternal,
  isSriError,
  generatePgColumns,
};
