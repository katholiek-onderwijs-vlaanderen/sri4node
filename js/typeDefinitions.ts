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
import pgPromise = require('pg-promise');
import { IClient, IConnectionParameters } from 'pg-promise/typescript/pg-subset';
import pg = require('pg-promise/typescript/pg-subset');
import { PhaseSyncer } from './phaseSyncedSettle';
// import * as pgPromise from 'pg-promise';

export type TPluginConfig = Record<string, unknown>;

// for example /llinkid/activityplanning, so should only start with a slash
// and maybe only lowercase etc???
export type TUriPath = string

export type THttpMethod = 'GET' | 'PUT' | 'DELETE' | 'PATCH' | 'POST';

export type TDebugChannel = 'general' | 'db'| 'sql' | 'requests' | 'hooks' | 'server-timing'| 'batch'
                        | 'trace'| 'phaseSyncer' | 'overloadProtection'| 'mocha';

export type TLogDebug = {
  channels: Set<TDebugChannel> | TDebugChannel[] | 'all',
  statuses?: Set<number> | Array<number>,
}

export type TDebugLogFunction = (channel:TDebugChannel, x:(() => string) | string) => void;

export type TErrorLogFunction = (...unknown) => void;

export class SriError {
  status: number;

  body: { errors: unknown[]; status: number; document: { [key:string]: unknown }; };

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
    status:number, errors:unknown[], headers?:{ [k:string]: string },
    document?:{ [k:string]: unknown }, sriRequestID?:string | null,
  }) {
    this.status = status;
    this.body = {
      errors: errors.map((e:{ [key:string]: unknown }) => {
        if (e.type === undefined) {
          e.type = 'ERROR'; // if no type is specified, set to 'ERROR'
        }
        return e;
      }),
      status,
      document,
    };
    this.headers = headers;
    this.sriRequestID = sriRequestID;
  }
}

export type TSriBatchElement = {
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

export type TSriBatchArray =
  Array<TSriBatchElement | Array<TSriBatchElement>>

export type TSriRequestBody =
  TSriBatchArray
  |
  Array<Operation> // json patch

export type TPreparedSql = {
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

/**
 * This will be returned by sri4node.configure() and it contains instance specific properties
 */
export type TSriServerInstance = {
  /**
   * pgp is an initialised version of the pgPromise library (https://vitaly-t.github.io/pg-promise)
   */
  pgp: pgPromise.IMain,
  /**
   * pgPromise database object (http://vitaly-t.github.io/pg-promise/Database.html)
   */
  db: pgPromise.IDatabase<{}, pg.IClient>,
  app: Express.Application,
}

// TODO make more strict
export type TSriRequest = {
  id: string,
  parentSriRequest?: TSriRequest,

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
  dbT: IDatabase<unknown>, // db transaction
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

  ended?: boolean,

  queryByKeyFetchList?: any, // Record<string, unknown>,
  queryByKeyResults?: Record<string, string>,

  putRowsToInsert?: any, // Record<string, unknown>,
  putRowsToInsertIDs?: Array<string>,
  multiInsertFailed?: boolean,
  multiInsertError?: any,

  putRowsToUpdate?: any,
  putRowsToUpdateIDs?: Array<string>,
  multiUpdateFailed?: boolean,
  multiUpdateError?: any,

  rowsToDelete?: any, // Record<string, unknown>,
  rowsToDeleteIDs?: Array<string>,
  multiDeleteFailed?: boolean,
  multiDeleteError?: any,

  userData: Record<string, any>,
};

export type TInternalSriRequest = {
  protocol: '_internal_',
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

  serverTiming: { [key:string]: unknown },
};

export type TResourceMetaType = Uppercase<string>;

export type TResourceDefinition = {
  type: TUriPath,
  metaType: TResourceMetaType,
  methods?: THttpMethod[],

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
      columnToField?: Array<(key:string, element:Record<string, unknown>) => void>,
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

export type TSriRequestHandlerForPhaseSyncer = (phaseSyncer:PhaseSyncer,
  tx:IDatabase<unknown>, sriRequest:TSriRequest, mapping:unknown) => unknown

export type TSriRequestHandler = ((sriRequest:TSriRequest) => unknown)
  | TSriRequestHandlerForPhaseSyncer;

export type TBatchHandlerRecord = {
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
export interface IExtendedDatabaseConnectionParameters extends IConnectionParameters {
  schema?: ValidSchema | ((dc: unknown) => ValidSchema),
  // will be run
  connectionInitSql?: string, // example "set random_page_cost = 1.1;",
}

export interface IExtendedDatabaseInitOptions extends IInitOptions {
  /**
   * Do we attach the pgMonitor plugin?
   */
  pgMonitor?: boolean,
}

export type TSriResult = {
  status: number,
  body: any,
  headers?: Record<string, string>,
}

export type TSriConfig = {
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

  /**
   * This is a global hook. It is called during configuration, just before routes are registered in express.
   */
  startUp?: Array<(dbT:IDatabase<unknown>, sriServerInstance: TSriServerInstance) => void>,

  /**
   * This is a global hook. New hook which will be called before each phase of a request is executed (phases are parts of requests, 
   * they are used to synchronize between executing batch operations in parallel, see Batch execution order in the README.
   */
  beforePhase?:
    Array<
      //(sriRequestMap:Array<[string, TSriRequest]>, jobMap:unknown, pendingJobs:Set<string>)
      (sriRequestMap:Map<string,TSriRequest>, jobMap:unknown, pendingJobs:Set<string>)
        => unknown
    >,

  /**
   * This is a global hook. This function is called at the very start of each http request (i.e. for batch only once).
   * Based on the expressRequest (maybe some headers?) you could make changes to the sriRequest object (like maybe
   * add the user's identity if it can be deducted from the headers).
   */
  transformRequest?: Array<(expressRequest:Request, sriRequest:TSriRequest, dbT:IDatabase<unknown>)
    => void>,

  /**
   * This is a global hook. This hook is defined to be able to copy data set by transformRequest (like use data) from the
   * original (parent) request to the new internal request. This function is called at creation of each sriRequest created
   * via the 'internal' interface.
   */
  transformInternalRequest?: Array<
    (dbT:IDatabase<unknown>, internalSriRequest:TInternalSriRequest, parentSriRequest:TSriRequest)
      => void>,

  /**
   * This is a global hook. This hook will be called in case an exception is catched during the handling of an SriResquest.
   * After calling this hook, sri4node continues with the built-in error handling (logging and sending error reply to the cient).
   * Warning: in case of an early error, sriRequest might be undefined!
  */
  errorHandler?: Array<(sriRequest:TSriRequest, error: Error) => void>,

  /**
   * This is a global hook. It will be called after the request is handled (without errors). At the moment this handler is called,
   * the database task/transaction is already closed and the response is already sent to the client.
   */
  afterRequest?: Array<(sriRequest:TSriRequest) => void>,

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
   * to enable [pg-monitor](https://www.npmjs.com/package/pg-monitor) (detailed logging about database interaction)
   */
  enablePgMonitor?: boolean,

  /**
   * When streaming a response, even if it takes a long time to send the next chunk,
   * we'll make sure something (a space character) is being sent to the client
   * to avoid anything in the middle to kill the connection.
   *
   * DEFAULT: 20_000 (20 seconds)
   */
  streamingKeepAliveTimeoutMillis?: number,
};

export type ParseTreeType = 'string' | 'number' | 'integer' | 'boolean';

export type ParseTreeProperty = { name: string, type: ParseTreeType, multiValued: boolean };

export type ParseTreeOperator = { name: string, type: ParseTreeType, multiValued: boolean };

export type ParseTreeFilter = {
  property?: ParseTreeProperty,
  operator: ParseTreeOperator,
  invertOperator: boolean,
  caseInsensitive: boolean,
  value: unknown,
}

export type ParseTree = {
  normalizedUrl: {
    rowFilters: ParseTreeFilter[],
    columnFilters: ParseTreeFilter[],
    listControlFilters: ParseTreeFilter[],
  }
}

// can be improved and made a lot more strict (cfr. @types/json-schema), but for now...
export type FlattenedJsonSchema = { [path: string]: { [jsonSchemaProperty: string]: unknown } }

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
