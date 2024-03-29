// This file should contain the shared type definitions.
// For example everything that is a part of the sriConfig object should
// have  a type definition, so it'll be easier to use for developers.
// Also internally sri4node would benfit from more strict types for the shared data structures.

import { Busboy, BusboyConfig } from "busboy";
import { Request } from "express";
import { Operation } from "fast-json-patch";
import { IncomingHttpHeaders } from "http2";
import { JSONSchema4 } from "json-schema";
import pgPromise from "pg-promise";
import { IClient, IConnectionParameters } from "pg-promise/typescript/pg-subset";
import stream from "stream";
import { PhaseSyncer } from "./phaseSyncedSettle";

import { ValidateFunction } from "ajv";
import { ParsedUrlQuery } from "querystring";

/**
 * This is the type definition for the plugin configuration object.
 */
export type TPluginConfig = {
  /**
   * Should be present in every plugin, and should be a unique identifier for the plugin.
   *
   */
  uuid?: string;

  /** 'installs' the plugin by making modifications to the sriConfig object
   * (for example adding hooks to existing paths, or adding new paths).
   * The second parameter is an initialized database connection so the plugin
   * can do some database operations on startup.
   *
   */
  install: (sriConfig: TSriConfig, db: pgPromise.IDatabase<{}, IClient>) => void | Promise<void>;
  // Record<string, unknown>;

  /**
   * This is called when the api is being closed. It can be used to clean up resources.
   * (like onnotification subscriptions to the database for example)
   *
   * @param sriConfig
   * @param db
   * @returns
   */
  close?: (sriConfig: TSriConfig, db: pgPromise.IDatabase<{}, IClient>) => void | Promise<void>;
};

// for example /llinkid/activityplanning, so should only start with a slash
// and maybe only lowercase etc???
export type TUriPath = string;

export type THttpMethod = "GET" | "PUT" | "DELETE" | "PATCH" | "POST";

export type TDebugChannel =
  | "general"
  | "db"
  | "sql"
  | "requests"
  | "hooks"
  | "server-timing"
  | "batch"
  | "trace"
  | "phaseSyncer"
  | "overloadProtection"
  | "mocha";

export type TLogDebug = {
  channels: Set<TDebugChannel> | TDebugChannel[] | "all";
  statuses?: Set<number> | Array<number>;
};

export type TDebugLogFunction = (
  channel: TDebugChannel | string,
  x: (() => string) | string,
) => void;

export type TErrorLogFunction = (...unknown) => void;

export class SriError {
  status: number;

  body: { errors: unknown[]; status: number; document: { [key: string]: unknown } };

  headers: { [key: string]: string };

  sriRequestID: string | null;

  /**
   * Contructs an sri error based on the given initialisation object
   *
   * @param {Object} value
   */
  constructor({
    status = 500,
    errors = [],
    headers = {},
    document = {},
    sriRequestID = null,
  }: {
    status: number;
    errors: unknown[];
    headers?: { [k: string]: string };
    document?: { [k: string]: unknown };
    sriRequestID?: string | null;
  }) {
    this.status = status;
    this.body = {
      errors: errors.map((e: { [key: string]: unknown }) => {
        if (e.type === undefined) {
          e.type = "ERROR"; // if no type is specified, set to 'ERROR'
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
  href: string;
  verb: THttpMethod;
  body: TSriRequestBody;
  match?: {
    path: string;
    queryParams: ParsedUrlQuery;
    routeParams: any;
    handler: TBatchHandlerRecord;
  };
};

export type TSriBatchArray = Array<TSriBatchElement | Array<TSriBatchElement>>;

export type TSriRequestBody =
  | TSriBatchArray
  | Array<Operation> // json patch
  | any;

export type TPreparedSql = {
  name?: string;
  text: string;
  params: Array<string | number | boolean>;
  param: (x: string | number | boolean, noQuotes?: boolean) => TPreparedSql;
  sql: (x: string) => TPreparedSql;
  keys: (o: Record<string, unknown>) => TPreparedSql;
  values: (o: Record<string, string | number | boolean>) => TPreparedSql;
  array: (x: Array<string | number | boolean>) => TPreparedSql;
  arrayOfTuples(x: Array<Array<string | number | boolean>>, cast?: Array<string>);
  /**
   * Check if a value is in a list of values.
   * You would think about 'x IN (list)' in SQL, but implementing it using an exists clause
   * is better for performance.
   * 'EXISTS (SELECT 1 FROM (VALUES (list[0]), (list[1]), ... (list[n])) as t(x) where t.x = x)'
   *
   * @param valueRef a string referencing the value to check like a column name or 'LOWER(columnname)'
   * @param list an array of values to check against
   */
  valueIn(valueRef: string, list: Array<string | number | boolean | Date>, cast?: string);
  /**
   * Check if a tuple is in a list of tuples.
   * You would think about '(x,y) IN (listOfTuples)' in SQL, but implementing it using an exists clause
   * is better for performance.
   * 'EXISTS (SELECT 1 FROM (VALUES (list[0][0],list[0][1]), ... (list[n][0],list[n][1])) as t(x) where t.x = (x,y))'
   *
   * @param valueRef a string referencing the tuple to check like a column name or 'LOWER(columnname)'
   * @param list an array of tuples to check against
   */
  tupleIn(
    valueRef: string,
    list: Array<Array<string | number | boolean | Date>>,
    cast?: Array<string>,
  );
  with: (
    nonrecursivequery: TPreparedSql,
    unionclause: string,
    recursivequery: TPreparedSql,
    virtualtablename: string,
  ) => TPreparedSql;
  appendQueryObject(queryObject2: TPreparedSql): TPreparedSql;
  toParameterizedSql: () => { sql: string; values: Array<any> };
};

export type TInformationSchema = {
  [resourcePath: string]: {
    [columnName: string]:
      | {
          type: "ARRAY";
          element_type: string;
        }
      | {
          type: string;
          element_type: null;
        };
  };
};

/**
 * This will be returned by sri4node.configure() and it contains instance specific properties
 */
export type TSriServerInstance = {
  /**
   * pgp is an initialised version of the pgPromise library (https://vitaly-t.github.io/pg-promise)
   */
  pgp: pgPromise.IMain;
  /**
   * pgPromise database object (http://vitaly-t.github.io/pg-promise/Database.html)
   */
  db: pgPromise.IDatabase<unknown, IClient>;
  app: Express.Application;

  // maybe later
  // /**
  //  * Will hold the current db structure
  //  */
  // informationSchema: any,

  /**
   * Closes the database pool.
   */
  close: () => void;
};

// TODO make more strict
export type TSriRequest = {
  id: string;
  parentSriRequest?: TSriRequest;

  logDebug: TDebugLogFunction;
  logError: TErrorLogFunction;
  SriError: typeof SriError; // we expose the SriError class itself, not an object of this class
  // context: Object,

  href?: string;
  verb?: THttpMethod;
  httpMethod?: THttpMethod;

  originalUrl?: string;

  path: TUriPath;
  query: ParsedUrlQuery; //Record<string, string>, // batchHandlerAndParams.queryParams,
  params: Record<string, string>; // batchHandlerAndParams.routeParams,

  sriType?: string; // batchHandlerAndParams.handler.mapping.type,
  isBatchRequest?: boolean;
  readOnly?: boolean;
  reqCancelled?: boolean;

  headers: { [key: string]: string } | IncomingHttpHeaders;
  body?: TSriRequestBody;
  dbT: pgPromise.IDatabase<unknown>; // db transaction
  inStream: stream.Readable;
  outStream: stream.Writable;
  setHeader?: (key: string, value: string) => void;
  setStatus?: (statusCode: number) => void;
  streamStarted?: () => boolean;

  protocol: "_internal_" | "http" | "https" | string | undefined;
  isBatchPart?: boolean;

  serverTiming: { [key: string]: unknown };

  containsDeleted?: boolean;
  generateError?: boolean;

  busBoy?: Busboy;

  ended?: boolean;

  queryByKeyFetchList?: Record<string, Array<string>>;
  queryByKeyResults?: Record<string, string>;

  putRowsToInsert?: Record<string, Array<any>>;
  putRowsToInsertIDs?: Array<string>;
  multiInsertFailed?: boolean;
  multiInsertError?: any;

  putRowsToUpdate?: Record<string, Array<any>>;
  putRowsToUpdateIDs?: Array<string>;
  multiUpdateFailed?: boolean;
  multiUpdateError?: any;

  rowsToDelete?: Record<
    string,
    Array<{
      key: string;
      "$$meta.modified": Date;
      "$$meta.deleted": boolean;
    }>
  >;
  rowsToDeleteIDs?: Array<string>;
  multiDeleteFailed?: boolean;
  multiDeleteError?: any;

  userData: Record<string, any>;
  userObject?: any; // can be used to store information of the user
};

export type TInternalSriRequest = {
  protocol: "_internal_";
  href: string;
  verb: THttpMethod;
  dbT: pgPromise.IDatabase<unknown>; // transaction or task object of pg promise
  parentSriRequest: TSriRequest;
  headers?: { [key: string]: string } | IncomingHttpHeaders;
  body?: Array<{ href: string; verb: THttpMethod; body: TSriRequestBody }> | TSriRequestBody;

  // In case of a streaming request, following fields are also required:
  inStream?: any;
  outStream?: any;
  /** function called to set headers before streaming */
  setHeader?: (key: string, value: string) => void;
  /** function called to set status before streaming */
  setStatus?: (statusCode: number) => void;
  /** function which should return true when streaming is started */
  streamStarted?: () => boolean;

  serverTiming: { [key: string]: unknown };
};

export type TResourceMetaType = Uppercase<string>;

/**
 * We invented this object that contains some utility functions that can come in handy
 * when writing hooks and custom route handlers.
 * We saw that some projects (and our own tests) were using global.sri4node_internal_interface
 * but that doesn't feel right in terms of the interface.
 *
 * So we decided to pass an object with extra useful functions (starting with internalSriRequest)
 * to every handler and hook that we have in the configuration.
 *
 * By adding it as the last patrameter, this should not break anything on existing projects,
 * but at least we can start using this new way of doing things right away.
 *
 * If we find more useful functions later, we can also easily add them to this object in the future.
 */
export type TSriInternalUtils = {
  internalSriRequest: (
    internalReq: Omit<TInternalSriRequest, "protocol" | "serverTiming">,
  ) => Promise<TSriResult>;
};

export type TSriQueryFun = {
  [key: string]: (
    value: string,
    select: TPreparedSql,
    key: string,
    database: pgPromise.IDatabase<unknown, IClient>,
    doCount: boolean,
    mapping: TResourceDefinition,
    urlParameters: ParsedUrlQuery,
  ) => void;
};

/** properties that always apply in ALL customRoute scenario's */
export type TCustomRouteGeneralProperties = {
  routePostfix: TUriPath;
  httpMethods: THttpMethod[];
  readOnly?: boolean; // might only be used internally, in that case should be removed here
};

/**
 * 'like' scenario (cfr README: https://github.com/katholiek-onderwijs-vlaanderen/sri4node#custom-routes)
 *
 * example if resourceDefinition.type = /things and like = '/:id' and
 * routePostfix = '/todo', then the custom route /things/<key>/todo will be
 * created that will respond only to the given htttpMethods.
 * The handler of the main resource will be called, and the alterMapping
 * or transformReponse methods will be used to modify the response just enough.
 *
 * Used in audit-broadcast api in the 'alterMapping' version.
 * Used in mailer-api and traing-api in the 'transformResponse' version.
 *
 * This feature CAN PROBABLY BE REMOVED, and solved with a simple customRoute
 * combined with an SriInternalRequest.
 */
export type TLikeCustomRoute = TCustomRouteGeneralProperties &
  ({
    like: string;
    /** this will define where the customRoute listens relative to the resource base */
    query?: TSriQueryFun;
  } & (
    | {
        alterMapping: (mapping: TResourceDefinition) => void;
      }
    | {
        transformResponse: (
          dbT: pgPromise.IDatabase<unknown>,
          sriRequest: TSriRequest,
          sriResult: TSriResult,
        ) => Promise<void>;
      }
  ));

/** NON streaming input & NON streaming output */
export type TNonStreamingCustomRoute = TCustomRouteGeneralProperties & {
  /** this will define where the customRoute listens relative to the resource base */
  beforeHandler?: (
    tx: pgPromise.IDatabase<unknown>,
    sriRequest: TSriRequest,
    customMapping: TResourceDefinition,
    internalUtils: TSriInternalUtils,
  ) => Promise<void>;
  handler: (
    tx: pgPromise.IDatabase<unknown>,
    sriRequest: TSriRequest,
    customMapping: TResourceDefinition,
    internalUtils: TSriInternalUtils,
  ) => Promise<TSriResult>;
  /** probably not so useful, since we can already control exactly what the response wil look like in the handler */
  transformResponse?: (
    dbT: pgPromise.IDatabase<unknown>,
    sriRequest: TSriRequest,
    sriResult: TSriResult,
    internalUtils: TSriInternalUtils,
  ) => Promise<void>;
  afterHandler?: (
    tx: pgPromise.IDatabase<unknown>,
    sriRequest: TSriRequest,
    customMapping: TResourceDefinition,
    result: TSriResult,
    internalUtils: TSriInternalUtils,
  ) => Promise<void>;
};

/** streaming input & streaming output */
export type TStreamingCustomRoute = TCustomRouteGeneralProperties & {
  /** indicates that busboy will be used, which helps with handling multipart form data */
  busBoy?: boolean;
  busBoyConfig?: BusboyConfig;
  /** indicates that the output stream is a binary stream (otherwise a response header Content-Type: 'application/json' will be set) */
  binaryStream?: boolean;
  beforeStreamingHandler?: (
    tx: pgPromise.IDatabase<unknown>,
    sriRequest: TSriRequest,
    customMapping: TResourceDefinition,
    internalUtils: TSriInternalUtils,
  ) => Promise<{ status: number; headers: Array<[key: string, value: string]> } | undefined>;
  streamingHandler: (
    tx: pgPromise.IDatabase<unknown>,
    sriRequest: TSriRequest,
    stream: import("stream").Duplex,
    internalUtils: TSriInternalUtils,
  ) => Promise<void>;
};

/**
 * This is the part of TResourceDefinition where the customRoutes are defined
 * Currently there are 3 possible scenario's for custom routes that work differently.
 */
export type TCustomRoute = TLikeCustomRoute | TNonStreamingCustomRoute | TStreamingCustomRoute;

export function isLikeCustomRouteDefinition(cr: TCustomRoute): cr is TLikeCustomRoute {
  return "like" in cr;
}

export function isNonStreamingCustomRouteDefinition(
  cr: TCustomRoute,
): cr is TNonStreamingCustomRoute {
  return "handler" in cr;
}

export function isStreamingCustomRouteDefinition(cr: TCustomRoute): cr is TStreamingCustomRoute {
  return "streamingHandler" in cr;
}

export type TResourceDefinition = {
  type: TUriPath;
  metaType: TResourceMetaType;
  methods?: THttpMethod[];

  /** the database table to store the records, optional, inferred from typeif missing */
  table?: string;

  // these next lines are put onto the same object afterwards, not by the user
  singleResourceRegex?: RegExp;
  listResourceRegex?: RegExp;
  validateKey?: ValidateFunction;
  validateSchema?: ValidateFunction;

  listResultDefaultIncludeCount?: boolean;
  maxlimit?: number;
  defaultlimit?: number;
  defaultexpansion?: boolean;
  // THIS SHOULD BE A JSON SCHEMA SO MAYBE https://github.com/json-schema-tools/meta-schema
  // WILL HELP TO CORRECTLY TYPE JSON SCHEMA'S INISDE OUT CODE
  schema: JSONSchema4;
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
  beforeUpdate?: Array<
    (
      tx: pgPromise.IDatabase<unknown>,
      sriRequest: TSriRequest,
      data: Array<{
        permalink: string;
        incoming: Record<string, any>;
        stored: Record<string, any>;
      }>,
      internalUtils: TSriInternalUtils,
    ) => void
  >;
  beforeInsert?: Array<
    (
      tx: pgPromise.IDatabase<unknown>,
      sriRequest: TSriRequest,
      data: Array<{
        permalink: string;
        incoming: Record<string, any>;
        stored: null;
      }>,
      internalUtils: TSriInternalUtils,
    ) => void
  >;
  beforeRead?: Array<
    (
      tx: pgPromise.IDatabase<unknown>,
      sriRequest: TSriRequest,
      internalUtils: TSriInternalUtils,
    ) => void
  >;
  beforeDelete?: Array<
    (
      tx: pgPromise.IDatabase<unknown>,
      sriRequest: TSriRequest,
      data: Array<{
        permalink: string;
        incoming: null;
        stored: Record<string, any>;
      }>,
      internalUtils: TSriInternalUtils,
    ) => void
  >;
  afterRead?: Array<
    (
      tx: pgPromise.IDatabase<unknown>,
      sriRequest: TSriRequest,
      data: Array<{
        permalink: string;
        incoming: null;
        stored: Record<string, any>;
      }>,
      internalUtils: TSriInternalUtils,
    ) => void
  >;
  afterUpdate?: Array<
    (
      tx: pgPromise.IDatabase<unknown>,
      sriRequest: TSriRequest,
      data: Array<{
        permalink: string;
        incoming: Record<string, any>;
        stored: Record<string, any>;
      }>,
      internalUtils: TSriInternalUtils,
    ) => void
  >;
  afterInsert?: Array<
    (
      tx: pgPromise.IDatabase<unknown>,
      sriRequest: TSriRequest,
      data: Array<{
        permalink: string;
        incoming: Record<string, any>;
        stored: Record<string, any>;
      }>,
      internalUtils: TSriInternalUtils,
    ) => void
  >;
  afterDelete?: Array<
    (
      tx: pgPromise.IDatabase<unknown>,
      sriRequest: TSriRequest,
      data: Array<{
        permalink: string;
        incoming: null;
        stored: Record<string, any>;
      }>,
      internalUtils: TSriInternalUtils,
    ) => void
  >;
  transformResponse?: Array<
    (
      dbT: pgPromise.IDatabase<unknown>,
      sriRequest: TSriRequest,
      sriResult: TSriResult,
      internalUtils: TSriInternalUtils,
    ) => void
  >;

  // all supported query parameters, with a function that will modify the preparedSQL so far
  // to make sure only the relevant results are returned
  query?: TSriQueryFun;
  // uses the same jeys as in 'query', to make sure the custom filters are documented as well
  queryDocs?: Record<string, string>;

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
    [k: string]: {
      columnToField?: Array<(key: string, element: Record<string, unknown>) => void>;
      [k: string]: any;
    };
  };
  onlyCustom?: boolean;
  customRoutes?: Array<TCustomRoute>;
};

export type TSriRequestHandlerForPhaseSyncer = (
  phaseSyncer: PhaseSyncer,
  tx: pgPromise.IDatabase<unknown>,
  sriRequest: TSriRequest,
  mapping: TResourceDefinition | null,
  internalUtils: TSriInternalUtils,
) => Promise<TSriResult>;

export type TSriRequestHandlerForBatch = (
  sriRequest: TSriRequest,
  internalUtils: TSriInternalUtils,
) => Promise<TSriResult>;

export type TSriRequestHandler = TSriRequestHandlerForBatch | TSriRequestHandlerForPhaseSyncer;

export type TBatchHandlerRecord = {
  route: string;
  verb: THttpMethod;
  func: TSriRequestHandler;
  // eslint-disable-next-line no-use-before-define
  config: TSriConfig;
  mapping: TResourceDefinition;
  streaming: boolean;
  readOnly: boolean;
  isBatch: boolean;
};
// EXPERIMENT: I think it would be better to separate func, which can have 2 types, into 2 separate
// properties, one for each type. This would make the type system more precise.
// & (
//   { requestHandlerForBatch: TSriRequestHandlerForBatch }
//   |
//   { requestHandlerForPhaseSyncer: TSriRequestHandlerForPhaseSyncer }
// )

/**
 * I believe schema should be set on the connection level and not the library level
 * so I am supporting it here already...
 *
 * Also adding an option here to run some sql when getting a new connection.
 * That option used to be in the root of TSriConfig and used to be called dbConnectionInitSql
 * EXAMPLE: "set random_page_cost = 1.1;"
 */
export interface IExtendedDatabaseConnectionParameters extends IConnectionParameters {
  schema?: pgPromise.ValidSchema | ((dc: unknown) => pgPromise.ValidSchema);
  // will be run
  connectionInitSql?: string; // example "set random_page_cost = 1.1;",
}

export interface IExtendedDatabaseInitOptions extends pgPromise.IInitOptions {
  /**
   * Do we attach the pgMonitor plugin?
   */
  pgMonitor?: boolean;
}

export type TSriResult = {
  status: number;
  headers?: Record<string, string>;
  body?:
    | {
        $$meta?: any;
        results: Array<any>;
      }
    | any;
};

export type TOverloadProtection = {
  maxPipelines: number;
  retryAfter?: number;
};

export type TJobMap = Map<string, PhaseSyncer>;

export type TBeforePhase = (
  sriRequestMap: Map<string, TSriRequest>,
  jobMap: TJobMap,
  pendingJobs: Set<string>,
  internalUtils: TSriInternalUtils,
) => Promise<void>;

export type TSriConfig = {
  // these next lines are put onto the same object afterwards, not by the user
  utils?: unknown;
  db?: pgPromise.IDatabase<unknown>;
  dbR?: pgPromise.IDatabase<unknown>;
  dbW?: pgPromise.IDatabase<unknown>;
  informationSchema?: TInformationSchema;
  /** a short string that will be added to every request id while logging
   * (tis can help to differentiate between different api's while searching thourgh logs)
   */
  id?: string;

  // the real properties !!!
  plugins?: TPluginConfig[];
  enableGlobalBatch?: boolean;
  globalBatchRoutePrefix?: TUriPath;
  // logrequests?: boolean,
  // logsql?: boolean,
  logdebug?: TLogDebug;
  description?: string;
  bodyParserLimit?: string; // example 50mb
  batchConcurrency?: number;
  overloadProtection?: TOverloadProtection;

  defaultlimit?: boolean;
  // 2022-03-08 REMOVE gc-stats as the project is abandoned and will cause problems with node versions > 12
  // trackHeapMax?: boolean,
  /**
   * DO NOT USE! This is generated when configure() is called,
   * and then added to the sriConfig object, which is bad practice.
   *
   * This is a map generated when configure() is called.
   * where the keys are httpMethod and the values an array of "*almost* TBatchHandlerRecord"
   */
  batchHandlerMap?: {
    [K in THttpMethod]: Array<Omit<TBatchHandlerRecord, "route"> & { route: Record<string, any> }>;
  };
  resources: TResourceDefinition[];

  /**
   * This is a global hook. It is called during configuration, before anything is done.
   */
  startUp?: Array<
    (dbT: pgPromise.IDatabase<unknown>, pgp: pgPromise.IMain<unknown, IClient>) => void
  >;

  /**
   * This is a global hook. New hook which will be called before each phase of a request is executed (phases are parts of requests,
   * they are used to synchronize between executing batch operations in parallel, see Batch execution order in the README.
   */
  beforePhase?: Array<TBeforePhase>;

  /**
   * This is a global hook. This function is called at the very start of each http request (i.e. for batch only once).
   * Based on the expressRequest (maybe some headers?) you could make changes to the sriRequest object (like maybe
   * add the user's identity if it can be deducted from the headers).
   */
  transformRequest?: Array<
    (
      expressRequest: Request,
      sriRequest: TSriRequest,
      dbT: pgPromise.IDatabase<unknown>,
      internalUtils: TSriInternalUtils,
    ) => void
  >;

  /**
   * This is a global hook. This hook is defined to be able to copy data set by transformRequest (like use data) from the
   * original (parent) request to the new internal request. This function is called at creation of each sriRequest created
   * via the 'internal' interface.
   */
  transformInternalRequest?: Array<
    (
      dbT: pgPromise.IDatabase<unknown>,
      internalSriRequest: TInternalSriRequest,
      parentSriRequest: TSriRequest,
    ) => void
  >;

  /**
   * This is a global hook. This hook will be called in case an exception is catched during the handling of an SriResquest.
   * After calling this hook, sri4node continues with the built-in error handling (logging and sending error reply to the cient).
   * Warning: in case of an early error, sriRequest might be undefined!
   */
  errorHandler?: Array<
    (sriRequest: TSriRequest, error: Error, internalUtils: TSriInternalUtils) => void
  >;

  /**
   * This is a global hook. It will be called after the request is handled (without errors). At the moment this handler is called,
   * the database task/transaction is already closed and the response is already sent to the client.
   */
  afterRequest?: Array<(sriRequest: TSriRequest) => void>;

  /**
   * @deprecated
   */
  defaultdatabaseurl?: string;

  /**
   * @deprecated
   */
  dbConnectionInitSql?: string; // example "set random_page_cost = 1.1;",

  /**
   * @deprecated
   */
  maxConnections?: string;

  // cfr. https://github.com/vitaly-t/pg-promise/blob/master/typescript/pg-subset.d.ts
  databaseConnectionParameters: IExtendedDatabaseConnectionParameters; // IConnectionOptions<IClient> do I need this type param?
  // cfr. https://github.com/vitaly-t/pg-promise/blob/master/typescript/pg-promise.d.ts
  // OPTIONAL, but useful if you want to enable pgMonitor or enable some lifecycle hooks
  databaseLibraryInitOptions?: IExtendedDatabaseInitOptions;

  /**
   * to enable [pg-monitor](https://www.npmjs.com/package/pg-monitor) (detailed logging about database interaction)
   */
  enablePgMonitor?: boolean;

  /**
   * When streaming a response, even if it takes a long time to send the next chunk,
   * we'll make sure something (a space character) is being sent to the client
   * to avoid anything in the middle to kill the connection.
   *
   * DEFAULT: 20_000 (20 seconds)
   */
  streamingKeepAliveTimeoutMillis?: number;
};

export type ParseTreeType = "string" | "number" | "integer" | "boolean";

export type ParseTreeProperty = { name: string; type: ParseTreeType; multiValued: boolean };

export type ParseTreeOperator = { name: string; type: ParseTreeType; multiValued: boolean };

export type ParseTreeFilter = {
  property?: ParseTreeProperty;
  operator: ParseTreeOperator;
  invertOperator: boolean;
  caseInsensitive: boolean;
  value: unknown;
};

export type ParseTree = {
  normalizedUrl: {
    rowFilters: ParseTreeFilter[];
    columnFilters: ParseTreeFilter[];
    listControlFilters: ParseTreeFilter[];
  };
};

// can be improved and made a lot more strict (cfr. @types/json-schema), but for now...
export type FlattenedJsonSchema = { [path: string]: { [jsonSchemaProperty: string]: unknown } };

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
