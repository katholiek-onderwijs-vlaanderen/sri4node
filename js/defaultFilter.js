exports = module.exports = function (value, select, parameter, database, count, mapping) { // eslint-disable-line
  'use strict';
  return require('./informationSchema.js').then(function (informationSchema) {
    var key, dataType;
    // Implement a generic filter

    // 1) Analyze parameter for postfixes, and determine the key of the resource mapping.
    // key = ...

    // 2) Find data type on database from information schema;
    dataType = informationSchema[mapping.type][key];

    // 3) Extend the sql query with the correct WHERE clause.
    if (dataType === 'text') {
      select.sql(' AND ' + key + ' ...operator... ').param(value);
    }
  });
};
