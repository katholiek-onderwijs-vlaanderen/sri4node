/// <reference types="node" />
import pgPromise, { IDatabase, IMain, ITask } from "pg-promise";
import { Application, Request, Response } from "express";
import { TResourceDefinition, TSriConfig, TSriRequestExternal, TDebugChannel, TSriRequestInternal, TDebugLogFunction, TErrorLogFunction, TLogDebugExternal, TInformationSchema, TSriInternalConfig, TLogDebugInternal, TResourceDefinitionInternal, TAfterReadHook, TSriRequest } from "./typeDefinitions";
import stream from "stream";
import * as emt from "./express-middleware-timer";
import { JSONSchema4 } from "json-schema";
import { IClient } from "pg-promise/typescript/pg-subset";
/**
 * process.hrtime() method can be used to measure execution time, but returns an array
 *
 * @param {Array<Integer>} hrtime tuple [seconds, nanoseconds]
 * @returns the input translated to milliseconds
 */
declare function hrtimeToMilliseconds([seconds, nanoseconds]: [number, number]): number;
/**
 *
 * @param channel name of the channel
 * @param logdebug optional. If not set, we will always return true.
 * @returns true if the channel is enabled in the logdebug config, or if logdebug is not set
 */
declare const isLogChannelEnabled: (channel: TDebugChannel | string, logdebug?: TLogDebugInternal) => boolean;
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
declare const debugAnyChannelAllowed: TDebugLogFunction;
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
declare const debug: (channel: TDebugChannel, output: (() => string) | string, logdebugConfig?: TSriInternalConfig["logdebug"]) => void;
/**
 * Logs errors to the console, but tries to prefix with reqId if it can be found with httpContext
 * in some express 'session' info linked to the current 'thread'.
 *
 * @param args
 */
declare const error: TErrorLogFunction;
/**
 * Will modify the parameter array into a sorted param array.
 *
 * @param parseTree
 * @returns the in-place sorted parseTree
 */
declare function sortUrlQueryParamParseTree(parseTree: Array<any>): any[];
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
declare function hrefToParsedObjectFactory(sriConfig?: TSriConfig, flat?: boolean): (href: string) => {
    parseTree: any;
};
/**
 * @param sriRequest
 * @param recurse if set, return top sriRequest
 * @returns the parent sri request if it exists (otherwise the same request is returned!)
 */
declare function getParentSriRequest(sriRequest: TSriRequest, recurse?: boolean): any;
/**
 * Make sure the express app uses the express-middleware-timer.
 *
 * @param app
 * @returns
 */
declare function installExpressMiddlewareTimer(app: Application): typeof emt;
/**
 * Will add the duration of 'property' to the serverTiming object of the parentSriRequest
 * (so parentSriRequest WILL BE MODIFIED IN PLACE!)
 * @param sriRequest
 * @param property
 * @param value
 */
declare function setServerTimingHdr(sriRequest: TSriRequest, property: any, value: any): void;
declare function expressMiddlewareTimerReportToServerTiming(req: Request, res: Response, sriRequest: TSriRequestExternal): void;
/**
 * Turns the config object passed to sri4node into an object that can be used internally.
 *
 * @param logdebug
 * @returns
 */
declare function createDebugLogConfigObject(logdebug?: TLogDebugExternal | boolean): TLogDebugInternal;
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
declare function handleRequestDebugLog(status: number, statuses: TLogDebugInternal["statuses"]): void;
declare function urlToTypeAndKey(urlToParse: string): {
    type: any;
    key: any;
};
/**
 * Unfortunatly we seems to have generated invalid UUIDs in the past.
 * (we even have uuids with invalid version like /organisations/efeb7119-60e4-8bd7-e040-fd0a059a2c55)
 * Therefore we cannot use a strict uuid checker like the npm module 'uuid-validate' but do we have to be less strict.
 *
 * @param uuid
 * @returns true or false
 */
declare function isUuid(uuid: string): boolean;
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
declare function parseResource(u: string): {
    base: string;
    id: null;
    query: string;
    comment: string | null;
} | {
    base: string;
    id: string;
    query: null;
    comment: string | null;
} | {
    base: string;
    id: null;
    query: null;
    comment: string | null;
} | null;
/**
 * return any string as code for REST API error object
 *
 * @param s
 * @returns
 */
declare function errorAsCode(s: string): string;
/**
 * Converts the configuration object for sri4node into an array per resource type
 */
declare function typeToConfig<T extends TResourceDefinition | TResourceDefinitionInternal>(config: Array<T>): T;
/**
 * @param type the string used as 'type' in the sriConfig resources
 * @param resources the array of resource definitions from the sriConfig
 * @returns the resource definition record from the active sriConfig
 */
declare function typeToMapping(type: string, resources: Array<TResourceDefinition> | Array<TResourceDefinitionInternal>): TResourceDefinitionInternal;
declare function sqlColumnNames(mapping: TResourceDefinitionInternal, summary?: boolean): string;
/**
 * @param row the database row
 * @param resourceMapping the applicable resource definition from the sriConfig object
 * @returns the json object as returned by the api
 */
declare function transformRowToObject(row: any, resourceMapping: TResourceDefinitionInternal): any;
/**
 * Function which verifies wether for all properties specified in the sri4node configuration
 * there exists a column in the database.
 * An improvement might be to also check if the types match.
 *
 * @param sriConfig sri4node configuration object
 * @param informationSchema the information schema of the database
 * @returns nothing, throw an error in case something is wrong
 */
declare function checkSriConfigWithDbInformationSchema(sriConfig: TSriConfig, informationSchema: TInformationSchema): void;
/**
 * @param obj the api object
 * @param resourceMapping the applicable resource definition from the sriConfig object
 * @param isNewResource boolean indicating that the resource doesn't exist yet
 * @returns a row to be saved on the database
 */
declare function transformObjectToRow(obj: Record<string, any>, resourceMapping: TResourceDefinition | TResourceDefinitionInternal, isNewResource: boolean, informationSchema: TInformationSchema): Record<string, unknown>;
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
declare function pgInit(pgpInitOptions: pgPromise.IInitOptions<{}, IClient> | undefined, extraOptions: {
    schema?: pgPromise.ValidSchema | ((dc: any) => pgPromise.ValidSchema) | undefined;
    connectionInitSql?: string;
    monitor: boolean;
}): pgPromise.IMain;
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
declare function pgConnect(pgp: pgPromise.IMain, sri4nodeConfig: TSriConfig): Promise<pgPromise.IDatabase<{}, IClient>>;
/**
 * @type {{ name: string, text: string }} details
 * @returns a prepared statement that can be used with tx.any() or similar functions
 */
declare function createPreparedStatement(details: pgPromise.IPreparedStatement | undefined): pgPromise.PreparedStatement;
declare function pgExec(db: pgPromise.IDatabase<unknown, IClient> | ITask<unknown>, query: any, sriRequest?: TSriRequestExternal): Promise<any>;
declare function pgResult(db: pgPromise.IDatabase<unknown, IClient> | ITask<unknown>, query: any, sriRequest?: TSriRequestExternal): Promise<pgPromise.IResultExt<unknown>>;
declare function startTransaction(db: pgPromise.IDatabase<unknown, IClient> | ITask<unknown>, mode?: {
    begin(cap?: boolean | undefined): string;
}): Promise<{
    tx: pgPromise.ITask<unknown>;
    resolveTx: () => Promise<void>;
    rejectTx: () => Promise<void>;
}>;
declare function startTask(db: pgPromise.IDatabase<unknown, IClient> | ITask<unknown>): Promise<{
    t: pgPromise.IDatabase<unknown, IClient> | ITask<unknown>;
    endTask: () => void;
}>;
declare function installVersionIncTriggerOnTable(db: pgPromise.IDatabase<unknown, IClient>, tableName: string, schemaName?: string): Promise<void>;
declare function getCountResult(tx: any, countquery: any, sriRequest: any): Promise<number>;
/**
 * Given a single resource definition from sriConfig.resources
 * returns the corresponding database table.
 * @param mapping
 * @returns the correponding database table name
 */
declare function tableFromMapping(mapping: TResourceDefinition | TResourceDefinitionInternal): any;
declare function isEqualSriObject(obj1: any, obj2: any, mapping: TResourceDefinitionInternal, informationSchema: TInformationSchema): any;
declare function stringifyError(e: any): string;
declare function settleResultsToSriResults(results: any): any;
declare function createReadableStream(objectMode?: boolean): stream.Readable;
declare function getParentSriRequestFromRequestMap(sriRequestMap: Map<string, TSriRequest>, recurse?: boolean): any;
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
declare function generateSriRequest(expressRequest?: Request | undefined, expressResponse?: Response | any | undefined, basicConfig?: {
    isBatchRequest: boolean;
    isStreamingRequest: boolean;
    readOnly: boolean;
    mapping?: TResourceDefinitionInternal;
    dbT: IDatabase<unknown, IClient> | ITask<unknown>;
    pgp: IMain;
} | undefined, batchHandlerAndParams?: any, parentSriRequest?: TSriRequestExternal | undefined, batchElement?: any, internalSriRequest?: Omit<TSriRequestInternal, "protocol" | "serverTiming"> | undefined): TSriRequestExternal;
/**
 * This is a recursive function that can find a property definition in a json schema definition.
 * This will also work when you have oneOf or anyOf sections in your schema definition.
 *
 * @param schema
 * @param propertyName
 * @returns the part of the json schema where the requested property is defined or null
 *  if the property is not found
 */
declare function findPropertyInJsonSchema(schema: JSONSchema4, propertyName: string): any;
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
declare const generatePgColumnSet: (columnNames: Array<string>, type: string, table: string, informationSchema: TInformationSchema, pgp: pgPromise.IMain) => pgPromise.ColumnSet<Record<string, string>>;
/**
 * Given the resource definition and the db information schema, check
 * if the database contains all the required fields (like key, $$meta.created etc.).
 *
 * @param mapping
 * @param informationSchema
 * @throws Error if a required field is missing
 */
declare function checkRequiredFields(mapping: TResourceDefinitionInternal, informationSchema: TInformationSchema): void;
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
declare function resourceDefToResourceDefInternal(resourceDefinition: TResourceDefinition): TResourceDefinitionInternal;
declare function addReferencingResources(type: string, column: any, targetkey: string | number, excludeOnExpand: string | string[]): TAfterReadHook;
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
declare const toArray: (thing: any) => any[];
/**
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
export { hrtimeToMilliseconds, isLogChannelEnabled, debugAnyChannelAllowed, debug, error, sortUrlQueryParamParseTree, hrefToParsedObjectFactory, getParentSriRequest, installExpressMiddlewareTimer, setServerTimingHdr, expressMiddlewareTimerReportToServerTiming, createDebugLogConfigObject, handleRequestDebugLog, urlToTypeAndKey, isUuid, parseResource, errorAsCode, typeToConfig, typeToMapping, sqlColumnNames, transformObjectToRow, transformRowToObject, pgInit, pgConnect, pgExec, pgResult, createPreparedStatement, startTransaction, startTask, installVersionIncTriggerOnTable, getCountResult, tableFromMapping, isEqualSriObject, stringifyError, settleResultsToSriResults, createReadableStream, getParentSriRequestFromRequestMap, generateSriRequest, checkSriConfigWithDbInformationSchema, findPropertyInJsonSchema, generatePgColumnSet, checkRequiredFields, addReferencingResources, toArray, resourceDefToResourceDefInternal, };
