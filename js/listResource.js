const _ = require('lodash');
const pMap = require('p-map'); 

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
  const standardParameters = ['orderBy', 'descending', 'limit', 'offset', 'expand', 'hrefs', 'modifiedSince'];

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


const applyOrderAndPagingParameters = (query, queryParams, mapping, queryLimit, maxlimit, offset) => {
  // All list resources support orderBy, limit and offset.

  // Order parameters
  let orderBy = queryParams.orderBy;
  const descending = queryParams.descending;

  if (orderBy) {
    valid = true;
    orders = orderBy.split(',');
    orderBy = '';
    for (o = 0; o < orders.length; o++) {
      order = orders[o];

      if (!mapping.map[order]) {
        if (order === '$$meta.created' || order === '$$meta.modified') {
          orders[o] = order;
        } else {
          valid = false;
          break;
        }
      }

      if (orderBy.length === 0) {
        orderBy = orders[o];
      } else {
        orderBy = orderBy + ',' + orders[o];
      }

    }
    if (valid) {
      query.sql(' order by "' + orders + '"');
      if (descending && descending === 'true') {
        query.sql(' desc ');
      } else {
        query.sql(' asc ');
      }
    } else {
      cl('Can not order by [' + orderBy + ']. One or more unknown properties. Ignoring orderBy.');
    }
  } else {
    query.sql(' order by "$$meta.created", "key"');
  }

  // Paging parameters

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
    query.sql(' offset ').param(offset);
  }
}


//sriRequest
const handleListQueryResult = (sriRequest, rows, count, mapping, queryLimit, offset) => {  
  const results = [];
  const originalUrl = sriRequest.originalUrl
  const queryParams = sriRequest.query

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
      count: count,
      schema: mapping.type + '/schema',
      docs: mapping.type + '/docs'
    },
    results: results
  };

  let newOffset = queryLimit * 1 + offset * 1;

  if (newOffset < count) {
    if (originalUrl.match(/offset/)) {
      output.$$meta.next = originalUrl.replace(/offset=(\d+)/, 'offset=' + newOffset);
    } else {
      output.$$meta.next = originalUrl + (originalUrl.match(/\?/) ? '&' : '?') +
        'offset=' + newOffset;
    }

  }

  if (offset > 0) {
    newOffset = offset - queryLimit;
    if (originalUrl.match(/offset/)) {
      output.$$meta.previous = originalUrl.replace(/offset=(\d+)/, newOffset > 0 ? 'offset=' + newOffset : '');
      output.$$meta.previous = output.$$meta.previous.replace(/[\?&]$/, '');
    } else {
      output.$$meta.previous = originalUrl;
      if (newOffset > 0) {
        output.$$meta.previous += (originalUrl.match(/\?/) ? '&' : '?') + 'offset=' + newOffset;
      }
    }
  }
  return output
}


async function getListResource(phaseSyncer, tx, sriRequest, mapping) {
  'use strict';
  const queryParams = sriRequest.query
  const type = sriRequest.sriType

  const defaultlimit = mapping.defaultlimit || DEFAULT_LIMIT;
  const maxlimit = mapping.maxlimit || MAX_LIMIT;
  const queryLimit = queryParams.limit || defaultlimit;
  const offset = queryParams.offset || 0;

  await phaseSyncer.phase()

  await hooks.applyHooks( 'before read', 
                          mapping.beforeRead, 
                          f => f( tx, 
                                  sriRequest,
                                )
                        )    

  await phaseSyncer.phase()

  debug('GET list resource ' + type);

  let count = 0
  try {
    const countquery = prepare();
    await getSQLFromListResource(mapping, queryParams, true, tx, countquery);
    debug('* executing SELECT COUNT query on tx');
    count = await getCountResult(tx, countquery) 
  } catch (error) { 
    if (error.code === '42703') { //UNDEFINED COLUMN
      throw new SriError({status: 409, errors: [{code: 'invalid.query.parameter'}]})
    } else {
      throw error
    }
  }
  
  const query = prepare();
  await getSQLFromListResource(mapping, queryParams, false, tx, query);
  applyOrderAndPagingParameters(query, queryParams, mapping, queryLimit, maxlimit, offset)
  debug('* executing SELECT query on tx');
  const rows = await pgExec(tx, query);
  
  debug('pgExec select ... OK');

  const containsDeleted = rows.some( r => r['$$meta.deleted'] === true )

  sriRequest.containsDeleted = { get: () => containsDeleted } 

  const output = handleListQueryResult(sriRequest, rows, count, mapping, queryLimit, offset)

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

  debug('* executing expansion : ' + queryParams.expand);
  await expand.executeExpansion(tx, sriRequest, output.results, mapping);

  return {status: 200, body: output}
}

exports = module.exports = {
  getListResource: getListResource,
  getSQLFromListResource: getSQLFromListResource
}