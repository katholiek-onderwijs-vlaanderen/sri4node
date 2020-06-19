/*
Utility function for reading the information schema
of the database. Creates a global cache, and assumes
the information schema does not change at runtime.

It returns a 2-dimensional associative array that
can be accessed like this :

var is = require('./informationSchema.js')(database, configuration, logverbose);
var type = is['/communities']['phone'];
if(type === 'text') {
  // do something.
}
*/
const _ = require('lodash');

var qo = require('./queryObject.js');
var common = require('./common.js');
//var cl = common.cl;
var pgExec = common.pgExec;
var cache = null;

exports = module.exports = async function (db, configuration) {
  'use strict';
  var q, tableNames;
  var i, type, table, tableName, row, typeCache, columnCache;

  if (cache !== null) {
    return cache;
  } else {
    q = qo.prepareSQL('information-schema');
    tableNames = [];

    for (i = 0; i < configuration.resources.length; i++) {
      type = configuration.resources[i].type;
      table = configuration.resources[i].table;
      tableName = table ? table : type.split('/')[type.split('/').length - 1];
      tableNames.push(tableName);
    }
    tableNames = _.uniq(tableNames);
    q.sql('select table_name, column_name, data_type from information_schema.columns where table_name in (')
      .array(tableNames).sql(') and table_schema = ').param(process.env.POSTGRES_SCHEMA);
    const rows = await pgExec(db, q, true)
    cache = {};
    for (i = 0; i < rows.length; i++) {
      row = rows[i];

      if (!cache['/' + row.table_name]) {
        cache['/' + row.table_name] = {};
      }
      typeCache = cache['/' + row.table_name];

      if (!typeCache[row.column_name]) {
        typeCache[row.column_name] = {};
      }
      columnCache = typeCache[row.column_name];

      // We may add extra fields like precision, etc.. in the future.
      columnCache.type = row.data_type;
    }
    return cache
  }
};
