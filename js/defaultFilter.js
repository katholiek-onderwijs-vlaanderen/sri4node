function analyseParameter(parameter) {
  'use strict';

  var key = parameter;
  var operator = null;
  var matches;

  if ((matches = key.match(/^(.*)(Greater(OrEqual)?|After|Less(OrEqual)?|Before|In|RegEx|Contains)$/)) !== null) {
    key = matches[1];
    operator = matches[2];
  }

  return {
    key: key,
    operator: operator
  };
}

function filterString(select, filter, value) {
  'use strict';
  var values;

  if (filter.operator === 'Greater') {
    select.sql(' AND LOWER(' + filter.key + ') > LOWER(\'' + value + '\')');
  } else if (filter.operator === 'GreaterOrEqual' || filter.operator === 'After') {
    select.sql(' AND LOWER(' + filter.key + ') >= LOWER(\'' + value + '\')');
  } else if (filter.operator === 'Less') {
    select.sql(' AND LOWER(' + filter.key + ') < LOWER(\'' + value + '\')');
  } else if (filter.operator === 'LessOrEqual' || filter.operator === 'Before') {
    select.sql(' AND LOWER(' + filter.key + ') <= LOWER(\'' + value + '\')');
  } else if (filter.operator === 'In') {
    values = value.split(',').map(function (v) {
      return v.toLowerCase();
    });
    select.sql(' AND LOWER(' + filter.key + ') IN (').array(values).sql(')');
  } else if (filter.operator === 'RegEx') {
    select.sql(' AND ' + filter.key + ' ~* ').param(value);
  } else if (filter.operator === 'Contains') {
    select.sql(' AND ' + filter.key + ' ILIKE \'%' + value + '%\'');
  } else {
    select.sql(' AND ' + filter.key + ' ILIKE ').param(value);
  }
}

function filterNumeric(select, filter, value) {
  'use strict';
  if (filter.operator === 'Greater') {
    select.sql(' AND ' + filter.key + ' > ').param(value);
  } else if (filter.operator === 'GreaterOrEqual' || filter.operator === 'After') {
    select.sql(' AND ' + filter.key + ' >= ').param(value);
  } else if (filter.operator === 'Less') {
    select.sql(' AND ' + filter.key + ' < ').param(value);
  } else if (filter.operator === 'LessOrEqual' || filter.operator === 'Before') {
    select.sql(' AND ' + filter.key + ' <= ').param(value);
  } else if (filter.operator === 'In') {
    select.sql(' AND ' + filter.key + ' IN (').array(value.split(',')).sql(')');
  } else {
    select.sql(' AND ' + filter.key + ' = ').param(value);
  }

}

function filterTimestamp(select, filter, value) {
  'use strict';
  if (filter.operator === 'Greater') {
    select.sql(' AND ' + filter.key + ' > ').param(value);
  } else if (filter.operator === 'GreaterOrEqual' || filter.operator === 'After') {
    select.sql(' AND ' + filter.key + ' >= ').param(value);
  } else if (filter.operator === 'Less') {
    select.sql(' AND ' + filter.key + ' < ').param(value);
  } else if (filter.operator === 'LessOrEqual' || filter.operator === 'Before') {
    select.sql(' AND ' + filter.key + ' <= ').param(value);
  } else if (filter.operator === 'In') {
    select.sql(' AND ' + filter.key + ' IN (').array(value.split(',')).sql(')');
  } else {
    select.sql(' AND ' + filter.key + ' = ').param(value);
  }
}

function filterArray(select, filter, value) {
  'use strict';
  var values = value.split(',');
  var i;

  for (i = 0; i < values.length; i++) {
    select.sql(' AND \'' + values[i] + '\' = ANY(' + filter.key + ')');
  }

  if (filter.operator !== 'Contains') {
    select.sql(' AND array_length(' + filter.key + ', 1) = ').param(values.length);
  }

}

function parseFilters(value, select, parameter, mapping) {

  'use strict';
  return function (informationSchema) {
    var filter;
    var field;
    var filterFn;

    // 1) Analyze parameter for postfixes, and determine the key of the resource mapping.
    filter = analyseParameter(parameter);

    // 2) Find data type on database from information schema;
    field = informationSchema[mapping.type][filter.key];

    // 3) Extend the sql query with the correct WHERE clause.
    if (field) {
      if (field.type.toLowerCase() === 'text') {
        filterFn = filterString;
      } else if (field.type.toLowerCase() === 'numeric') {
        filterFn = filterNumeric;
      } else if (field.type.toLowerCase().match(/^timestamp/)) {
        filterFn = filterTimestamp;
      } else if (field.type.toLowerCase() === 'array') {
        filterFn = filterArray;
      }

      if (filterFn) {
        filterFn(select, filter, value);
      }
    }

  };
}

exports = module.exports = function (value, select, parameter, database, mapping, configuration) { // eslint-disable-line
  'use strict';

  return require('./informationSchema.js')(database, configuration)
    .then(parseFilters(value, select, parameter, mapping));

};
