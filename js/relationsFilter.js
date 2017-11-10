var _ = require('lodash');

function fromTypesFilter(value, select, key, database, count, mapping) {
  var sql, fromCondition, whereCondition, table, fromTable, types;

  if (value && mapping.map.from && mapping.map.from.references) {

    fromCondition = select.text.split(' from')[1];
    whereCondition = fromCondition.split('where')[1];
    fromCondition = fromCondition.split('where')[0];

    const table = tableFromMapping(mapping)
    types = value.split(',').join('\',\'');
    fromTable = mapping.map.from.references.split('/')[mapping.map.from.references.split('/').length - 1];

    sql = select.text.indexOf('count') !== -1 ? 'select count(distinct ' + table + '.*)' : 'select distinct ' + table + '.*';
    sql += ' from ' + fromCondition + ' JOIN ' + fromTable + ' c on c.key = ' + table + '.from ';
    sql += ' where ' + whereCondition;
    sql += ' AND c.type in (\'' + types + '\') AND c."$$meta.deleted" = false ';

    select.text = sql;

    //console.log('fromTypes:', sql);
  }
}

function toTypesFilter(value, select, key, database, count, mapping) {
  var sql, fromCondition, whereCondition, table, toTable, types;

  if (value && mapping.map.to && mapping.map.to.references) {

    fromCondition = select.text.split(' from')[1];
    whereCondition = fromCondition.split('where')[1];
    fromCondition = fromCondition.split('where')[0];

    const table = tableFromMapping(mapping)
    types = value.split(',').join('\',\'');
    toTable = mapping.map.to.references.split('/')[mapping.map.to.references.split('/').length - 1];

    sql = select.text.indexOf('count') !== -1 ? 'select count(distinct ' + table + '.*)' : 'select distinct ' + table + '.*';
    sql += ' FROM ' + fromCondition + ' JOIN ' + toTable + ' c2 on c2.key = ' + table + '.to ';
    sql += ' where ' + whereCondition;
    sql += ' AND c2.type in (\'' + types + '\') AND c2."$$meta.deleted" = false ';

    select.text = sql;

    //console.log('toTypes:', sql);
  }
}

function fromsFilter(value, select, key, database, count, mapping) {
  var froms;

  if (value) {

    const table = tableFromMapping(mapping)

    froms = value.split(',').map(function(val) {
      return val.split('/')[val.split('/').length - 1];
    }).join('\',\'');

    select.sql(' AND ' + table + '.from in (\'' + froms + '\')');
  }
}

function tosFilter(value, select, key, database, count, mapping) {
  var tos;

  if (value) {

    const table = tableFromMapping(mapping)

    tos = value.split(',').map(function(val) {
      return val.split('/')[val.split('/').length - 1];
    }).join('\',\'');

    select.sql(' AND ' + table + '.to in (\'' + tos + '\')');
  }
}

// function fromsFilter(value, select, key, database, count, mapping) {
//   var froms;

//   if (value) {

//     const table = tableFromMapping(mapping)

//     froms = value.split(',').map(function(val) {
//       return val.split('/')[val.split('/').length - 1];
//     }).join('\',\'');

//     select.sql(' AND ' + table + '.from in (\'' + froms + '\')');
//   }
// }


exports = module.exports = {
    fromTypes: fromTypesFilter,
    toTypes: toTypesFilter,
    tos: tosFilter,
    froms: fromsFilter
  };
