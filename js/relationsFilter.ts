import _ from "lodash";
import { IDatabase } from "pg-promise";
import * as common from "./common";
import { TPreparedSql, TResourceDefinitionInternal } from "./typeDefinitions";

function fromTypesFilter(
  value: string,
  select: TPreparedSql,
  _key: string,
  _database: IDatabase<unknown>,
  _doCount: boolean,
  mapping: TResourceDefinitionInternal,
  _urlParameters: URLSearchParams,
) {
  let sql;
  let fromCondition;
  let whereCondition;
  let fromTable;
  let types;

  if (value && mapping.map?.from?.references) {
    fromCondition = select.text.split(" from")[1];
    whereCondition = fromCondition.split("where")[1];
    fromCondition = fromCondition.split("where")[0];

    const table = common.tableFromMapping(mapping);
    types = value.split(",").join("','");
    fromTable =
      mapping.map.from.references.split("/")[mapping.map.from.references.split("/").length - 1];

    sql =
      select.text.indexOf("count") !== -1
        ? `select count(distinct ${table}.*)`
        : `select distinct ${table}.*`;
    sql += ` from ${fromCondition} JOIN ${fromTable} c on c.key = ${table}.from `;
    sql += ` where ${whereCondition}`;
    sql += ` AND c.type in ('${types}') AND c."$$meta.deleted" = false `;

    select.text = sql;
  }
}

function toTypesFilter(
  value: string,
  select: TPreparedSql,
  _key: string,
  _database: IDatabase<unknown>,
  _doCount: boolean,
  mapping: TResourceDefinitionInternal,
  _urlParameters: URLSearchParams,
) {
  let sql;
  let fromCondition;
  let whereCondition;
  let toTable: string;
  let types: string;

  if (value && mapping.map?.to?.references) {
    fromCondition = select.text.split(" from")[1];
    whereCondition = fromCondition.split("where")[1];
    fromCondition = fromCondition.split("where")[0];

    const table = common.tableFromMapping(mapping);
    types = value.split(",").join("','");
    toTable = mapping.map.to.references.split("/")[mapping.map.to.references.split("/").length - 1];

    sql =
      select.text.indexOf("count") !== -1
        ? `select count(distinct ${table}.*)`
        : `select distinct ${table}.*`;
    sql += ` FROM ${fromCondition} JOIN ${toTable} c2 on c2.key = ${table}.to `;
    sql += ` where ${whereCondition}`;
    sql += ` AND c2.type in ('${types}') AND c2."$$meta.deleted" = false `;

    select.text = sql;
  }
}

function fromsFilter(
  value: string,
  select: TPreparedSql,
  _key: string,
  _database: IDatabase<unknown>,
  _doCount: boolean,
  mapping: TResourceDefinitionInternal,
  _urlParameters: URLSearchParams,
) {
  if (value) {
    const table = common.tableFromMapping(mapping);

    const froms = value.split(",").map((val) => val.split("/")[val.split("/").length - 1]);

    select.sql(` AND ${table}.from in (`).array(froms).sql(")");
  }
}

function tosFilter(
  value: string,
  select: TPreparedSql,
  _key: string,
  _database: IDatabase<unknown>,
  _doCount: boolean,
  mapping: TResourceDefinitionInternal,
  _urlParameters: URLSearchParams,
) {
  if (value) {
    const table = common.tableFromMapping(mapping);

    const tos = value.split(",").map((val) => val.split("/")[val.split("/").length - 1]);

    select.sql(` AND ${table}.to in (`).array(tos).sql(")");
  }
}

export {
  fromTypesFilter as fromTypes,
  toTypesFilter as toTypes,
  tosFilter as tos,
  fromsFilter as froms,
};
