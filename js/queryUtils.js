/* External query utilities. use in the 'query' section of your sri4node configuration */
var Q = require('q');
var utils = require('./common.js');
var cl = utils.cl;

exports = module.exports = {
  filterHrefs: function (value, query, key, database, count, mapping) {
    'use strict';
    var permalinks, keys, i, key, reject;
    const table = tableFromMapping(mapping)
  
    if (value) {
      const permalinks = value.split(',');
      const keys = [];
      permalinks.forEach( (permalink) => {
          key = permalink.split('/')[permalink.split('/').length - 1];
          if (key.length === 36) {
            keys.push(key);
          } else {
            throw new { code: 'parameter.hrefs.invalid.value' }
          }        
      })
     
      query.sql(' and ' + table + '.key in (').array(keys).sql(') ');
    }
  },

 ///  TODO
  // // filterReferencedType('/persons','person')
  // filterReferencedType: function (resourcetype, columnname) {
  //   'use strict';
  //   return function (value, query) {
  //     var deferred = Q.defer();
  //     var permalinks, keys, i, reject, key;

  //     if (value) {
  //       permalinks = value.split(',');
  //       keys = [];
  //       reject = false;
  //       for (i = 0; i < permalinks.length; i++) {
  //         if (permalinks[i].indexOf(resourcetype + '/') === 0) {
  //           key = permalinks[i].substr(resourcetype.length + 1);
  //           if (key.length === 36) {
  //             keys.push(key);
  //           } else {
  //             deferred.reject({
  //               code: 'parameter.invalid.value'
  //             });
  //             reject = true;
  //             break;
  //           }
  //         } else {
  //           deferred.reject({
  //             code: 'parameter.invalid.value'
  //           });
  //           reject = true;
  //           break;
  //         }
  //       }
  //       if (!reject) {
  //         query.sql(' and "' + columnname + '" in (').array(keys).sql(') ');
  //         deferred.resolve();
  //       }
  //     }

  //     return deferred.promise;
  //   };
  // },

  modifiedSince: function (value, query, key, database, count, mapping) {
    'use strict';
    const table = tableFromMapping(mapping)

    query.sql(' AND ' + table + '."$$meta.modified" >= ').param(value);

    return query
  },

  defaultFilter: require('./defaultFilter.js')
};
