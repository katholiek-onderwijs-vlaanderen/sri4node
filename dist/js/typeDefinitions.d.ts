/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { Busboy, BusboyConfig } from "busboy";
import { Request } from "express";
import { Operation } from "fast-json-patch";
import { IncomingHttpHeaders } from "http2";
import { JSONSchema4 } from "json-schema";
import pgPromise, { ITask } from "pg-promise";
import { IConnectionParameters } from "pg-promise/typescript/pg-subset";
import stream from "stream";
import { PhaseSyncer } from "./phaseSyncedSettle";
import { ValidateFunction } from "ajv";
import { addReferencingResources, parseResource, pgConnect, pgExec, tableFromMapping, transformObjectToRow, transformRowToObject, typeToMapping, urlToTypeAndKey } from "./common";
import { prepareSQL } from "./queryObject";
import { getSQLFromListResource } from "./listResource";
/** got this from Copilot, should return a union type that has all the required keys of type T */
export type RequiredKeysOf<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
} extends {
    [_ in keyof T]-?: infer U;
} ? U : never;
/**
 * Helper type to only pick the required properties of an object
 */
export type RequiredOnly<T> = Pick<T, RequiredKeysOf<T>>;
/**
 * Helper type to make extra properties mandatory based on an existing type
 * @example
 * ```ts
 * // a is required, b, c and d are optional
 * type T = { a: boolean, b?: number, c?: string, d?: Date };
 * // a, b and c are required, d is optional
 * type TReqB = RequiredExtra<T, 'b' | 'c'>;
 * ```
 */
export type RequiredExtra<T, K extends keyof T> = T & Required<Pick<T, K>>;
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
    install: (sriConfig: TSriInternalConfig, db: pgPromise.IDatabase<unknown>) => void | Promise<void>;
    /**
     * This is called when the api is being closed. It can be used to clean up resources.
     * (like onnotification subscriptions to the database for example)
     *
     * @param sriConfig
     * @param db
     * @returns
     */
    close?: (sriConfig: TSriInternalConfig, db: pgPromise.IDatabase<unknown>) => void | Promise<void>;
};
export type TUriPath = string;
export type THttpMethod = "GET" | "PUT" | "DELETE" | "PATCH" | "POST";
export type TDebugChannel = "general" | "db" | "sql" | "requests" | "hooks" | "server-timing" | "batch" | "trace" | "phaseSyncer" | "overloadProtection" | "mocha";
export type TLogDebugExternal = {
    channels: TDebugChannel[] | "all";
    statuses?: Array<number>;
};
export type TLogDebugInternal = {
    channels: Set<TDebugChannel | string> | "all";
    statuses?: Set<number>;
};
export type TDebugLogFunction = (channel: TDebugChannel | string, x: (() => string) | string, logdebugConfig?: TSriInternalConfig["logdebug"]) => void;
export type TErrorLogFunction = (...unknown: any[]) => void;
/**
 * Base class for every error that is being thrown throughout the lifetime of an sri request
 */
export declare class SriError {
    status: number;
    body: {
        errors: unknown[];
        status: number;
        document: {
            [key: string]: unknown;
        };
        vskoReqId?: string;
    };
    headers: {
        [key: string]: string;
    };
    sriRequestID: string | null;
    verb?: THttpMethod;
    href?: string;
    /**
     * Contructs an sri error based on the given initialisation object
     *
     * @param {Object} value
     */
    constructor({ status, errors, headers, document, sriRequestID, }: {
        status: number;
        errors: unknown[];
        headers?: {
            [k: string]: string;
        };
        document?: {
            [k: string]: unknown;
        };
        sriRequestID?: string | null;
    });
}
export type TSriBatchElement = {
    href: string;
    verb: THttpMethod;
    body: TSriRequestBody;
    match?: {
        path: string;
        queryParams: URLSearchParams;
        routeParams: Record<string, string>;
        handler: TBatchHandlerRecord;
    };
};
export type TSriBatchArray = Array<TSriBatchElement | Array<TSriBatchElement>>;
export type TSriRequestBody = TSriBatchArray | Array<Operation> | any;
export type TPreparedSql = {
    name?: string;
    text: string;
    params: Array<string | number | boolean>;
    param: (x: string | number | boolean, noQuotes?: boolean) => TPreparedSql;
    sql: (x: string) => TPreparedSql;
    keys: (o: Record<string, unknown>) => TPreparedSql;
    values: (o: Record<string, string | number | boolean>) => TPreparedSql;
    array: (x: Array<string | number | boolean>) => TPreparedSql;
    arrayOfTuples(x: Array<Array<string | number | boolean>>, cast?: Array<string>): any;
    /**
     * Check if a value is in a list of values.
     * You would think about 'x IN (list)' in SQL, but implementing it using an exists clause
     * is better for performance.
     * 'EXISTS (SELECT 1 FROM (VALUES (list[0]), (list[1]), ... (list[n])) as t(x) where t.x = x)'
     *
     * @param valueRef a string referencing the value to check like a column name or 'LOWER(columnname)'
     * @param list an array of values to check against
     */
    valueIn(valueRef: string, list: Array<string | number | boolean | Date>, cast?: string): any;
    /**
     * Check if a tuple is in a list of tuples.
     * You would think about '(x,y) IN (listOfTuples)' in SQL, but implementing it using an exists clause
     * is better for performance.
     * 'EXISTS (SELECT 1 FROM (VALUES (list[0][0],list[0][1]), ... (list[n][0],list[n][1])) as t(x) where t.x = (x,y))'
     *
     * @param valueRef a string referencing the tuple to check like a column name or 'LOWER(columnname)'
     * @param list an array of tuples to check against
     */
    tupleIn(valueRef: string, list: Array<Array<string | number | boolean | Date>>, cast?: Array<string>): any;
    with: (nonrecursivequery: TPreparedSql, unionclause: string, recursivequery: TPreparedSql, virtualtablename: string) => TPreparedSql;
    appendQueryObject(queryObject2: TPreparedSql): TPreparedSql;
    toParameterizedSql: () => {
        sql: string;
        values: Array<any>;
    };
};
export type TInformationSchema = {
    [resourcePath: string]: {
        [columnName: string]: {
            type: "ARRAY";
            element_type: string;
        } | {
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
    db: pgPromise.IDatabase<unknown>;
    app: Express.Application;
    /**
     * Closes the database pool.
     */
    close: () => void;
};
export type TSriRequestExternal = {
    id: string;
    parentSriRequest?: TSriRequestExternal;
    logDebug: TDebugLogFunction;
    logError: TErrorLogFunction;
    SriError: typeof SriError;
    href?: string;
    verb?: THttpMethod;
    httpMethod?: THttpMethod;
    originalUrl?: string;
    path: TUriPath;
    query: URLSearchParams;
    params: Record<string, string>;
    sriType?: string;
    isBatchRequest?: boolean;
    readOnly?: boolean;
    reqCancelled?: boolean;
    headers: {
        [key: string]: string;
    } | IncomingHttpHeaders;
    body?: TSriRequestBody;
    dbT: ITask<unknown>;
    pgp: pgPromise.IMain;
    inStream: stream.Readable;
    outStream: stream.Writable;
    setHeader?: (key: string, value: string) => void;
    setStatus?: (statusCode: number) => void;
    streamStarted?: () => boolean;
    protocol: "_internal_" | "http" | "https" | string | undefined;
    isBatchPart?: boolean;
    serverTiming: {
        [key: string]: unknown;
    };
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
    rowsToDelete?: Record<string, Array<{
        key: string;
        "$$meta.modified": Date;
        "$$meta.deleted": boolean;
    }>>;
    rowsToDeleteIDs?: Array<string>;
    multiDeleteFailed?: boolean;
    multiDeleteError?: any;
    userData: Record<string, any>;
    userObject?: any;
};
/**
 * This is the internal sri request object that is used for internal requests.
 * These are request that do not go through express, but that will reuse
 * an existing database transaction, and are being run while handling another request.
 *
 * You could imagine that you could use it for a validation rule for instance.
 * Or maybe if a put to one resource should result in puts to other resources as well.
 * It is up to the user to imagine what they could do with this.
 */
export type TSriRequestInternal = TSriRequestExternal & {
    id: string;
    protocol: "_internal_";
    href: string;
    verb: THttpMethod;
    dbT: ITask<unknown>;
    pgp: pgPromise.IMain;
    parentSriRequest: TSriRequestExternal;
    headers?: {
        [key: string]: string;
    } | IncomingHttpHeaders;
    body?: Array<{
        href: string;
        verb: THttpMethod;
        body: TSriRequestBody;
    }> | TSriRequestBody;
    inStream?: any;
    outStream?: any;
    /** function called to set headers before streaming */
    setHeader?: (key: string, value: string) => void;
    /** function called to set status before streaming */
    setStatus?: (statusCode: number) => void;
    /** function which should return true when streaming is started */
    streamStarted?: () => boolean;
    serverTiming: {
        [key: string]: unknown;
    };
};
/**
 * This srirequest can be either an external (the normal one) or an internal one.
 */
export type TSriRequest = TSriRequestExternal | TSriRequestInternal;
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
 * By adding it as the last parameter, this should not break anything on existing projects,
 * but at least we can start using this new way of doing things right away.
 *
 * If we find more useful functions later, we can also easily add them to this object in the future.
 */
export type TSriInternalUtils = {
    internalSriRequest: (internalReq: Omit<TSriRequestInternal, "id" | "protocol" | "serverTiming" | "pgp" | "query" | "logDebug" | "logError" | "SriError" | "path" | "params" | "headers" | "inStream" | "outStream" | "userData">) => Promise<TSriResult>;
};
export type TSriQueryFun = {
    [key: string]: (value: string, select: TPreparedSql, key: string, database: pgPromise.IDatabase<unknown> | ITask<unknown>, doCount: boolean, mapping: TResourceDefinitionInternal, urlParameters: URLSearchParams, informationSchema: TInformationSchema) => void;
};
/** properties that always apply in ALL customRoute scenario's */
export type TCustomRouteGeneralProperties = {
    routePostfix: TUriPath;
    httpMethods: THttpMethod[];
    readOnly?: boolean;
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
export type TLikeCustomRoute = TCustomRouteGeneralProperties & ({
    like: string;
    /** this will define where the customRoute listens relative to the resource base */
    query?: TSriQueryFun;
} & ({
    alterMapping: (mapping: TResourceDefinitionInternal) => void;
} | {
    transformResponse: (dbT: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, sriResult: TSriResult) => Promise<void>;
}));
/** NON streaming input & NON streaming output */
export type TNonStreamingCustomRoute = TCustomRouteGeneralProperties & {
    /** this will define where the customRoute listens relative to the resource base */
    beforeHandler?: (tx: pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, customMapping: TResourceDefinitionInternal, sriInternalUtils: TSriInternalUtils) => Promise<void>;
    handler: (tx: pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, customMapping: TResourceDefinitionInternal, sriInternalUtils: TSriInternalUtils) => Promise<TSriResult>;
    /** probably not so useful, since we can already control exactly what the response wil look like in the handler */
    transformResponse?: (dbT: pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, sriResult: TSriResult, sriInternalUtils: TSriInternalUtils) => Promise<void>;
    afterHandler?: (tx: pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, customMapping: TResourceDefinitionInternal, result: TSriResult, sriInternalUtils: TSriInternalUtils) => Promise<void>;
};
/** streaming input & streaming output */
export type TStreamingCustomRoute = TCustomRouteGeneralProperties & {
    /** indicates that busboy will be used, which helps with handling multipart form data */
    busBoy?: boolean;
    busBoyConfig?: BusboyConfig;
    /** indicates that the output stream is a binary stream (otherwise a response header Content-Type: 'application/json' will be set) */
    binaryStream?: boolean;
    beforeStreamingHandler?: (tx: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, customMapping: TResourceDefinitionInternal, sriInternalUtils: TSriInternalUtils) => Promise<{
        status: number;
        headers: Array<[key: string, value: string]>;
    } | undefined>;
    streamingHandler: (tx: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, stream: import("stream").Duplex, sriInternalUtils: TSriInternalUtils) => Promise<void>;
};
/**
 * This is the part of TResourceDefinition where the customRoutes are defined
 * Currently there are 3 possible scenario's for custom routes that work differently.
 */
export type TCustomRoute = TLikeCustomRoute | TNonStreamingCustomRoute | TStreamingCustomRoute;
export declare function isLikeCustomRouteDefinition(cr: TCustomRoute): cr is TLikeCustomRoute;
export declare function isNonStreamingCustomRouteDefinition(cr: TCustomRoute): cr is TNonStreamingCustomRoute;
export declare function isStreamingCustomRouteDefinition(cr: TCustomRoute): cr is TStreamingCustomRoute;
export type TBeforeUpdateHook = (tx: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, data: Array<{
    permalink: string;
    incoming: Record<string, any>;
    stored: Record<string, any>;
}>, sriInternalUtils: TSriInternalUtils) => void;
export type TBeforeInsertHook = (tx: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, data: Array<{
    permalink: string;
    incoming: Record<string, any>;
    stored: null;
}>, sriInternalUtils: TSriInternalUtils) => void;
export type TBeforePhaseHook = (sriRequestMap: Map<string, TSriRequest>, jobMap: TJobMap, pendingJobs: Set<string>, sriInternalUtils: TSriInternalUtils, resources: Array<TResourceDefinitionInternal>, informationSchema: TInformationSchema, pgColumns: TPgColumns) => Promise<void>;
export type TBeforeReadHook = (tx: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, sriInternalUtils: TSriInternalUtils) => void;
export type TBeforeDeleteHook = (tx: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, data: Array<{
    permalink: string;
    incoming: null;
    stored: Record<string, any>;
}>, sriInternalUtils: TSriInternalUtils) => void;
export type TAfterReadHook = (tx: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, data: Array<{
    permalink: string;
    incoming: null;
    stored: Record<string, any>;
}>, sriInternalUtils: TSriInternalUtils, resources: Array<TResourceDefinitionInternal>) => void;
export type TAfterUpdateHook = (tx: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, data: Array<{
    permalink: string;
    incoming: Record<string, any>;
    stored: Record<string, any>;
}>, sriInternalUtils: TSriInternalUtils) => void;
export type TAfterInsertHook = (tx: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, data: Array<{
    permalink: string;
    incoming: Record<string, any>;
    stored: Record<string, any> | null;
}>, sriInternalUtils: TSriInternalUtils) => void;
export type TAfterDeleteHook = (tx: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriRequest: TSriRequestExternal, data: Array<{
    permalink: string;
    incoming: null;
    stored: Record<string, any>;
}>, sriInternalUtils: TSriInternalUtils) => void;
export type TTransformResponseHook = (dbT: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriRequest: TSriRequest, sriResult: TSriResult, sriInternalUtils: TSriInternalUtils) => void;
export type TTransformInternalRequestHook = (dbT: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, internalSriRequest: TSriRequestInternal, parentSriRequest: TSriRequestExternal) => void;
export type TErrorHandlerHook = (sriRequest: TSriRequestExternal, error: Error, sriInternalUtils: TSriInternalUtils) => void;
export type TAfterRequestHook = (sriRequest: TSriRequestExternal) => void;
export type TTransformRequestHook = (expressRequest: Request, sriRequest: TSriRequestExternal, dbT: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriInternalUtils: TSriInternalUtils) => void;
export type TStartupHook = (dbT: pgPromise.IDatabase<unknown>, pgp: pgPromise.IMain<unknown>) => void;
export type TResourceDefinition = {
    type: TUriPath;
    metaType: TResourceMetaType;
    methods?: THttpMethod[];
    /** the database table to store the records, optional, inferred from typeif missing */
    table?: string;
    listResultDefaultIncludeCount?: boolean;
    maxlimit?: number;
    defaultlimit?: number;
    defaultexpansion?: boolean;
    schema: JSONSchema4;
    beforeUpdate?: Array<TBeforeUpdateHook>;
    beforeInsert?: Array<TBeforeInsertHook>;
    beforeRead?: Array<TBeforeReadHook>;
    beforeDelete?: Array<TBeforeDeleteHook>;
    afterRead?: Array<TAfterReadHook>;
    afterUpdate?: Array<TAfterUpdateHook>;
    afterInsert?: Array<TAfterInsertHook>;
    afterDelete?: Array<TAfterDeleteHook>;
    transformResponse?: Array<TTransformResponseHook>;
    query?: TSriQueryFun;
    queryDocs?: Record<string, string>;
    map?: {
        [k: string]: {
            columnToField?: Array<(key: string, element: Record<string, unknown>) => void>;
            [k: string]: any;
        };
    };
    onlyCustom?: boolean;
    customRoutes?: Array<TCustomRoute>;
};
/**
 * For internal resource definition, make sure some of the optional properties are required.
 *
 * In case onlyCustom is true, many properties should NOT be in the object as they make no sense,
 * but for now we are keepig things simple.
 */
export type TResourceDefinitionInternal = RequiredExtra<TResourceDefinition, "beforeRead" | "afterRead" | "beforeUpdate" | "afterUpdate" | "beforeInsert" | "afterInsert" | "beforeDelete" | "afterDelete" | "customRoutes" | "transformResponse"> & {
    singleResourceRegex: RegExp;
    listResourceRegex: RegExp;
    validateKey: ValidateFunction;
    validateSchema: ValidateFunction;
};
export type TSriRequestHandlerForPhaseSyncer = (phaseSyncer: PhaseSyncer, tx: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>, sriRequest: TSriRequest, mapping: TResourceDefinitionInternal | null, sriInternalUtils: TSriInternalUtils, informationSchema: TInformationSchema, resources: Array<TResourceDefinitionInternal>) => Promise<TSriResult>;
export type TSriRequestHandlerForBatch = (sriRequest: TSriRequest, sriInternalUtils: TSriInternalUtils, informationSchema: TInformationSchema, overloadProtection: TOverloadProtection) => Promise<TSriResult>;
export type TSriRequestHandler = TSriRequestHandlerForBatch | TSriRequestHandlerForPhaseSyncer;
export type TBatchHandlerRecord = {
    route: string;
    verb: THttpMethod;
    func: TSriRequestHandler;
    config: TSriInternalConfig;
    mapping: TResourceDefinitionInternal;
    streaming: boolean;
    readOnly: boolean;
    isBatch: boolean;
};
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
    connectionInitSql?: string;
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
    body?: {
        $$meta?: any;
        results: Array<any>;
    } | any;
};
export type TOverloadProtectionConfig = {
    maxPipelines: number;
    retryAfter?: number;
};
/**
 * A stateful object that exposes methods to help protect against overload
 */
export type TOverloadProtection = {
    canAccept: () => boolean;
    startPipeline: (nr?: number) => number;
    endPipeline: (nr?: number) => void;
    addExtraDrops: (nr: number) => void;
};
export type TJobMap = Map<string, PhaseSyncer>;
/**
 * The configuration object as passed by the user to the configure() function.
 */
export type TSriConfig = {
    plugins?: TPluginConfig[];
    enableGlobalBatch?: boolean;
    globalBatchRoutePrefix?: TUriPath;
    logdebug?: TLogDebugExternal;
    /** a short string that will be added to every request id while logging
     * (this can help to differentiate between different api's while searching through logs)
     */
    id?: string;
    /** Explain what kind of information is being stored in this API */
    description?: string;
    bodyParserLimit?: string;
    batchConcurrency?: number;
    overloadProtection?: TOverloadProtectionConfig;
    defaultlimit?: boolean;
    /**
     * An Array of resource definitions. Each resource definition is an object that defines
     * the path of the resource, and the schema (+ some other info to customize the api's behevior).
     */
    resources: TResourceDefinition[];
    /**
     * This is a global hook. It is called during configuration, before anything is done.
     */
    startUp?: Array<TStartupHook>;
    /**
     * This is a global hook. New hook which will be called before each phase of a request is executed (phases are parts of requests,
     * they are used to synchronize between executing batch operations in parallel, see Batch execution order in the README.
     */
    beforePhase?: Array<TBeforePhaseHook>;
    /**
     * This is a global hook. This function is called at the very start of each http request (i.e. for batch only once).
     * Based on the expressRequest (maybe some headers?) you could make changes to the sriRequest object (like maybe
     * add the user's identity if it can be deducted from the headers).
     */
    transformRequest?: Array<TTransformRequestHook>;
    /**
     * This is a global hook. This hook is defined to be able to copy data set by transformRequest (like use data) from the
     * original (parent) request to the new internal request. This function is called at creation of each sriRequest created
     * via the 'internal' interface.
     */
    transformInternalRequest?: Array<TTransformInternalRequestHook>;
    /**
     * This is a global hook. This hook will be called in case an exception is catched during the handling of an SriResquest.
     * After calling this hook, sri4node continues with the built-in error handling (logging and sending error reply to the cient).
     * Warning: in case of an early error, sriRequest might be undefined!
     */
    errorHandler?: Array<TErrorHandlerHook>;
    /**
     * This is a global hook. It will be called after the request is handled (without errors). At the moment this handler is called,
     * the database task/transaction is already closed and the response is already sent to the client.
     */
    afterRequest?: Array<TAfterRequestHook>;
    /**
     * @deprecated
     */
    defaultdatabaseurl?: string;
    /**
     * @deprecated
     * @see databaseConnectionParameters.connectionInitSql
     */
    dbConnectionInitSql?: string;
    /**
     * @deprecated
     * @see databaseConnectionParameters.max
     */
    maxConnections?: string;
    databaseConnectionParameters: IExtendedDatabaseConnectionParameters;
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
    /** Enforce https on express (will redirect if not on localhost). */
    forceSecureSockets?: boolean;
};
export type TPgColumns = {
    [resourcePath: string]: {
        insert: pgPromise.ColumnSet<unknown>;
        update: pgPromise.ColumnSet<unknown>;
        delete: pgPromise.ColumnSet<unknown>;
    };
};
/**
 * The internal configuration object which is a extended and modified version of the TSriConfig
 * object that the user passed into the configure() function.
 */
export type TSriInternalConfig = RequiredExtra<Omit<TSriConfig, "logdebug" | "resources">, "batchConcurrency" | "bodyParserLimit" | "beforePhase" | "transformRequest" | "transformInternalRequest"> & {
    /** logdebug gets overwritten with an internal version ! */
    logdebug: TLogDebugInternal;
    resources: Array<TResourceDefinitionInternal>;
    utils: {
        executeSQL: typeof pgExec;
        prepareSQL: typeof prepareSQL;
        convertListResourceURLToSQL: typeof getSQLFromListResource;
        addReferencingResources: typeof addReferencingResources;
        pgConnect: typeof pgConnect;
        /**
         * still here for backwards compatibility, in most cases we assume that using an
         * internalSriRequest would be sufficient
         */
        transformRowToObject: typeof transformRowToObject;
        /**
         * still here for backwards compatibility, in most cases we assume that using an
         * internalSriRerquest would be sufficient
         */
        transformObjectToRow: typeof transformObjectToRow;
        typeToMapping: typeof typeToMapping;
        tableFromMapping: typeof tableFromMapping;
        urlToTypeAndKey: typeof urlToTypeAndKey;
        /**
         * should be deprecated in favour of a decent url parsing mechanism
         */
        parseResource: typeof parseResource;
    };
    db: pgPromise.IDatabase<unknown>;
    dbR: pgPromise.IDatabase<unknown>;
    dbW: pgPromise.IDatabase<unknown>;
    informationSchema: TInformationSchema;
    pgColumns: TPgColumns;
    /**
     * This is a map generated when configure() is called.
     * where the keys are httpMethod and the values an array of "*almost* TBatchHandlerRecord"
     */
    batchHandlerMap: {
        [K in THttpMethod]: Array<TBatchHandlerRecord>;
    };
};
export type ParseTreeType = "string" | "number" | "integer" | "boolean";
export type ParseTreeProperty = {
    name: string;
    type: ParseTreeType;
    multiValued: boolean;
};
export type ParseTreeOperator = {
    name: string;
    type: ParseTreeType;
    multiValued: boolean;
};
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
export type FlattenedJsonSchema = {
    [path: string]: {
        [jsonSchemaProperty: string]: unknown;
    };
};
