const _ = require('lodash');
const pMap = require('p-map'); 
const pFilter = require('p-filter'); 
const url = require('url');

const hooks = require('./hooks.js')
const expand = require('./expand.js');
const { typeToConfig, typeToMapping, debug, cl, sqlColumnNames, getCountResult, typeFromUrl,
        transformRowToObject, tableFromMapping, pgExec, SriError } = require('./common.js');
const queryobject = require('./queryObject.js');
const queryUtils = require('./queryUtils.js');
const prepare = queryobject.prepareSQL; 


// Constants
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 500;


// apply extra parameters on request URL for a list-resource to a select.
async function applyRequestParameters(mapping, query, urlparameters, tx, count) {
  'use strict';
  const standardParameters = ['orderBy', 'descending', 'limit', 'keyOffset', 'expand', 'hrefs', 'modifiedSince', '$$includeCount', 'offset'];

  if (mapping.query) {
    await pMap(
        _.keys(urlparameters),
        async (key) => {
            if (!standardParameters.includes(key)) {
              if (mapping.query[key] || mapping.query.defaultFilter) {
                // Execute the configured function that will apply this URL parameter
                // to the SELECT statement
                if (!mapping.query[key] && mapping.query.defaultFilter) { // eslint-disable-line
                  await mapping.query.defaultFilter(urlparameters[key], query, key, mapping, tx)
                } else {
                  await mapping.query[key](urlparameters[key], query, key, tx, count, mapping)
                }
              } else {
                throw new SriError({status: 404, errors: [{code: 'unknown.query.parameter', parameter: key}]}) // this is small API change (previous: errors: [{code: 'invalid.query.parameter', parameter: key}])
              }          
            } else if (key === 'hrefs' && urlparameters.hrefs) {
              queryUtils.filterHrefs(urlparameters.hrefs, query, key, tx, count, mapping)
            } else if (key === 'modifiedSince') {
              queryUtils.modifiedSince(urlparameters.modifiedSince, query, key, tx, count, mapping)
            }
        },
        {concurrency: 1}
      )
  }
}

async function getSQLFromListResource(mapping, parameters, count, tx, query) {
  'use strict';
  const table = tableFromMapping(mapping)

  let sql, columns;
  if (parameters.expand && parameters.expand.toLowerCase() === 'none') {
    columns = '"key"';
  } else {
    columns = sqlColumnNames(mapping, 
                             parameters.expand && parameters.expand.toLowerCase() === 'summary');
  }

  if (count) {
    if (parameters['$$meta.deleted'] === 'true') {
      sql = 'select count(*) from "' + table + '" where "' + table + '"."$$meta.deleted" = true ';
    } else if (parameters['$$meta.deleted'] === 'any') {
      sql = 'select count(*) from "' + table + '" where 1=1 ';
    } else {
      sql = 'select count(*) from "' + table + '" where "' + table + '"."$$meta.deleted" = false ';
    }
    query.sql(sql);
  } else {
    if (parameters['$$meta.deleted'] === 'true') {
      sql = 'select ' + columns + ', "$$meta.deleted", "$$meta.created", "$$meta.modified" from "';
      sql += table + '" where "' + table + '"."$$meta.deleted" = true ';
    } else if (parameters['$$meta.deleted'] === 'any') {
      sql = 'select ' + columns + ', "$$meta.deleted", "$$meta.created", "$$meta.modified" from "';
      sql += table + '" where 1=1 ';
    } else {
      sql = 'select ' + columns + ', "$$meta.deleted", "$$meta.created", "$$meta.modified" from "';
      sql += table + '" where "' + table + '"."$$meta.deleted" = false ';
    }
    query.sql(sql);
  }

  debug('* applying URL parameters to WHERE clause');
  await applyRequestParameters(mapping, query, parameters, tx, count)

}


const applyOrderAndPagingParameters = (query, queryParams, mapping, queryLimit, maxlimit, keyOffset, offset) => {
  // All list resources support orderBy, limit and offset.

  // Order parameters
  const orderBy = queryParams.orderBy;
  const descending = queryParams.descending;

  let orderKeys = [ '$$meta.created', 'key' ];  //default

  if (orderBy !== undefined) {
    orderKeys = orderBy.split(',');
    if (orderKeys.some( k => (k !== '$$meta.created' && k !== '$$meta.modified' && !mapping.map[k]) )) {
      throw new SriError({status: 400, errors: [
          {
            code: 'invalid.orderby.parameter',
            message: `Can not order by [${orderBy}]. One or more unknown properties.`
          }]})
    }
  }

  // add paging to where clause

  if (keyOffset) {
    const keyValues  = keyOffset.split(',')
    if (keyValues.length !== orderKeys.length) {
      throw new SriError({status: 400, errors: [
          {
            code: 'invalid.keyoffset',
            message: `Number of offset key values (${keyValues.length}) does not match number of order keys (${orderKeys.length}).`
          }]})      
    }

    query.sql(' AND (')
    const orderKeyOp = (descending === 'true') ? '<' : '>';
    let equalConditions = []
    const table = tableFromMapping(mapping);
    const tableInformation = global.sri4node_configuration.informationSchema['/' + table]; 

    const addQueryClause = (table, k, orderKeyOp, value) => {
        query.sql(` "${table}"."${k}" ${orderKeyOp} `).param(value);
    }

    orderKeys.forEach( (k, idx) => {
      if (idx===0) {
        addQueryClause(table, k, orderKeyOp, keyValues[idx]);
      } else {
        query.sql(' OR (')
        orderKeys.slice(0, idx).forEach( (k2, idx2) => {
          if (idx2 > 0) {
            query.sql(' AND ')
          }
          addQueryClause(table, k2, '=', keyValues[idx2]);
        });
        query.sql(' AND ')
        addQueryClause(table, k, orderKeyOp, keyValues[idx]);
        query.sql(' )')
      }
    })
    query.sql(') ')

  }

  // add order parameter
  query.sql(` order by ${orderKeys.map( k => `"${k}" ${(descending === 'true') ? 'desc' : 'asc'}` ).join(',')}`);

  // add limit parameter
  const isGetAllExpandNone = (queryLimit === '*' && queryParams.expand !== undefined && queryParams.expand.toLowerCase() === 'none')
  if (!isGetAllExpandNone) {
    if (queryLimit > maxlimit || queryLimit === '*' ) {
      throw new SriError({status: 409, errors: [
          {
            code: 'invalid.limit.parameter',
            type: 'ERROR',
            message: 'The maximum allowed limit is ' + maxlimit
          }]})
    }
    // limit condition is always added except special case where the paremeter limit=* and expand is NONE (#104)
    query.sql(' limit ').param(queryLimit);
  }

  if (offset) {
    if (keyOffset) {
      throw new SriError({status: 409, errors: [
          {
            code: 'offset.and.keyoffset.incompatible',
            type: 'ERROR',
            message: 'The parameters "offset" and "keyOffset" cannot be used together'
          }]})
    } else {
      query.sql(' offset ').param(offset);  
    }
  }

  return orderKeys;
}


//sriRequest
const handleListQueryResult = (sriRequest, rows, count, mapping, queryLimit, orderKeys) => {  
  const results = [];
  const originalUrl = sriRequest.originalUrl
  const queryParams = sriRequest.query

  const table = tableFromMapping(mapping);
  const tableInformation = global.sri4node_configuration.informationSchema['/' + table];

  // const elements = [];
  rows.forEach( (currentrow) => {
    const element = {
      href: mapping.type + '/' + currentrow.key
    };

    // full, or any set of expansion values that must
    // all start with "results.href" or "results.href.*" will result in inclusion
    // of the regular resources in the list resources.
    if (!queryParams.expand ||
      ( queryParams.expand.toLowerCase() === 'full' || 
        queryParams.expand.toLowerCase() === 'summary' || 
        queryParams.expand.indexOf('results') === 0)) {
      element.$$expanded = transformRowToObject(currentrow, mapping)
      element.$$expanded['$$meta'].type = mapping.metaType;
    } else if (queryParams.expand && queryParams.expand.toLowerCase() === 'none') {
      // Intentionally left blank.
    } else if (queryParams.expand) {
      // Error expand must be either 'full','none' or start with 'href'
      const msg = 'expand value unknown : ' + queryParams.expand;
      debug(msg);
      throw new SriError({ status: 400, 
                           errors: [{ code: 'parameter.value.unknown', 
                                 msg: `Unknown value [${queryParams.expand}] for 'expand' parameter. The possible values are 'NONE', 'SUMMARY' and 'FULL'.`,
                                 parameter: "expand",
                                 value: queryParams.expand,
                                 possibleValues: [ 'NONE', 'SUMMARY', 'FULL' ]
                               }]
                         })      
    }
    results.push(element);
  })

  const output = {
    $$meta: {
      schema: mapping.type + '/schema',
      docs: mapping.type + '/docs'
    },
    results: results
  };

  if (count!=null) {
      output["$$meta"].count = count
  }

  const addOrReplaceParameter = (url, parameter, value) => {
    if  (url.indexOf(parameter) > 0) {
      return url.replace(new RegExp(`${parameter}[^&]*`), parameter + '=' + value)
    } else {
      return url + ((url.indexOf('?') > 0) ? '&' : '?') + parameter + '=' + value;
    }
  }

  if (results.length === parseInt(queryLimit) && results.length > 0) {  
    let lastElement = queryParams.expand && queryParams.expand.toLowerCase() === 'none' ? rows[queryLimit-1] : results[queryLimit-1]['$$expanded'];
    const keyOffset = orderKeys.map( k => {
                                      const o =_.get(lastElement, k);
                                      if (tableInformation[k].type === 'timestamp with time zone') {
                                        return encodeURIComponent(o);
                                      } else {
                                        return o.toString();
                                      }
                                   })
                               .join(',')
    output.$$meta.next = addOrReplaceParameter(originalUrl, 'keyOffset', keyOffset)
  }

  return output
}


async function getListResource(phaseSyncer, tx, sriRequest, mapping) {
  'use strict';
  const queryParams = sriRequest.query
  const type = mapping.type

  const defaultlimit = mapping.defaultlimit || DEFAULT_LIMIT;
  const maxlimit = mapping.maxlimit || MAX_LIMIT;
  const queryLimit = queryParams.limit || defaultlimit;
  const keyOffset = queryParams.keyOffset || '';
  const offset = queryParams.offset;

  await phaseSyncer.phase()

  await hooks.applyHooks( 'before read', 
                          mapping.beforeRead, 
                          f => f( tx, 
                                  sriRequest
                                )
                        )    

  await phaseSyncer.phase()

  debug('GET list resource ' + type);

  let count = null;
  let rows;
  let orderKeys;
  try {
    let includeCount = mapping.listResultDefaultIncludeCount;
    if ( queryParams["$$includeCount"] !== undefined ) {
      includeCount = ( queryParams["$$includeCount"] === 'true' )
    } 
    if ( includeCount ) {      
      const countquery = prepare();
      await getSQLFromListResource(mapping, queryParams, true, tx, countquery);
      debug('* executing SELECT COUNT query on tx');
      const startc = new Date();
      count = await getCountResult(tx, countquery) 
      // cl('pgExec count ... OK, exectime='+(new Date() - startc)+' ms.');
    }

    const query = prepare();
    await getSQLFromListResource(mapping, queryParams, false, tx, query);
    orderKeys = applyOrderAndPagingParameters(query, queryParams, mapping, queryLimit, maxlimit, keyOffset, offset)
    debug('* executing SELECT query on tx');
    const start = new Date();
    rows = await pgExec(tx, query);
    
    // cl('pgExec select ... OK, exectime='+(new Date() - start)+' ms.');
  } catch (error) { 
    if (error.code === '42703') { //UNDEFINED COLUMN
      throw new SriError({status: 409, errors: [{code: 'invalid.query.parameter'}]})
    } else {
      throw error
    }
  }


  const containsDeleted = rows.some( r => r['$$meta.deleted'] === true )

  sriRequest.containsDeleted = { get: () => containsDeleted } 

  const output = handleListQueryResult(sriRequest, rows, count, mapping, queryLimit, orderKeys)

  await phaseSyncer.phase()

  debug('* executing afterRead functions on results');

  await hooks.applyHooks( 'after read', 
                          mapping.afterRead, 
                          f => f( tx, 
                                  sriRequest, 
                                  output.results.map( e => {
                                    if (e['$$expanded']) {
                                      return { permalink: e.href
                                             , incoming: null
                                             , stored: e['$$expanded'] }
                                    } else {
                                      return { permalink: e.href
                                             , incoming: null
                                             , stored: null }
                                    }
                                  })
                                )
                        )  

  await phaseSyncer.phase()

  debug('* executing expansion : ' + queryParams.expand);
  await expand.executeExpansion(tx, sriRequest, output.results, mapping);

  return {status: 200, body: output}
}



///================


const matchUrl = (url, mapping) =>  {
  if (url.match(mapping.listResourceRegex) !== null) {
    return { type: 'list'}
  }
  const matchResult = url.match(mapping.singleResourceRegex);
  if (matchResult !== null) {
    const key = matchResult[1]
    return { type: 'single', key: key}
  }  
  throw new SriError({status: 400, errors: [{code: 'unknown.resource.type', url: url}]})
}


// Check if a given raw url A is a subset of the given raw urls in list B

// POST /[resource]/isPartOf
// { 
//  "a": { "href": [urlA] }
//  "b": { "hrefs": [ [urlB1], [urlB2], [urlB3] ] }
// }
// ==> [ [urlB2] ]  (all raw urls from list B for which url A is a subset)

async function isPartOf(phaseSyncer, tx, sriRequest, mapping) {

  if ( sriRequest.body.a === undefined || sriRequest.body.a.href === undefined
       || sriRequest.body.b === undefined || sriRequest.body.b.hrefs === undefined ) {
    throw new SriError({status: 400, errors: [{code: 'a.href.and.b.hrefs.needs.to.specified'}]})
  }
  if (Array.isArray(sriRequest.body.a.href)) {
    throw new SriError({status: 400, errors: [{code: 'a.href.must.be.single.value'}]})
  }
  if (!Array.isArray(sriRequest.body.b.hrefs)) {
    throw new SriError({status: 400, errors: [{code: 'b.hrefs.must.be.array'}]})
  }

  await phaseSyncer.phase();
  await phaseSyncer.phase();
  await phaseSyncer.phase();

  const urlA = sriRequest.body.a.href
  const typeA = matchUrl(urlA, mapping)

  const resultList = await pFilter(sriRequest.body.b.hrefs, async urlB => {
    const typeB = matchUrl(urlB, mapping);

    if (typeB.type === 'single') {
      if (typeA.type === 'single') {
        return (typeA.key === typeB.key);
      } else {
        return false;
      }
    } else {
      const { query:paramsB } = url.parse(urlB, true);
      const queryB = prepare();
      try {
        await getSQLFromListResource(mapping, paramsB, false, tx, queryB);
      } catch (err) {
        throw new SriError({status: 400, errors: [{code: 'resource.b.raised.error', url: urlB, err: err}]})
      }
      const sqlB = queryB.text;
      const valuesB = queryB.params;

      const query = prepare();
      if (typeA.type === 'single') {
        query.sql(`SELECT EXISTS ( SELECT key from (${sqlB}) as temp WHERE key='${typeA.key}' )  as result;`);
        query.params.push(...valuesB);
      } else {
        const { query:paramsA } = url.parse(urlA, true);
        const queryA = prepare();
        try {
          await getSQLFromListResource(mapping, paramsA, false, tx, queryA);
        } catch (err) {
          throw new SriError({status: 400, errors: [{code: 'resource.a.raised.error', url: urlA, err: err}]})
        }
        const sqlA = queryA.text;
        const valuesA = queryA.params;  

        query.sql(`SELECT NOT EXISTS ( SELECT key from (${sqlA}) as a WHERE NOT EXISTS (SELECT 1 FROM (${sqlB}) as b WHERE a.key = b.key)) as result;`)
        query.params.push(...valuesA);
        query.params.push(...valuesB);
      }
      const [{result}] = await pgExec(tx, query);
      return result;
    }
  });
  return { status: 200, body: resultList }    
}


//=================


exports = module.exports = {
  getListResource: getListResource,
  getSQLFromListResource: getSQLFromListResource,
  isPartOf: isPartOf
}