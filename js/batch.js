const _ = require('lodash')
const pMap = require('p-map');
const pEachSeries = require('p-each-series');
const url = require('url');

const { debug, cl, SriError, startTransaction, typeToConfig, stringifyError, settleResultsToSriResults } = require('./common.js');
const listResource = require('./listResource.js')
const regularResource = require('./regularResource.js')
const hooks = require('./hooks.js')
const phaseSyncedSettle = require('./phaseSyncedSettle.js')


const maxSubListLen = (a) => 
  // this code works as long as a batch array contain either all objects or all (sub)arrays
  // (which is required by batchOpertation, otherwise a 'batch.invalid.type.mix' error is sent)
  a.reduce((max, e, idx, arr) => {
    if (Array.isArray(e)) {
      console.log(`array: ${e}`)
      return Math.max(maxSubListLen(e), max);
    } else {
      console.log('NOT array')
      return Math.max(arr.length, max);
    }
  }, 0);


exports = module.exports = {

  batchOperation: async (tx, req, db) => {
    'use strict';

    // Body of request is an array of objects with 'href', 'verb' and 'body' (see sri spec)
    const reqBody = req.body

    if (!Array.isArray(reqBody)) {
      throw new SriError({status: 400, errors: [{code: 'batch.body.invalid', msg: 'Batch body should be JSON array.'}]})  
    }

    const batchConcurrency = global.overloadProtection.startPipeline(
                                Math.min(maxSubListLen(reqBody), global.sri4node_configuration.batchConcurrency));

    const context = {};

    const handleBatch = async (batch, tx) => {  
      if ( batch.every(element =>  Array.isArray(element)) ) {
        debug('┌──────────────────────────────────────────────────────────────────────────────')
        debug(`| Handling batch list`)
        debug('└──────────────────────────────────────────────────────────────────────────────')
        return await pMap( batch
                         , async element => {
                              const {tx: tx1, resolveTx, rejectTx} = await startTransaction(tx)
                              const result = await handleBatch(element, tx1)
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
        const batchJobs = await pMap(batch, async element => {
          if (!element.verb) {
            throw new SriError({status: 400, errors: [{code: 'verb.missing', msg: 'VERB is not specified.'}]}) 
          }

          debug('┌──────────────────────────────────────────────────────────────────────────────')
          debug(`| Executing /batch section ${element.verb} - ${element.href} `)
          debug('└──────────────────────────────────────────────────────────────────────────────')

          const batchBase = req.path.split('/batch')[0]
          const parsedUrl = url.parse(element.href, true);
          const pathName = parsedUrl.pathname.replace(/\/$/, '') // replace eventual trailing slash

          // only allow batch operations within the same resource (will be extended later with 'boundaries')
          if (!pathName.startsWith(batchBase)) {
            throw new SriError({status: 400, errors: [{code: 'href.across.boundary', msg: 'Only requests within (sub) path of /batch request are allowed.'}]}) 
          }
          
          if (parsedUrl.query.dryRun === 'true') {
            throw new SriError({status: 400, errors: [{code: 'dry.run.not.allowed.in.batch', msg: 'The dryRun query parameter is only allowed for the batch url itself (/batch?dryRun=true), not for hrefs inside a batch request.'}]}) 
          }

          const applicableHandlers = global.sri4node_configuration.batchHandlerMap.filter( ({ route, verb }) => {
            return (route.match(pathName) && element.verb === verb)
          })
          if (applicableHandlers.length > 1) {
            cl(`WARNING: multiple handler functions match for batch request ${pathName}. Only first will be used. Check configuration.`)
          }
          const handler =  _.first(applicableHandlers)

          if (!handler || !handler.func) {
            throw new SriError({status: 404, errors: [{code: 'no.matching.route', msg: `No route found for ${element.verb} on ${pathName}.`}]})
          }

          const func  = handler.func
          const routeParams = handler.route.match(pathName)

          const sriRequest  = {
            path: pathName,
            originalUrl: element.href,
            query: parsedUrl.query,
            params: routeParams,
            httpMethod: element.verb,
            headers: req.headers,
            protocol: req.protocol,
            body: (element.body == null ? null : _.isObject(element.body) ? element.body : JSON.parse(element.body)),
            sriType: handler.mapping.type,
            isBatchPart: true,
            SriError: SriError,
            db: db,
            context: context
          }
          
          await hooks.applyHooks('transform request'
                                , handler.mapping.transformRequest
                                , f => f(req, sriRequest, tx))

          return [ func, [tx, sriRequest, handler.mapping] ]
        }, {concurrency: 1})

        const results = settleResultsToSriResults( await phaseSyncedSettle(batchJobs, {concurrency: batchConcurrency} ))

        await pEachSeries( results
                     , async (res, idx) => {
                          const [ _phaseSyncer, _tx, sriRequest, mapping ] = batchJobs[idx][1]
                          if (! (res instanceof SriError)) {
                            await hooks.applyHooks('transform response'
                                                  , mapping.transformResponse
                                                  , f => f(tx, sriRequest, res))
                          }
                       } )
        return results.map( (res, idx) => {
                            const [ _phaseSyncer, _tx, sriRequest, _mapping ] = batchJobs[idx][1]
                            res.href = sriRequest.originalUrl
                            res.verb = sriRequest.httpMethod
                            return res
                          })
      } else {
        throw new SriError({status: 400, errors: [{code: 'batch.invalid.type.mix', msg: 'A batch array should contain either all objects or all (sub)arrays.'}]})          
      }
    }

    const batchResults = _.flatten(await handleBatch(reqBody, tx))
    

    // spec: The HTTP status code of the response must be the highest values of the responses of the operations inside 
    // of the original batch, unless at least one 403 Forbidden response is present in the batch response, then the 
    // server MUST respond with 403 Forbidden.
    const status = batchResults.some( e => (e.status === 403) ) 
                        ? 403 
                        : Math.max(200, ...batchResults.map( e => e.status ))                      

    global.overloadProtection.stopPipeline(batchConcurrency);

    return { status: status, body: batchResults }    
  }
}