// analyses parameter and return its parts (key, operator, prefix and postfix)
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

// filter function for text fields
function filterString(select, filter, value) {
  'use strict';
  var values;
  var not = filter.postfix === 'Not';
  var sensitive = filter.prefix === 'CaseSensitive';

  if (filter.operator === 'Greater' && not && sensitive || filter.operator === 'Less' && !not && sensitive) {

    select.sql(' AND "' + filter.key + '" < ').param(value);

  } else if (filter.operator === 'Greater' && !not && sensitive || filter.operator === 'Less' && not && sensitive) {

    select.sql(' AND "' + filter.key + '" > ').param(value);

  } else if (filter.operator === 'Greater' && not && !sensitive || filter.operator === 'Less' && !not && !sensitive) {

    select.sql(' AND LOWER("' + filter.key + '") < LOWER(\'' + value + '\')');

  } else if (filter.operator === 'Greater' && !not && !sensitive || filter.operator === 'Less' && not && !sensitive) {

    select.sql(' AND LOWER("' + filter.key + '") > LOWER(\'' + value + '\')');

  } else if ((filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && not && sensitive ||
    (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && !not && sensitive) {

    select.sql(' AND "' + filter.key + '" <= ').param(value);

  } else if ((filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && !not && sensitive ||
    (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && not && sensitive) {

    select.sql(' AND "' + filter.key + '" >= ').param(value);

  } else if ((filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && not && !sensitive ||
    (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && !not && !sensitive) {

    select.sql(' AND LOWER("' + filter.key + '") <= LOWER(\'' + value + '\')');

  } else if ((filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && !not && !sensitive ||
    (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && not && !sensitive) {

    select.sql(' AND LOWER("' + filter.key + '") >= LOWER(\'' + value + '\')');

  } else if (filter.operator === 'In' && not && sensitive) {

    values = value.split(',');
    select.sql(' AND "' + filter.key + '" NOT IN (').array(values).sql(')');

  } else if (filter.operator === 'In' && !not && sensitive) {

    values = value.split(',');
    select.sql(' AND "' + filter.key + '" IN (').array(values).sql(')');

  } else if (filter.operator === 'In' && not && !sensitive) {

    values = value.split(',').map(function (v) {
      return v.toLowerCase();
    });
    select.sql(' AND LOWER("' + filter.key + '") NOT IN (').array(values).sql(')');

  } else if (filter.operator === 'In' && !not && !sensitive) {

    values = value.split(',').map(function (v) {
      return v.toLowerCase();
    });
    select.sql(' AND LOWER("' + filter.key + '") IN (').array(values).sql(')');

  } else if (filter.operator === 'RegEx' && not && sensitive) {

    select.sql(' AND "' + filter.key + '" !~ ').param(value);

  } else if (filter.operator === 'RegEx' && !not && sensitive) {

    select.sql(' AND "' + filter.key + '" ~ ').param(value);

  } else if (filter.operator === 'RegEx' && not && !sensitive) {

    select.sql(' AND "' + filter.key + '" !~* ').param(value);

  } else if (filter.operator === 'RegEx' && !not && !sensitive) {

    select.sql(' AND "' + filter.key + '" ~* ').param(value);

  } else if (filter.operator === 'Contains' && not && sensitive) {

    select.sql(' AND "' + filter.key + '" NOT LIKE \'%' + value + '%\'');

  } else if (filter.operator === 'Contains' && !not && sensitive) {

    select.sql(' AND "' + filter.key + '" LIKE \'%' + value + '%\'');

  } else if (filter.operator === 'Contains' && not && !sensitive) {

    select.sql(' AND "' + filter.key + '" NOT ILIKE \'%' + value + '%\'');

  } else if (filter.operator === 'Contains' && !not && !sensitive) {

    select.sql(' AND "' + filter.key + '" ILIKE \'%' + value + '%\'');

  } else if (not && sensitive) {

    select.sql(' AND TRIM("' + filter.key + '") NOT LIKE ').param(value);

  } else if (!not && sensitive) {

    select.sql(' AND TRIM("' + filter.key + '") LIKE ').param(value);

  } else if (not && !sensitive) {

    select.sql(' AND TRIM("' + filter.key + '") NOT ILIKE ').param(value);

  } else {

    select.sql(' AND TRIM("' + filter.key + '") ILIKE ').param(value);

  }

}

// filter function for fields of type numeric or timestamp (the logic is the same)
function filterNumericOrTimestamp(select, filter, value) {
  'use strict';

  if (!filter.postfix && filter.operator === 'Less' || filter.operator === 'Greater' && filter.postfix === 'Not') {

    select.sql(' AND "' + filter.key + '" < ').param(value);

  } else if (!filter.postfix && (filter.operator === 'LessOrEqual' || filter.operator === 'Before') ||
    (filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && filter.postfix === 'Not') {

    select.sql(' AND "' + filter.key + '" <= ').param(value);

  } else if (!filter.postfix && filter.operator === 'Greater' || filter.operator === 'Less' &&
    filter.postfix === 'Not') {

    select.sql(' AND "' + filter.key + '" > ').param(value);

  } else if (!filter.postfix && (filter.operator === 'GreaterOrEqual' || filter.operator === 'After') ||
    (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && filter.postfix === 'Not') {

    select.sql(' AND "' + filter.key + '" >= ').param(value);

  } else if (filter.operator === 'In') {

    if (filter.postfix === 'Not') {
      select.sql(' AND "' + filter.key + '" NOT IN (').array(value.split(',')).sql(')');
    } else {
      select.sql(' AND "' + filter.key + '" IN (').array(value.split(',')).sql(')');
    }

  } else if (filter.postfix === 'Not') {
    select.sql(' AND "' + filter.key + '" <> ').param(value);
  } else {
    select.sql(' AND "' + filter.key + '" = ').param(value);
  }

}

// filter function for arrays. Important: since the schema doesn't specify the type of field of the array
// we treat each object in a generic way (no string manipulation, only exact matches)
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
      select.sql(' \'' + values[i] + '\' = ANY("' + filter.key + '")');
    }
    if (filter.operator !== 'Contains') {
      select.sql(' AND array_length(' + filter.key + ', 1) = ').param(values.length);
    }
    select.sql(')');
  }

}

// returns all the fields that are of type text (for the q= filter)
function getTextFieldsFromTable(informationSchema) {
  'use strict';

  var textFields = [];
  var field;
  var type;

  for (field in informationSchema) {
    if (informationSchema.hasOwnProperty(field)) {
      type = informationSchema[field].type;

      if (type === 'text' || type === 'varchar' || type === 'character varying' || type === 'char' ||
        type === 'character') {
        textFields.push(field);
      }
    }
  }

  return textFields;
}

// filter all the textfields by a value (for the q= filter)
function filterFieldByValues(select, value, textFields) {
  'use strict';
  var i;

  select.sql(' AND (');
  for (i = 0; i < textFields.length; i++) {
    if (i > 0) {
      select.sql(' OR ');
    }
    select.sql('"'+textFields[i] + '" ILIKE \'%' + value + '%\'');
  }
  select.sql(')');
}

// filter general (q=): filters in all the fields of type text, with multiple values supported
// i.e. if the filter is q=test+value it will find records with both field AND value in any of the text fields
function filterGeneral(select, value, textFields) {
  'use strict';

  var values = value.split(/[ +]/);
  var i;

  for (i = 0; i < values.length; i++) {

    filterFieldByValues(select, values[i], textFields);

  }

}

function getFieldBaseType(fieldType) {
  'use strict';

  var type = fieldType.trim().toLowerCase();

  if (type.match(/^timestamp/) || type === 'date') {
    return 'timestamp';
  }

  if (type === 'array') {
    return 'array';
  }

  if (type === 'text' || type === 'varchar' || type === 'character varying' || type === 'char' ||
    type === 'character') {
    return 'text';
  }

  if (type === 'numeric' || type === 'integer' || type === 'boolean' || type === 'bigint' || type === 'smallint' || type === 'decimal' ||
    type === 'real' || type === 'double precision' || type === 'smallserial' || type === 'serial' ||
      type === 'bigserial') {
    return 'numeric';
  }

  return null;
}

function parseFilters(value, select, parameter, mapping) {

  'use strict';
  return function (informationSchema) {
    var filter;
    var field;
    var filterFn;
    var baseType;
    var error;
    var idx;

    // 1) Analyze parameter for postfixes, and determine the key of the resource mapping.
    filter = analyseParameter(parameter);

    // 2) Find data type on database from information schema;
    idx = mapping.table ? '/' + mapping.table : mapping.type;
    field = informationSchema[idx][filter.key];

    // 3) Extend the sql query with the correct WHERE clause.
    if (field) {

      baseType = getFieldBaseType(field.type);

      if (baseType === 'text') {
        filterFn = filterString;
      } else if (baseType === 'numeric' || baseType === 'timestamp') {
        filterFn = filterNumericOrTimestamp;
      } else if (baseType === 'array') {
        filterFn = filterArray;
      }

      if (filterFn) {
        filterFn(select, filter, value);
      }
    } else if (filter.key === 'q') {
      filterGeneral(select, value, getTextFieldsFromTable(informationSchema[mapping.type]));
    } else {
      error = {code: 'invalid.query.parameter', parameter: parameter, type: 'ERROR'};
      throw error;
    }

    console.log(select);

  };
}

exports = module.exports = function (value, select, parameter, database, mapping, configuration) { // eslint-disable-line
  'use strict';

  return require('./informationSchema.js')(database, configuration)
    .then(parseFilters(value, select, parameter, mapping));

};
