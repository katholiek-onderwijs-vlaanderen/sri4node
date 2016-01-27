/* Internal utilities for sri4node */

var Q = require('q');
var env = require('./env.js');
var qo = require('./queryObject.js');
var parameterPattern = qo.parameterPattern;

exports = module.exports = {
  cl: function (x) {
    'use strict';
    console.log(x); // eslint-disable-line
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
    var sqlColumnNames = columnNames.indexOf('key') === -1 ? '"key",' : '';
    for (j = 0; j < columnNames.length; j++) {
      sqlColumnNames += '"' + columnNames[j] + '"';
      if (j < columnNames.length - 1) {
        sqlColumnNames += ',';
      }
    }

    return sqlColumnNames;
  },

  /* Merge all direct properties of object 'source' into object 'target'. */
  mergeObject: function (source, target) {
    'use strict';
    var key;
    for (key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
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
          if (row[key] != null) {
            element[key] = {
              href: typeToMapping[referencedType].type + '/' + row[key]
            };
          } else {
            element[key] = null;
          }
        } else if (mapping.map[key].onlyinput) {
          // Skip on output !
        } else if (key.indexOf('$$meta.') === -1) {
          element[key] = row[key];
        } else {
          if (!element.$$meta) {
            element.$$meta = {};
          }
          element.$$meta[key.split('$$meta.')[1]] = row[key];
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
  },

  // Q wrapper to get a node-postgres client from the client pool.
  // It returns a Q promise to allow chaining, error handling, etc.. in Q-style.
  pgConnect: function (pg, configuration) {
    'use strict';
    var deferred = Q.defer();
    var cl = exports.cl;

    // ssl=true is required for heruko.com
    // ssl=false is required for development on local postgres (Cloud9)
    var databaseUrl = env.databaseUrl;
    var dbUrl, searchPathPara;
    if (databaseUrl) {
      dbUrl = databaseUrl;
    } else {
      dbUrl = configuration.defaultdatabaseurl;
    }
    if (env.postgresSchema) {
      searchPathPara = 'search_path=' + env.postgresSchema + ',public';
      if (dbUrl.match('\\?')) {
        dbUrl += '&' + searchPathPara;
      } else {
        dbUrl += '?' + searchPathPara;
      }
    }
    if (configuration.logsql) {
      cl('Using database connection string : [' + dbUrl + ']');
    }

    pg.connect(dbUrl, function (err, client, done) {
      if (err) {
        cl('Unable to connect to database on URL : ' + dbUrl);
        deferred.reject(err);
      } else {
        deferred.resolve({
          client: client,
          done: done
        });
      }
    });

    return deferred.promise;
  },

  // Q wrapper for executing SQL statement on a node-postgres client.
  //
  // Instead the db object is a node-postgres Query config object.
  // See : https://github.com/brianc/node-postgres/wiki/Client#method-query-prepared.
  //
  // name : the name for caching as prepared statement, if desired.
  // text : The SQL statement, use $1,$2, etc.. for adding parameters.
  // values : An array of java values to be inserted in $1,$2, etc..
  //
  // It returns a Q promise to allow chaining, error handling, etc.. in Q-style.
  pgExec: function (db, query, logsql, logdebug) {
    'use strict';
    var deferred = Q.defer();
    var q = {};
    var i, index, msg, prefix, postfix;
    var cl = exports.cl;

    function debug(x) {
      if (logdebug) {
        cl(x);
      }
    }

    q.text = query.text;
    q.values = query.params;
    var paramCount = 1;
    if (q.values && q.values.length > 0) {
      for (i = 0; i < q.values.length; i++) {
        index = q.text.indexOf(parameterPattern);
        if (index === -1) {
          msg = 'Parameter count in query does not add up. Too few parameters in the query string';
          debug('** ' + msg);
          deferred.reject(msg);
        } else {
          prefix = q.text.substring(0, index);
          postfix = q.text.substring(index + parameterPattern.length, q.text.length);
          q.text = prefix + '$' + paramCount + postfix;
          paramCount++;
        }
      }
      index = q.text.indexOf(parameterPattern);
      if (index !== -1) {
        msg = 'Parameter count in query does not add up. Extra parameters in the query string.';
        debug('** ' + msg);
        deferred.reject();
      }
    }

    if (logsql) {
      cl(q);
    }

    db.client.query(q, function (err, result) {
      if (err) {
        if (logsql) {
          cl('SQL error :');
          cl(err);
        }
        deferred.reject(err);
      } else {
        if (logsql) {
          cl('SQL result : ');
          cl(result.rows);
        }
        deferred.resolve(result);
      }
    });

    return deferred.promise;
  }
};
