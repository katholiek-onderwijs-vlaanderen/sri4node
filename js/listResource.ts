import _ from "lodash";
import pMap from "p-map";
import pFilter from "p-filter";
import url from "url";
import {
  debug,
  sqlColumnNames,
  getCountResult,
  transformRowToObject,
  tableFromMapping,
  pgExec,
} from "./common";
import {
  TResourceDefinitionInternal,
  SriError,
  TSriRequestExternal,
  TPreparedSql,
  TInformationSchema,
  TSriInternalUtils,
  TBeforeReadHook,
  TAfterReadHook,
} from "./typeDefinitions";
import { prepareSQL } from "./queryObject";

import { applyHooks } from "./hooks";
import { executeExpansion } from "./expand";
import * as queryUtils from "./queryUtils";
import { IDatabase } from "pg-promise";
import { PhaseSyncer } from "./phaseSyncedSettle";
import { IClient } from "pg-promise/typescript/pg-subset";

// Constants
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 500;

// apply extra parameters on request URL for a list-resource to a select.
async function applyRequestParameters(
  mapping: TResourceDefinitionInternal,
  query: TPreparedSql,
  urlparameters: URLSearchParams,
  tx: IDatabase<unknown>,
  doCount: boolean,
  informationSchema: TInformationSchema,
) {
  const standardParameters = [
    "orderBy",
    "descending",
    "limit",
    "keyOffset",
    "expand",
    "hrefs",
    "modifiedSince",
    "$$includeCount",
    "offset",
  ];

  if (mapping.query) {
    await pMap(
      urlparameters.keys(),
      async (key) => {
        const currentUrlParam = urlparameters.get(key);
        const keyAsString =
          typeof currentUrlParam === "string" ? currentUrlParam : (currentUrlParam || []).join(",");
        if (!standardParameters.includes(key)) {
          if (mapping.query?.[key] || mapping.query?.defaultFilter) {
            // Execute the configured function that will apply this URL parameter
            // to the SELECT statement
            if (!mapping.query[key] && mapping.query.defaultFilter) {
              await mapping.query.defaultFilter(
                keyAsString,
                query,
                key,
                tx,
                doCount,
                mapping,
                urlparameters,
                informationSchema,
              );
            } else {
              await mapping.query[key](
                keyAsString,
                query,
                key,
                tx,
                doCount,
                mapping,
                urlparameters,
                informationSchema,
              );
            }
          } else {
            throw new SriError({
              status: 404,
              errors: [{ code: "unknown.query.parameter", parameter: key }],
            }); // this is small API change (previous: errors: [{code: 'invalid.query.parameter', parameter: key}])
          }
        } else if (key === "hrefs" && urlparameters.get("hrefs")) {
          // queryUtils.filterHrefs(urlparameters.hrefs, query, key, tx, count, mapping);
          queryUtils.filterHrefs(keyAsString, query, key, tx, doCount, mapping, urlparameters);
        } else if (key === "modifiedSince") {
          queryUtils.modifiedSince(keyAsString, query, key, tx, doCount, mapping, urlparameters);
        }
      },
      { concurrency: 1 },
    );
  }
}

async function getSQLFromListResource(
  mapping: TResourceDefinitionInternal,
  parameters: url.URLSearchParams,
  doCount: boolean,
  tx: IDatabase<unknown>,
  query: TPreparedSql,
  informationSchema: TInformationSchema,
) {
  const table = tableFromMapping(mapping);

  let sql;
  let columns;
  if (parameters.get("expand")?.toLowerCase() === "none") {
    if (parameters.get("orderBy") !== null) {
      columns = parameters
        .get("orderBy")
        ?.split(",")
        .map((v) => `"${v}"`)
        .join(",");
    } else {
      // this should become obsolete when we have a separate query parser that builds a fully deterministic parseTree
      // because
      columns = '"key","$$meta.created"';
    }
    // what if orderby is specified in a list query with expand=NONE?
  } else {
    columns = sqlColumnNames(mapping, parameters.get("expand")?.toLowerCase() === "summary");
  }

  if (doCount) {
    if (parameters.get("$$meta.deleted") === "true") {
      sql = `select count(*) from "${table}" where "${table}"."$$meta.deleted" = true `;
    } else if (parameters.get("$$meta.deleted") === "any") {
      sql = `select count(*) from "${table}" where 1=1 `;
    } else {
      sql = `select count(*) from "${table}" where "${table}"."$$meta.deleted" = false `;
    }
    query.sql(sql);
  } else {
    if (parameters.get("$$meta.deleted") === "true") {
      sql = `select ${columns} from "`;
      sql += `${table}" where "${table}"."$$meta.deleted" = true `;
    } else if (parameters.get("$$meta.deleted") === "any") {
      sql = `select ${columns} from "`;
      sql += `${table}" where 1=1 `;
    } else {
      sql = `select ${columns} from "`;
      sql += `${table}" where "${table}"."$$meta.deleted" = false `;
    }
    query.sql(sql);
  }

  debug("trace", "listResource - applying URL parameters to WHERE clause");
  await applyRequestParameters(mapping, query, parameters, tx, doCount, informationSchema);
}

const applyOrderAndPagingParameters = (
  query,
  queryParams: url.URLSearchParams,
  mapping: TResourceDefinitionInternal,
  queryLimit,
  maxlimit,
  keyOffset,
  offset,
) => {
  // All list resources support orderBy, limit and offset.

  // Order parameters
  const orderBy = queryParams.get("orderBy");
  const descending = queryParams.get("descending");

  let orderKeys = ["$$meta.created", "key"]; // default

  if (orderBy) {
    orderKeys = (orderBy as string).split(",");
    const invalidOrderByKeys = orderKeys.filter(
      (k) => k !== "$$meta.created" && k !== "$$meta.modified" && !mapping.map?.[k],
    );
    if (invalidOrderByKeys.length !== 0) {
      throw new SriError({
        status: 400,
        errors: [
          {
            code: "invalid.orderby.parameter",
            message: `Can not order by [${orderBy}]. Unknown properties: ${invalidOrderByKeys.join(
              ", ",
            )}.`,
          },
        ],
      });
    }
  }

  // add paging to where clause

  if (keyOffset) {
    const keyValues = keyOffset.split(",").map((o) => decodeURIComponent(o));
    if (keyValues.length !== orderKeys.length) {
      throw new SriError({
        status: 400,
        errors: [
          {
            code: "invalid.keyoffset",
            message: `Number of offset key values (${keyValues.length}) does not match number of order keys (${orderKeys.length}).`,
          },
        ],
      });
    }

    const table = tableFromMapping(mapping);
    const orderKeyOp = descending === "true" ? "<" : ">";
    query.sql(` AND (${orderKeys.map((k) => `"${table}"."${k}"`).join()}) ${orderKeyOp} (`);

    orderKeys.forEach((_k, idx) => {
      if (idx > 0) {
        query.sql(",");
      }
      query.param(keyValues[idx]);
    });

    query.sql(")");
  }

  // add order parameter
  query.sql(
    ` order by ${orderKeys
      .map((k) => `"${k}" ${descending === "true" ? "desc" : "asc"}`)
      .join(",")}`,
  );

  // add limit parameter
  const isGetAllExpandNone =
    queryLimit === "*" && queryParams.get("expand")?.toLowerCase() === "none";
  if (!isGetAllExpandNone) {
    if (queryLimit > maxlimit || queryLimit === "*") {
      throw new SriError({
        status: 409,
        errors: [
          {
            code: "invalid.limit.parameter",
            type: "ERROR",
            message: `The maximum allowed limit is ${maxlimit}`,
          },
        ],
      });
    }
    // limit condition is always added except special case where the parameter limit=* and expand is NONE (#104)
    query.sql(" limit ").param(queryLimit);
  }

  if (offset) {
    if (keyOffset) {
      throw new SriError({
        status: 409,
        errors: [
          {
            code: "offset.and.keyoffset.incompatible",
            type: "ERROR",
            message: 'The parameters "offset" and "keyOffset" cannot be used together',
          },
        ],
      });
    } else {
      query.sql(" offset ").param(offset);
    }
  }

  return orderKeys;
};

// sriRequest
const handleListQueryResult = (
  sriRequest: TSriRequestExternal,
  rows: Array<Record<string, unknown>>,
  count: number,
  mapping: TResourceDefinitionInternal,
  queryLimit: string | number,
  orderKeys: Array<string>,
  theInformationSchema: TInformationSchema,
) => {
  const results: any[] = [];
  const { originalUrl } = sriRequest;
  const queryParams = sriRequest.query;

  const tableInformation = theInformationSchema[mapping.type];

  const queryLimitInt = parseInt(queryLimit as string, 10);

  // const elements = [];
  rows.forEach((currentrow) => {
    const element: any = {
      href: `${mapping.type}/${currentrow.key}`,
    };

    // full, or any set of expansion values that must
    // all start with "results.href" or "results.href.*" will result in inclusion
    // of the regular resources in the list resources.
    if (
      !queryParams.get("expand") ||
      ["full", "summary"].includes(queryParams.get("expand")?.toLowerCase() ?? "") ||
      queryParams.get("expand")?.indexOf("results") === 0
    ) {
      element.$$expanded = transformRowToObject(currentrow, mapping);
      element.$$expanded.$$meta.type = mapping.metaType;
    } else if (
      queryParams.get("expand") &&
      typeof queryParams.get("expand") === "string" &&
      queryParams.get("expand")?.toLowerCase() === "none"
    ) {
      // Intentionally left blank.
    } else if (queryParams.get("expand")) {
      // Error expand must be either 'full','none' or start with 'href'
      const msg = `listResource - expand value unknown : ${queryParams.get("expand")}`;
      debug("trace", msg);
      throw new SriError({
        status: 400,
        errors: [
          {
            code: "parameter.value.unknown",
            msg: `Unknown value [${queryParams.get("expand")}] for 'expand' parameter. The possible values are 'NONE', 'SUMMARY' and 'FULL'.`,
            parameter: "expand",
            value: queryParams.get("expand"),
            possibleValues: ["NONE", "SUMMARY", "FULL"],
          },
        ],
      });
    }
    results.push(element);
  });

  const output: any = {
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
      return url.replace(
        new RegExp(`${parameter}[^&]*`),
        `${parameter}=${encodeURIComponent(value)}`,
      );
    }
    return `${url + (url.indexOf("?") > 0 ? "&" : "?") + parameter}=${encodeURIComponent(value)}`;
  };

  if (results.length === queryLimitInt && results.length > 0) {
    const lastElement =
      queryParams.get("expand") && (queryParams.get("expand") as string).toLowerCase() === "none"
        ? rows[queryLimitInt - 1]
        : results[queryLimitInt - 1].$$expanded;
    const keyOffset = orderKeys
      .map((k) => {
        // !!! _.get supports a dotted notation path { 'my.key': 'value' } as well as { my: { key: 'value' } }
        const o = _.get(lastElement, k);
        if (tableInformation[k].type === "timestamp with time zone") {
          return encodeURIComponent(o);
        } else if (o === null) {
          return null;
        }
        return encodeURIComponent(o.toString());
      })
      .join(",");
    output.$$meta.next = addOrReplaceParameter(originalUrl, "keyOffset", keyOffset);
  }

  return output;
};

async function getListResource(
  phaseSyncer: PhaseSyncer,
  tx: IDatabase<unknown, IClient>,
  sriRequest: TSriRequestExternal,
  mapping: TResourceDefinitionInternal,
  sriInternalUtils: TSriInternalUtils,
  informationSchema: TInformationSchema,
  resources: Array<TResourceDefinitionInternal>,
) {
  const queryParams = sriRequest.query;
  const { type } = mapping;

  const defaultlimit = mapping.defaultlimit || DEFAULT_LIMIT;
  const maxlimit = mapping.maxlimit || MAX_LIMIT;
  const queryLimit = queryParams.get("limit") || defaultlimit;
  const keyOffset = queryParams.get("keyOffset") || "";
  const offset = queryParams.get("offset") || 0;

  await phaseSyncer.phase(); // step 0
  await phaseSyncer.phase(); // step 1
  await phaseSyncer.phase(); // step 2

  await applyHooks<TBeforeReadHook>(
    "before read",
    mapping.beforeRead || [],
    (f) => f(tx, sriRequest, sriInternalUtils),
    sriRequest,
  );

  await phaseSyncer.phase();

  debug("trace", `listResource - GET list resource starting${type}`);

  let count: any = null;
  let rows;
  let orderKeys;
  try {
    let includeCount = mapping.listResultDefaultIncludeCount;
    if (queryParams.get("$$includeCount") !== null) {
      includeCount = queryParams.get("$$includeCount") === "true";
    }
    if (includeCount) {
      const countquery = prepareSQL();
      await getSQLFromListResource(mapping, queryParams, true, tx, countquery, informationSchema);
      debug("trace", "listResource - executing SELECT COUNT query on tx");
      count = await getCountResult(tx, countquery, sriRequest);
    }

    const query = prepareSQL();
    await getSQLFromListResource(mapping, queryParams, false, tx, query, informationSchema);
    orderKeys = applyOrderAndPagingParameters(
      query,
      queryParams,
      mapping,
      queryLimit,
      maxlimit,
      keyOffset,
      offset,
    );
    debug("trace", "listResource - executing SELECT query on tx");
    rows = await pgExec(tx, query, sriRequest);
  } catch (error) {
    if (error.code === "42703") {
      // UNDEFINED COLUMN
      throw new SriError({ status: 409, errors: [{ code: "invalid.query.parameter" }] });
    } else {
      throw error;
    }
  }

  sriRequest.containsDeleted = rows.some((r) => r["$$meta.deleted"] === true);

  const output = handleListQueryResult(
    sriRequest,
    rows,
    count,
    mapping,
    queryLimit as number,
    orderKeys,
    informationSchema,
  );

  await phaseSyncer.phase();
  await phaseSyncer.phase();

  debug("trace", "listResource - executing afterRead functions on results");

  await applyHooks<TAfterReadHook>(
    "after read",
    mapping.afterRead || [],
    (f) =>
      f(
        tx,
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
        }),
        sriInternalUtils,
        resources,
      ),
    sriRequest,
  );

  await phaseSyncer.phase();

  debug("trace", `listResource - executing expansion : ${queryParams.get("expand")}`);
  await executeExpansion(tx, sriRequest, output.results, mapping, resources, sriInternalUtils);

  return { status: 200, body: output };
}

/// ================

const matchUrl = (url, mapping) => {
  if (url.match(mapping.listResourceRegex) !== null) {
    return { type: "list" };
  }
  const matchResult = url.match(mapping.singleResourceRegex);
  if (matchResult !== null) {
    const key = matchResult[1];
    return { type: "single", key };
  }
  throw new SriError({ status: 400, errors: [{ code: "unknown.resource.type", url }] });
};

// Check if a given raw url A is a subset of the given raw urls in list B

// POST /[resource]/isPartOf
// {
//  "a": { "href": [urlA] }
//  "b": { "hrefs": [ [urlB1], [urlB2], [urlB3] ] }
// }
// ==> [ [urlB2] ]  (all raw urls from list B for which url A is a subset)

async function isPartOf(
  phaseSyncer: PhaseSyncer,
  tx: IDatabase<unknown, IClient>,
  sriRequest: TSriRequestExternal,
  mapping: TResourceDefinitionInternal,
  _sriInternalUtils: TSriInternalUtils,
  informationSchema: TInformationSchema,
) {
  await phaseSyncer.phase();
  await phaseSyncer.phase();
  await phaseSyncer.phase();
  await phaseSyncer.phase();
  await phaseSyncer.phase();

  if (
    sriRequest.body.a === undefined ||
    sriRequest.body.a.href === undefined ||
    sriRequest.body.b === undefined ||
    sriRequest.body.b.hrefs === undefined
  ) {
    throw new SriError({
      status: 400,
      errors: [{ code: "a.href.and.b.hrefs.needs.to.specified" }],
    });
  }
  if (Array.isArray(sriRequest.body.a.href)) {
    throw new SriError({ status: 400, errors: [{ code: "a.href.must.be.single.value" }] });
  }
  if (!Array.isArray(sriRequest.body.b.hrefs)) {
    throw new SriError({ status: 400, errors: [{ code: "b.hrefs.must.be.array" }] });
  }

  const urlA = sriRequest.body.a.href;
  const typeA = matchUrl(urlA, mapping);

  const resultList = await pFilter(sriRequest.body.b.hrefs, async (urlB: string) => {
    const typeB = matchUrl(urlB, mapping);

    if (typeB.type === "single") {
      if (typeA.type === "single") {
        return typeA.key === typeB.key;
      }
      return false;
    }
    const paramsB = new URL(urlB, "https://domain.com").searchParams; //url.parse(urlB, true);
    const queryB = prepareSQL();
    try {
      await getSQLFromListResource(mapping, paramsB, false, tx, queryB, informationSchema);
    } catch (err) {
      throw new SriError({
        status: 400,
        errors: [{ code: "resource.b.raised.error", url: urlB, err }],
      });
    }
    const sqlB = queryB.text;
    const valuesB = queryB.params;

    const query = prepareSQL();
    if (typeA.type === "single") {
      query.sql(
        `SELECT EXISTS ( SELECT key from (${sqlB}) as temp WHERE key='${typeA.key}' )  as result;`,
      );
      query.params.push(...valuesB);
    } else {
      const paramsA = new URL(urlA, "https://domain.com").searchParams;
      const queryA = prepareSQL();
      try {
        await getSQLFromListResource(mapping, paramsA, false, tx, queryA, informationSchema);
      } catch (err) {
        throw new SriError({
          status: 400,
          errors: [{ code: "resource.a.raised.error", url: urlA, err }],
        });
      }
      const sqlA = queryA.text;
      const valuesA = queryA.params;

      query.sql(
        `SELECT NOT EXISTS ( SELECT key from (${sqlA}) as a WHERE NOT EXISTS (SELECT 1 FROM (${sqlB}) as b WHERE a.key = b.key)) as result;`,
      );
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

export { getListResource, getSQLFromListResource, isPartOf };
