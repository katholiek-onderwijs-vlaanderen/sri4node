const configuration = global.configuration  
const _ = require('lodash')

const expand = require('./expand.js');
const { typeToConfig, typeToMapping, debug, cl, sqlColumnNames, getCountResult, typeFromUrl,
        mapColumnsToObject, executeOnFunctions, tableFromMapping, pgExec, SriError } = require('./common.js');
var queryobject = require('./queryObject.js');
const prepare = queryobject.prepareSQL; 


// Constants
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 500;


// apply extra parameters on request URL for a list-resource to a select.
function applyRequestParameters(mapping, query, urlparameters, database, count) {
  'use strict';
  var standardParameters = ['orderBy', 'descending', 'limit', 'offset', 'expand', 'hrefs', 'modifiedSince'];

  if (mapping.query) {
    const reqParamsects = _.keys(urlparameters)
            .forEach( (key) => {
                if (!standardParameters.includes(key)) {
                  if (mapping.query[key] || mapping.query.defaultFilter) {
                    // Execute the configured function that will apply this URL parameter
                    // to the SELECT statement
                    if (!mapping.query[key] && mapping.query.defaultFilter) { // eslint-disable-line
                      mapping.query.defaultFilter(urlparameters[key], query, key, mapping, database, configuration)
                    } else {
                      mapping.query[key](urlparameters[key], query, key, database, count, mapping)
                    }
                  } else {
                    throw new SriError(404, 'unknown.query.parameter', key) // this is small API change (previous: errors: [{code: 'invalid.query.parameter', parameter: key}])
                  }          
                } else if (key === 'hrefs' && urlparameters.hrefs) {
                  queryUtils.filterHrefs(urlparameters.hrefs, query, key, database, count, mapping)
                } else if (key === 'modifiedSince') {
                  queryUtils.modifiedSince(urlparameters.modifiedSince, query, key, database, count, mapping)
                }
            })
  }
}

function getSQLFromListResource(type, parameters, count, database, query) {
  'use strict';

  const mapping = typeToConfig(global.configuration.resources)[type]
  const table = tableFromMapping(mapping)

  var sql;
  var columns;

  if (parameters.expand && parameters.expand.toLowerCase() === 'none') {
    columns = '"key"';
  } else {
    columns = sqlColumnNames(mapping);
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
  applyRequestParameters(mapping, query, parameters, database, count)

}


const applyOrderAndPagingParameters = (query, reqParams, mapping, queryLimit, maxlimit, offset) => {
  // All list resources support orderBy, limit and offset.

  // Order parameters
  const orderBy = reqParams.orderBy;
  const descending = reqParams.descending;

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

  if (queryLimit > maxlimit || (queryLimit === '*' && reqParams.expand !== 'NONE')) {
    throw new SriHttpObject(409, 'ERROR', 
        {
          code: 'invalid.limit.parameter',
          type: 'ERROR',
          message: 'The maximum allowed limit is ' + maxlimit
        })
  }

  if (!(queryLimit === '*' && reqParams.expand === 'NONE')) {
    // limit condition is always added except special case where the paremeter limit=* and expand is NONE (#104)
    query.sql(' limit ').param(queryLimit);
  }

  if (offset) {
    query.sql(' offset ').param(offset);
  }
}


const handleListQueryResult = (rows, count, mapping, reqParams, originalUrl, queryLimit, offset) => {
  var results = [];
  var row, currentrow;
  var element, msg;

  const elements = [];
  rows.forEach( (currentrow) => {
    element = {
      href: mapping.type + '/' + currentrow.key
    };

    // full, or any set of expansion values that must
    // all start with "results.href" or "results.href.*" will result in inclusion
    // of the regular resources in the list resources.
    if (!reqParams.expand ||
      (reqParams.expand.toLowerCase() === 'full' || reqParams.expand.indexOf('results') === 0)) {
      element.$$expanded = {
        $$meta: {
          permalink: mapping.type + '/' + currentrow.key
        }
      };
      if (currentrow['$$meta.deleted']) {
        element.$$expanded.$$meta.deleted = true;
      }
      element.$$expanded.$$meta.created = currentrow['$$meta.created'];
      element.$$expanded.$$meta.modified = currentrow['$$meta.modified'];
      mapColumnsToObject(global.configuration.resources, mapping, currentrow, element.$$expanded);
      executeOnFunctions(global.configuration.resources, mapping, 'onread', element.$$expanded);
      elements.push(element.$$expanded);
    } else if (reqParams.expand && reqParams.expand.toLowerCase() === 'none') {
      // Intentionally left blank.
    } else if (reqParams.expand) {
      // Error expand must be either 'full','none' or start with 'href'
      msg = 'expand value unknown : ' + reqParams.expand;
      debug(msg);
      throw new SriError(400, [{ code: 'parameter.value.unknown', 
                                 msg: `Unknown value [${reqParams.expand}] for 'expand' parameter. The possible values are 'NONE', 'SUMMARY' and 'FULL'.`,
                                 parameter: "expand",
                                 value: reqParams.expand,
                                 possibleValues: [ 'NONE', 'SUMMARY', 'FULL' ]
                               }])      
    }
    results.push(element);
  })

  output = {
    $$meta: {
      count: count,
      schema: mapping.type + '/schema',
      docs: mapping.type + '/docs'
    },
    results: results
  };

  var newOffset = queryLimit * 1 + offset * 1;

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


async function getListResource(db, me, reqUrl, reqParams, reqBody) {
  'use strict';
  const type = '/' + _.last(reqUrl.replace(/\/$/, '').split('?')[0].split('/'))
console.log('TYPE')
console.log(type)  
  const mapping = typeToConfig(global.configuration.resources)[type];

  const defaultlimit = mapping.defaultlimit || DEFAULT_LIMIT;
  const maxlimit = mapping.maxlimit || MAX_LIMIT;
  const queryLimit = reqParams.limit || defaultlimit;
  const offset = reqParams.offset || 0;

  debug('GET list resource ' + type);

  const countquery = prepare();
  getSQLFromListResource(type, reqParams, true, db, countquery);
  debug('* executing SELECT COUNT query on database');
  const count = await getCountResult(db, countquery) 
  
  const query = prepare();
  getSQLFromListResource(type, reqParams, false, db, query);
  applyOrderAndPagingParameters(query, reqParams, mapping, queryLimit, maxlimit, offset)
  debug('* executing SELECT query on database');
  const rows = await pgExec(db, query);
  
  debug('pgExec select ... OK');
  debug(rows);

  var output
  if (mapping.handlelistqueryresult) {
    output = await mapping.handlelistqueryresult(rows)
  } else {
    output = handleListQueryResult(rows, count, mapping, reqParams, reqUrl, queryLimit, offset)
    debug('* executing expansion : ' + reqParams.expand);
    await expand.executeExpansion(db, output.results, mapping, global.configuration.resources, 
                                  reqParams.expand, me, reqUrl);
  }

  debug('* sending response to client :');
  debug(output);

  return {status: 200, body: output}
}

exports = module.exports = {
  getListResource: getListResource
}