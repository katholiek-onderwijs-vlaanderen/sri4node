function analyseParameter(parameter) {
  'use strict';

  var key = parameter;
  var operator = null;
  var prefix = null;
  var postfix = null;
  var matches;

  var pattern = /^(.*?)(CaseSensitive)?(Greater(OrEqual)?|After|Less(OrEqual)?|Before|In|RegEx|Contains)?$/;

  if ((matches = key.match(pattern)) !== null) {
    key = matches[1];
    prefix = matches[2];
    operator = matches[3];
  }

  return {
    key: key,
    operator: operator,
    prefix: prefix,
    postfix: postfix
  };
}

function filterString(select, filter, value) {
  'use strict';
  var values;

  if (filter.operator === 'Greater') {
    if (filter.prefix === 'CaseSensitive') {
      select.sql(' AND ' + filter.key + ' > ').param(value);
    } else {
      select.sql(' AND LOWER(' + filter.key + ') > LOWER(\'' + value + '\')');
    }

  } else if (filter.operator === 'GreaterOrEqual' || filter.operator === 'After') {
    if (filter.prefix === 'CaseSensitive') {
      select.sql(' AND ' + filter.key + ' >= ').param(value);
    } else {
      select.sql(' AND LOWER(' + filter.key + ') >= LOWER(\'' + value + '\')');
    }

  } else if (filter.operator === 'Less') {
    if (filter.prefix === 'CaseSensitive') {
      select.sql(' AND ' + filter.key + ' < ').param(value);
    } else {
      select.sql(' AND LOWER(' + filter.key + ') < LOWER(\'' + value + '\')');
    }

  } else if (filter.operator === 'LessOrEqual' || filter.operator === 'Before') {
    if (filter.prefix === 'CaseSensitive') {
      select.sql(' AND ' + filter.key + ' <= ').param(value);
    } else {
      select.sql(' AND LOWER(' + filter.key + ') <= LOWER(\'' + value + '\')');
    }
  } else if (filter.operator === 'In') {
    values = value.split(',');
    if (filter.prefix === 'CaseSensitive') {
      select.sql(' AND ' + filter.key + ' IN (').array(values).sql(')');
    } else {
      values = values.map(function (v) {
        return v.toLowerCase();
      });
      select.sql(' AND LOWER(' + filter.key + ') IN (').array(values).sql(')');
    }

  } else if (filter.operator === 'RegEx') {
    if (filter.prefix === 'CaseSensitive') {
      select.sql(' AND ' + filter.key + ' ~ ').param(value);
    } else {
      select.sql(' AND ' + filter.key + ' ~* ').param(value);
    }

  } else if (filter.operator === 'Contains') {
    if (filter.prefix === 'CaseSensitive') {
      select.sql(' AND ' + filter.key + ' LIKE \'%' + value + '%\'');
    } else {
      select.sql(' AND ' + filter.key + ' ILIKE \'%' + value + '%\'');
    }

  } else if (filter.prefix === 'CaseSensitive') {
    select.sql(' AND ' + filter.key + ' LIKE ').param(value);
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
