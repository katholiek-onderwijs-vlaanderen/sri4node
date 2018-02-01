const configuration = global.configuration  

const _ = require('lodash')
const pMap = require('p-map');
const url = require('url');

const { debug, cl, SriError, startTransaction, typeToConfig, stringifyError, settleResultsToSriResults } = require('./common.js');
const listResource = require('./listResource.js')
const regularResource = require('./regularResource.js')
const hooks = require('./hooks.js')
const phaseSyncedSettle = require('./phaseSyncedSettle.js')


exports = module.exports = {

  batchOperation: async (db, sriRequest) => {
    'use strict';

    // Body of request is an array of objects with 'href', 'verb' and 'body' (see sri spec)
    const reqBody = sriRequest.body

    debug('batchOperations')
    debug(reqBody)

    const {tx, resolveTx, rejectTx} = await startTransaction(db)

    if (!Array.isArray(reqBody)) {
      throw new SriError({status: 400, errors: [{code: 'batch.body.invalid', msg: 'Batch body should be JSON array.'}]})  
    }

    const handleBatch = async (batch) => {
      if ( batch.every(element =>  Array.isArray(element)) ) {
        return await pMap(batch, async element => await handleBatch(element), {concurrency: 1})
      } else if ( batch.every(element => (typeof(element) === 'object') && (!Array.isArray(element)) )) {
        const batchJobs = await pMap(batch, async element => {
          // spec: if verb is omitted, it MUST be interpreted as PUT.
          if (!element.verb) {
            element.verb = 'PUT'
          }

          debug('┌──────────────────────────────────────────────────────────────────────────────')
          debug(`| Executing /batch section ${element.verb} - ${element.href} `)
          debug('└──────────────────────────────────────────────────────────────────────────────')

          const batchBase = sriRequest.path.split('/batch')[0]
          const parsedUrl = url.parse(element.href, true);
          const pathName = parsedUrl.pathname.replace(/\/$/, '') // replace eventual trailing slash

          // only allow batch operations within the same resource (will be extended later with 'boundaries')
          if (!pathName.startsWith(batchBase)) {
            throw new SriError({status: 400, errors: [{code: 'href.across.boundary', msg: 'Only requests within (sub) path of /batch request are allowed.'}]}) 
          }
          
          const applicableHandlers = configuration.batchHandlerMap.filter( ({ route, verb, func, type }) => {
            return (route.match(pathName) && element.verb === verb)
          })
          if (applicableHandlers.length > 1) {
            cl(`WARNING: multiple handler functions match for batch request ${pathname}. Only first will be used. Check configuration.`)
          }
          const handler =  _.first(applicableHandlers)

          const func  = handler.func
          if (!func) {
            throw new SriError({status: 404, errors: [{code: 'no.handler.found', msg: `No handler found for ${e.verb} on ${pathName}.`}]})
          }
          const routeParams = handler.route.match(pathName)

          const elementSriRequest  = {
            path: pathName,
            originalUrl: element.href,
            query: parsedUrl.query,
            params: routeParams,
            httpMethod: element.verb,
            headers: sriRequest.headers,
            protocol: sriRequest.protocol,
            body: (element.body == null ? null : _.isObject(element.body) ? element.body : JSON.parse(element.body)),
            sriType: handler.type,
            // isListRequest: !('uuid' in routeParams)
            SriError: SriError
          }
          
          const mapping = typeToConfig(configuration.resources)[handler.type]
          await hooks.applyHooks('transform batch request'
                                , mapping.transformBatchRequest
                                , f => f(sriRequest, elementSriRequest))


          return [ func, [tx, elementSriRequest] ]
        }, {concurrency: 1})


        return settleResultsToSriResults( await phaseSyncedSettle(batchJobs, {concurrency: 4, debug: true} ))

      } else {
        throw new SriError({status: 400, errors: [{code: 'batch.invalid.type.mix', msg: 'A batch array should contain either all objects or all (sub)arrays.'}]})          
      }
    }

    const batchResults = _.flatten(await handleBatch(reqBody))
    

    // spec: The HTTP status code of the response must be the highest values of the responses of the operations inside 
    // of the original batch, unless at least one 403 Forbidden response is present in the batch response, then the 
    // server MUST respond with 403 Forbidden.
    const status = batchResults.some( e => (e.status === 403) ) 
                        ? 403 
                        : Math.max(200, ...batchResults.map( e => e.status ))

    if (status < 300) {
      resolveTx()
      return { status: status, body: batchResults }
    } else {
      rejectTx()
      return { status: status, body: batchResults }
    }
  }
}