/// <reference types="node" />
import Express from 'express';
import { IInitOptions } from 'pg-promise';
import pgPromise from 'pg-promise';
import { Application, Request, Response } from 'express';
import { Readable } from 'stream';
import { TResourceDefinition, TSriConfig, TSriRequest, TDebugChannel, TInternalSriRequest, TDebugLogFunction, TErrorLogFunction, TLogDebug, TInformationSchema } from './typeDefinitions';
import * as emt from './express-middleware-timer';
/**
 * Base class for every error that is being thrown throughout the lifetime of an sri request
 */
/**
 * process.hrtime() method can be used to measure execution time, but returns an array
 *
 * @param {Array<Integer>} hrtime tuple [seconds, nanoseconds]
 * @returns the input translated to milliseconds
 */
declare function hrtimeToMilliseconds([seconds, nanoseconds]: [number, number]): number;
declare const isLogChannelEnabled: (channel: TDebugChannel | string) => boolean;
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
declare const debugAnyChannelAllowed: TDebugLogFunction;
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
declare const debug: (channel: TDebugChannel, output: (() => string) | string) => void;
declare const error: TErrorLogFunction;
/**
 * Will modify the parameter array into a sorted param array.
 *
 * @param {*} parseTree
 * @returns the in-place sorted parseTree
 */
declare function sortUrlQueryParamParseTree(parseTree: any[]): any[];
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
declare function installEMT(app: Application): typeof emt;
declare function setServerTimingHdr(sriRequest: TSriRequest, property: any, value: any): void;
declare function emtReportToServerTiming(req: Request, res: Response, sriRequest: TSriRequest): void;
declare function createDebugLogConfigObject(logdebug: TLogDebug | boolean): TLogDebug;
declare function handleRequestDebugLog(status: number): void;
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
declare function errorAsCode(s: string): string;
/**
 * Converts the configuration object for sri4node into an array per resource type
 */
declare function typeToConfig(config: TResourceDefinition[]): {};
/**
 * @param type the string used as 'type' in the sriConfig resources
 * @returns the resource definition record from the active sriConfig
 */
declare function typeToMapping(type: string): TResourceDefinition;
declare function sqlColumnNames(mapping: any, summary?: boolean): string;
/**
 * @param row the database row
 * @param resourceMapping the applicable resource definition from the sriConfig object
 * @returns the json object as returned by the api
 */
declare function transformRowToObject(row: any, resourceMapping: TResourceDefinition): any;
/**
 * Function which verifies wether for all properties specified in the sri4node configuration
 * there exists a column in the database.
 * An improvement might be to also check if the types
 * @param sriConfig sri4node configuration object
 * @returns nothing, throw an error in case something is wrong
 */
declare function checkSriConfigWithDb(sriConfig: TSriConfig, informationSchema: TInformationSchema): void;
/**
 * @param obj the api object
 * @param resourceMapping the applicable resource definition from the sriConfig object
 * @param isNewResource boolean indicating that the resource doesn't exist yet
 * @returns a row to be saved on the database
 */
declare function transformObjectToRow(obj: Record<string, any>, resourceMapping: TResourceDefinition, isNewResource: boolean): {};
/**
 * Here we initalize the instance of the pgPromise LIBRARY.
 *
 * For some reason, setting the default schema is done on the library level
 * instead of the connection level...
 *
 * @param pgpInitOptions
 * @param extraOptions
 */
declare function pgInit(pgpInitOptions: IInitOptions<{}, import("pg-promise/typescript/pg-subset").IClient> | undefined, extraOptions: {
    schema?: pgPromise.ValidSchema | ((dc: any) => pgPromise.ValidSchema) | undefined;
    connectionInitSql?: string;
    monitor: boolean;
}): Promise<void>;
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
declare function pgConnect(sri4nodeConfig: TSriConfig): Promise<pgPromise.IDatabase<{}, import("pg-promise/typescript/pg-subset").IClient>>;
/**
 * @type {{ name: string, text: string }} details
 * @returns a prepared statement that can be used with tx.any() or similar functions
 */
declare function createPreparedStatement(details: pgPromise.IPreparedStatement | undefined): pgPromise.PreparedStatement;
declare function pgExec(db: any, query: any, sriRequest?: TSriRequest): Promise<any>;
declare function pgResult(db: any, query: any, sriRequest?: TSriRequest): Promise<any>;
declare function startTransaction(db: any, mode?: pgPromise.TransactionMode): Promise<{
    tx: pgPromise.ITask<any>;
    resolveTx: () => Promise<void>;
    rejectTx: () => Promise<void>;
}>;
declare function startTask(db: any): Promise<{
    t: unknown;
    endTask: () => Promise<void>;
}>;
declare function installVersionIncTriggerOnTable(db: any, tableName: string, schemaName?: string): Promise<void>;
declare function getCountResult(tx: any, countquery: any, sriRequest: any): Promise<number>;
/**
 * Given a single resource definition from sriConfig.resources
 * returns the corresponding database table.
 * @param mapping
 * @returns the correponding database table name
 */
declare function tableFromMapping(mapping: TResourceDefinition): any;
declare function isEqualSriObject(obj1: any, obj2: any, mapping: any): any;
declare function stringifyError(e: any): string;
declare function settleResultsToSriResults(results: any): any;
declare function createReadableStream(objectMode?: boolean): Readable;
declare function getParentSriRequestFromRequestMap(sriRequestMap: Map<string, TSriRequest>, recurse?: boolean): any;
declare function getPgp(): pgPromise.IMain<{}, import("pg-promise/typescript/pg-subset").IClient>;
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
declare function generateSriRequest(expressRequest?: Express.Request | undefined, expressResponse?: Express.Response | any | undefined, basicConfig?: {
    isBatchRequest: boolean;
    isStreamingRequest: boolean;
    readOnly: boolean;
    mapping?: TResourceDefinition;
    dbT: any;
} | undefined, batchHandlerAndParams?: any, parentSriRequest?: TSriRequest | undefined, batchElement?: any, internalSriRequest?: Omit<TInternalSriRequest, 'protocol' | 'serverTiming'> | undefined): TSriRequest;
export { hrtimeToMilliseconds, isLogChannelEnabled, debugAnyChannelAllowed, debug, error, sortUrlQueryParamParseTree, hrefToParsedObjectFactory, getParentSriRequest, installEMT, setServerTimingHdr, emtReportToServerTiming, createDebugLogConfigObject, handleRequestDebugLog, urlToTypeAndKey, isUuid, parseResource, errorAsCode, typeToConfig, typeToMapping, sqlColumnNames, transformObjectToRow, transformRowToObject, pgInit, pgConnect, pgExec, pgResult, createPreparedStatement, startTransaction, startTask, installVersionIncTriggerOnTable, getCountResult, tableFromMapping, isEqualSriObject, stringifyError, settleResultsToSriResults, createReadableStream, getParentSriRequestFromRequestMap, getPgp, generateSriRequest, checkSriConfigWithDb, };
