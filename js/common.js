/* Internal utilities for sri4node */

var Q = require('q');

exports = module.exports = {
  cl: function (x) {
    'use strict';
    console.log(x);
  },

  // Converts the configuration object for roa4node into an array per resource type.
  typeToConfig: function (config) {
    'use strict';
    var i;
    var ret = {};
    for (i = 0; i < config.length; i++) {
      ret[config[i].type] = config[i];
    }
    return ret;
  },

  sqlColumnNames: function (mapping) {
    'use strict';
    var columnNames = [];
    var key, j;

    for (key in mapping.map) {
      if (mapping.map.hasOwnProperty(key)) {
        columnNames.push(key);
      }
    }
    var sqlColumnNames = '"key",';
    for (j = 0; j < columnNames.length; j++) {
      sqlColumnNames += '"' + columnNames[j] + '"';
      if (j < columnNames.length - 1) {
        sqlColumnNames += ',';
      }
    }

    return sqlColumnNames;
  },

  // Create a ROA resource, based on a row result from node-postgres.
  mapColumnsToObject: function (config, mapping, row, element) {
    'use strict';
    var typeToMapping = exports.typeToConfig(config);
    var key, referencedType;

    // add all mapped columns to output.
    for (key in mapping.map) {
      if (mapping.map.hasOwnProperty(key)) {
        if (mapping.map[key].references) {
          referencedType = mapping.map[key].references;
          element[key] = {
            href: typeToMapping[referencedType].type + '/' + row[key]
          };
        } else if (mapping.map[key].onlyinput) {
          // Skip on output !
        } else {
          element[key] = row[key];
        }
      }
    }
  },

  // Execute registered mapping functions for elements of a ROA resource.
  executeOnFunctions: function (config, mapping, ontype, element) {
    'use strict';
    var key;
    for (key in mapping.map) {
      if (mapping.map.hasOwnProperty(key)) {
        if (mapping.map[key][ontype]) {
          mapping.map[key][ontype](key, element);
        }
      }
    }
  },

  executeValidateMethods: function (mapping, body, db, logdebug) {
    'use strict';
    var deferred = Q.defer();
    var promises, errors, ret;

    function debug(x) {
      if (logdebug) {
        exports.cl(x);
      }
    }

    if (mapping.validate && mapping.validate.length > 0) {
      debug('Executing validation methods.');
      promises = [];
      mapping.validate.forEach(function (f) {
        promises.push(f(body, db));
      });

      Q.allSettled(promises).then(function (results) {
        errors = [];
        results.forEach(function (result) {
          if (result.state === 'rejected') {
            errors.push(result.reason);
          }
        });

        if (errors.length === 0) {
          deferred.resolve();
        } else {
          ret = {
            errors: errors
          };
          debug('Some validate methods rejected : ');
          debug(ret);
          deferred.reject(ret);
        }
      });
    } else {
      debug('No validate methods were registered.');
      deferred.resolve();
    }

    return deferred.promise;
  }
};
