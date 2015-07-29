function analyseParameter(parameter) {
  'use strict';

  var key = parameter;
  var operator = null;
  var prefix = null;
  var postfix = null;
  var matches;

  var pattern = /^(.*?)(CaseSensitive)?(Not)?(Greater(OrEqual)?|After|Less(OrEqual)?|Before|In|RegEx|Contains)?$/;

  if ((matches = key.match(pattern)) !== null) {
    key = matches[1];
    prefix = matches[2];
    postfix = matches[3];
    operator = matches[4];
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
      if (filter.postfix === 'Not') {
        select.sql(' AND ' + filter.key + ' < ').param(value);
      } else {
        select.sql(' AND ' + filter.key + ' > ').param(value);
      }
    } else if (filter.postfix === 'Not') {
      select.sql(' AND LOWER(' + filter.key + ') < LOWER(\'' + value + '\')');
    } else {
      select.sql(' AND LOWER(' + filter.key + ') > LOWER(\'' + value + '\')');
    }
  } else if (filter.operator === 'GreaterOrEqual' || filter.operator === 'After') {
    if (filter.prefix === 'CaseSensitive') {
      if (filter.postfix === 'Not') {
        select.sql(' AND ' + filter.key + ' <= ').param(value);
      } else {
        select.sql(' AND ' + filter.key + ' >= ').param(value);
      }
    } else if (filter.postfix === 'Not') {
      select.sql(' AND LOWER(' + filter.key + ') <= LOWER(\'' + value + '\')');
    } else {
      select.sql(' AND LOWER(' + filter.key + ') >= LOWER(\'' + value + '\')');
    }
  } else if (filter.operator === 'Less') {
    if (filter.prefix === 'CaseSensitive') {
      if (filter.postfix === 'Not') {
        select.sql(' AND ' + filter.key + ' > ').param(value);
      } else {
        select.sql(' AND ' + filter.key + ' < ').param(value);
      }
    } else if (filter.postfix === 'Not') {
      select.sql(' AND LOWER(' + filter.key + ') > LOWER(\'' + value + '\')');
    } else {
      select.sql(' AND LOWER(' + filter.key + ') < LOWER(\'' + value + '\')');
    }
  } else if (filter.operator === 'LessOrEqual' || filter.operator === 'Before') {
    if (filter.prefix === 'CaseSensitive') {
      if (filter.postfix === 'Not') {
        select.sql(' AND ' + filter.key + ' >= ').param(value);
      } else {
        select.sql(' AND ' + filter.key + ' <= ').param(value);
      }
    } else if (filter.postfix === 'Not') {
      select.sql(' AND LOWER(' + filter.key + ') >= LOWER(\'' + value + '\')');
    } else {
      select.sql(' AND LOWER(' + filter.key + ') <= LOWER(\'' + value + '\')');
    }
  } else if (filter.operator === 'In') {
    values = value.split(',');
    if (filter.prefix === 'CaseSensitive') {
      if (filter.postfix === 'Not') {
        select.sql(' AND ' + filter.key + ' NOT IN (').array(values).sql(')');
      } else {
        select.sql(' AND ' + filter.key + ' IN (').array(values).sql(')');
      }
    } else {
      values = values.map(function (v) {
        return v.toLowerCase();
      });
      if (filter.postfix === 'Not') {
        select.sql(' AND LOWER(' + filter.key + ') NOT IN (').array(values).sql(')');
      } else {
        select.sql(' AND LOWER(' + filter.key + ') IN (').array(values).sql(')');
      }

    }
  } else if (filter.operator === 'RegEx') {
    if (filter.prefix === 'CaseSensitive') {
      if (filter.postfix === 'Not') {
        select.sql(' AND ' + filter.key + ' !~ ').param(value);
      } else {
        select.sql(' AND ' + filter.key + ' ~ ').param(value);
      }

    } else if (filter.postfix === 'Not') {
      select.sql(' AND ' + filter.key + ' !~* ').param(value);
    } else {
      select.sql(' AND ' + filter.key + ' ~* ').param(value);
    }
  } else if (filter.operator === 'Contains') {
    if (filter.prefix === 'CaseSensitive') {
      if (filter.postfix === 'Not') {
        select.sql(' AND ' + filter.key + ' NOT LIKE \'%' + value + '%\'');
      } else {
        select.sql(' AND ' + filter.key + ' LIKE \'%' + value + '%\'');
      }

    } else if (filter.postfix === 'Not') {
      select.sql(' AND ' + filter.key + ' NOT ILIKE \'%' + value + '%\'');
    } else {
      select.sql(' AND ' + filter.key + ' ILIKE \'%' + value + '%\'');
    }
  } else if (filter.prefix === 'CaseSensitive') {
    if (filter.postfix === 'Not') {
      select.sql(' AND ' + filter.key + ' NOT LIKE ').param(value);
    } else {
      select.sql(' AND ' + filter.key + ' LIKE ').param(value);
    }
  } else if (filter.postfix === 'Not') {
    select.sql(' AND ' + filter.key + ' NOT ILIKE ').param(value);
  } else {
    select.sql(' AND ' + filter.key + ' ILIKE ').param(value);
  }

}

function filterNumericOrTimestamp(select, filter, value) {
  'use strict';

  if (!filter.postfix && filter.operator === 'Less' || filter.operator === 'Greater' && filter.postfix === 'Not') {

    select.sql(' AND ' + filter.key + ' < ').param(value);

  } else if (!filter.postfix && (filter.operator === 'LessOrEqual' || filter.operator === 'Before') || (filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && filter.postfix === 'Not') {

    select.sql(' AND ' + filter.key + ' <= ').param(value);

  } else if (!filter.postfix && filter.operator === 'Greater' || filter.operator === 'Less' && filter.postfix === 'Not') {

    select.sql(' AND ' + filter.key + ' > ').param(value);

  } else if (!filter.postfix && (filter.operator === 'GreaterOrEqual' || filter.operator === 'After') || (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && filter.postfix === 'Not') {

    select.sql(' AND ' + filter.key + ' >= ').param(value);

  } else if (filter.operator === 'In') {

    if (filter.postfix === 'Not') {
      select.sql(' AND ' + filter.key + ' NOT IN (').array(value.split(',')).sql(')');
    } else {
      select.sql(' AND ' + filter.key + ' IN (').array(value.split(',')).sql(')');
    }

  } else if (filter.postfix === 'Not') {
    select.sql(' AND ' + filter.key + ' <> ').param(value);
  } else {
    select.sql(' AND ' + filter.key + ' = ').param(value);
  }

}

function filterArray(select, filter, value) {
  'use strict';
  var values = value.split(',');
  var i;

  if (values.length > 0) {
    if (filter.postfix === 'Not') {
      select.sql(' AND NOT (');
    } else {
      select.sql(' AND (');
    }
    for (i = 0; i < values.length; i++) {
      if (i > 0) {
        select.sql(' AND');
      }
      select.sql(' \'' + values[i] + '\' = ANY(' + filter.key + ')');
    }
    if (filter.operator !== 'Contains') {
      select.sql(' AND array_length(' + filter.key + ', 1) = ').param(values.length);
    }
    select.sql(')');
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
      } else if (field.type.toLowerCase() === 'numeric' || field.type.toLowerCase().match(/^timestamp/)) {
        filterFn = filterNumericOrTimestamp;
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
