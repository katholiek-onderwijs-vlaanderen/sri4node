import * as _ from 'lodash';
import * as pMap from 'p-map';
import * as pFilter from 'p-filter';
import * as url from 'url';
import {
  debug, sqlColumnNames, getCountResult,
  transformRowToObject, tableFromMapping, pgExec,
} from './common';
import { TResourceDefinition, SriError, TSriRequest } from './typeDefinitions';
import { prepareSQL } from './queryObject';

import { applyHooks } from './hooks';
import { executeExpansion } from './expand';
import * as queryUtils from './queryUtils';

// Constants
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 500;

// apply extra parameters on request URL for a list-resource to a select.
async function applyRequestParameters(mapping, query, urlparameters, tx, count) {
  const standardParameters = ['orderBy', 'descending', 'limit', 'keyOffset', 'expand', 'hrefs', 'modifiedSince', '$$includeCount', 'offset'];

  if (mapping.query) {
    await pMap(
      Object.keys(urlparameters),
      async (key) => {
        if (!standardParameters.includes(key)) {
          if (mapping.query[key] || mapping.query.defaultFilter) {
            // Execute the configured function that will apply this URL parameter
            // to the SELECT statement
            if (!mapping.query[key] && mapping.query.defaultFilter) {
              await mapping.query.defaultFilter(urlparameters[key], query, key, mapping, tx);
            } else {
              await mapping.query[key](urlparameters[key], query, key, tx, count, mapping, urlparameters);
            }
          } else {
            throw new SriError({ status: 404, errors: [{ code: 'unknown.query.parameter', parameter: key }] }); // this is small API change (previous: errors: [{code: 'invalid.query.parameter', parameter: key}])
          }
        } else if (key === 'hrefs' && urlparameters.hrefs) {
          // queryUtils.filterHrefs(urlparameters.hrefs, query, key, tx, count, mapping);
          queryUtils.filterHrefs(urlparameters.hrefs, query, mapping);
        } else if (key === 'modifiedSince') {
          // queryUtils.modifiedSince(urlparameters.modifiedSince, query, key, tx, count, mapping);
          queryUtils.modifiedSince(urlparameters.modifiedSince, query, mapping);
        }
      },
      { concurrency: 1 },
    );
  }
}

async function getSQLFromListResource(mapping, parameters, count, tx, query) {
  const table = tableFromMapping(mapping);

  let sql;
  let columns;
  if (parameters.expand && parameters.expand.toLowerCase() === 'none') {
    if (parameters.orderBy) {
      columns = parameters.orderBy
        .split(',')
        .map((v) => `"${v}"`)
        .join(',')
    } else {
      // this should become obsolete when we have a separate query parser that builds a fully deterministic parseTree
      // because
      columns = '"key","$$meta.created"';
    }
    // what if orderby is specified in a list query with expand=NONE?
  } else {
    columns = sqlColumnNames(
      mapping,
      parameters.expand && parameters.expand.toLowerCase() === 'summary',
    );
  }

  if (count) {
    if (parameters['$$meta.deleted'] === 'true') {
      sql = `select count(*) from "${table}" where "${table}"."$$meta.deleted" = true `;
    } else if (parameters['$$meta.deleted'] === 'any') {
      sql = `select count(*) from "${table}" where 1=1 `;
    } else {
      sql = `select count(*) from "${table}" where "${table}"."$$meta.deleted" = false `;
    }
    query.sql(sql);
  } else {
    if (parameters['$$meta.deleted'] === 'true') {
      sql = `select ${columns} from "`;
      sql += `${table}" where "${table}"."$$meta.deleted" = true `;
    } else if (parameters['$$meta.deleted'] === 'any') {
      sql = `select ${columns} from "`;
      sql += `${table}" where 1=1 `;
    } else {
      sql = `select ${columns} from "`;
      sql += `${table}" where "${table}"."$$meta.deleted" = false `;
    }
    query.sql(sql);
  }

  debug('trace', 'listResource - applying URL parameters to WHERE clause');
  await applyRequestParameters(mapping, query, parameters, tx, count);
}

const applyOrderAndPagingParameters = (query, queryParams, mapping, queryLimit, maxlimit, keyOffset, offset) => {
  // All list resources support orderBy, limit and offset.

  // Order parameters
  const { orderBy, descending } = queryParams;

  let orderKeys = ['$$meta.created', 'key']; // default

  if (orderBy !== undefined) {
    orderKeys = orderBy.split(',');
    const invalidOrderByKeys = orderKeys.filter((k) => (k !== '$$meta.created' && k !== '$$meta.modified' && !mapping.map[k]));
    if (invalidOrderByKeys.length !== 0) {
      throw new SriError({
        status: 400,
        errors: [
          {
            code: 'invalid.orderby.parameter',
            message: `Can not order by [${orderBy}]. Unknown properties: ${invalidOrderByKeys.join(', ')}.`,
          }],
      });
    }
  }

  // add paging to where clause

  if (keyOffset) {
    const keyValues = keyOffset.split(',');
    if (keyValues.length !== orderKeys.length) {
      throw new SriError({
        status: 400,
        errors: [
          {
            code: 'invalid.keyoffset',
            message: `Number of offset key values (${keyValues.length}) does not match number of order keys (${orderKeys.length}).`,
          }],
      });
    }

    const table = tableFromMapping(mapping);
    const orderKeyOp = (descending === 'true') ? '<' : '>';
    query.sql(` AND (${orderKeys.map((k) => `"${table}"."${k}"`).join()}) ${orderKeyOp} (`);

    orderKeys.forEach(
      (_k, idx) => {
        if (idx > 0) {
          query.sql(',');
        }
        query.param(keyValues[idx]);
      },
    );

    query.sql(')');
  }

  // add order parameter
  query.sql(` order by ${orderKeys.map((k) => `"${k}" ${(descending === 'true') ? 'desc' : 'asc'}`).join(',')}`);

  // add limit parameter
  const isGetAllExpandNone = (queryLimit === '*' && queryParams.expand !== undefined && queryParams.expand.toLowerCase() === 'none');
  if (!isGetAllExpandNone) {
    if (queryLimit > maxlimit || queryLimit === '*') {
      throw new SriError(
        {
          status: 409,
          errors: [
            {
              code: 'invalid.limit.parameter',
              type: 'ERROR',
              message: `The maximum allowed limit is ${maxlimit}`,
            },
          ],
        },
      );
    }
    // limit condition is always added except special case where the parameter limit=* and expand is NONE (#104)
    query.sql(' limit ').param(queryLimit);
  }

  if (offset) {
    if (keyOffset) {
      throw new SriError({
        status: 409,
        errors: [
          {
            code: 'offset.and.keyoffset.incompatible',
            type: 'ERROR',
            message: 'The parameters "offset" and "keyOffset" cannot be used together',
          }],
      });
    } else {
      query.sql(' offset ').param(offset);
    }
  }

  return orderKeys;
};

// sriRequest
const handleListQueryResult = (sriRequest, rows, count, mapping, queryLimit, orderKeys) => {
  const results:any[] = [];
  const { originalUrl } = sriRequest;
  const queryParams = sriRequest.query;

  const tableInformation = global.sri4node_configuration.informationSchema[mapping.type];

  // const elements = [];
  rows.forEach((currentrow) => {
    const element:any = {
      href: `${mapping.type}/${currentrow.key}`,
    };

    // full, or any set of expansion values that must
    // all start with "results.href" or "results.href.*" will result in inclusion
    // of the regular resources in the list resources.
    if (!queryParams.expand
      || (queryParams.expand.toLowerCase() === 'full'
        || queryParams.expand.toLowerCase() === 'summary'
        || queryParams.expand.indexOf('results') === 0)) {
      element.$$expanded = transformRowToObject(currentrow, mapping);
      element.$$expanded.$$meta.type = mapping.metaType;
    } else if (queryParams.expand && queryParams.expand.toLowerCase() === 'none') {
      // Intentionally left blank.
    } else if (queryParams.expand) {
      // Error expand must be either 'full','none' or start with 'href'
      const msg = `listResource - expand value unknown : ${queryParams.expand}`;
      debug('trace', msg);
      throw new SriError({
        status: 400,
        errors: [{
          code: 'parameter.value.unknown',
          msg: `Unknown value [${queryParams.expand}] for 'expand' parameter. The possible values are 'NONE', 'SUMMARY' and 'FULL'.`,
          parameter: 'expand',
          value: queryParams.expand,
          possibleValues: ['NONE', 'SUMMARY', 'FULL'],
        }],
      });
    }
    results.push(element);
  });

  const output:any = {
    $$meta: {
      schema: `${mapping.type}/schema`,
      docs: `${mapping.type}/docs`,
    },
    results,
  };

  if (count != null) {
    output.$$meta.count = count;
  }

  const addOrReplaceParameter = (url, parameter, value) => {
    if (url.indexOf(parameter) > 0) {
      return url.replace(new RegExp(`${parameter}[^&]*`), `${parameter}=${value}`);
    }
    return `${url + ((url.indexOf('?') > 0) ? '&' : '?') + parameter}=${value}`;
  };

  if (results.length === parseInt(queryLimit, 10) && results.length > 0) {
    const lastElement = queryParams.expand && queryParams.expand.toLowerCase() === 'none' ? rows[queryLimit - 1] : results[queryLimit - 1].$$expanded;
    const keyOffset = orderKeys
      .map((k) => {
        // !!! _.get supports a dotted notation path { 'my.key': 'value' } as well as { my: { key: 'value' } }
        const o = _.get(lastElement, k);
        if (tableInformation[k].type === 'timestamp with time zone') {
          return encodeURIComponent(o);
        } else if (o === null) {
          return null;
        }
        return o.toString();
      })
      .join(',');
    output.$$meta.next = addOrReplaceParameter(originalUrl, 'keyOffset', keyOffset);
  }

  return output;
};

async function getListResource(phaseSyncer, tx, sriRequest:TSriRequest, mapping:TResourceDefinition) {
  const queryParams = sriRequest.query;
  const { type } = mapping;

  const defaultlimit = mapping.defaultlimit || DEFAULT_LIMIT;
  const maxlimit = mapping.maxlimit || MAX_LIMIT;
  const queryLimit = queryParams.limit || defaultlimit;
  const keyOffset = queryParams.keyOffset || '';
  const { offset } = queryParams;

  await phaseSyncer.phase(); // step 0
  await phaseSyncer.phase(); // step 1
  await phaseSyncer.phase(); // step 2

  await applyHooks('before read',
    mapping.beforeRead || [],
    (f) => f(tx,
      sriRequest),
    sriRequest);

  await phaseSyncer.phase();

  debug('trace', `listResource - GET list resource starting${type}`);

  let count:any = null;
  let rows;
  let orderKeys;
  try {
    let includeCount = mapping.listResultDefaultIncludeCount;
    if (queryParams.$$includeCount !== undefined) {
      includeCount = (queryParams.$$includeCount === 'true');
    }
    if (includeCount) {
      const countquery = prepareSQL();
      await getSQLFromListResource(mapping, queryParams, true, tx, countquery);
      debug('trace', 'listResource - executing SELECT COUNT query on tx');
      count = await getCountResult(tx, countquery, sriRequest);
    }

    const query = prepareSQL();
    await getSQLFromListResource(mapping, queryParams, false, tx, query);
    orderKeys = applyOrderAndPagingParameters(
      query, queryParams, mapping, queryLimit, maxlimit, keyOffset, offset,
    );
    debug('trace', 'listResource - executing SELECT query on tx');
    rows = await pgExec(tx, query, sriRequest);
  } catch (error) {
    if (error.code === '42703') { // UNDEFINED COLUMN
      throw new SriError({ status: 409, errors: [{ code: 'invalid.query.parameter' }] });
    } else {
      throw error;
    }
  }

  sriRequest.containsDeleted = rows.some((r) => r['$$meta.deleted'] === true);

  const output = handleListQueryResult(sriRequest, rows, count, mapping, queryLimit, orderKeys);

  await phaseSyncer.phase();
  await phaseSyncer.phase();

  debug('trace', 'listResource - executing afterRead functions on results');

  await applyHooks('after read',
    mapping.afterRead || [],
    (f) => f(tx,
      sriRequest,
      output.results.map((e) => {
        if (e.$$expanded) {
          return {
            permalink: e.href,
            incoming: null,
            stored: e.$$expanded,
          };
        }
        return {
          permalink: e.href,
          incoming: null,
          stored: null,
        };
      })),
    sriRequest);

  await phaseSyncer.phase();

  debug('trace', `listResource - executing expansion : ${queryParams.expand}`);
  await executeExpansion(tx, sriRequest, output.results, mapping);

  return { status: 200, body: output };
}

/// ================

const matchUrl = (url, mapping) => {
  if (url.match(mapping.listResourceRegex) !== null) {
    return { type: 'list' };
  }
  const matchResult = url.match(mapping.singleResourceRegex);
  if (matchResult !== null) {
    const key = matchResult[1];
    return { type: 'single', key };
  }
  throw new SriError({ status: 400, errors: [{ code: 'unknown.resource.type', url }] });
};

// Check if a given raw url A is a subset of the given raw urls in list B

// POST /[resource]/isPartOf
// {
//  "a": { "href": [urlA] }
//  "b": { "hrefs": [ [urlB1], [urlB2], [urlB3] ] }
// }
// ==> [ [urlB2] ]  (all raw urls from list B for which url A is a subset)

async function isPartOf(phaseSyncer, tx, sriRequest, mapping) {
  await phaseSyncer.phase();
  await phaseSyncer.phase();
  await phaseSyncer.phase();
  await phaseSyncer.phase();
  await phaseSyncer.phase();

  if (sriRequest.body.a === undefined || sriRequest.body.a.href === undefined
       || sriRequest.body.b === undefined || sriRequest.body.b.hrefs === undefined) {
    throw new SriError({ status: 400, errors: [{ code: 'a.href.and.b.hrefs.needs.to.specified' }] });
  }
  if (Array.isArray(sriRequest.body.a.href)) {
    throw new SriError({ status: 400, errors: [{ code: 'a.href.must.be.single.value' }] });
  }
  if (!Array.isArray(sriRequest.body.b.hrefs)) {
    throw new SriError({ status: 400, errors: [{ code: 'b.hrefs.must.be.array' }] });
  }

  const urlA = sriRequest.body.a.href;
  const typeA = matchUrl(urlA, mapping);

  const resultList = await pFilter(sriRequest.body.b.hrefs, async (urlB:string) => {
    const typeB = matchUrl(urlB, mapping);

    if (typeB.type === 'single') {
      if (typeA.type === 'single') {
        return (typeA.key === typeB.key);
      }
      return false;
    }
    const { query: paramsB } = url.parse(urlB, true);
    const queryB = prepareSQL();
    try {
      await getSQLFromListResource(mapping, paramsB, false, tx, queryB);
    } catch (err) {
      throw new SriError({ status: 400, errors: [{ code: 'resource.b.raised.error', url: urlB, err }] });
    }
    const sqlB = queryB.text;
    const valuesB = queryB.params;

    const query = prepareSQL();
    if (typeA.type === 'single') {
      query.sql(`SELECT EXISTS ( SELECT key from (${sqlB}) as temp WHERE key='${typeA.key}' )  as result;`);
      query.params.push(...valuesB);
    } else {
      const { query: paramsA } = url.parse(urlA, true);
      const queryA = prepareSQL();
      try {
        await getSQLFromListResource(mapping, paramsA, false, tx, queryA);
      } catch (err) {
        throw new SriError({ status: 400, errors: [{ code: 'resource.a.raised.error', url: urlA, err }] });
      }
      const sqlA = queryA.text;
      const valuesA = queryA.params;

      query.sql(`SELECT NOT EXISTS ( SELECT key from (${sqlA}) as a WHERE NOT EXISTS (SELECT 1 FROM (${sqlB}) as b WHERE a.key = b.key)) as result;`);
      query.params.push(...valuesA);
      query.params.push(...valuesB);
    }
    const [{ result }] = await pgExec(tx, query, sriRequest);
    return result;
  });
  await phaseSyncer.phase();
  await phaseSyncer.phase();
  return { status: 200, body: resultList };
}

//= ================

export {
  getListResource,
  getSQLFromListResource,
  isPartOf,
};
