exports = module.exports = function (value, select, parameter, database, count, mapping, configuration) { // eslint-disable-line
  'use strict';

  return require('./informationSchema.js')(database, configuration).then(function (informationSchema) {
    var key, field, values, i;

    // 1) Analyze parameter for postfixes, and determine the key of the resource mapping.
    key = parameter;

    // 2) Find data type on database from information schema;
    field = informationSchema[mapping.type][key];

    // 3) Extend the sql query with the correct WHERE clause.

    if (field.type.toLowerCase() === 'text') {
      select.sql(' AND ' + key + ' ILIKE ').param(value);
    } else if (field.type.toLowerCase() === 'numeric') {
      select.sql(' AND ' + key + ' = ').param(value);
    } else if (field.type.toLowerCase().match(/^timestamp/)) {
      select.sql(' AND ' + key + ' = ').param(value);
    } else if (field.type.toLowerCase() === 'array') {
      values = value.split(',');

      for (i = 0; i < values.length; i++) {
        select.sql(' AND \'' + values[i] + '\' = ANY(' + key + ')');
      }
      select.sql(' AND array_length(' + key + ', 1) = ').param(values.length);
    }

  });
};
