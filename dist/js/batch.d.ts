import { THttpMethod, TBatchHandlerRecord, TSriRequestHandlerForBatch } from "./typeDefinitions";
type TMatchedHref = {
    path: string;
    routeParams: any;
    queryParams: any;
    handler: TBatchHandlerRecord;
};
/**
 * Tries to find the proper record in the global batchHandlerMap
 * and then returns the handler found + some extras
 * like path, routeParams (example /resources/:id) and queryParams (?key=value)
 *
 * @param {String} href
 * @param {THttpMethod} verb: GET,PUT,PATCH,DELETE,POST
 * @returns an object of the form { path, routeParams, queryParams, handler: [path, verb, func, config, mapping, streaming, readOnly, isBatch] }
 */
declare function matchHref(href: string, verb: THttpMethod): TMatchedHref;
/**
 * This will add a 'match' property to every batch element that already contains
 * which handler will be needed for each operation (and throws SriErrors if necessary)
 *
 * Used to detect early (without executing a lot of stuff on the DB first)
 * if a batch is going to fail anyway along the way because of invalid urls etc.
 *
 * @param {TSriRequest} req
 */
declare function matchBatch(req: any): void;
declare const batchOperation: TSriRequestHandlerForBatch;
/**
 * It will return an object only containing status and no body, because the body is being streamed.
 */
declare const batchOperationStreaming: TSriRequestHandlerForBatch;
export { matchHref, matchBatch, batchOperation, batchOperationStreaming };
