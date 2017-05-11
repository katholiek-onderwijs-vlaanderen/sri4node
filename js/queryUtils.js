/* External query utilities. use in the 'query' section of your sri4node configuration */
var Q = require('q');
var utils = require('./common.js');
var cl = utils.cl;

exports = module.exports = {
  filterHrefs: function (value, query, key, database, count, mapping) {
    'use strict';
    var deferred = Q.defer();
    var permalinks, keys, i, key, reject;
    var table = mapping.table ? mapping.table : mapping.type.split('/')[mapping.type.split('/').length - 1];

    try {
      if (value) {
        permalinks = value.split(',');
        keys = [];
        reject = false;
        for (i = 0; i < permalinks.length; i++) {
          key = permalinks[i].split('/')[permalinks[i].split('/').length - 1];
          if (key.length === 36) {
            keys.push(key);
          } else {
            deferred.reject({
              code: 'parameter.hrefs.invalid.value'
            });
            reject = true;
            break;
          }
        }
        if (!reject) {
          query.sql(' and ' + table + '.key in (').array(keys).sql(') ');
          deferred.resolve();
        }
      }
    } catch (error) {
      cl(error.stack);
      deferred.reject({
        code: 'internal.error',
        description: error.toString()
      });
    }

    return deferred.promise;
  },

  // filterReferencedType('/persons','person')
  filterReferencedType: function (resourcetype, columnname) {
    'use strict';
    return function (value, query) {
      var deferred = Q.defer();
      var permalinks, keys, i, reject, key;

      if (value) {
        permalinks = value.split(',');
        keys = [];
        reject = false;
        for (i = 0; i < permalinks.length; i++) {
          if (permalinks[i].indexOf(resourcetype + '/') === 0) {
            key = permalinks[i].substr(resourcetype.length + 1);
            if (key.length === 36) {
              keys.push(key);
            } else {
              deferred.reject({
                code: 'parameter.invalid.value'
              });
              reject = true;
              break;
            }
          } else {
            deferred.reject({
              code: 'parameter.invalid.value'
            });
            reject = true;
            break;
          }
        }
        if (!reject) {
          query.sql(' and "' + columnname + '" in (').array(keys).sql(') ');
          deferred.resolve();
        }
      }

      return deferred.promise;
    };
  },

  modifiedSince: function (value, select, key, database, count, mapping) {
    'use strict';
    var table = mapping.table ? mapping.table : mapping.type.split('/')[mapping.type.split('/').length - 1];

    return select.sql(' AND ' + table + '."$$meta.modified" >= ').param(value);

  },

  defaultFilter: require('./defaultFilter.js')
};
