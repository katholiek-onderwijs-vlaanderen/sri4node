// This file should contain the shared type definitions.
// For example everything that is a part of the sriConfig object should
// have  a type definition, so it'll be easier to use for developers.
// Also internally sri4node would benfit from more strict types for the shared data structures.

import { BusboyConfig } from 'busboy';
import { Request } from 'express';
import { Operation } from 'fast-json-patch';
import { IncomingHttpHeaders } from 'http2';
import { JSONSchema4 } from 'json-schema';
import {
  IDatabase, IInitOptions, ValidSchema,
} from 'pg-promise';
import { IClient, IConnectionParameters } from 'pg-promise/typescript/pg-subset';
import { PhaseSyncer } from './phaseSyncedSettle';
// import * as pgPromise from 'pg-promise';

type TPluginConfig = Record<string, unknown>;

// for example /llinkid/activityplanning, so should only start with a slash
// and maybe only lowercase etc???
type TUriPath = string

type THttpMethod = 'GET' | 'PUT' | 'DELETE' | 'PATCH' | 'POST';

type TDebugChannel = 'general' | 'db'| 'sql' | 'requests' | 'hooks' | 'server-timing'| 'batch'
                        | 'trace'| 'phaseSyncer' | 'overloadProtection'| 'mocha';

type TLogDebug = {
  channels: Set<TDebugChannel> | TDebugChannel[] | 'all',
  statuses?: Set<number> | Array<number>,
}

type TDebugLogFunction = (channel:TDebugChannel, x:(() => string) | string) => void;

type TErrorLogFunction = (...unknown) => void;


/**
 * When sri encpounters an error, an array of errors will be sent back
 * in the body of the response.
 * Each error object will have a code and a msg,
 * but some errors contain extra info, so these fields are also allowed...
 */
type TSriErrorItem = {
  code: string,       // a code like 'internal.server.error'
  msg: string,        // description of the error
  type?: string,      // Used to categorize the error => ERROR or WARNING
                      // but also used as
                      // meta type of resource that caused the issue
  err?: Error,        // the raw exception can be passed in
  parameter?: string, // parameter name if it's about an invalid query param
  possibleParameters?: string[] // list of allowed parameter names if it's about an invalid query param
  value?: string,     // parameter value if it's about an invalid query param
  possibleValues?: string[] // possible parameter values (if this applies for the given parameter)
  url?: string,       // 
  key?: string,       // key of resource that caused the issue
  errors?: { validationErrors: Array<Record<string, unknown>> } // used on schema validation errors (but why not simply add each schema error as a single error)?
  body?: unknown,     // request body
};
class SriError {
  status: number;

  body: { errors: Array<TSriErrorItem>; status: number; document: { [key:string]: unknown }; };

  headers: { [key:string]: string };

  sriRequestID: string | null;

  /**
   * Contructs an sri error based on the given initialisation object
   *
   * @param {Object} value
   */
  constructor({
    status = 500, errors = [], headers = {}, document = {}, sriRequestID = null,
  }:{
    status:number, errors:Array<TSriErrorItem>,
    headers?:{ [k:string]: string }, document?:{ [k:string]: unknown },
    sriRequestID?:string | null,
  }) {
    this.status = status;
    this.body = {
      errors: errors.map((e:TSriErrorItem) => ({
          type: 'ERROR', // default
          ...e,
        }),
      ),
      status,
      document,
    };
    this.headers = { ...headers };
    this.sriRequestID = sriRequestID;
  }
}

type TSriBatchElement = {
  href: string,
  verb: THttpMethod,
  body: TSriRequestBody,
  match?: {
    path: string,
    queryParams: any,
    routeParams: any,
    handler: TBatchHandlerRecord,
  }
}

type TSriBatchArray =
  Array<TSriBatchElement | Array<TSriBatchElement>>

type TSriRequestBody =
  TSriBatchArray
  |
  Array<Operation> // json patch

type TPreparedSql = {
  name?:string,
  text:string,
  params: Array<string | number | boolean>,
  param: (x:string | number | boolean, noQuotes?:boolean) => TPreparedSql,
  sql: (x:string) => TPreparedSql,
  keys: (o:Record<string,unknown>) => TPreparedSql,
  values: (o:Record<string,string | number | boolean>) => TPreparedSql,
  array: (x:Array<string | number | boolean>) => TPreparedSql,
  with: (nonrecursivequery:TPreparedSql, unionclause:string, recursivequery:TPreparedSql,
      virtualtablename:string) => TPreparedSql,
  appendQueryObject(queryObject2:TPreparedSql):TPreparedSql,
  toParameterizedSql: () => { sql: string, values: Array<any> },
}

// TODO make more strict
type TSriRequest = {
  id: string,
  parentSriRequest?: TSriRequest | TInternalSriRequest,

  logDebug: TDebugLogFunction,
  logError: TErrorLogFunction,
  SriError: typeof SriError, // we expose the SriError class itself, not an object of this class
  // context: Object,

  href?: string,
  verb?: THttpMethod,
  httpMethod?: THttpMethod,

  originalUrl?: string,

  path: TUriPath,
  query: Record<string, string>, // batchHandlerAndParams.queryParams,
  params: Record<string, string>, // batchHandlerAndParams.routeParams,

  sriType?: string, // batchHandlerAndParams.handler.mapping.type,
  isBatchRequest?: boolean,
  readOnly?: boolean,
  reqCancelled?: boolean,

  headers: { [key:string] : string } | IncomingHttpHeaders,
  body?: TSriRequestBody,
  dbT: IDatabase<unknown> | undefined, // db transaction
  inStream?: any,
  outStream?: any,
  setHeader?: (key: string, value: string) => void,
  setStatus?: (statusCode:number) => void,
  streamStarted?: () => boolean,

  protocol: '_internal_' | 'http' | 'https' | string | undefined,
  isBatchPart?: boolean,

  serverTiming: { [key:string]: unknown },

  containsDeleted?: boolean,
  generateError?: boolean,

  busBoy?: unknown,

  /**
   * Under the custom property a user (or a plugin) can store custom information
   * that it needs to pass from one stage to the next during the sriRequest's lifecycle.
   *
   * We think about information that is needed in later hooks, like for example:
   *  * setting the identity in a 'before' hook, and using that identity for some check
   *    in an 'after' hook
   *  * whatever information you can think of that you have at one point, but doesn't
   *    immediately lead to an exception (status other than 2xx) that would end the request
   *    right away
   */
  custom: Record<string, unknown>,
};

type TInternalSriRequest = {
  href: string,
  verb: THttpMethod,
  dbT: IDatabase<unknown>, // transaction or task object of pg promise
  parentSriRequest: TSriRequest,
  headers?: { [key:string] : string } | IncomingHttpHeaders,
  body?: Array<{ href: string, verb: THttpMethod, body: TSriRequestBody }>,

  // In case of a streaming request, following fields are also required:
  inStream?: any,
  outStream?: any,
  setHeader?: (key: string, value: string) => void,
  setStatus?: (statusCode:number) => void,
  streamStarted?: () => boolean,
};

type TResourceMetaType = Uppercase<string>;

type TResourceDefinition = {
  type: TUriPath,
  metaType: TResourceMetaType,

  /** the database table to store the records, optional, inferred from typeif missing */
  table?: string,

  // these next lines are put onto the same object afterwards, not by the user
  singleResourceRegex?: RegExp,
  listResourceRegex?: RegExp,
  validateKey?: (key:string) => boolean,

  listResultDefaultIncludeCount?: boolean,
  maxlimit?: number,
  defaultlimit?: number,
  defaultexpansion?: boolean,
  // THIS SHOULD BE A JSON SCHEMA SO MAYBE https://github.com/json-schema-tools/meta-schema
  // WILL HELP TO CORRECTLY TYPE JSON SCHEMA'S INISDE OUT CODE
  schema: JSONSchema4,
  // {
  //   $schema: "http://json-schema.org/schema#",
  //   title: "activities on a plan",
  //   "type": "object",
  //   "properties": {
  //     "key": {
  //       "type": "string",
  //       "description": "unique key",
  //       "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
  //     },
  //     "parent": {
  //       "type": "object",
  //       "description": "a permalink to the parent. either another activity or the plan",
  //       "properties": {
  //         "href": {
  //           "type": "string",
  //           "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
  //         }
  //       },
  //       "required": [
  //         "href"
  //       ]
  //     },
  //     "title": {
  //       "type": "string",
  //       "description": "name of the activity"
  //     },
  //     "description": {
  //       "type": "string",
  //       "description": "short description of the entire activity (the entire period of the activity)."
  //     },
  //     "period": {
  //       "type": "object",
  //       "description": "the time-range that the activities is spanning.",
  //       "properties": {
  //         "startDate": {
  //           "type": "string",
  //           "format": "date-time",
  //           "description": "Date on which this item must be published."
  //         },
  //         "endDate": {
  //           "type": "string",
  //           "format": "date-time",
  //           "description": "Date on which this item must be unpublished."
  //         }
  //       },
  //       "required": [
  //         "startDate",
  //         "endDate"
  //       ]
  //     },
  //     "goals": {
  //       "type": "array",
  //       "description": "An array of permalinks to goals (either in the base curriculum, or one of the custom curricula).",
  //       "items": {
  //         "type": "object",
  //         "description": "a permalink to the goal",
  //         "properties": {
  //           "href": {
  //             "type": "string",
  //             "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
  //           }
  //         },
  //         "required": [
  //           "href"
  //         ]
  //       }
  //     }
  //   },
  //   "required": [
  //     "key",
  //     "parent",
  //     "period"
  //   ]
  // },
  beforeUpdate?: ((p:unknown) => unknown)[],
  beforeInsert?: ((p:unknown) => unknown)[],
  beforeRead?: ((p:unknown) => unknown)[],
  afterRead?: ((p:unknown) => unknown)[],
  transformResponse?: Array<
    (dbT:IDatabase<unknown>, sriRequest:TSriRequest, sriResult:TSriResult) => void
  >

  // current query
  query?: {
    defaultFilter?:
      (valueEnc: string, query: TPreparedSql, parameter: any, mapping: TResourceDefinition,
        database: IDatabase<unknown, IClient>) => void,
  }
  |
  {
    [key:string]:
    (value: string, select: TPreparedSql, key: string, database: IDatabase<unknown, IClient>,
      count: number, mapping: TResourceDefinition) => void,
  },

  // "POSSIBLE_FUTURE_QUERY": {
  //   // THIS SHOULD ALWAYS WORK defaultFilter,
  //   _rootWithContextContains: {
  //     name: '_rootWithContextContains',
  //     // propertyName: undefined or property if this filter filters on a specific property
  //     // operatorName: '_INCLUDED_IN_ROOT'
  //     'aliases': [ 'rootWithConextContains' ],
  //     default: '*',
  //     expectedValueType: 'string[]',
  //     // option 1: the handlet to produce the SQL is per custom filter
  //     handler: function(normalizedName, value) return { where: ..., joins: ..., cte: ... }
  //     // whatn to do with customFilters that produce other query when multiple filters are combined
  //   },
  //   // option 1: the handlet to produce the SQL gets all the custom filters as input
  //   handler: function(customFilters) {} //function([ { normalizedName, value }, ... ]) return { where: ..., joins: ..., cte: ... }
  // },
  map?: {
    [k:string]: {
      columnToField: Array<(key:string, element:Record<string, unknown>) => void>,
      [k:string]: any,
    }
  },
  onlyCustom?: boolean,
  customRoutes?: Array<
    {
      routePostfix: TUriPath,
      httpMethods: THttpMethod[],
      readOnly?: boolean,
      busBoy?: boolean,
      busBoyConfig?: BusboyConfig,
      binaryStream?: boolean,
      alterMapping?: (unknown) => unknown,
      transformRequest: ((unknown) => unknown)[],
      transformResponse: ((unknown) => unknown)[],
      like?: string,
      query?: string,
      beforeHandler?:
        (tx:IDatabase<unknown>, sriRequest:TSriRequest, customMapping:unknown) => unknown,
      handler?: (tx:IDatabase<unknown>, sriRequest:TSriRequest, customMapping:unknown) => unknown,
      afterHandler?: (
          tx:IDatabase<unknown>, sriRequest:TSriRequest, customMapping:unknown, result:unknown
        ) => unknown,
      beforeStreamingHandler?:
        (tx:IDatabase<unknown>, sriRequest:TSriRequest, customMapping:unknown)
          => { status: number, headers: Array<[key:string, value:string]> },
      streamingHandler?: (tx:IDatabase<unknown>, sriRequest:TSriRequest, stream:unknown) => unknown,
    }
  >
};

type TSriRequestHandlerForPhaseSyncer = (phaseSyncer:PhaseSyncer,
  tx:IDatabase<unknown>, sriRequest:TSriRequest, mapping:unknown) => unknown

type TSriRequestHandler = ((sriRequest:TSriRequest) => unknown)
  | TSriRequestHandlerForPhaseSyncer;

type TBatchHandlerRecord = {
  route: unknown,
  verb: THttpMethod,
  func: TSriRequestHandler,
  // eslint-disable-next-line no-use-before-define
  config: TSriConfig,
  mapping: TResourceDefinition,
  streaming: boolean,
  readOnly: boolean,
  isBatch: boolean,
}

/**
 * I believe schema should be set on the cionnection level and not the library level
 * so I am supporting it here already...
 *
 * Also adding an option here to run some sql when getting a new connection.
 * That option used to be in the root of TSriConfig and used to be called dbConnectionInitSql
 * EXAMPLE: "set random_page_cost = 1.1;"
 */
interface IExtendedDatabaseConnectionParameters extends IConnectionParameters {
  schema?: ValidSchema | ((dc: unknown) => ValidSchema),
  // will be run
  connectionInitSql?: string, // example "set random_page_cost = 1.1;",
}

interface IExtendedDatabaseInitOptions extends IInitOptions {
  /**
   * Do we attach the pgMonitor plugin?
   */
  pgMonitor?: boolean,
}

type TSriResult = {
  status: number,
  body: any,
  headers?: Record<string, string>,
}

type TSriConfig = {
  // these next lines are put onto the same object afterwards, not by the user
  utils?: unknown,
  db?: IDatabase<unknown>,
  dbR?: IDatabase<unknown>,
  dbW?: IDatabase<unknown>,
  informationSchema?: unknown,
  /** a short string that will be added to every request id while logging
   * (tis can help to differentiate between different api's while searching thourgh logs)
   */
  id?: string,

  // the real properties !!!
  plugins?: TPluginConfig[]
  enableGlobalBatch?: boolean,
  globalBatchRoutePrefix?: TUriPath,
  // logrequests?: boolean,
  // logsql?: boolean,
  logdebug?: TLogDebug,
  description?: string,
  bodyParserLimit?: string, // example 50mb
  batchConcurrency?: number,
  overloadProtection?: {
    retryAfter?: number,
  },

  defaultlimit?: boolean,
  // 2022-03-08 REMOVE gc-stats as the project is abandoned and will cause problems with node versions > 12
  // trackHeapMax?: boolean,
  batchHandlerMap?: TBatchHandlerRecord,
  resources: TResourceDefinition[],
  beforePhase?:
    Array<
      (sriRequestMap:Array<[string, TSriRequest]>, jobMap:unknown, pendingJobs:Set<string>)
        => unknown
    >,

  transformRequest?: Array<(expressRequest:Request, sriRequest:TSriRequest, dbT:IDatabase<unknown>)
    => void>,

  afterRequest?: Array<(sriRequest:TSriRequest) => void>,

  transformInternalRequest?: Array<
    (dbT:IDatabase<unknown>, internalSriRequest:TInternalSriRequest, parentSriRequest:TSriRequest)
      => void
  >,

  /**
   * @deprecated
   */
  defaultdatabaseurl?: string,

  /**
   * @deprecated
   */
  dbConnectionInitSql?: string, // example "set random_page_cost = 1.1;",

  /**
   * @deprecated
   */
  maxConnections?: string,

  // cfr. https://github.com/vitaly-t/pg-promise/blob/master/typescript/pg-subset.d.ts
  databaseConnectionParameters: IExtendedDatabaseConnectionParameters, // IConnectionOptions<IClient> do I need this type param?
  // cfr. https://github.com/vitaly-t/pg-promise/blob/master/typescript/pg-promise.d.ts
  // OPTIONAL, but useful if you want to enable pgMonitor or enable some lifecycle hooks
  databaseLibraryInitOptions?: IExtendedDatabaseInitOptions,

  /**
   * When streaming a response, even if it takes a long time to send the next chunk,
   * we'll make sure something (a space character) is being sent to the client
   * to avoid anything in the middle to kill the connection.
   *
   * DEFAULT: 20_000 (20 seconds)
   */
  streamingKeepAliveTimeoutMillis?: number,
};

type TParseTreeType = 'string' | 'number' | 'integer' | 'boolean';

type TParseTreeProperty = { name: string, type: TParseTreeType, multiValued: boolean };

type TParseTreeOperator = { name: string, type: TParseTreeType, multiValued: boolean };

type TParseTreeFilter = {
  property?: TParseTreeProperty,
  operator: TParseTreeOperator,
  invertOperator: boolean,
  caseInsensitive: boolean,
  value: unknown,
}

type TParseTree = {
  normalizedUrl: {
    rowFilters: TParseTreeFilter[],
    columnFilters: TParseTreeFilter[],
    listControlFilters: TParseTreeFilter[],
  }
}

// can be improved and made a lot more strict (cfr. @types/json-schema), but for now...
type TFlattenedJsonSchema = { [path: string]: { [jsonSchemaProperty: string]: unknown } }

// const sriConfig = {
//   "plugins": [
//     {
//       "uuid": "7569812c-a992-11ea-841b-1f780ac2b6cc"
//     },
//     {}
//   ],
//   "enableGlobalBatch": true,
//   "globalBatchRoutePrefix": "/llinkid/activityplanning",
//   "logrequests": true,
//   "logsql": true,
//   "logdebug": "general",
//   "description": "This API is to provide custom curricula",
//   "bodyParserLimit": "50mb",
//   "dbConnectionInitSql": "set random_page_cost = 1.1;",
//   "resources": [
//     {
//       "type": "/llinkid/activityplanning/activityplans/activities",
//       "metaType": "ACTIVITY",
//       "listResultDefaultIncludeCount": false,
//       "schema": {
//         "$schema": "http://json-schema.org/schema#",
//         "title": "activities on a plan",
//         "type": "object",
//         "properties": {
//           "key": {
//             "type": "string",
//             "description": "unique key",
//             "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
//           },
//           "parent": {
//             "type": "object",
//             "description": "a permalink to the parent. either another activity or the plan",
//             "properties": {
//               "href": {
//                 "type": "string",
//                 "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
//               }
//             },
//             "required": [
//               "href"
//             ]
//           },
//           "title": {
//             "type": "string",
//             "description": "name of the activity"
//           },
//           "description": {
//             "type": "string",
//             "description": "short description of the entire activity (over all weeks/the entire period of the activity)."
//           },
//           "period": {
//             "type": "object",
//             "description": "the time-range that the activities is spanning.",
//             "properties": {
//               "startDate": {
//                 "type": "string",
//                 "format": "date-time",
//                 "description": "Date on which this item must be published."
//               },
//               "endDate": {
//                 "type": "string",
//                 "format": "date-time",
//                 "description": "Date on which this item must be unpublished."
//               }
//             },
//             "required": [
//               "startDate",
//               "endDate"
//             ]
//           },
//           "goals": {
//             "type": "array",
//             "description": "An array of permalinks to goals (either in the base curriculum, or one of the custom curricula).",
//             "items": {
//               "type": "object",
//               "description": "a permalink to the goal",
//               "properties": {
//                 "href": {
//                   "type": "string",
//                   "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
//                 }
//               },
//               "required": [
//                 "href"
//               ]
//             }
//           }
//         },
//         "required": [
//           "key",
//           "parent",
//           "period"
//         ]
//       },
//       "beforeUpdate": [
//         null,
//         null
//       ],
//       "beforeInsert": [
//         null,
//         null
//       ],
//       "afterRead": [
//         null,
//         null
//       ],
//       "query": {
//         defaultFilter: function(x,y,z) {}
//       },
//       // POSSIBLE_FUTURE_QUERY
//       "customQueryParams": {
//         // THIS SHOULD ALWAYS WORK defaultFilter,
//         _rootWithContextContains: {
//           name: '_rootWithContextContains', // necessary if the key already contains that name, or do we make customQueryParams an array of object?
//           // propertyName: undefined or property if this filter filters on a specific property
//           // operatorName: '_INCLUDED_IN_ROOT'
//           'aliases': [ 'rootWithConextContains' ],
//           default: '*', // the filter value that is equivalent to not specifying the filter, if applicable
//           expectedValueType: 'string[]', // kind of 'borrowed' from typescript
//           // option 1: the handler to produce the SQL is per custom filter
//           handler: function(normalizedName, value) return { where: ..., joins: ..., cte: ... }
//           // BUT what to do with customFilters that produce other query when multiple filters are combined
//         },
//         // option 2: the handlet to produce the SQL gets all the custom filters as input
//         // (which allows for optimizing combinations of fillters, and also allows implementing a default for a custom filter)
//         handler: function(customFilters) {} //function([ { normalizedName, value }, ... ]) return { where: ..., joins: ..., cte: ... }
//       },
//       "maxlimit": 5000,
//       "map": {
//         "key": {},
//         "parentPlan": {},
//         "parentActivity": {},
//         "title": {},
//         "description": {},
//         "period": {},
//         "goals": {}
//       },
//       "customRoutes": [
//         {
//           "routePostfix": "/attachments",
//           "httpMethods": [
//             "POST"
//           ],
//           "readOnly": false,
//           "busBoy": true
//         },
//         {
//           "routePostfix": "/:key/attachments/:filename([^/]*.[A-Za-z0-9]{1,})",
//           "httpMethods": [
//             "GET"
//           ],
//           "readOnly": true,
//           "binaryStream": true
//         },
//         {
//           "routePostfix": "/:key/attachments/:attachmentKey",
//           "readOnly": false,
//           "httpMethods": [
//             "DELETE"
//           ]
//         },
//         {
//           "routePostfix": "/:key/attachments/:attachmentKey",
//           "httpMethods": [
//             "GET"
//           ],
//           "readOnly": true
//         }
//       ]
//     },
//     {
//       "type": "/llinkid/activityplanning/activityplans",
//       "metaType": "ACTIVITY_PLAN",
//       "listResultDefaultIncludeCount": false,
//       "schema": {
//         "$schema": "http://json-schema.org/schema#",
//         "title": "List of activity plans",
//         "type": "object",
//         "properties": {
//           "key": {
//             "type": "string",
//             "description": "unique key",
//             "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
//           },
//           "title": {
//             "type": "string",
//             "description": "The additional name of this curriculum"
//           },
//           "creators": {
//             "type": "array",
//             "description": "List of creators for this activityplan",
//             "minItems": 1,
//             "items": {
//               "type": "object",
//               "description": "A permalink to the authoring [organisational unit | responsibility] of this plan",
//               "properties": {
//                 "href": {
//                   "type": "string",
//                   "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
//                 }
//               },
//               "required": [
//                 "href"
//               ]
//             }
//           },
//           "context": {
//             "type": "object",
//             "description": "mandatory reference to the schoolentity that this activityplan is valid for",
//             "properties": {
//               "href": {
//                 "type": "string",
//                 "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
//               }
//             },
//             "required": [
//               "href"
//             ]
//           },
//           "issued": {
//             "type": "object",
//             "description": "the time-range that the activityplan is valid.",
//             "properties": {
//               "startDate": {
//                 "type": "string",
//                 "format": "date-time",
//                 "description": "Date on which this item must be published."
//               },
//               "endDate": {
//                 "type": "string",
//                 "format": "date-time",
//                 "description": "Date on which this item must be unpublished."
//               }
//             },
//             "required": [
//               "startDate",
//               "endDate"
//             ]
//           },
//           "curricula": {
//             "type": "array",
//             "description": "List of curricula for this activityplan",
//             "minItems": 1,
//             "items": {
//               "type": "object",
//               "description": "permalink to customcurricula or customcurriculagroup",
//               "properties": {
//                 "href": {
//                   "type": "string",
//                   "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
//                 }
//               },
//               "required": [
//                 "href"
//               ]
//             }
//           },
//           "activityplangroup": {
//             "type": "object",
//             "properties": {
//               "href": {
//                 "type": "string",
//                 "pattern": "^/llinkid/activityplanning/activityplangroups/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$",
//                 "description": "permalink to the activityplan group"
//               }
//             },
//             "required": [
//               "href"
//             ]
//           },
//           "class": {
//             "type": "object",
//             "properties": {
//               "href": {
//                 "type": "string",
//                 "pattern": "^/sam/organisationalunits/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$",
//                 "description": "permalink to a class (OU in samenscholing of type CLASS)"
//               }
//             },
//             "required": [
//               "href"
//             ]
//           },
//           "observers": {
//             "type": "array",
//             "description": "List of people/OUs who can view this activityplan",
//             "items": {
//               "type": "object",
//               "description": "A permalink to the authoring [organisational unit | responsibility] of this plan",
//               "properties": {
//                 "href": {
//                   "type": "string",
//                   "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
//                 }
//               },
//               "required": [
//                 "href"
//               ]
//             }
//           },
//           "softDeleted": {
//             "type": "string",
//             "format": "date-time",
//             "description": "a timestamp defining if/when the plan is soft-deleted"
//           }
//         },
//         "required": [
//           "key",
//           "curricula",
//           "creators",
//           "issued",
//           "class",
//           "activityplangroup"
//         ]
//       },
//       "query": {},
//       "maxlimit": 5000,
//       "map": {
//         "key": {},
//         "title": {},
//         "context": {},
//         "creators": {},
//         "issued": {},
//         "curricula": {},
//         "activityplangroup": {
//           "references": "/llinkid/activityplanning/activityplangroups"
//         },
//         "class": {},
//         "observers": {},
//         "softDeleted": {}
//       }
//     },
//     {
//       "type": "/llinkid/activityplanning/activityplangroups",
//       "metaType": "ACTIVITY_PLAN_GROUP",
//       "listResultDefaultIncludeCount": false,
//       "schema": {
//         "$schema": "http://json-schema.org/schema#",
//         "title": "List of activity plan groups",
//         "type": "object",
//         "properties": {
//           "key": {
//             "type": "string",
//             "description": "unique key of this activityplangroup",
//             "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
//           }
//         },
//         "required": [
//           "key"
//         ]
//       },
//       "query": {},
//       "maxlimit": 5000,
//       "map": {
//         "key": {}
//       }
//     }
//   ]
// };

export {
  TPluginConfig,
  TUriPath,
  THttpMethod,
  TDebugChannel,
  TLogDebug,
  TDebugLogFunction,
  TErrorLogFunction,
  SriError,
  TSriBatchElement,
  TSriBatchArray,
  TSriRequestBody,
  TPreparedSql,
  TSriRequest,
  TInternalSriRequest,
  TResourceMetaType,
  TResourceDefinition,
  TSriRequestHandlerForPhaseSyncer,
  TSriRequestHandler,
  TBatchHandlerRecord,
  TSriResult,
  TSriConfig,
  TParseTreeType,
  TParseTreeProperty,
  TParseTreeOperator,
  TParseTreeFilter,
  TParseTree,
  TFlattenedJsonSchema,
  IExtendedDatabaseConnectionParameters,
  IExtendedDatabaseInitOptions,
};