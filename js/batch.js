const configuration = global.configuration  

const _ = require('lodash')
const parse = require('url-parse')

const { debug, cl, SriError, startTransaction, typeToConfig } = require('./common.js');
const listResource = require('./listResource.js')
const regularResource = require('./regularResource.js')


exports = module.exports = {
  batchOperation: async (db, me, reqUrl, reqParams, reqBody, globalVerb) => {
    'use strict';

    // Body of request is an array of objects with 'href', 'verb' and 'body' (see sri spec)

    debug('batchOperations')
    debug(reqBody)

    const {tx, resolveTx, rejectTx} = await startTransaction(db)

    //spec: The batch operation itself MUST be a PUT operation, unless the entire batch is composed of GET operations, in which case the batch it's HTTP verb MUST be GET.
    const onlyGets = (reqBody.length > 0) && (reqBody.every( e => ( e.verb == 'GET') ))
    if (onlyGets && globalVerb != 'GET') {
      throw new SriError(400, [{code: 'batch.of.gets.requires.get.verb', msg: 'Batch entirely composed of GET operations, MUST have HTTP verb GET.'}])
    }

    const batchResults = await pMap(reqBody, async (element, idx) => {
      try {
        // spec: if verb is omitted, it MUST be interpreted as PUT.
        if (!element.verb) {
          element.verb = 'PUT'
        }

        debug(`Executing /batch section ${element.verb} - ${element.href}`)

        const batchBase = reqUrl.split('/batch')[0]
        const parsedUrl = parse(element.href, true);
        const pathName = parsedUrl.pathname.replace(/\/$/, '') // replace eventual trailing slash

        // only allow batch operations within the same resources (will be extended later with 'boundaries')
        if (!pathName.startsWith(batchBase)) {
          throw new SriError(400, [{code: 'href.across.boundary', msg: 'Only requests within (sub) path of /batch request are allowed.'}]) 
        }

        const allowed = await pEvery(mapping.secure, (func) => func(db, me, element.href, element.verb ) )
        if (!allowed) {
          throw new SriError(403, []) 
        } 
        
        const applicableHandlers = configuration.batchHandlerMap.filter( ({ route, verb, func }) => {
          return (route.match(pathName) && element.verb === verb)
        })
        if (applicableHandlers.length > 1) {
          cl(`WARNING: multiple handler functions match for batch request ${pathname}. Only first will be used. Check configuration.`)
        }
        func  = _.first(applicableHandlers).func
        if (!func) {
          throw new SriError(404, [{code: 'no.handler.found', msg: `No handler found for ${e.verb} on ${pathName}.`}])
        }
        
        return ( await func(tx, me, element.href, parsedUrl.query, (_.isObject(e.body) ? e.body : JSON.parse(element.body) ) ) )
      } catch (err) {  
        if (err instanceof SriError) {
          return err.obj
        } else {      
          console.log('____________________________ E R R O R ____________________________________________________') 
          console.log(err)
          console.log('___________________________________________________________________________________________') 
          return (new SriError(500, [{code: 'internal.server.error.in.batch.part', msg: 'Internal Server Error. [' + err.toString() + ']'}])).obj
        }
      }
    })

    // spec: The HTTP status code of the response must be the highest values of the responses of the operations inside 
    // of the original batch, unless at least one 403 Forbidden response is present in the batch response, then the 
    // server MUST respond with 403 Forbidden.
    var status 
    if (batchResults.filter( e => (e.status == 403) ).length > 0) {
      status = 403
    } else {
      status = Math.max(200, ...batchResults.map( e => e.status ))
    }

    if (status < 300) {
      resolveTx()
      return { status: status, body: batchResults }
    } else {
      rejectTx()
      return { status: status, body: batchResults }
    }
  }
}