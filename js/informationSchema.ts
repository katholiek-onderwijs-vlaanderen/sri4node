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
const _ = require('lodash');

const qo = require('./queryObject');
import * as common from './common';
import { SriConfig } from './typeDefinitions';

let cache: any = null;

/**
 * Assumes that sriConfig.databaseConnectionParameters.schema is set to a single string !!!
 */
export = module.exports = async function (db, sriConfig:SriConfig) {
  if (cache === null) {
    const tableNames = _.uniq(sriConfig.resources.map(mapping => common.tableFromMapping(mapping)));
    const query = qo.prepareSQL('information-schema');
    query.sql(`SELECT c.table_name, c.column_name, c.data_type, e.data_type AS element_type from information_schema.columns c
               LEFT JOIN information_schema.element_types e
                  ON ((c.table_catalog, c.table_schema, c.table_name, 'TABLE', c.dtd_identifier)
                           = (e.object_catalog, e.object_schema, e.object_name, e.object_type, e.collection_type_identifier))
               WHERE table_name in (`).array(tableNames).sql(') and table_schema = ').param(sriConfig.databaseConnectionParameters.schema);

    const rowsByTable = _.groupBy(await common.pgExec(db, query), r => r.table_name);

    cache = Object.fromEntries(
      sriConfig.resources
        .filter(mapping => !mapping.onlyCustom)
        .map(mapping => {
          return [
            mapping.type,
            Object.fromEntries(
              rowsByTable[common.tableFromMapping(mapping)]
                .map(c => [c.column_name, { type: c.data_type, element_type: c.element_type }]),
            )];
        }));
  }
  return cache;
};