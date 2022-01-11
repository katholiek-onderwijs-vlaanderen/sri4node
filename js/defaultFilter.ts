import common from './common';
const { tableFromMapping, SriError } = common;

// analyses parameter and return its parts (key, operator, prefix and postfix)
function analyseParameter(parameter) {
  'use strict';

  var key = parameter;
  var operator = null;
  var prefix = null;
  var postfix = null;
  var path = null;
  var matches;

  var pattern = /^(.*?)(CaseSensitive)?(Not)?(Greater(OrEqual)?|After|Less(OrEqual)?|Before|In|RegEx|Contains|Overlaps)?$/;

  if ((matches = key.match(pattern)) !== null) {
    key = matches[1];
    prefix = matches[2];
    postfix = matches[3];
    operator = matches[4];
  }
  if (parameter.indexOf('.') > -1 && parameter.indexOf('$$meta') == -1) {
    path = key;
    key = parameter.split('.')[0];
  }

  return {
    key: key,
    operator: operator,
    prefix: prefix,
    postfix: postfix,
    path: path
  };
}

// filter function for text fields
function filterString(select, filter, value, mapping) {
  'use strict';
  var values;
  var not = filter.postfix === 'Not';
  var sensitive = filter.prefix === 'CaseSensitive';
  const tablename = tableFromMapping(mapping)

  if (filter.operator === 'Greater' && not && sensitive || filter.operator === 'Less' && !not && sensitive) {

    select.sql(' AND (' + tablename + '."' + filter.key + '"::text COLLATE "C") < ').param(value);

  }
  else if (filter.operator === 'Greater' && !not && sensitive || filter.operator === 'Less' && not && sensitive) {

    select.sql(' AND (' + tablename + '."' + filter.key + '"::text COLLATE "C") > ').param(value);

  }
  else if (filter.operator === 'Greater' && not && !sensitive || filter.operator === 'Less' && !not && !sensitive) {

    select.sql(' AND LOWER(' + tablename + '."' + filter.key + '"::text) < LOWER(').param(value).sql(')');

  }
  else if (filter.operator === 'Greater' && !not && !sensitive || filter.operator === 'Less' && not && !sensitive) {

    select.sql(' AND LOWER(' + tablename + '."' + filter.key + '"::text) > LOWER(').param(value).sql(')');

  }
  else if ((filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && not && sensitive ||
    (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && !not && sensitive) {

    select.sql(' AND (' + tablename + '."' + filter.key + '"::text COLLATE "C") <= ').param(value);

  }
  else if ((filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && !not && sensitive ||
    (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && not && sensitive) {

    select.sql(' AND (' + tablename + '."' + filter.key + '"::text COLLATE "C") >= ').param(value);

  }
  else if ((filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && not && !sensitive ||
    (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && !not && !sensitive) {

    select.sql(' AND LOWER(' + tablename + '."' + filter.key + '"::text) <= LOWER(').param(value).sql(')');

  }
  else if ((filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && !not && !sensitive ||
    (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && not && !sensitive) {

    select.sql(' AND LOWER(' + tablename + '."' + filter.key + '"::text) >= LOWER(').param(value).sql(')');

  }
  else if (filter.operator === 'In' && not && sensitive) {

    values = value.split(',');
    select.sql(' AND (' + tablename + '."' + filter.key + '"::text NOT IN (').array(values).sql(') OR ' + filter.key + '::text IS NULL)');

  }
  else if (filter.operator === 'In' && !not && sensitive) {

    values = value.split(',');
    select.sql(' AND ' + tablename + '."' + filter.key + '"::text IN (').array(values).sql(')');

  }
  else if (filter.operator === 'In' && not && !sensitive) {

    values = value.split(',').map (v => v.toLowerCase() );
    select.sql(' AND (LOWER(' + tablename + '."' + filter.key + '"::text) NOT IN (').array(values).sql(') OR ' + filter.key + '::text IS NULL)');

  }
  else if (filter.operator === 'In' && !not && !sensitive) {

    values = value.split(',').map (v => v.toLowerCase() );
    select.sql(' AND LOWER(' + tablename + '."' + filter.key + '"::text) IN (').array(values).sql(')');

  }
  else if (filter.operator === 'RegEx' && not && sensitive) {

    select.sql(' AND ' + tablename + '."' + filter.key + '"::text !~ ').param(value);

  }
  else if (filter.operator === 'RegEx' && !not && sensitive) {

    select.sql(' AND ' + tablename + '."' + filter.key + '"::text ~ ').param(value);

  }
  else if (filter.operator === 'RegEx' && not && !sensitive) {

    select.sql(' AND ' + tablename + '."' + filter.key + '"::text !~* ').param(value);

  }
  else if (filter.operator === 'RegEx' && !not && !sensitive) {

    select.sql(' AND ' + tablename + '."' + filter.key + '"::text ~* ').param(value);

  }
  else if (filter.operator === 'Contains' && not && sensitive) {

    select.sql(' AND (' + tablename + '."' + filter.key + '"::text NOT LIKE ').param(`%${value}%`).sql(' OR ' + filter.key + '::text IS NULL)');

  }
  else if (filter.operator === 'Contains' && !not && sensitive) {

    select.sql(' AND ' + tablename + '."' + filter.key + '"::text LIKE ').param(`%${value}%`);

  }
  else if (filter.operator === 'Contains' && not && !sensitive) {

    select.sql(' AND (' + tablename + '."' + filter.key + '"::text NOT ILIKE ').param(`%${value}%`).sql(' OR ' + filter.key + '::text IS NULL)');

  }
  else if (filter.operator === 'Contains' && !not && !sensitive) {

    select.sql(' AND ' + tablename + '."' + filter.key + '"::text ILIKE ').param(`%${value}%`);

  }
  else if (not && sensitive) {

    select.sql(' AND (' + tablename + '."' + filter.key + '"::text <> ').param(value).sql(' OR ' + filter.key + '::text IS NULL)');

  }
  else if (!not && sensitive) {
    select.sql(' AND ' + tablename + '."' + filter.key + '"::text = ').param(value);
  }
  else if (not && !sensitive) {

    select.sql(' AND (LOWER(' + tablename + '."' + filter.key + '"::text) <> ').param(value.toLowerCase()).sql(' OR ' + filter.key + '::text IS NULL)');

  }
  else {
    select.sql(' AND LOWER(' + tablename + '."' + filter.key + '"::text) = ').param(value.toLowerCase());
  }

}

// filter function for fields of type numeric or timestamp (the logic is the same)
function filterNumericOrTimestamp(select, filter, value, mapping, baseType) {
  'use strict';

  if (!filter.postfix && filter.operator === 'Less' || filter.operator === 'Greater' && filter.postfix === 'Not') {

    select.sql(' AND "' + filter.key + '" < ').param(value);

  }
  else if (!filter.postfix && (filter.operator === 'LessOrEqual' || filter.operator === 'Before') ||
    (filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && filter.postfix === 'Not') {

    select.sql(' AND "' + filter.key + '" <= ').param(value);

  }
  else if (!filter.postfix && filter.operator === 'Greater' || filter.operator === 'Less' &&
    filter.postfix === 'Not') {

    select.sql(' AND "' + filter.key + '" > ').param(value);

  }
  else if (!filter.postfix && (filter.operator === 'GreaterOrEqual' || filter.operator === 'After') || 
    (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && filter.postfix === 'Not') {

    select.sql(' AND ("' + filter.key + '" >= ').param(value);

    if (baseType === 'timestamp') {
      select.sql(' OR "' + filter.key + '" IS NULL)');
    } else {
      select.sql(')');
    }

  }  
  else if (filter.operator === 'In') {

    if (filter.postfix === 'Not') {    
      select.sql(' AND ("' + filter.key + '" NOT IN (').array(value.split(',')).sql(') OR "' + filter.key + '" IS NULL)');      
    }
    else {
      select.sql(' AND "' + filter.key + '" IN (').array(value.split(',')).sql(')');
    }

  }
  else if (filter.postfix === 'Not') {
    select.sql(' AND "' + filter.key + '" <> ').param(value);
  }
  else {
    select.sql(' AND "' + filter.key + '" = ').param(value);
  }

}

// filter function for arrays. Important: since the schema doesn't specify the type of field of the array
// we treat each object in a generic way (no string manipulation, only exact matches)
function filterArray(select, filter, value, _mapping, _baseType, field) {
  'use strict';
  var values = value.split(',');

  if (values.length > 0) {
    if (filter.postfix === 'Not') {
      select.sql(' AND NOT (');
    }
    else {
      select.sql(' AND (');
    }
    if (filter.operator === 'Overlaps') {
      select.sql('ARRAY[').array(values).sql(`]::${field.element_type}[] && "${filter.key}"`);
    } else if ( (filter.operator === 'Contains')
                    || (filter.operator === 'In') ) {
                            // Implement 'In' as an alias for 'Contains'; before previous change 'In' was implicitly
                            // (probably unintended) implemented as equal array match, but that did not make much sense.
        select.sql('ARRAY[').array(values).sql(`]::${field.element_type}[] <@ "${filter.key}"`);
    } else if (filter.operator === undefined) { 
        // plain equal match, NOT taking into account order of the elements
        select.sql('( ARRAY[').array(values).sql(`]::${field.element_type}[] <@ "${filter.key}"`)
              .sql('AND ARRAY[').array(values).sql(`]::${field.element_type}[] @> "${filter.key}" )`);
    } else {
      // Not expected to be here -> throw error 
      throw new SriError({status: 400, errors: [{
        code: 'invalid.array.filter',
        parameter: filter.operator,
        message: 'Invalid array filter operator.'
      }]})
    }
    select.sql(')');
  }

}

// filter function for boolean fields
function filterBoolean(select, filter, value) {
  'use strict';

  if (value !== 'any') {
    if (filter.postfix === 'Not') {
      select.sql(' AND NOT ');
    }
    else {
      select.sql(' AND ');
    }

    select.sql('"' + filter.key + '" = ').param(value);
  }

}

function filterJson(select, filter, value, mapping) {
  'use strict';
  var path = filter.path;
  if (path == null) {
    throw new SriError({status: 404, errors: [{
      code: 'invalid.query.property',
      parameter: filter.key,
      message: 'There is no valid path defined, use \'.\' to define path.'
    }]})

  } else {
    let jsonKey = '';
    path.split('.').forEach((part) => {
      if(jsonKey === ''){
        jsonKey = '"'+ part + '"';
      } else {
        jsonKey = '('+jsonKey+')::json->>\''+part+'\'';
      }
    });
    jsonKey = '(' + jsonKey + ')';

    var not = filter.postfix === 'Not';
    var sensitive = filter.prefix === 'CaseSensitive';

    if (filter.operator === 'Greater' && not && sensitive || filter.operator === 'Less' && !not && sensitive) {

      select.sql(' AND ' + jsonKey + '::text < ').param(value);

    }
    else if (filter.operator === 'Greater' && !not && sensitive || filter.operator === 'Less' && not && sensitive) {

      select.sql(' AND ' + jsonKey + '::text > ').param(value);

    }
    else if (filter.operator === 'Greater' && not && !sensitive || filter.operator === 'Less' && !not && !sensitive) {

      select.sql(' AND LOWER(' + jsonKey + '::text) < LOWER(').param(value).sql(')');

    }
    else if (filter.operator === 'Greater' && !not && !sensitive || filter.operator === 'Less' && not && !sensitive) {

      select.sql(' AND LOWER(' + jsonKey + '::text) > LOWER(').param(value).sql(')');

    }
    else if ((filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && not && sensitive ||
      (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && !not && sensitive) {

      select.sql(' AND ' + jsonKey + '::text <= ').param(value);

    }
    else if ((filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && !not && sensitive ||
      (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && not && sensitive) {

      select.sql(' AND ' + jsonKey + '::text >= ').param(value);

    }
    else if ((filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && not && !sensitive ||
      (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && !not && !sensitive) {

      select.sql(' AND LOWER(' + jsonKey + '::text) <= LOWER(').param(value).sql(')');

    }
    else if ((filter.operator === 'GreaterOrEqual' || filter.operator === 'After') && !not && !sensitive ||
      (filter.operator === 'LessOrEqual' || filter.operator === 'Before') && not && !sensitive) {

      select.sql(' AND LOWER(' + jsonKey + '::text) >= LOWER(').param(value).sql(')');

    }
    else if (filter.operator === 'In' && not && sensitive) {

      const values = value.split(',');
      select.sql(' AND (' + jsonKey + '::text NOT IN (').array(values).sql(') OR ' + filter.key + '::text IS NULL)');

    }
    else if (filter.operator === 'In' && !not && sensitive) {

      const values = value.split(',');
      select.sql(' AND ' + jsonKey + '::text IN (').array(values).sql(')');

    }
    else if (filter.operator === 'In' && not && !sensitive) {

      const values = value.split(',').map(function(v) {
        return v.toLowerCase();
      });
      select.sql(' AND (LOWER(' + jsonKey + '::text) NOT IN (').array(values).sql(') OR ' + filter.key + '::text IS NULL)');

    }
    else if (filter.operator === 'In' && !not && !sensitive) {

      const values = value.split(',').map(function(v) {
        return v.toLowerCase();
      });
      select.sql(' AND LOWER(' + jsonKey + '::text) IN (').array(values).sql(')');

    }
    else if (filter.operator === 'RegEx' && not && sensitive) {

      select.sql(' AND ' + jsonKey + '::text !~ ').param(value);

    }
    else if (filter.operator === 'RegEx' && !not && sensitive) {

      select.sql(' AND ' + jsonKey + '::text ~ ').param(value);

    }
    else if (filter.operator === 'RegEx' && not && !sensitive) {

      select.sql(' AND ' + jsonKey + '::text !~* ').param(value);

    }
    else if (filter.operator === 'RegEx' && !not && !sensitive) {

      select.sql(' AND ' + jsonKey + '::text ~* ').param(value);

    }
    else if (filter.operator === 'Contains' && not && sensitive) {

      select.sql(' AND (' + jsonKey + '::text NOT LIKE ').param(`%${value}%`).sql(' OR ' + filter.key + '::text IS NULL)');

    }
    else if (filter.operator === 'Contains' && !not && sensitive) {

      select.sql(' AND ' + jsonKey + '::text LIKE ').param(`%${value}%`);

    }
    else if (filter.operator === 'Contains' && not && !sensitive) {

      select.sql(' AND (' + jsonKey + '::text NOT ILIKE ').param(`%${value}%`).sql(' OR ' + filter.key + '::text IS NULL)');

    }
    else if (filter.operator === 'Contains' && !not && !sensitive) {

      select.sql(' AND ' + jsonKey + '::text ILIKE ').param(`%${value}%`);

    }
    else if (not && sensitive) {

      select.sql(' AND (' + jsonKey + '::text <> ').param(value).sql(' OR ' + filter.key + '::text IS NULL)');

    }
    else if (!not && sensitive) {
      select.sql(' AND ' + jsonKey + '::text = ').param(value);
    }
    else if (not && !sensitive) {

      select.sql(' AND (LOWER(' + jsonKey + '::text) <> ').param(value.toLowerCase()).sql(' OR ' + filter.key + '::text IS NULL)');

    } else {
      select.sql(' AND LOWER(' + jsonKey + '::text) = ').param(value.toLowerCase());
    }
  }
}

// returns all the fields that are of type text (for the q= filter)
function getTextFieldsFromTable(informationSchema) {
  'use strict';

  let textFields:string[] = [];
  let field:string;
  let type:string;

  for (field in informationSchema) {
    if (informationSchema.hasOwnProperty(field)) {
      type = informationSchema[field].type;

      if (type === 'text' || type === 'varchar' || type === 'character varying' || type === 'char' ||
        type === 'character' || type === 'uuid') {
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
    select.sql('"' + textFields[i] + '"::text ILIKE ').param(`%${value}%`);
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

  if (type === 'boolean') {
    return 'boolean';
  }


  if (type === 'text' || type === 'varchar' || type === 'character varying' || type === 'char' ||
    type === 'character' || type === 'uuid') {
    return 'text';
  }

  if (type === 'numeric' || type === 'integer' || type === 'bigint' || type === 'smallint' ||
    type === 'decimal' || type === 'real' || type === 'double precision' || type === 'smallserial' ||
    type === 'serial' || type === 'bigserial') {
    return 'numeric';
  }
  if (type === 'jsonb' || type === 'json') {
    return 'json';
  }

  return null;
}
/**
 * The default filter gets multiple arguments in order to analyze
 * how the user wants the result filtered.
 * The second argument is the SQL query 'so far', that will be modified (!)
 * to reflect whatever this filter wants to add to the query.
 * 
 * REMARKS !!!
 * The fact that this object can be modified has been abused before to add joins etc
 * by doing string replaces.
 * This feels entirely wrong. Instead, this function should return an object containing
 * * whetever needs to be added to the where clause + the necessary parameters
 * * any joins that need to be done in order to make the where clause work
 * * any CTEs that need to be added to the query
 * * ... (adding fields to the select clause maybe?)
 * And the calling function should be responsible for using that information
 * in order to modify the query it has so far, instead of putting that responsibility here.
 * 
 * 
 * @param {String} valueEnc: the search param value (after the = sign)
 * @param {String} query: the sqlQuery object that gets modified by this function (mostly adding 'AND ...' to the where clause)!!!
 * @param {String} parameter: the search param name (before the = sign)
 * @param {*} mapping: the matching record from the resources array that describes for the matched path what the resources at this address will look like
 * @param {*} database: ?
 */
export = module.exports = (valueEnc, query, parameter, mapping, database) => {
  'use strict';

  const value = decodeURIComponent(valueEnc)

  // 1) Analyze parameter for postfixes, and determine the key of the resource mapping.
  const filter = analyseParameter(parameter);

  // 2) Find data type on database from information schema;
  const informationSchema = (global as any).sri4node_configuration.informationSchema
  const idx = mapping.type;
  const field = informationSchema[idx][filter.key];

  // 3) Extend the sql query with the correct WHERE clause.
  if (field) {

    const baseType = getFieldBaseType(field.type);
    var filterFn;
    if (baseType === 'text') {
      filterFn = filterString;
    }
    else if (baseType === 'numeric' || baseType === 'timestamp') {
      filterFn = filterNumericOrTimestamp;
    }
    else if (baseType === 'array') {
      filterFn = filterArray;
    }
    else if (baseType === 'boolean') {
      filterFn = filterBoolean;
    }
    else if (baseType === 'json') {
      filterFn = filterJson;
    }

    if (filterFn) {
      filterFn(query, filter, value, mapping, baseType, field);
    }
  }
  else if (filter.key === 'q') {
    filterGeneral(query, value, getTextFieldsFromTable(informationSchema[idx]));
  }
  else {
    throw new SriError({status: 404, errors: [{
      code: 'invalid.query.parameter',
      parameter: parameter,
      possibleParameters: Object.keys(informationSchema[idx])
    }]})
  }
}

