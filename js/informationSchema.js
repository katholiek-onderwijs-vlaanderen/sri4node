/*
Utility function for reeading the information schema
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

var qo = require('./queryObject.js');
var common = require('./common.js');
var cl = common.cl;
var pgExec = common.pgExec;
var cache;

exports = module.exports = function (database, configuration, logverbose) {
  'use strict';
  if (cache != null) {
    return cache;
  }

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  var q = qo.prepareSQL('information-schema');
  var tableNames = [];
  var i, type, tableName;

  for (i = 0; i < configuration.resources.length; i++) {
    type = configuration.resources[i].type;
    tableName = type.split('/')[1];
    tableNames.push(tableName);
  }
  debug(tableName);
  q.sql('select table_name, column_name, data_type from information_schema.columns where table_name in (')
    .array(tableNames).sql(')');
  debug(q);
/*
  pgExec(database, q).then(function (results) {
    debug(results);
  });
*/
  cache = {};
  return cache;
};
