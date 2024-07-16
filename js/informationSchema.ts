/*
Utility function for reading the information schema
of the database. Creates a global cache, and assumes
the information schema does not change at runtime.

It returns a 2-dimensional associative array that
can be accessed like this :

var is = require('./informationSchema')(database, configuration, logverbose);
var type = is['/communities']['phone'];
if(type === 'text') {
  // do something.
}
*/
import _ from "lodash";

import { prepareSQL } from "./queryObject";
import * as common from "./common";
import { TInformationSchema, TSriConfig } from "./typeDefinitions";
import { IDatabase } from "pg-promise";

/**
 * Assumes that sriConfig.databaseConnectionParameters.schema is set to a single string !!!
 *
 */
async function getInformationSchema(
  db: IDatabase<unknown>,
  sriConfig: TSriConfig,
): Promise<TInformationSchema> {
  const tableNames = _.uniq(
    sriConfig.resources
      .map((mapping) => common.tableFromMapping(mapping))
      .filter((u) => u !== undefined),
  ) as Array<string>;
  const query = prepareSQL("information-schema");
  const { schema } = sriConfig.databaseConnectionParameters;
  let schemaParam = "public";
  if (Array.isArray(schema)) {
    // eslint-disable-next-line prefer-destructuring
    schemaParam = schema[0];
    // prefer-destructuring would make this kind of ugly
    // ([schemaParam] = schema);
  } else if (typeof schema === "function") {
    schemaParam = (await schema(db))?.toString() || schemaParam;
  } else if (schema) {
    schemaParam = schema;
  }

  if (tableNames.length === 0) {
    // avoid useless query (which will fail as well)
    return {};
  }

  query
    .sql(
      `SELECT c.table_name, c.column_name, c.data_type, e.data_type AS element_type from information_schema.columns c
          LEFT JOIN information_schema.element_types e
            ON ((c.table_catalog, c.table_schema, c.table_name, 'TABLE', c.dtd_identifier)
                      = (e.object_catalog, e.object_schema, e.object_name, e.object_type, e.collection_type_identifier))
          WHERE table_schema = `,
    )
    .param(schemaParam)
    .sql(` AND`)
    .valueIn("c.table_name", tableNames);

  const rowsByTable = _.groupBy(await common.pgExec(db, query), (r) => r.table_name);

  return Object.fromEntries(
    sriConfig.resources
      .filter((mapping) => !mapping.onlyCustom)
      .map((mapping) => {
        return [
          mapping.type,
          Object.fromEntries(
            rowsByTable[common.tableFromMapping(mapping)].map((c) => [
              c.column_name,
              { type: c.data_type, element_type: c.element_type },
            ]),
          ),
        ];
      }),
  );
}

export { getInformationSchema };
