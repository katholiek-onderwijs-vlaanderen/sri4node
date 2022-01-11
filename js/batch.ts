import { Stream } from "stream";

const _ = require('lodash')
const pMap = require('p-map');
const pEachSeries = require('p-each-series');
const url = require('url');
const JSONStream = require('JSONStream');
const EventEmitter = require('events');
const pEvent = require('p-event');
const httpContext = require('express-http-context');
const { v4: uuidv4 } = require('uuid');

import common from './common';
const { debug, cl, SriError, startTransaction, settleResultsToSriResults, generateSriRequest } = common;
const hooks = require('./hooks')
const phaseSyncedSettle = require('./phaseSyncedSettle')


const maxSubListLen = (a) => 
  // this code works as long as a batch array contain either all objects or all (sub)arrays
  // (which is required by batchOpertation, otherwise a 'batch.invalid.type.mix' error is sent)
  a.reduce((max, e, idx, arr) => {
    if (Array.isArray(e)) {
      return Math.max(maxSubListLen(e), max);
    } else {
      return Math.max(arr.length, max);
    }
  }, 0);




export = module.exports = {

  /**
   * This will add a 'match' property to every batch element that already contains
   * which handler will be needed for each operation (and throws SriErrors if necessary)
   *
   * Used to detect early (without executing a lot of stuff on the DB first)
   * if a batch is going to fail anyway along the way because of invalid urls etc.
   *
   * @param {SriRequest} req
   */
  matchBatch: (req) => {
    // Body of request is an array of objects with 'href', 'verb' and 'body' (see sri spec)
    const reqBody = req.body
    const batchBase = req.path.split('/batch')[0]

    if (!Array.isArray(reqBody)) {
      throw new SriError({status: 400, errors: [{code: 'batch.body.invalid', msg: 'Batch body should be JSON array.', 
                                                 body: reqBody}]})  
    }

    const handleBatchForMatchBatch = (batch) => {
        if ( batch.every(element =>  Array.isArray(element)) ) {
          batch.forEach(handleBatchForMatchBatch);
        } else if ( batch.every(element => (typeof(element) === 'object') && (!Array.isArray(element)) )) {
          batch.forEach(element => {
            const match = module.exports.matchHref(element.href, element.verb)

            if (match.handler.isBatch === 'true') {
              throw new SriError({status: 400, errors: [{code: 'batch.not.allowed.in.batch', msg: 'Nested /batch requests are not allowed, use 1 batch with sublists inside the batch JSON.'}]}) 
            }

            // only allow batch operations within the same resource (will be extended later with 'boundaries')
            if (!match.path.startsWith(batchBase)) {
              throw new SriError({status: 400, errors: [{code: 'href.across.boundary', msg: 'Only requests within (sub) path of /batch request are allowed.'}]}) 
            }
            
            if (match.queryParams.dryRun === 'true') {
              throw new SriError({status: 400, errors: [{code: 'dry.run.not.allowed.in.batch', msg: 'The dryRun query parameter is only allowed for the batch url itself (/batch?dryRun=true), not for hrefs inside a batch request.'}]}) 
            }
            element.match = match;
          })
        } else {
          throw new SriError({status: 400, errors: [{code: 'batch.invalid.type.mix', msg: 'A batch array should contain either all objects or all (sub)arrays.'}]})          
        }
    }
    handleBatchForMatchBatch(reqBody);
  },

  /**
   * Tries to find the proper record in the global batchHandlerMap
   * and then returns the handler found + some extras
   * like path, routeParams (example /resources/:id) and queryParams (?key=value)
   *
   * @param {String} href
   * @param {'GET' | 'PUT' | 'PATCH' | 'DELETE' | 'POST'} verb: GET,PUT,PATCH,DELETE,POST
   * @returns an object of the form { path, routeParams, queryParams, handler: [path, verb, func, config, mapping, streaming, readOnly, isBatch] }
   */
  matchHref: (href, verb) => {
    if (!verb) {
      console.log(`No VERB stated for ${href}.`)
      throw new SriError({status: 400, errors: [{code: 'no.verb', msg: `No VERB stated for ${href}.`}]})
    }
    const parsedUrl = url.parse(href, true);
    const queryParams = parsedUrl.query;
    const path = parsedUrl.pathname.replace(/\/$/, '') // replace eventual trailing slash

    const matches = (global as any).sri4node_configuration.batchHandlerMap[verb]
      .map( handler => ({ handler, match: handler.route.match(path)}) )
      .filter( ({ match }) => match !== false );

    if (matches.length > 1) {
      cl(`WARNING: multiple handler functions match for batch request ${path}. Only first will be used. Check configuration.`)
    } else if (matches.length === 0) {
      throw new SriError({status: 404, errors: [{code: 'no.matching.route', msg: `No route found for ${verb} on ${path}.`}]})
    }

    const handler = _.first(matches).handler;
    const routeParams = _.first(matches).match;

    return { handler, path, routeParams, queryParams }
  },

  batchOperation: async (sriRequest) => {
    'use strict';
    const reqBody = sriRequest.body
    const batchConcurrency = (global as any).overloadProtection.startPipeline(
                                Math.min(maxSubListLen(reqBody), (global as any).sri4node_configuration.batchConcurrency));
    try {
      const contextInsideBatch = {};
      let batchFailed = false;

      const handleBatchInBatchOperation = async (batch, tx) => {
        if ( batch.every(element =>  Array.isArray(element)) ) {
          debug('batch', '┌──────────────────────────────────────────────────────────────────────────────')
          debug('batch', `| Handling batch list`)
          debug('batch', '└──────────────────────────────────────────────────────────────────────────────')
          return await pMap( batch
                           , async element => {
                                const {tx: tx1, resolveTx, rejectTx} = await startTransaction(tx)
                                const result = await handleBatchInBatchOperation(element, tx1)
                                if (result.every(e => e.status < 300)) {
                                  await resolveTx()
                                } else {
                                  await rejectTx()
                                }
                                return result
                             }
                           , {concurrency: 1}
                           )
        } else if ( batch.every(element => (typeof(element) === 'object') && (!Array.isArray(element)) )) {
          if (!batchFailed) {
              const batchJobs = await pMap(batch, async batchElement => {
                if (!batchElement.verb) {
                  throw new SriError({status: 400, errors: [{code: 'verb.missing', msg: 'VERB is not specified.'}]}) 
                }
                debug('batch', '┌──────────────────────────────────────────────────────────────────────────────')
                debug('batch', `| Executing /batch section ${batchElement.verb} - ${batchElement.href} `)
                debug('batch', '└──────────────────────────────────────────────────────────────────────────────')

                const match = batchElement.match;

                const innerSriRequest = generateSriRequest(undefined, undefined, undefined, match, sriRequest, batchElement);

                return [ match.handler.func, [tx, innerSriRequest, match.handler.mapping] ]
              }, {concurrency: 1})

              const results = settleResultsToSriResults(
                    await phaseSyncedSettle(batchJobs, { concurrency: batchConcurrency,
                                                         beforePhaseHooks: (global as any).sri4node_configuration.beforePhase
                                                       } ));

              if (results.some(e => e instanceof SriError || e?.__proto__?.constructor?.name === 'SriError') && sriRequest.readOnly === false) {
                  batchFailed = true;
              }

              await pEachSeries( results
                           , async (res, idx) => {
                                const [ _phaseSyncer, _tx, innerSriRequest, mapping ] = batchJobs[idx][1]
                                if (! (res instanceof SriError || res?.__proto__?.constructor?.name === 'SriError')) {
                                  await hooks.applyHooks('transform response'
                                                        , mapping.transformResponse
                                                        , f => f(tx, innerSriRequest, res))
                                }
                             } )
              return results.map( (res, idx) => {
                                  const [ _phaseSyncer, _tx, innerSriRequest, _mapping ] = batchJobs[idx][1]
                                  res.href = innerSriRequest.originalUrl
                                  res.verb = innerSriRequest.httpMethod
                                  delete res.sriRequestID
                                  return res
                                })
          } else {
              // TODO: generate correct error json with refering element in it!
              return batch.map( e =>  new SriError({ status: 202, errors: [{ code: 'cancelled', msg: 'Request cancelled due to failure in accompanying request in batch.' }] })  );
          }
        } else {
          batchFailed = true;
          throw new SriError({status: 400, errors: [{code: 'batch.invalid.type.mix', msg: 'A batch array should contain either all objects or all (sub)arrays.'}]})          
        }
      }

      const batchResults = _.flatten(await handleBatchInBatchOperation(reqBody, sriRequest.dbT))

      // spec: The HTTP status code of the response must be the highest values of the responses of the operations inside 
      // of the original batch, unless at least one 403 Forbidden response is present in the batch response, then the 
      // server MUST respond with 403 Forbidden.
      const status = batchResults.some( e => (e.status === 403) ) 
                          ? 403 
                          : Math.max(200, ...batchResults.map( e => e.status ))

      return { status: status, body: batchResults }
    } finally {
      (global as any).overloadProtection.endPipeline(batchConcurrency);
    }
  },

  batchOperationStreaming: async (sriRequest) => {
    'use strict';
    let keepAliveTimer:NodeJS.Timer | null = null;
    const stream = null;
    const reqBody = sriRequest.body
    const batchConcurrency = (global as any).overloadProtection.startPipeline(
                                Math.min(maxSubListLen(reqBody), (global as any).sri4node_configuration.batchConcurrency));
    try {
      const context = {};
      let batchFailed = false;

      const handleBatchStreaming = async (batch, tx) => {
        if ( batch.every(element =>  Array.isArray(element)) ) {
          debug('batch', '┌──────────────────────────────────────────────────────────────────────────────')
          debug('batch', `| Handling batch list`)
          debug('batch', '└──────────────────────────────────────────────────────────────────────────────')
          return await pMap( batch
                           , async element => {
                                const result = await handleBatchStreaming(element, tx)
                                return result;
                             }
                           , {concurrency: 1}
                           )
        } else if ( batch.every(element => (typeof(element) === 'object') && (!Array.isArray(element)) )) {
          if (!batchFailed) {
              const batchJobs = await pMap(batch, async element => {
                if (!element.verb) {
                  throw new SriError({status: 400, errors: [{code: 'verb.missing', msg: 'VERB is not specified.'}]})
                }
                debug('batch', '┌──────────────────────────────────────────────────────────────────────────────')
                debug('batch', `| Executing /batch section ${element.verb} - ${element.href} `)
                debug('batch', '└──────────────────────────────────────────────────────────────────────────────')

                const match = element.match;

                const innerSriRequest  = {
                  ...sriRequest,
                  parentSriRequest: sriRequest,
                  path: match.path,
                  originalUrl: element.href,
                  query: match.queryParams,
                  params: match.routeParams,
                  httpMethod: element.verb,
                  body: (element.body == null ? null : _.isObject(element.body) ? element.body : JSON.parse(element.body)),
                  sriType: match.handler.mapping.type,
                  isBatchPart: true,
                  context: context
                }

                return [ match.handler.func, [tx, innerSriRequest, match.handler.mapping] ]
              }, {concurrency: 1})

              const results = settleResultsToSriResults( await phaseSyncedSettle(batchJobs, { concurrency: batchConcurrency
                                                                                            , beforePhaseHooks: (global as any).sri4node_configuration.beforePhase }))

              if (results.some(e => e instanceof SriError || e?.__proto__?.constructor?.name === 'SriError')) {
                batchFailed = true;
              }

              await pEachSeries( results
                           , async (res, idx) => {
                                const [ _phaseSyncer, _tx, innerSriRequest, mapping ] = batchJobs[idx][1]
                                if (! (res instanceof SriError || res?.__proto__?.constructor?.name === 'SriError')) {
                                  await hooks.applyHooks('transform response'
                                                        , mapping.transformResponse
                                                        , f => f(tx, innerSriRequest, res))
                                }
                             } )
              return results.map( (res, idx) => {
                                  const [ _phaseSyncer, _tx, innerSriRequest, _mapping ] = batchJobs[idx][1]
                                  res.href = innerSriRequest.originalUrl
                                  res.verb = innerSriRequest.httpMethod
                                  delete res.sriRequestID
                                  stream.push(res);
                                  return res.status;
                                })
          } else {
            //   const l = batch.map( e =>  new SriError({ status: 202, errors: [{ code: 'cancelled', msg: 'Request cancelled due to failure in accompanying request in batch.' }] })  );
              // TODO: generate correct error json with refering element in it!
              batch.forEach( _e => stream.push({ status: 202, errors: [{ code: 'cancelled', msg: 'Request cancelled due to failure in accompanying request in batch.' }] }) );
              return 202;
          }
        } else {
          batchFailed = true;
          throw new SriError({status: 400, errors: [{code: 'batch.invalid.type.mix', msg: 'A batch array should contain either all objects or all (sub)arrays.'}]})
        }
      }

      const reqId = httpContext.get('reqId');
      if (reqId!==undefined) {
        sriRequest.setHeader('vsko-req-id', reqId)
      }
      if (sriRequest['headers']['request-server-timing']) {
        sriRequest.setHeader('Trailer', 'Server-Timing')
      }
      sriRequest.setHeader('Content-Type', 'application/json; charset=utf-8')
      const stream = new Stream.Readable({objectMode: true});
      stream._read = function () {};
      stream.pipe(JSONStream.stringify()).pipe(sriRequest.outStream, {end: false});
      keepAliveTimer = setInterval(() => { sriRequest.outStream.write('') }, 15000)

      const streamEndEmitter = new EventEmitter()
      const streamDonePromise = pEvent(streamEndEmitter, 'done')

      stream.on('end', () => streamEndEmitter.emit('done'));

      sriRequest.outStream.write('{')
      sriRequest.outStream.write('"results":')

      const batchResults = _.flatten(await handleBatchStreaming(reqBody, sriRequest.dbT))

      // spec: The HTTP status code of the response must be the highest values of the responses of the operations inside
      // of the original batch, unless at least one 403 Forbidden response is present in the batch response, then the
      // server MUST respond with 403 Forbidden.
      const status = batchResults.some( e => (e === 403) )
                          ? 403
                          : Math.max(200, ...batchResults)

      // signal end to JSON stream
      stream.push(null)
      stream.destroy();

      // wait until JSON stream is ended
      await streamDonePromise;

      sriRequest.outStream.write(`, "status": ${status}`);
      sriRequest.outStream.write('}\n');

      return { status: status };
    } finally {
      if (keepAliveTimer !== null) {
        clearInterval(keepAliveTimer)
      }
      (global as any).overloadProtection.endPipeline(batchConcurrency);
    }
  }
}
