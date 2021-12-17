/* Internal utilities for sri4node */
import {JSONSchema4, JSONSchema4Type} from 'json-schema';
import { URL } from 'url';
import { FlattenedJsonSchema, ParseTree, ResourceDefinition, SriConfig, SriRequest } from './typeDefinitions';

const _ = require('lodash')
const url = require('url')
const EventEmitter = require('events');
const pEvent = require('p-event');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const stream = require('stream');
const peggy = require("peggy");
const { generateFlatQueryStringParserGrammar } = require('./url_parsing/flat_url_parser')
const { generateNonFlatQueryStringParserGrammar } = require('./url_parsing/non_flat_url_parser')

const env = require('./env');

const { Readable } = require('stream')
const httpContext = require('express-http-context');

process.env.TIMER = 'true'; //eslint-disable-line
const emt = require('express-middleware-timer');
const { DEFAULT_MAX_VERSION } = require('tls');

import * as pgPromise from 'pg-promise';
import { ISSLConfig } from 'pg-promise/typescript/pg-subset';
import { Application, Request, Response } from 'express';

let pgp:pgPromise.IMain; // will be initialized at pgConnect


const logBuffer:{ [k:string]: string[]} = {};


/**
 * @typedef {object} SriErrorConstructorObject
 *  @property {Number} status: the http status
 *  @property {Array<Error>} errors: the errors
 *  @property {Array<Header>} headers: the headers that should be sent
 *  @property {object} document
 *  @property {String} sriRequestID
 */

/**
 * Base class for every error that is being thrown throughout the lifetime of an sri request
 */
class SriError {
  status: number;
  body: { errors: {}[]; status: number; document: any; };
  headers: {};
  sriRequestID: string | null;
  /**
   * Contructs an sri error based on the given initialisation object
   *
   * @param {SriErrorConstructorObject} value
   */
  constructor({status = 500, errors = [], headers = {}, document = {}, sriRequestID=null}:{ status:number, errors:any[] | any, headers?:{[k:string]: string}, document?:any, sriRequestID?:string | null }) {
    this.status = status,
    this.body = {
      errors: errors.map( (e:any) => {
                  if (e.type == undefined) {
                    e.type = 'ERROR' // if no type is specified, set to 'ERROR'
                  }
                  return e
                }),
      status: status,
      document,
    },
    this.headers = headers,
    this.sriRequestID = sriRequestID
  }
};


/**
 * Short for console.log, what's the use of this ???
 * @param x 
 */
 function cl (x:any) {
  console.log(x); // eslint-disable-line
}

/**
 * process.hrtime() method can be used to measure execution time, but returns an array
 *
 * @param {Array<Integer>} param0
 * @returns the input traslated to milliseconds
 */
function hrtimeToMilliseconds([seconds, nanoseconds]: [number, number]):number {
  return seconds * 1000 + nanoseconds / 1000000;
}

/**
 * @typedef {object} SriRequest
 *  @property {string} id
 *  @property {parentSriRequest} SriRequest
 */

/**
 * @typedef {object} SriRequest
 *  @property {string} id
 *  @property {parentSriRequest} SriRequest
 */

const debug = (channel:string, x:(() => string) | string) => {
  if ((global as any).sri4node_configuration===undefined ||
        ((global as any).sri4node_configuration.logdebug && (
          (global as any).sri4node_configuration.logdebug.channels==='all' ||
          (global as any).sri4node_configuration.logdebug.channels.has(channel)) ) )
  {
    const reqId:string = httpContext.get('reqId');
    const msg = `${(new Date()).toISOString()} ${reqId ? `[reqId:${reqId}]` : ""}[${channel}] ${typeof x === 'function' ? x() : x}`
    if (reqId !== undefined) {
        if ((global as any).sri4node_configuration.logdebug.statuses !== undefined) {
          logBuffer[reqId] ? logBuffer[reqId].push(msg) : logBuffer[reqId] = [ msg ];
        } else {
          console.log(msg);
        }
    } else {
      console.log(msg);
    }
  }
};

const error = function(...args) {
  const reqId = httpContext.get('reqId');
  if (reqId) {
      console.error(`[reqId:${reqId}]`, ...args);
  } else {
      console.error(...args);
  }
};

/**
 * @typedef {object} SriErrorConstructorObject
 *  @property {Number} status: the http status
 *  @property {Array<Error>} errors: the errors
 *  @property {Array<Header>} headers: the headers that should be sent
 *  @property {object} document
 *  @property {String} sriRequestID
 */

/**
 * This will make sure we can easily find all possible dot-separated property names
 * by going through the keys in the object, because it will create a non-nested version
 * of the json schema where all the keys are dot-separated.
 * In case of a an array, the 'key' should become something like myobj.myarray[*] to indicate
 * all array elements, and thus myobj.myarray[*].arrayelementproperty if the array contains objects
 * (cfr. JSONPath)
 *
 * so
 * {
 *  type: 'object',
 *  properties: {
 *    a: {
 *      type: 'object',
 *      properties: {
 *        b: { type: 'string' }
 *        cs: { type: 'array', items: { type: 'number' } }
 *      }
 *    }
 *  }
 * }
 * would become:
 * {
 *  'a.b': { type: 'string' }
 *  'a.cs[*]': { type: 'number' }
 * }
 *
 * @param {object} jsonSchema
 * @param {Array<string>} pathToCurrent
 * @returns a version of the json schema where every property name if on the top-level but with dot notation
 */
function flattenJsonSchema(jsonSchema:JSONSchema4, pathToCurrent:string[] = []) {
  if (jsonSchema.type === 'object') {
    // old skool modification of an object is a bit easier to reason about in this case
    const retVal = {};
    Object.entries(jsonSchema.properties || {})
      .forEach(([pName, pSchema]) => {
        Object.assign(retVal, flattenJsonSchema(pSchema, [...pathToCurrent, pName]));
      });
    return retVal;
  } else if (jsonSchema.type === 'array') {
    // return Object.fromEntries(flattenJsonSchema(jsonSchema.items, [...pathToCurrent, '[*]']);
    const retVal = {};
    if (Array.isArray(jsonSchema.items)) {
      jsonSchema.items?.forEach((pSchema) => {
        Object.assign(retVal, flattenJsonSchema(pSchema, [...pathToCurrent, '[*]']));
      });
    } else if (jsonSchema.items) {
      Object.assign(retVal, flattenJsonSchema(jsonSchema.items, [...pathToCurrent, '[*]']));
    }
    return retVal;
  } else {
    const flattenedName = pathToCurrent.reduce((a, c) => {
      if (c === '[*]') {
        return `${a}${c}`;
      }
      return `${a}.${c}`;
    });
    return { [flattenedName]: jsonSchema };
  }
}

/**
 * Given the generated grammar, generate and return the parser
 *
 * @param {*} grammar
 * @returns
 */
function generateQueryStringParser(grammar:string, allowedStartRules:string[] | undefined = undefined): any {
  const pegConf = allowedStartRules
    ? {
      // Array of rules the parser will be allowed to start parsing from (default: the first rule in the grammar).
      allowedStartRules
    }
    : {};
  return peggy.generate(grammar, pegConf);
};

/**
 *
 * @param {pegSyntaxError} e
 * @param {String} input
 * @returns a string
 */
function pegSyntaxErrorToErrorMessage(e:{[prop:string]: any}, input = '') {
  if (e.location) {
    const searchParams = input;

    // const markedPart = ' >> ' + searchParams.slice(e.location.start.offset, e.location.end.offset) + ' << ' + 

    // Since we can expect to be in a UTF-8 environment we can use some UTF-8 niftyness
    //   https://www.fileformat.info/info/unicode/block/combining_diacritical_marks/index.htm
    //   a character that modifies the previous one (like adding underline or something)
    //   try them all with for (let i = 0x0300; i < 0x036F; i ++) { console.log( "hello".split('').map(c => `${c}${String.fromCharCode(i)}`).join('') + ' = 0x' + i.toString(16)); }
        
    const markedPart = searchParams
      .slice(e.location.start.offset, e.location.end.offset)
      .split('')
      .map( c => `${c}\u0333`) // \u0330 (tilde below) \u0332 (underline) \u0333 (double underline) \u0347 (also double underline)
      .join('');
    

    const markedErrorString = (
        searchParams.slice(0, e.location.start.offset) +
        markedPart +
        searchParams.slice(e.location.end.offset)
      )
      .split('\n')
      .map((l, lineNr) => `${("0000" + lineNr).slice(-3)} ${l}`)
      .filter((l, lineNr) => lineNr > e.location.start.line - 3 && lineNr < e.location.start.line + 3)
      .join('\n');

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
function generateMissingDefaultsForParseTree(parseTree:any, mapping:ResourceDefinition) {
  const DEFAULT_LIMIT = 30; // if not configured in mapping file
  const DEFAULT_MAX_LIMIT = 500; // if not configured in mapping file
  const DEFAULT_EXPANSION = 'FULL';
  const DEFAULT_INCLUDECOUNT = false;
  const DEFAULT_$$meta_deleted_IN = [false];
  const DEFAULT_LIST_ORDER_BY = ['$$meta.created', 'key'];
  const DEFAULT_LIST_ORDER_DESCENDING = false;

  let retVal:any[] = [];

  if (!parseTree.find((f:any) => f.operator === 'LIST_LIMIT')) {
    retVal.push({
      operator: 'LIST_LIMIT',
      value: Math.min(mapping.defaultlimit || DEFAULT_LIMIT, mapping.maxlimit || DEFAULT_MAX_LIMIT),
    });
  }
  if (!parseTree.find((f:any) => f.operator === 'EXPANSION')) {
    retVal.push({
      operator: 'EXPANSION',
      value: mapping.defaultexpansion || DEFAULT_EXPANSION,
    });
  }
  if (!parseTree.find((f:any) => f.operator === 'LIST_META_INCLUDE_COUNT')) {
    retVal.push({
      operator: 'LIST_META_INCLUDE_COUNT',
      value: DEFAULT_INCLUDECOUNT,
    });
  }
  if (!parseTree.find((f:any) => f.property === '$$meta.deleted' && f.operator === 'IN')) {
    retVal.push({
      property: '$$meta.deleted',
      operator: 'IN',
      value: [ false ],
      caseInsensitive: true,
      invertOperator: false,
    });
  }
  if (!parseTree.find((f:any) => f.operator === 'LIST_ORDER_BY')) {
    retVal.push({
      operator: 'LIST_ORDER_BY',
      value: DEFAULT_LIST_ORDER_BY,
    });
  }
  if (!parseTree.find((f:any) => f.operator === 'LIST_ORDER_DESCENDING')) {
    retVal.push({
      operator: 'LIST_ORDER_DESCENDING',
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
function sortUrlQueryParamParseTree(parseTree:any[]) {
  const compareProperties = (a:any, b:any, properties:string[]) => {
    return properties.reduce((acc, cur) => {
        if (acc !== 0) return acc;
        if (a[cur] === b[cur]) return acc;
        if ((a[cur] || '') > (b[cur] || '')) {
          // console.log(a[cur], '>', b[cur], ' => return 1', a, b);
          return 1;
        }
        // console.log(a[cur], '<', b[cur], ' => return -1', a, b);
        return -1;
      },
      0
    );
  };

  return parseTree.sort((a, b) => compareProperties(
    a,
    b,
    ['property', 'operator', 'invertOperator', 'caseInsensitive', 'value'],
  ));
}


let hrefToParsedObjectFactoryThis:any = {};

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
 * @param {object} sri4nodeConfigObject: the sri4node config (and mainly the mapping section) holds most info we need to know
 * @param {boolean} flat: if true, will generate a 'flat' parseTree, otherwise a non-flat parseTree (filters grouped per type) will be generated
 */
function hrefToParsedObjectFactory(sriConfig:SriConfig = { resources: [] }, flat = false) {
  let parseQueryStringPartByPart:'NORMAL' | 'PART_BY_PART' | 'VALUES_APART' = 'PART_BY_PART'; //'PARTBYPART';

  // assuming sriConfig will always be the same, we optimize with
  // some simple memoization of a few calculated helper data structures
  if (hrefToParsedObjectFactoryThis.sriConfig !== sriConfig) {
    try {
      hrefToParsedObjectFactoryThis.sriConfig = sriConfig;
      hrefToParsedObjectFactoryThis.mappingByPathMap = Object.fromEntries(
        sriConfig.resources.map((r) => [r.type, r])
      );
      hrefToParsedObjectFactoryThis.flattenedJsonSchemaByPathMap = Object.fromEntries(
        sriConfig.resources.map((r) => [r.type, flattenJsonSchema(r.schema)]),
      );
      hrefToParsedObjectFactoryThis.flatQueryStringParserByPathMap = Object.fromEntries(
        sriConfig.resources.map((r) => {
          const grammar = generateFlatQueryStringParserGrammar(hrefToParsedObjectFactoryThis.flattenedJsonSchemaByPathMap[r.type], sriConfig);
          try {
            // console.log(`${r.type} GRAMMAR`);
            // console.log(`=================`);
            // console.log(grammar);
            switch(parseQueryStringPartByPart) {
              case 'NORMAL':
                return [r.type, generateQueryStringParser(grammar)];
              case 'PART_BY_PART':
                return [r.type, generateQueryStringParser(grammar, ['QueryStringPart'])];
              case 'VALUES_APART':
                return [
                  r.type,
                  {
                    filterParser: generateQueryStringParser(grammar, ['FilterName']),
                    singleValueParser: generateQueryStringParser(grammar, ['SingleValue']),
                    multiValueParser: generateQueryStringParser(grammar, ['MultiValue']),
                  }
                ];
              default:
                throw `parseQueryStringPartByPart has an unsupported value (${parseQueryStringPartByPart})`;
            }
          } catch(e) {
            console.log(pegSyntaxErrorToErrorMessage(e, grammar));
            throw e;
          }
        }),
      );
      hrefToParsedObjectFactoryThis.nonFlatQueryStringParserByPathMap = Object.fromEntries(
        sriConfig.resources.map((r) => {
          const grammar = generateNonFlatQueryStringParserGrammar(hrefToParsedObjectFactoryThis.flattenedJsonSchemaByPathMap[r.type], sriConfig);
          try {
            return [r.type, generateQueryStringParser(grammar)];
          } catch(e) {
            console.log(pegSyntaxErrorToErrorMessage(e, grammar));
            throw e;
          }
        }),
      );
    } catch(e) {
      delete hrefToParsedObjectFactoryThis.sriConfig;
      console.log('Uh oh, something went wrong while setting up flattenedJsonSchema and parsers');
      console.log(pegSyntaxErrorToErrorMessage(e));
      throw e;
    }
  }

  if (flat) {
    return function hrefToFlatParsedObject(href:string) {
      const urlToWorkOn = new URL(`https://domain.com${href}`);
      const searchParamsToWorkOn = urlToWorkOn.searchParams;
  
      const flatQueryStringParser = hrefToParsedObjectFactoryThis.flatQueryStringParserByPathMap[urlToWorkOn.pathname];
      try {
        const parseTree = {
          'NORMAL': () => flatQueryStringParser.parse(searchParamsToWorkOn.toString()),
          'PART_BY_PART': () => [...searchParamsToWorkOn.entries()].map(([k, v]) => flatQueryStringParser.parse(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`)),
          // TODO !!!
          'VALUES_APART': () => [...searchParamsToWorkOn.entries()].map(([k, v]) => {
              const { expectedValue, ...parsedFilter } = flatQueryStringParser.filterParser.parse(encodeURIComponent(k));
              // now that we know if the expected input is an array or not, we can parse it as such
              const value = flatQueryStringParser.valueParser.parse(encodeURIComponent(v), [ expectedValue.inputShouldBeArray ? 'MultiValue' : 'SingleValue']);
              return { ...parsedFilter, value };
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
  
        const normalizedParseTree = sortUrlQueryParamParseTree([ ...parseTree, ...missingDefaultsParseTree ])
          // remove 'expectedValue' to make sure tests still work
          .map(x => { const { expectedValue, ...rest } = x; return rest });
  
        const parsedUrlObject = {
          parseTree: normalizedParseTree,
          // TODO normalizedUrl: urlQueryStringParseTreeToNormalizedURLSearchParams(parseTree),
        }
  
        return parsedUrlObject;
      } catch (e) {
        // console.log('href parse error', e.message, e);
        console.log(pegSyntaxErrorToErrorMessage(e, searchParamsToWorkOn.toString()));
        throw e;
      }
    }
  }

  return function hrefToNonFlatParsedObject(href:string) {
    const urlToWorkOn = new URL(href, 'https://domain.com');
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
      }

      return parsedUrlObject;
    } catch (e) {
      // console.log('href parse error', e.message, e);
      console.log(pegSyntaxErrorToErrorMessage(e, searchParamsToWorkOn.toString()));
      throw e;
    }
  }
}


export = module.exports = {
  cl,

  installEMT: (app:Application) => {
    app.use(emt.init(function emtReporter(req:Express.Request, res:Express.Response) {
    }));
    return emt;
  },

  emtReportToServerTiming: (req:Request, res:Response, sriRequest:SriRequest) => {
      const report = emt.calculate(req, res);
      const timerLogs = Object.keys(report.timers).forEach(timer => {
        const duration = report.timers[timer]['took']
        if (duration > 0 && timer !== 'express-wrapper') {
            module.exports.setServerTimingHdr(sriRequest, timer, duration);
        }
      });
  },

  createDebugLogConfigObject: (logdebug:any):any => {
    if (logdebug === true) {
        // for backwards compability
        console.warn(
            '\n\n\n------------------------------------------------------------------------------------------------------------------\n' +
            'The logdebug parameter has changed format. Before, debug logging was enabled by specifying the boolean value \'true\'.\n' +
            'Now you need to provide a string with all the logchannels for which you want to receive debug logging (see the\n' +
            'sri4node documentation for more details ). For now "general,trace,requests" is set as sensible default, but please\n' +
            'specify the preferred channels for which logging is requested.\n' +
            '------------------------------------------------------------------------------------------------------------------\n\n\n'
            )
        return { channels: new Set(['general', 'trace', 'requests']) }
    } else if (logdebug === false) {
        return { channels: new Set() }
    } else {
        const tempLogDebug:any = { channels: logdebug.channels === 'all' ? 'all' : new Set(logdebug.channels) }
        if (logdebug.statuses) {
            tempLogDebug.statuses =  new Set(logdebug.statuses)
        }
        return tempLogDebug;
    }
  },

  handleRequestDebugLog: (status:number) => {
      const reqId = httpContext.get('reqId');
      if ((global as any).sri4node_configuration.logdebug.statuses.has(status)) {
        logBuffer[reqId].forEach( e => console.log(e) );
      }
      delete logBuffer[reqId];
  },

  debug,

  error,

  urlToTypeAndKey: (urlToParse:string) => {
    if (typeof urlToParse !== 'string') {
      throw 'urlToTypeAndKey requires a string argument instead of ' + urlToParse
    }
    const parsedUrl = url.parse(urlToParse);
    const pathName = parsedUrl.pathname.replace(/\/$/, '');
    const parts = pathName.split('/');
    const type = _.initial(parts).join('/');
    const key = _.last(parts);

    return { type, key }
  },


// 2 functions below are COPIED FROM beveiliging_nodejs --> TODO: remove them there and use the version here

// Unfortunatly we seems to have generated invalid UUIDs in the past.
// (we even have uuids with invalid version like /organisations/efeb7119-60e4-8bd7-e040-fd0a059a2c55)
// Therefore we cannot use a strict uuid checker like the npm module 'uuid-validate' but do we have to be less strict.
  isUuid: (uuid:string) => (uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/) != null),

  parseResource: (u:string) => {
    if (!u) {
      return null;
    }

    const [u1, comment] = (u.includes('#'))
      ? u.split('#/')
      : [u, null];

    if (u1.includes('?')) {
      const splittedUrl = u1.split('?');
      return {
        base: splittedUrl[0],
        id: null,
        query: splittedUrl[1],
        comment,
      };
    }
    const pp = path.parse(u1);
    if (module.exports.isUuid(pp.name)) {
      return {
        base: pp.dir,
        id: pp.name,
        query: null,
        comment,
      };
    }
    return {
      base: `${(pp.dir !== '/' ? pp.dir : '')}/${pp.name}`,
      id: null,
      query: null,
      comment,
    };
  },


  errorAsCode: (s:string) => {
    // return any string as code for REST API error object.
    var ret = s;

    ret = ret.replace(/".*"/, '');

    ret = ret.toLowerCase().trim();
    ret = ret.replace(/[^a-z0-9 ]/gmi, '');
    ret = ret.replace(/ /gmi, '.');

    return ret;
  },

  // Converts the configuration object for roa4node into an array per resource type.
  typeToConfig: function (config:any[]) {
    return config.reduce( (acc, c) => {
                acc[c.type] = c
                return acc
              }, {} )
  },

  typeToMapping: function (type:string) {
      return module.exports.typeToConfig((global as any).sri4node_configuration.resources)[type]
  },

  sqlColumnNames: function (mapping, summary=false) {
    const columnNames = summary
                          ? Object.keys(mapping.map).filter(c => ! (mapping.map[c].excludeOn !== undefined && mapping.map[c].excludeOn.toLowerCase() === 'summary'))
                          : Object.keys(mapping.map)

    return (columnNames.includes('key') ? '' : '"key",')
            + (columnNames.map( c => `"${c}"`).join(','))
            + ', "$$meta.deleted", "$$meta.created", "$$meta.modified", "$$meta.version"';
  },

  /* Merge all direct properties of object 'source' into object 'target'. */
  mergeObject: function (source, target) {
    Object.keys(source).forEach( key => target[key] = source[key] );
  },

  transformRowToObject: function (row:any, resourceMapping:ResourceDefinition) {
    const map = resourceMapping.map || {};
    let element:any = {};
    element.$$meta = {};
    Object.keys(map).forEach((key) => {
      if (map[key].references) {
        const referencedType = map[key].references;
        if (row[key] !== null) {
          element[key] = {
            href: referencedType + '/' + row[key]
          };
        } else {
          element[key] = null;
        }
      } else {
        if (key.startsWith('$$meta.')) {
          element['$$meta'][key.split('$$meta.')[1]] = row[key]
        } else {
          element[key] = row[key];
        }
      }

      map[key]?.['columnToField']?.forEach((f) => f(key, element));
    });

    Object.assign(element.$$meta, _.pickBy({
        // keep only properties with defined non-null value (requires lodash - behaves different as underscores _.pick())
        deleted: row['$$meta.deleted'],
        created: row['$$meta.created'],
        modified: row['$$meta.modified'],
      }));
    element.$$meta.permalink = resourceMapping.type + '/' + row.key;
    element.$$meta.version = row['$$meta.version'];

    return element
  },


  transformObjectToRow: function (obj, resourceMapping, isNewResource) {
    const map = resourceMapping.map
    const row = {}
    Object.keys(map).forEach( key => {
      if (map[key].references && obj[key] !== undefined) {
        const permalink = obj[key].href;
        if (!permalink) {
          throw new SriError({status: 409, errors: [{code: 'no.href.inside.reference', msg: 'No href found inside reference ' + key}]})
        }
        const expectedType = map[key].references
        const { type: refType, key: refKey } = module.exports.urlToTypeAndKey(permalink)
        if (refType === expectedType) {
          row[key] = refKey;
        } else {
          const msg = `Faulty reference detected [${permalink}], detected [${refType}] expected [${expectedType}].`
          cl(msg);
          throw new SriError({status: 409, errors: [{code: 'faulty.reference', msg: msg}]})
        }
      } else {
        if (obj[key] !== undefined) {
          row[key] = obj[key];
        } else {
          // explicitly set missing properties to null (https://github.com/katholiek-onderwijs-vlaanderen/sri4node/issues/118)
          row[key] = null
        }
      }

      if (map[key]['fieldToColumn']) {
        map[key]['fieldToColumn'].forEach( f => f(key, row, isNewResource) );
      }

      const fieldTypeDb = (global as any).sri4node_configuration.informationSchema[resourceMapping.type][key].type
      const fieldTypeObject = resourceMapping.schema.properties[key]
                                  ? resourceMapping.schema.properties[key].type
                                  : null
      if ( fieldTypeDb === 'jsonb' && fieldTypeObject === 'array') {
        // for this type combination we need to explicitly stringify the JSON,
        // otherwise insert will attempt to store a postgres array which fails for jsonb
        row[key] = JSON.stringify(row[key])
      }

    })

    return row
  },


  pgInit: async function (pgpInitOptionsIn = {}) {
    const pgpInitOptions = {
        schema: process.env.POSTGRES_SCHEMA,
        ...pgpInitOptionsIn,
    };

    pgp = pgPromise(pgpInitOptions);
    if (process.env.PGP_MONITOR === 'true') {
      const monitor = require('pg-monitor');
      monitor.attach(pgpInitOptions);
    }

    if ((global as any).sri4node_configuration && (global as any).sri4node_configuration.pgMonitor===true) {
        const monitor = require('pg-monitor');
        monitor.attach(pgpInitOptions);
    };

    // The node pg library assumes by default that values of type 'timestamp without time zone' are in local time.
    //   (a deliberate choice, see https://github.com/brianc/node-postgres/issues/429)
    // In the case of sri4node storing in UTC makes more sense as input data arrives in UTC format. Therefore we
    // override the pg handler for type 'timestamp without time zone' with one that appends a 'Z' before conversion
    // to a JS Date object to indicate UTC.
    if (pgp) {
      pgp.pg.types.setTypeParser(1114, s=>new Date(s+'Z'));

      pgp.pg.types.setTypeParser(1184, s => {
          const match = s.match(/\.\d\d\d(\d{0,3})\+/);
          let microseconds = '';
          if (match !== null) {
            microseconds = match[1];
          }

          const isoWithoutMicroseconds = (new Date(s)).toISOString();
          const isoWithMicroseconds = isoWithoutMicroseconds.substring(0, isoWithoutMicroseconds.length - 1)
                                          + microseconds + 'Z';
          return isoWithMicroseconds;
        });

      pgp.pg.types.setTypeParser(20, BigInt);
      pgp.pg.types.setTypeParser(1700, function(val) {
          return parseFloat(val);
      });
      (BigInt.prototype as any).toJSON = function() { return this.toString() };
    } else {
      throw 'pgPromise not initialized!';
    }
  },

  pgConnect: async function (arg) {
    // pgConnect can be called with the database url as argument of the sri4configuration object
    let dbUrl:string, ssl:ISSLConfig | boolean, sri4nodeConfig;

    if (typeof arg === 'string') {
      // arg is the connection string
      dbUrl = arg;
    } else {
      // arg is sri4node configuration object
      sri4nodeConfig = arg;
      if (!pgp) {
        let pgpInitOptions:any = {}
        if (sri4nodeConfig.dbConnectionInitSql !== undefined) {
          pgpInitOptions.connect = (client, dc, useCount) => {
                if (useCount===0) {
                  client.query(sri4nodeConfig.dbConnectionInitSql);
                }
            };
        }
        module.exports.pgInit(pgpInitOptions);
      }
      if (process.env.DATABASE_URL) {
        dbUrl = process.env.DATABASE_URL;
      } else {
        dbUrl = sri4nodeConfig.defaultdatabaseurl;
      }
    }

    if (dbUrl === undefined) {
        error('FATAL: database configuration is missing !');
        process.exit(1)
    }


    // ssl=true is required for heruko.com
    // ssl=false is required for development on local postgres (Cloud9)
    if (dbUrl.indexOf('ssl=false') === -1) {
      ssl = { rejectUnauthorized: false }
      // recent pg 8 deprecates implicit disabling of certificate verification
      //   and heroku does not provide for their  CA files or certificate for your Heroku Postgres server
      //   (see https://help.heroku.com/3DELT3RK/why-can-t-my-third-party-utility-connect-to-heroku-postgres-with-ssl)
      //   ==> need for explicit disabling of rejectUnauthorized
    } else {
      dbUrl = dbUrl.replace('ssl=false', '').replace(/\?$/, '');
      ssl = false
    }

    let cn = {
       connectionString: dbUrl,
       ssl: ssl,
       // TODO: get these values from sriConfig instead of environment !!!
       connectionTimeoutMillis: parseInt(process.env.PGP_CONN_TIMEOUT || '2000'),
       idleTimeoutMillis: parseInt(process.env.PGP_IDLE_TIMEOUT || '14400000'), // 4 hours
       max: process.env.PGP_POOL_SIZE || (sri4nodeConfig !== undefined && sri4nodeConfig.maxConnections) || 16,
    }

    cl('Using database connection object : [' + JSON.stringify(cn) + ']');

    return pgp(cn);
  },


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
  pgExec: async function (db, query, sriRequest=null) {
    const {sql, values} = query.toParameterizedSql()

    module.exports.debug('sql', () => pgp.as.format(sql, values));

    const hrstart = process.hrtime();
    const result = await db.query(sql, values);
    const hrElapsed = process.hrtime(hrstart);
    if (sriRequest) {
      module.exports.setServerTimingHdr(sriRequest, 'db', hrtimeToMilliseconds(hrElapsed));
    }

    return result;
  },

  pgResult: async function (db, query, sriRequest=null) {
    const {sql, values} = query.toParameterizedSql()

    debug('sql', () => pgp.as.format(sql, values));

    const hrstart = process.hrtime();
    const result = await db.result(sql, values)
    const hrElapsed = process.hrtime(hrstart);
    if (sriRequest) {
        module.exports.setServerTimingHdr(sriRequest, 'db', hrtimeToMilliseconds(hrElapsed));
    }

    return result;
  },

  startTransaction: async (db, sriRequest=null, mode = new pgp.txMode.TransactionMode()) => {
    const hrstart = process.hrtime();
    debug('db', '++ Starting database transaction.');

    const emitter = new EventEmitter()

    const txWrapper = async (emitter) => {
      // This wrapper run async without being awaited. This has some consequences:
      //   * errors are not passed the usual way, but via the 'tDone' event
      //   * debug() does not log the correct reqId
      try {
        await db.tx( {mode},  async tx => {
          emitter.emit('txEvent', tx)
          const how = await pEvent(emitter, 'terminate')
          if (how === 'reject') {
            throw 'txRejected'
          }
        })
        emitter.emit('txDone')
      } catch(err) {
        // 'txRejected' as err is expected behaviour in case rejectTx is called
        if (err!='txRejected') {
          emitter.emit('txDone', err)
        } else {
          emitter.emit('txDone')
        }
      }
    }

    try {
      const tx:pgPromise.ITask<any> = await new Promise(function(resolve, reject) {
        let resolved = false
        emitter.on('txEvent', (tx) => {
          resolve(tx);
          resolved = true;
        });
        emitter.on('txDone', (err) => {
          // ignore undefined error, happens at
          if (!resolved) {
            console.log('GOT ERROR:')
            console.log(err)
            console.log(JSON.stringify(err));
            reject(err);
          }
        });
        txWrapper(emitter);
      });
      debug('db', 'Got db tx object.');

      await tx.none('SET CONSTRAINTS ALL DEFERRED;');

      const terminateTx = (how) => async () => {
          if (how !== 'reject') {
            await tx.none('SET CONSTRAINTS ALL IMMEDIATE;');
          }
          emitter.emit('terminate', how)
          const res = await pEvent(emitter, 'txDone')
          if (res !== undefined) {
            throw res
          }
      }

      const hrElapsed = process.hrtime(hrstart);
      if (sriRequest) {
          module.exports.setServerTimingHdr(sriRequest, 'db-starttx', hrtimeToMilliseconds(hrElapsed));
      }

      return ({ tx, resolveTx: terminateTx('resolve'), rejectTx: terminateTx('reject') })
    } catch (err) {
      error('CAUGHT ERROR: ');
      error(JSON.stringify(err), err);
      throw new SriError({status: 503, errors: [{code: 'too.busy', msg: 'The request could not be processed as the database is too busy right now. Try again later.'}]})
    }
  },


  startTask: async (db, sriRequest=null) => {
    const hrstart = process.hrtime();
    debug('db', '++ Starting database task.');

    const emitter = new EventEmitter()

    const taskWrapper = async (emitter) => {
      // This wrapper run async without being awaited. This has some consequences:
      //   * errors are not passed the usual way, but via the 'tDone' event
      //   * debug() does not log the correct reqId
      try {
        await db.task( async t => {
          emitter.emit('tEvent', t)
          await pEvent(emitter, 'terminate')
        })
        emitter.emit('tDone')
      } catch(err) {
        emitter.emit('tDone', err)
      }
    }

    try {
      const t = await new Promise(function(resolve, reject) {
        emitter.on('tEvent', (t) => {
          resolve(t);
        });
        emitter.on('tDone', (err) => {
          reject(err);
        });
        taskWrapper(emitter);
      });
      debug('db', 'Got db t object.');

      const endTask = async () => {
          emitter.emit('terminate')
          const res = await pEvent(emitter, 'tDone')
          debug('db', 'db task done.');
          if (res !== undefined) {
            throw res
          }
      }
      const hrElapsed = process.hrtime(hrstart);
      if (sriRequest) {
          module.exports.setServerTimingHdr(sriRequest, 'db-starttask', hrtimeToMilliseconds(hrElapsed));
      }

      return ({ t, endTask: endTask })
    } catch (err) {
      error('CAUGHT ERROR: ');
      error(JSON.stringify(err));
      throw new SriError({status: 503, errors: [{code: 'too.busy', msg: 'The request could not be processed as the database is too busy right now. Try again later.'}]})
    }
  },

  installVersionIncTriggerOnTable: async function(db, tableName) {

    const tgname = `vsko_resource_version_trigger_${( env.postgresSchema !== undefined ? env.postgresSchema : '' )}_${tableName}`

    const plpgsql = `
      DO $___$
      BEGIN
        -- 1. add column '$$meta.version' if not yet present
        IF NOT EXISTS (
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = '${tableName}'
            AND column_name = '$$meta.version'
            ${( env.postgresSchema !== undefined
              ? `AND table_schema = '${env.postgresSchema}'`
              : '' )}
        ) THEN
          ALTER TABLE "${tableName}" ADD "$$meta.version" integer DEFAULT 0;
        END IF;

        -- 2. create func vsko_resource_version_inc_function if not yet present
        IF NOT EXISTS (SELECT proname from pg_proc p INNER JOIN pg_namespace ns ON (p.pronamespace = ns.oid)
                        WHERE proname = 'vsko_resource_version_inc_function'
                        ${( env.postgresSchema !== undefined
                          ? `AND nspname = '${env.postgresSchema}'`
                          : `AND nspname = 'public'` )}
                      ) THEN
          CREATE FUNCTION ${( env.postgresSchema !== undefined ? env.postgresSchema : 'public' )}.vsko_resource_version_inc_function() RETURNS OPAQUE AS '
          BEGIN
            NEW."$$meta.version" := OLD."$$meta.version" + 1;
            RETURN NEW;
          END' LANGUAGE 'plpgsql';
        END IF;

        -- 3. create trigger 'vsko_resource_version_trigger_${tableName}' if not yet present
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${tgname}') THEN
            CREATE TRIGGER ${tgname} BEFORE UPDATE ON "${tableName}"
            FOR EACH ROW EXECUTE PROCEDURE ${( env.postgresSchema !== undefined ? env.postgresSchema : 'public' )}.vsko_resource_version_inc_function();
        END IF;
      END
      $___$
      LANGUAGE 'plpgsql';
    `
    await db.query(plpgsql)
  },

  getCountResult: async (tx, countquery, sriRequest) => {
    const [{count}] = await module.exports.pgExec(tx, countquery, sriRequest);
    return parseInt(count, 10);
  },

  tableFromMapping: (mapping) => {
    return (mapping.table ? mapping.table : _.last(mapping.type.split('/')) )
  },

  isEqualSriObject: (obj1, obj2, mapping) => {
    const relevantProperties = Object.keys(mapping.map)

    function customizer(val, key, obj) {
      if (mapping.schema.properties[key] && mapping.schema.properties[key].format === 'date-time') {
        return (new Date(val)).getTime();
      }

      if ((global as any).sri4node_configuration.informationSchema[mapping.type][key]
            && (global as any).sri4node_configuration.informationSchema[mapping.type][key].type === 'bigint') {
        return BigInt(val)
      }
    }

    const o1 =_.cloneDeepWith(_.pickBy(obj1, (val, key) => {
      return (val!==null && val!=undefined && relevantProperties.includes(key))
    }), customizer)
    const o2 =_.cloneDeepWith(_.pickBy(obj2, (val, key) => {
      return (val!==null && val!=undefined && relevantProperties.includes(key))
    }), customizer)

    return _.isEqualWith(o1, o2);
  },

  stringifyError: (e) => {
    if (e instanceof Error) {
      return e.toString()
    } else {
      return JSON.stringify(e)
    }
  },

  settleResultsToSriResults: (results) => {
    return results.map(res => {
        if (res.isFulfilled) {
          return res.value
        } else {
          const err = res.reason
          if (err instanceof SriError) {
            return err
          } else {
            error('____________________________ E R R O R (settleResultsToSriResults)_________________________')
            error(module.exports.stringifyError(err))
            if (err && err.stack) {
                error('STACK:')
                error(err.stack)
            }
            error('___________________________________________________________________________________________')
            return new SriError({status: 500, errors: [{code: 'internal.server.error', msg: `Internal Server Error. [$module.exports.stringifyError(err)}]`}]})
          }
        }
      });
  },

  createReadableStream: (objectMode = true) => {
    const s = new Readable({ objectMode })
    s._read = function () {}
    return s
  },

  getPersonFromSriRequest: (sriRequest) => {
    // A userObject of null happens when the user is (not yet) logged in
    return (sriRequest.userObject ? '/persons/' + sriRequest.userObject.uuid : 'NONE')
  },

  setServerTimingHdr: (sriRequest, property, value) => {
    const parentSriRequest = module.exports.getParentSriRequest(sriRequest);
    if (parentSriRequest.serverTiming === undefined) {
        parentSriRequest.serverTiming = {}
    }
    if (parentSriRequest.serverTiming[property] === undefined) {
        parentSriRequest.serverTiming[property] = value;
    } else {
        parentSriRequest.serverTiming[property] += value;
    }
  },

  getParentSriRequest: (sriRequest) => {
    return sriRequest.parentSriRequest ? sriRequest.parentSriRequest : sriRequest;
  },
  getParentSriRequestFromRequestMap: (sriRequestMap) => {
    const sriRequest = Array.from(sriRequestMap.values())[0];
    return module.exports.getParentSriRequest(sriRequest);
  },

  getPgp: () => pgp,

  SriError,

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
   * @param {object} expressResponse: needed for creating a basic SriRequest object (if streaming mode = true)
   * @param {object} config: needed for creating a basic SriRequest object, of the form {isBatchRequest: boolean, readOnly: boolean, mapping: <single element from sri4node config 'mappings' section>}
   * @param {object} batchHandlerAndParams: an object as returned by bath/matchHref of the form { path, routeParams, queryParams, handler: [path, verb, func, config, mapping, streaming, readOnly, isBatch] }
   * @param {SriRequest} parentSriRequest: needed when inside a batch or when called as sri4node_internal_onterface
   * @param {BatchElement} batchElement: needed when creating a 'virtual' SriRequest that represents 1 request from inside a batch
   *
   * @returns {SriRequest}
   */
  generateSriRequest: function generateSriRequest(
                                  expressRequest:Express.Request | SriRequest | undefined = undefined,
                                  expressResponse:Express.Response | any | undefined = undefined,
                                  basicConfig:any = undefined,
                                  batchHandlerAndParams:any = undefined,
                                  parentSriRequest:SriRequest | undefined = undefined,
                                  batchElement:any = undefined
                                ):SriRequest {
    const baseSriRequest = {
      id: uuidv4(),
      logDebug: debug,
      logError: error,
      SriError,
      context: {},
      parentSriRequest,

      path: undefined,
      query: undefined,
      params: undefined,
      sriType: undefined,
      isBatchRequest: undefined,
      readOnly: undefined,

      originalUrl: undefined,
      httpMethod: undefined,
      headers: undefined,
      body: undefined,
      dbT: undefined,
      inStream: undefined,
      outStream: undefined,
      setHeader: undefined,
      setStatus: undefined,
      streamStarted: undefined,

      protocol: undefined,
      isBatchPart: undefined,

      serverTiming: undefined,
    }

    if (parentSriRequest && !batchElement) { // internal interface
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

        protocol: '_internal_',
        isBatchPart: false,

        parentSriRequest: parentSriRequest.parentSriRequest //??? || parentSriRequest,
      };
    } else if (parentSriRequest && batchElement) { // batch item
      // const batchHandlerAndParams = batchElement.match;

      return {
        ...parentSriRequest,
        ...baseSriRequest,

        originalUrl: batchElement.href,

        path: batchHandlerAndParams.path,
        query: batchHandlerAndParams.queryParams,
        params: batchHandlerAndParams.routeParams,
        httpMethod: batchElement.verb,

        body: (batchElement.body == null ? null : _.isObject(batchElement.body) ? batchElement.body : JSON.parse(batchElement.body)),
        sriType: batchHandlerAndParams.handler.mapping.type,
        isBatchPart: true,
      };
    } else if (expressRequest) { // a 'normal' request
      let generatedSriRequest:SriRequest = {
        ...baseSriRequest,

        path: expressRequest.path,
        originalUrl: expressRequest.originalUrl,
        query: expressRequest.query,
        params: expressRequest.params,
        httpMethod: expressRequest.method,

        headers: expressRequest.headers,
        protocol: expressRequest.protocol,
        body: expressRequest.body,
        isBatchPart: false,
        isBatchRequest: basicConfig.isBatchRequest,
        readOnly: basicConfig.readOnly,

        // the batch code will set sriType for batch elements
        sriType: !basicConfig.isBatchRequest ? basicConfig.mapping.type : undefined,
      };

      // adding sriRequest.dbT should still be done in code after this function
      // because for the normal case it is asynchronous, and I wanted to keep
      // this function synchronous as long as possible
      // ======================================================================

      if (basicConfig.isStreamingRequest) {
        if (!expressResponse) {
          throw Error('[generateSriRequest] basicConfig.isStreamingRequest is true, but expressResponse argument is missing')
        }
        // use passthrough streams to avoid passing req and resp in sriRequest
        const inStream = new stream.PassThrough({allowHalfOpen: false, emitClose: true});
        const outStream = new stream.PassThrough({allowHalfOpen: false, emitClose: true});
        generatedSriRequest.inStream = expressRequest.pipe(inStream);
        generatedSriRequest.outStream = outStream.pipe(expressResponse);
        generatedSriRequest.setHeader = ((k, v) => expressResponse.set(k, v));
        generatedSriRequest.setStatus = ((s) => expressResponse.status(s));
        generatedSriRequest.streamStarted = (() => expressResponse.headersSent);
      }
      return generatedSriRequest;
    }

    if (parentSriRequest && !batchElement) { // internal interface
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

        protocol: '_internal_',
        isBatchPart: false,

        parentSriRequest: parentSriRequest.parentSriRequest //??? || parentSriRequest,
      };
    } else if (parentSriRequest && batchElement) { // batch item
      // const batchHandlerAndParams = batchElement.match;

      return {
        ...parentSriRequest,
        ...baseSriRequest,

        originalUrl: batchElement.href,

        path: batchHandlerAndParams.path,
        query: batchHandlerAndParams.queryParams,
        params: batchHandlerAndParams.routeParams,
        httpMethod: batchElement.verb,

        body: (batchElement.body == null ? null : _.isObject(batchElement.body) ? batchElement.body : JSON.parse(batchElement.body)),
        sriType: batchHandlerAndParams.handler.mapping.type,
        isBatchPart: true,
      };
    } else { // a 'normal' request
      let generatedSriRequest:SriRequest = {
        ...baseSriRequest,

        path: expressRequest.path,
        originalUrl: expressRequest.originalUrl,
        query: expressRequest.query,
        params: expressRequest.params,
        httpMethod: expressRequest.method,

        headers: expressRequest.headers,
        protocol: expressRequest.protocol,
        body: expressRequest.body,
        isBatchPart: false,
        isBatchRequest: basicConfig.isBatchRequest,
        readOnly: basicConfig.readOnly,

        // the batch code will set sriType for batch elements
        sriType: !basicConfig.isBatchRequest ? basicConfig.mapping.type : undefined,
      };

      // adding sriRequest.dbT should still be done in code after this function
      // because for the normal case it is asynchronous, and I wanted to keep
      // this function synchronous as long as possible
      // ======================================================================

      if (basicConfig.isStreamingRequest) {
        if (!expressResponse) {
          throw Error('[generateSriRequest] basicConfig.isStreamingRequest is true, but expressResponse argument is missing')
        }
        // use passthrough streams to avoid passing req and resp in sriRequest
        const inStream = new stream.PassThrough({allowHalfOpen: false, emitClose: true});
        const outStream = new stream.PassThrough({allowHalfOpen: false, emitClose: true});
        generatedSriRequest.inStream = expressRequest.pipe(inStream);
        generatedSriRequest.outStream = outStream.pipe(expressResponse);
        generatedSriRequest.setHeader = ((k, v) => expressResponse.set(k, v));
        generatedSriRequest.setStatus = ((s) => expressResponse.status(s));
        generatedSriRequest.streamStarted = (() => expressResponse.headersSent);
      }
      return generatedSriRequest;
    }
  },

  hrefToParsedObjectFactory,

  flattenJsonSchema,

  hrtimeToMilliseconds,

  sortUrlQueryParamParseTree,
}
