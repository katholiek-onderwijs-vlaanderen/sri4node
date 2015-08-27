/*
  The core server for the REST api.
  It is configurable, and provides a simple framework for creating REST interfaces.
*/

// Constants
var DEFAULT_LIMIT = 30;
var MAX_LIMIT = 500;

// External dependencies.
var Validator = require('jsonschema').Validator;
var compression = require('compression');
var bodyParser = require('body-parser');
var Q = require('q');

// Utility function.
var common = require('./js/common.js');
var responseHandler = require('./js/responseHandler');
var cl = common.cl;
var pgConnect = common.pgConnect;
var pgExec = common.pgExec;
var typeToConfig = common.typeToConfig;
var sqlColumnNames = common.sqlColumnNames;
var mapColumnsToObject = common.mapColumnsToObject;
var executeOnFunctions = common.executeOnFunctions;
var executeValidateMethods = common.executeValidateMethods;

var queryobject = require('./js/queryObject.js');
var prepare = queryobject.prepareSQL;

// Module variables.
var configuration;
var resources;
var logsql;
var logdebug;
var postgres;

function debug(x) {
  'use strict';
  if (configuration.logdebug) {
    cl(x);
  }
}

var generateError = function (status, type, errors) {
  'use strict';
  // errors can be array with errors or a string, in which case error array with one element will be created
  if (typeof errors == 'string') {
    errors = [{code: type, message: errors}];
  }
  var err = {
    type: type,
    status: status,
    body: {
      errors: errors,
      status: status
    }
  };
  return err;
};

// apply extra parameters on request URL for a list-resource to a sselect.
function applyRequestParameters(mapping, req, select, database, count) {
  'use strict';
  var deferred = Q.defer();

  var urlparameters = req.query;
  var standardParameters = ['orderby', 'descending', 'limit', 'offset', 'expand', 'hrefs'];

  var key, ret;

  var promises = [];
  var reject = false;
  if (mapping.query) {
    for (key in urlparameters) {
      if (urlparameters.hasOwnProperty(key)) {
        if (standardParameters.indexOf(key) === -1) {
          if (mapping.query[key] || mapping.query.defaultFilter) {
            // Execute the configured function that will apply this URL parameter
            // to the SELECT statement
            if (!mapping.query[key] && mapping.query.defaultFilter) { // eslint-disable-line
              promises.push(mapping.query.defaultFilter(urlparameters[key], select, key, database, mapping,
                configuration));
            } else {
              promises.push(mapping.query[key](urlparameters[key], select, key, database, count, mapping));
            }
          } else {
            debug('rejecting unknown query parameter : [' + key + ']');
            reject = true;
            deferred.reject({
              type: 'unknown.query.parameter',
              status: 400,
              body: {
                errors: [{code: 'invalid.query.parameter', parameter: key}]
              }
            });
            break;
          }
        } else if (key === 'hrefs') {
          promises.push(exports.queryUtils.filterHrefs(urlparameters.hrefs, select, key, database, count));
        }
      }
    }
  }

  if (!reject) {
    Q.allSettled(promises).then(function (results) {
      var errors = [];
      results.forEach(function (result) {
        if (result.state === 'rejected') {
          errors.push(result.reason);
        }
      });

      if (errors.length === 0) {
        deferred.resolve();
      } else {
        ret = {
          // When rejecting we return an object with :
          // 'type' -> an internal code to identify the error. Useful in the fail() method.
          // 'status' -> the returned HTTP status code.
          // 'body' -> the response body that will be returned to the client.
          type: 'query.functions.rejected',
          status: 400,
          body: {
            errors: errors
          }
        };
        deferred.reject(ret);
      }
    });
  }

  return deferred.promise;
}

var errorAsCode = function (s) {
  'use strict';
  // return any string as code for REST API error object.
  var ret = s;

  ret = ret.toLowerCase().trim();
  ret = ret.replace(/[^a-z0-9 ]/gmi, '');
  ret = ret.replace(/ /gmi, '.');

  return ret;
};

function queryByKey(config, db, mapping, key) {
  'use strict';
  debug('** queryByKey()');
  var columns = sqlColumnNames(mapping);
  var table = mapping.table ? mapping.table : mapping.type.split('/')[1];
  var row, output, msg;
  var v;
  var result;
  var deferred;

  if (mapping.schema && mapping.schema.properties.key) {
    v = new Validator();
    result = v.validate(key, mapping.schema.properties.key);
    if (result.errors.length > 0) {
      deferred = Q.defer();
      deferred.reject(generateError(
        400,
        'key.invalid',
        result.errors.map(function (e) {
          msg = 'key ' + e.message;
          return {code: errorAsCode(msg), message: msg};
        })
      ));
      return deferred.promise;
    }
  }

  var query = prepare('select-row-by-key-from-' + table);
  query.sql('select ' + columns + ' from "' + table + '" where "key" = ').param(key);
  return pgExec(db, query, logsql, logdebug).then(function (queryResult) {
    var queryDeferred = Q.defer();

    var rows = queryResult.rows;
    if (rows.length === 1) {
      row = queryResult.rows[0];

      output = {};
      debug('** mapping columns to JSON object');
      mapColumnsToObject(config, mapping, row, output);
      debug('** executing onread functions');
      executeOnFunctions(config, mapping, 'onread', output);
      debug('** queryResult of queryByKey() : ');
      debug(output);
      queryDeferred.resolve(output);
    } else if (rows.length === 0) {
      queryDeferred.reject({
        type: 'not.found',
        status: 404,
        body: 'Not Found'
      });
    } else {
      msg = 'More than one entry with key ' + key + ' found for ' + mapping.type;
      debug(msg);
      queryDeferred.reject(new Error(msg));
    }
    return queryDeferred.promise;
  });
}

function getSchemaValidationErrors(json, schema) {
  'use strict';
  var v = new Validator();
  var result = v.validate(json, schema);

  var ret, i, current, err;

  if (result.errors && result.errors.length > 0) {
    cl('Schema validation revealed errors.');
    cl(result.errors);
    cl('JSON schema was : ');
    cl(schema);
    cl('Document was : ');
    cl(json);
    ret = {};
    ret.errors = [];
    ret.document = json;
    for (i = 0; i < result.errors.length; i++) {
      current = result.errors[i];
      err = {};
      err.code = errorAsCode(current.message);
      if (current.property && current.property.indexOf('instance.') === 0) {
        err.path = current.property.substring(9);
      }
      ret.errors.push(err);
    }
    return ret;
  }
}

// Security cache; stores a map 'e-mail' -> 'password'
// To avoid a database query for all API calls.
var knownPasswords = {};

// Force https in production.
function forceSecureSockets(req, res, next) {
  'use strict';
  var isHttps = req.headers['x-forwarded-proto'] === 'https';
  if (!isHttps && req.get('Host').indexOf('localhost') < 0 && req.get('Host').indexOf('127.0.0.1') < 0) {
    return res.redirect('https://' + req.get('Host') + req.url);
  }

  next();
}

function checkBasicAuthentication(req, res, next) {
  'use strict';
  var basic, encoded, decoded, firstColonIndex, email, password;
  var typeToMapping, type, mapping;
  var path = req.route.path;
  var database;

  if (path !== '/me' && path !== '/batch') {
    typeToMapping = typeToConfig(resources);
    type = '/' + req.route.path.split('/')[1];
    mapping = typeToMapping[type];
    if (mapping.public) {
      next();
      return;
    }
  }

  var unauthorized = function () {
    res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
    res.status(401).send('Unauthorized');
  };

  if (req.headers.authorization) {
    basic = req.headers.authorization;
    encoded = basic.substr(6);
    decoded = new Buffer(encoded, 'base64').toString('utf-8');
    firstColonIndex = decoded.indexOf(':');
    if (firstColonIndex !== -1) {
      email = decoded.substr(0, firstColonIndex);
      password = decoded.substr(firstColonIndex + 1);
      if (email && password && email.length > 0 && password.length > 0) {
        if (knownPasswords[email]) {
          if (knownPasswords[email] === password) {
            next();
          } else {
            debug('Invalid password');
            unauthorized();
          }
        } else {
          pgConnect(postgres, configuration).then(function (db) {
            database = db;

            var q = prepare('select-count-from-persons-where-email-and-password');
            q.sql('select count(*) from persons where email = ').param(email).sql(' and password = ').param(password);

            return pgExec(db, q, logsql, logdebug).then(function (result) {
              var count = parseInt(result.rows[0].count, 10);
              if (count === 1) {
                // Found matching record, add to cache for subsequent requests.
                knownPasswords[email] = password;
                next();
              } else {
                debug('Wrong combination of email / password. Found ' + count + ' records.');
                unauthorized();
              }
            });
          }).then(function () {
            database.done();
          }).fail(function (err) {
            debug('checking basic authentication against database failed.');
            debug(err);
            debug(err.stack);
            database.done(err);
            unauthorized();
          });
        }
      } else {
        unauthorized();
      }
    } else {
      unauthorized();
    }
  } else {
    debug('No authorization header received from client. Rejecting.');
    unauthorized();
  }
}

// Apply CORS headers.
// TODO : Change temporary URL into final deploy URL.
var allowCrossDomain = function (req, res, next) {
  'use strict';
  var typeToMapping = typeToConfig(resources);
  var type = '/' + req.path.split('/')[1];
  var mapping = typeToMapping[type];
  var methods;
  var allowedMethods;

  if (mapping && mapping.methods) {
    methods = mapping.methods.slice();
    methods.push('HEAD', 'OPTIONS');
    allowedMethods = methods.join(',');
    if (methods.indexOf(req.method) === -1) {
      res.header('Allow', allowedMethods);
      res.status(405).send('Method Not Allowed');
      return;
    }
  } else {
    allowedMethods = 'GET,PUT,POST,DELETE,HEAD,OPTIONS';
  }
  var origin = '*';
  if (req.headers['x-forwarded-for']) {
    origin = req.headers['x-forwarded-for'];
  } else if (req.headers['X-Forwarded-For']) {
    origin = req.headers['X-Forwarded-For'];
  } else if (req.headers.origin) {
    origin = req.headers.origin;
  } else if (req.headers.Origin) {
    origin = req.headers.Origin;
  } else if (req.headers.host) {
    origin = req.headers.host;
  } else if (req.headers.Host) {
    origin = req.headers.Host;
  }
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', allowedMethods);
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.header('Allow', allowedMethods);
    res.status(200).send(allowedMethods);
  } else {
    next();
  }
};

function logRequests(req, res, next) {
  'use strict';
  var start;
  if (configuration.logrequests) {
    cl(req.method + ' ' + req.path + ' starting.');
    start = Date.now();
    res.on('finish', function () {
      var duration = Date.now() - start;
      cl(req.method + ' ' + req.path + ' took ' + duration + ' ms. ');
    });
  }
  next();
}

function postProcess(functions, db, body) {
  'use strict';
  var promises;
  var deferred = Q.defer();

  if (functions && functions.length > 0) {
    promises = [];
    functions.forEach(function (f) {
      promises.push(f(db, body));
    });

    Q.all(promises).then(function () {
      debug('all post processing functions resolved.');
      deferred.resolve();
    }).catch(function (error) {
      debug('one of the post processing functions rejected.');
      deferred.reject(error);
    });
  } else {
    debug('no post processing functions registered.');
    deferred.resolve();
  }

  return deferred.promise;
}

/* eslint-disable */
function executePutInsideTransaction(db, url, body) {
    'use strict';
    var deferred, element, errors;
    var type = '/' + url.split('/')[1];
    var key = url.split('/')[2];

    debug('PUT processing starting. Request body :');
    debug(body);
    debug('Key received on URL : ' + key);

    var typeToMapping = typeToConfig(resources);
    // var type = '/' + req.route.path.split("/")[1];
    var mapping = typeToMapping[type];
    var table = mapping.table ? mapping.table : mapping.type.split("/")[1];

    debug('Validating schema.');
    if (mapping.schema) {
      errors = getSchemaValidationErrors(body, mapping.schema);
      if (errors) {
        deferred = Q.defer();
        deferred.reject(errors);
        return deferred.promise;
      } else {
        debug('Schema validation passed.');
      }
    }

    return executeValidateMethods(mapping, body, db, configuration.logdebug).then(function () {
      // create an object that only has mapped properties
      var k, value, referencedType, referencedMapping, parts, refkey;
      element = {};
      for (k in mapping.map) {
        if (mapping.map.hasOwnProperty(k)) {
          if (body[k]) {
            element[k] = body[k];
          }
        }
      }
      debug('Mapped incomming object according to configuration');

      // check and remove types from references.
      for (k in mapping.map) {
        if (mapping.map.hasOwnProperty(k)) {
          if (mapping.map[k].references) {
            value = element[k].href;
            if (!value) {
              throw new Error('No href found inside reference ' + k);
            }
            referencedType = mapping.map[k].references;
            referencedMapping = typeToMapping[referencedType];
            parts = value.split('/');
            type = '/' + parts[1];
            refkey = parts[2];
            if (type === referencedMapping.type) {
              element[k] = refkey;
            } else {
              cl('Faulty reference detected [' + element[key].href + '], ' +
                'detected [' + type + '] expected [' + referencedMapping.type + ']');
              return;
            }
          }
        }
      }
      debug('Converted references to values for update');

      var countquery = prepare('check-resource-exists-' + table);
      countquery.sql('select count(*) from ' + table + ' where "key" = ').param(key);
      return pgExec(db, countquery, logsql, logdebug).then(function (results) {
        var deferred = Q.defer();

        var count = parseInt(results.rows[0].count, 10);

        if (count === 1) {
          executeOnFunctions(resources, mapping, 'onupdate', element);

          var update = prepare('update-' + table);
          update.sql('update "' + table + '" set ');
          var firstcolumn = true;
          for (var k in element) {
            if (element.hasOwnProperty(k)) {
              if (!firstcolumn) {
                update.sql(',');
              } else {
                firstcolumn = false;
              }

              update.sql('\"' + k + '\"' + '=').param(element[k]);
            }
          }
          update.sql(' where "key" = ').param(key);

          return pgExec(db, update, logsql, logdebug).then(function (results) {
            if (results.rowCount != 1) {
              debug('No row affected ?!');
              var deferred = Q.defer();
              deferred.reject('No row affected.');
              return deferred.promise();
            } else {
              return postProcess(mapping.afterupdate, db, body);
            }
          });
        } else {
          element.key = key;
          executeOnFunctions(resources, mapping, 'oninsert', element);

          var insert = prepare('insert-' + table);
          insert.sql('insert into "' + table + '" (').keys(element).sql(') values (').values(element).sql(') ');
          return pgExec(db, insert, logsql, logdebug).then(function (results) {
            if (results.rowCount != 1) {
              debug('No row affected ?!');
              var deferred = Q.defer();
              deferred.reject('No row affected.');
              return deferred.promise();
            } else {
              return postProcess(mapping.afterinsert, db, body);
            }
          });
        }
      }); // pgExec(db,countquery)...
    }).fail(function (errors) {
      var deferred = Q.defer();
      deferred.reject(errors);
      return deferred.promise;
    });
  }
  /* eslint-enable */

// Local cache of known identities.
var knownIdentities = {};
// Returns a JSON object with the identity of the current user.
function getMe(req) {
  'use strict';
  var deferred = Q.defer();

  var basic = req.headers.authorization;
  var encoded = basic.substr(6);
  var decoded = new Buffer(encoded, 'base64').toString('utf-8');
  var firstColonIndex = decoded.indexOf(':');
  var database, username;

  if (firstColonIndex !== -1) {
    username = decoded.substr(0, firstColonIndex);
    if (knownIdentities[username]) {
      deferred.resolve(knownIdentities[username]);
    } else {
      pgConnect(postgres, configuration).then(function (db) {
        database = db;
        return configuration.identity(username, db);
      }).then(function (me) {
        knownIdentities[username] = me;
        database.done();
        deferred.resolve(me);
      }).fail(function (err) {
        cl('Retrieving of identity had errors. Removing pg client from pool. Error : ');
        cl(err);
        database.done(err);
        deferred.reject(err);
      });
    }
  }

  return deferred.promise;
}

function execBeforeQueryFunctions(mapping, db, req, resp) {
  'use strict';
  var deferred = Q.defer();

  var beforequery = mapping.beforequery ? mapping.beforequery : [];

  var promises = [];
  beforequery.forEach(function (f) {
    promises.push(f(req, resp, db));
  });

  if (beforequery.length > 0) {
    Q.all(promises).then(function () {
      deferred.resolve();
    }).catch(function (error) {
      if (error.type && error.status && error.body) {
        deferred.reject(error);
      } else {
        deferred.reject({
          type: 'internal.error',
          status: 500,
          body: 'Internal Server Error. [' + error.toString() + ']'
        });
      }
    });
  } else {
    deferred.resolve();
  }

  return deferred.promise;
}

function executeAfterReadFunctions(database, elements, mapping) {
  'use strict';
  var promises, i, ret;
  debug('executeAfterReadFunctions');
  var deferred = Q.defer();

  if (mapping.afterread && mapping.afterread.length > 0) {
    promises = [];
    for (i = 0; i < mapping.afterread.length; i++) {
      promises.push(mapping.afterread[i](database, elements));
    }

    Q.allSettled(promises).then(function (results) {
      debug('allSettled :');
      debug(results);
      var errors = [];
      results.forEach(function (result) {
        if (result.state === 'rejected') {
          errors.push(result.reason.message);
        }
      });

      if (errors.length === 0) {
        deferred.resolve();
      } else {
        ret = {
          // When rejecting we return an object with :
          // 'type' -> an internal code to identify the error. Useful in the fail() method.
          // 'status' -> the returned HTTP status code.
          // 'body' -> the response body that will be returned to the client.
          type: 'afterread.failed',
          status: 500,
          body: {
            code: 'afterread.failed',
            errors: errors,
            status: 500
          }
        };
        deferred.reject(ret);
      }
    });
  } else {
    // Nothing to do, resolve the promise.
    deferred.resolve();
  }

  return deferred.promise;
}

/* Handle GET /{type}/schema */
function getSchema(req, resp) {
  'use strict';
  var typeToMapping = typeToConfig(resources);
  var type = '/' + req.route.path.split('/')[1];
  var mapping = typeToMapping[type];

  resp.set('Content-Type', 'application/json');
  resp.send(mapping.schema);
}

function getListResource(executeExpansion, defaultlimit, maxlimit) {
  'use strict';
  return function (req, resp) {
    var typeToMapping = typeToConfig(resources);
    var type = '/' + req.route.path.split('/')[1];
    var mapping = typeToMapping[type];
    var columns = sqlColumnNames(mapping);
    var table = mapping.table ? mapping.table : mapping.type.split('/')[1];

    var database;
    var countquery;
    var count;
    var query;
    var output;
    var elements;
    var valid;
    var orders, order, o;
    var queryLimit;
    var offset;

    debug('GET list resource ' + type);
    pgConnect(postgres, configuration).then(function (db) {
      debug('pgConnect ... OK');
      database = db;
      var begin = prepare('begin-transaction');
      begin.sql('BEGIN');
      return pgExec(database, begin, logsql, logdebug);
    }).then(function () {
      debug('* running before query functions');
      return execBeforeQueryFunctions(mapping, database, req, resp);
    }).then(function () {
      countquery = prepare();
      countquery.sql('select count(*) from "' + table + '" where 1=1 ');
      debug('* applying URL parameters to WHERE clause');
      return applyRequestParameters(mapping, req, countquery, database, true);
    }).then(function () {
      debug('* executing SELECT COUNT query on database');
      return pgExec(database, countquery, logsql, logdebug);
    }).then(function (results) {
      count = parseInt(results.rows[0].count, 10);
      query = prepare();
      query.sql('select ' + columns + ' from "' + table + '" where 1=1 ');
      debug('* applying URL parameters to WHERE clause');
      return applyRequestParameters(mapping, req, query, database, false);
    }).then(function () {
      // All list resources support orderby, limit and offset.
      var orderby = req.query.orderby;
      var descending = req.query.descending;
      if (orderby) {
        valid = true;
        orders = orderby.split(',');
        for (o = 0; o < orders.length; o++) {
          order = orders[o];
          if (!mapping.map[order]) {
            valid = false;
            break;
          }
        }
        if (valid) {
          query.sql(' order by ' + orders);
          if (descending) {
            query.sql(' desc');
          }
        } else {
          cl('Can not order by [' + orderby + ']. One or more unknown properties. Ignoring orderby.');
        }
      }

      queryLimit = req.query.limit || defaultlimit;

      offset = req.query.offset || 0;
      var error;

      if (queryLimit > maxlimit) {

        error = {
          status: 409,
          type: 'ERROR',
          body: [
            {
              code: 'invalid.limit.parameter',
              type: 'ERROR',
              message: 'The maximum allowed limit is ' + maxlimit
            }
          ]
        };

        throw error;
      }

      query.sql(' limit ').param(queryLimit);

      if (offset) {
        query.sql(' offset ').param(offset);
      }

      debug('* executing SELECT query on database');
      return pgExec(database, query, logsql, logdebug);
    }).then(function (result) {
      var deferred;
      debug('pgExec select ... OK');
      debug(result);
      if (mapping.handlelistqueryresult) {
        deferred = Q.defer();
        mapping.handlelistqueryresult(req, result).then(function (ret) {
          output = ret;
          deferred.resolve();
        }).catch(function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      }
      var rows = result.rows;
      var results = [];
      var row, currentrow;
      var element, msg;

      elements = [];
      for (row = 0; row < rows.length; row++) {
        currentrow = rows[row];

        element = {
          href: mapping.type + '/' + currentrow.key
        };

        // full, or any set of expansion values that must
        // all start with "results.href" or "results.href.*" will result in inclusion
        // of the regular resources in the list resources.
        if (!req.query.expand ||
          (req.query.expand.toLowerCase() === 'full' || req.query.expand.indexOf('results') === 0)) {
          element.$$expanded = {
            $$meta: {
              permalink: mapping.type + '/' + currentrow.key
            }
          };
          mapColumnsToObject(resources, mapping, currentrow, element.$$expanded);
          executeOnFunctions(resources, mapping, 'onread', element.$$expanded);
          elements.push(element.$$expanded);
        } else if (req.query.expand && req.query.expand.toLowerCase() === 'none') {
          // Intentionally left blank.
        } else if (req.query.expand) {
          // Error expand must be either 'full','none' or start with 'href'
          msg = 'expand value unknown : ' + req.query.expand;
          debug(msg);
          throw new Error(msg);
        }
        results.push(element);
      }

      output = {
        $$meta: {
          count: count,
          schema: mapping.type + '/schema'
        },
        results: results
      };

      var newOffset = queryLimit * 1 + offset * 1;

      if (newOffset < count) {
        if (req.originalUrl.match(/offset/)) {
          output.$$meta.next = req.originalUrl.replace(/offset=(\d+)/, 'offset=' + newOffset);
        } else {
          output.$$meta.next = req.originalUrl + (req.originalUrl.match(/\?/) ? '&' : '?') +
            'offset=' + newOffset;
        }

      }

      if (offset > 0) {
        newOffset = offset - queryLimit;
        if (req.originalUrl.match(/offset/)) {
          output.$$meta.previous = req.originalUrl.replace(/offset=(\d+)/, newOffset > 0 ? 'offset=' + newOffset : '');
          output.$$meta.previous = output.$$meta.previous.replace(/[\?&]$/, '');
        } else {
          output.$$meta.previous = req.originalUrl;
          if (newOffset > 0) {
            output.$$meta.previous += (req.originalUrl.match(/\?/) ? '&' : '?') + 'offset=' + newOffset;
          }
        }
      }

      debug('* executing expansion : ' + req.query.expand);
      return executeExpansion(database, elements, mapping, resources, req.query.expand);
    }).then(function () {
      debug('* executing afterread functions on results');
      debug(elements);
      return executeAfterReadFunctions(database, elements, mapping);
    }).then(function () {
      debug('* sending response to client :');
      debug(output);
      resp.set('Content-Type', 'application/json');
      resp.send(output);

      debug('* rolling back database transaction, GETs never have a side effect on the database.');
      database.client.query('ROLLBACK', function (err) {
        // If err is defined, client will be removed from pool.
        database.done(err);
      });
      database.done();
    }).fail(function (error) {
      database.client.query('ROLLBACK', function (err) {
        // If err is defined, client will be removed from pool.
        database.done(err);
      });

      if (error.type && error.status && error.body) {
        resp.status(error.status).send(error.body);
        database.done();
      } else {
        cl('GET processing had errors. Removing pg client from pool. Error : ');
        if (error.stack) {
          cl(error.stack);
        } else {
          cl(error);
        }
        database.done(error);
        resp.status(500).send('Internal Server Error. [' + error.toString() + ']');
      }
    });
  };
}

function getRegularResource(executeExpansion) {
  'use strict';
  return function (req, resp) {
    var typeToMapping = typeToConfig(resources);
    var type = '/' + req.route.path.split('/')[1];
    var mapping = typeToMapping[type];
    var key = req.params.key;

    var database;
    var element;
    var elements;
    pgConnect(postgres, configuration).then(function (db) {
      database = db;
    }).then(function () {
      debug('* running before query functions');
      return execBeforeQueryFunctions(mapping, database, req, resp);
    }).then(function () {
      debug('* query by key');
      return queryByKey(resources, database, mapping, key);
    }).then(function (result) {
      element = result;
      element.$$meta = {
        permalink: mapping.type + '/' + key
      };
      elements = [];
      elements.push(element);
      debug('* executing expansion : ' + req.query.expand);
      return executeExpansion(database, elements, mapping, resources, req.query.expand);
    }).then(function () {
      debug('* executing afterread functions');
      return executeAfterReadFunctions(database, elements, mapping);
    }).then(function () {
      debug('* sending response to the client :');
      debug(element);
      resp.set('Content-Type', 'application/json');
      resp.send(element);
      database.done();
    }).fail(function (error) {
      if (error.type && error.status && error.body) {
        resp.status(error.status).send(error.body);
        database.done();
      } else {
        cl('GET processing had errors. Removing pg client from pool. Error : ');
        cl(error);
        database.done(error);
        resp.status(500).send('Internal Server Error. [' + error.toString() + ']');
      }
    });
  };
}

function createOrUpdate(req, resp) {
  'use strict';
  debug('* sri4node PUT processing invoked.');
  var url = req.path;
  pgConnect(postgres, configuration).then(function (db) {
    var begin = prepare('begin-transaction');
    begin.sql('BEGIN');
    return pgExec(db, begin, logsql, logdebug).then(function () {
      return executePutInsideTransaction(db, url, req.body);
    }).then(function () {
      debug('PUT processing went OK. Committing database transaction.');
      db.client.query('COMMIT', function (err) {
        // If err is defined, client will be removed from pool.
        db.done(err);
        debug('COMMIT DONE.');
        resp.send(true);
      });
    }).fail(function (puterr) {
      cl('PUT processing failed. Rolling back database transaction. Error was :');
      cl(puterr);
      db.client.query('ROLLBACK', function (rollbackerr) {
        // If err is defined, client will be removed from pool.
        db.done(rollbackerr);
        cl('ROLLBACK DONE.');
        resp.status(409).send(puterr);
      });
    });
  }); // pgConnect
}

function deleteResource(req, resp) {
  'use strict';
  debug('sri4node DELETE invoked');
  var typeToMapping = typeToConfig(resources);
  var type = '/' + req.route.path.split('/')[1];
  var mapping = typeToMapping[type];
  var table = mapping.table ? mapping.table : mapping.type.split('/')[1];
  var deferred;
  var database;

  pgConnect(postgres, configuration).then(function (db) {
    database = db;
    var begin = prepare('begin-transaction');
    begin.sql('BEGIN');
    return pgExec(database, begin, logsql, logdebug);
  }).then(function () {
    var deletequery = prepare('delete-by-key-' + table);
    deletequery.sql('delete from "' + table + '" where "key" = ').param(req.params.key);
    return pgExec(database, deletequery, logsql, logdebug);
  }).then(function (results) {
    if (results.rowCount !== 1) {
      debug('No row affected ?!');
      deferred = Q.defer();
      deferred.reject('No row affected.');
      return deferred.promise();
    } else { // eslint-disable-line
      return postProcess(mapping.afterdelete, database, req.route.path);
    }
  }).then(function () {
    debug('DELETE processing went OK. Committing database transaction.');
    database.client.query('COMMIT', function (err) {
      // If err is defined, client will be removed from pool.
      database.done(err);
      debug('COMMIT DONE.');
      resp.send(true);
    });
  }).fail(function (delerr) {
    cl('DELETE processing failed. Rolling back database transaction. Error was :');
    cl(delerr);
    database.client.query('ROLLBACK', function (rollbackerr) {
      // If err is defined, client will be removed from pool.
      database.done(rollbackerr);
      cl('ROLLBACK DONE. Sending 500 Internal Server Error. [' + delerr.toString() + ']');
      resp.status(500).send('Internal Server Error. [' + delerr.toString() + ']');
    });
  });
}

function wrapCustomRouteHandler(customRouteHandler, mapping) {

  'use strict';

  return function (req, res) {

    Q.all([pgConnect(postgres, configuration, mapping.getme(req))]).done(
      function (results) {
        customRouteHandler(req, res, results[0], results[1]);
        results[0].done();
      }
    );

  };
}

function handleBatchOperations(responseHandlers) {
  'use strict';

  return function (req, res, next) {
    var batch = req.body;
    batch.reverse();

    function nextElement() {
      var element, url;
      var type;
      var elementReq;
      if (batch.length > 0) {
        element = batch.pop();
        url = element.href;
        type = '/' + url.split('/')[1];
        elementReq = {
          method: element.verb,
          params: {
            key: url.split('/')[2]
          },
          originalUrl: url,
          user: req.user
        };
        responseHandlers[type](elementReq, res, nextElement);
      } else {
        return next();
      }
    }

    return nextElement(batch);
  };

}

function batchOperation(req, resp) {
  'use strict';
  var database;

  // An array of objects with 'href', 'verb' and 'body'
  var batch = req.body;
  batch.reverse();

  pgConnect(postgres, configuration).then(function (db) {
    database = db;
    var begin = prepare('begin-transaction');
    begin.sql('BEGIN');
    return pgExec(database, begin, logsql, logdebug);
  }).then(function () {
      function recurse() {
        var element, url, body, verb;
        if (batch.length > 0) {
          element = batch.pop();
          url = element.href;
          cl('executing /batch section ' + url);
          body = element.body;
          verb = element.verb;
          if (verb === 'PUT') {
            return executePutInsideTransaction(database, url, body).then(function () {
              return recurse();
            });
          } else { // eslint-disable-line
            cl('UNIMPLEMENTED - /batch ONLY SUPPORTS PUT OPERATIONS !!!');
            throw new Error();
          }
        }
      }

      return recurse(batch);
    }).then(function () {
      cl('PUT processing went OK. Committing database transaction.');
      database.client.query('COMMIT', function (err) {
        // If err is defined, client will be removed from pool.
        database.done(err);
        cl('COMMIT DONE.');
        resp.send(true);
      });
    }).fail(function (puterr) {
      cl('PUT processing failed. Rolling back database transaction. Error was :');
      cl(puterr);
      database.client.query('ROLLBACK', function (rollbackerr) {
        // If err is defined, client will be removed from pool.
        database.done(rollbackerr);
        cl('ROLLBACK DONE.');
        resp.status(500).send(puterr);
      });
    });
}

/* express.js application, configuration for roa4node */
exports = module.exports = {
  configure: function (app, pg, config) {
    'use strict';
    var executeExpansion = require('./js/expand.js')(config.logdebug, prepare, pgExec, executeAfterReadFunctions);
    var configIndex, mapping, url;
    var defaultlimit;
    var maxlimit;
    var responseHandlerFn;
    var customroute;
    var i;
    var responseHandlers = [];

    configuration = config;
    resources = config.resources;
    logsql = config.logsql;
    logdebug = config.logdebug;
    postgres = pg;

    // All URLs force SSL and allow cross origin access.
    app.use(forceSecureSockets);
    app.use(allowCrossDomain);
    app.use(bodyParser.json());

    // a global error handler to catch among others JSON errors
    //  => log stack trace and send JSON error message tp client
    // (unfortunatly the JSON errors cannot be distinguished from other errors ?!)
    app.use(function (error, req, res, next) {
      var body;
      if (error) {
        body = {
          errors: [{code: 'generic.error', message: error.name + ':' + error.message, body: error.body}],
          status: error.status || 500
        };
        res.status(error.status).send(body);
      } else {
        next();
      }
    });

    for (configIndex = 0; configIndex < resources.length; configIndex++) {
      mapping = resources[configIndex];

      // when no custom checkauthentication and getme defined, use the default ones
      if (!mapping.checkauthentication) {
        mapping.checkauthentication = checkBasicAuthentication;
      }
      if (!mapping.getme) {
        mapping.getme = getMe;
      }

      // register schema for external usage. public.
      url = mapping.type + '/schema';
      app.use(url, logRequests);

      app.get(url, getSchema);

      // register list resource for this type.
      url = mapping.type;

      responseHandlerFn = responseHandler(mapping, configuration, postgres);
      responseHandlers[url] = responseHandlerFn;

      // register list resource for this type.
      maxlimit = mapping.maxlimit || MAX_LIMIT;
      defaultlimit = mapping.defaultlimit || DEFAULT_LIMIT;
      app.get(url, logRequests, mapping.checkauthentication, responseHandlerFn,
        compression(), getListResource(executeExpansion, defaultlimit, maxlimit)); // app.get - list resource

      // register single resource
      url = mapping.type + '/:key';
      app.route(url)
        .get(logRequests, mapping.checkauthentication, responseHandlerFn, compression(),
          getRegularResource(executeExpansion))
        .put(logRequests, mapping.checkauthentication, responseHandlerFn, createOrUpdate)
        .delete(logRequests, mapping.checkauthentication, responseHandlerFn, deleteResource); // app.delete

      // register custom routes (if any)

      if (mapping.customroutes && mapping.customroutes instanceof Array) {
        for (i = 0; i < mapping.customroutes.length; i++) {
          customroute = mapping.customroutes[i];
          if (customroute.route && customroute.handler) {
            app.get(customroute.route, logRequests, mapping.checkauthentication,
              responseHandlerFn, compression(), wrapCustomRouteHandler(customroute.handler, mapping));
          }
        }
      }

    } // for all mappings.

    url = '/batch';
    app.put(url, logRequests, mapping.checkauthentication, handleBatchOperations(responseHandlers), batchOperation);

    url = '/me';
    app.get(url, logRequests, mapping.checkauthentication, function (req, resp) {
      mapping.getme(req).then(function (me) {
        resp.set('Content-Type', 'application/json');
        resp.send(me);
      }).fail(function (error) {
        resp.status(500).send('Internal Server Error. [' + error.toString() + ']');
      });
    });

    app.put('/log', function (req, resp) {
      var j;
      var error = req.body;
      cl('Client side error :');
      var lines = error.stack.split('\n');
      for (j = 0; i < lines.length; j++) {
        cl(lines[j]);
      }
      resp.end();
    });
  },

  utils: {
    // Call this is you want to clear the password and identity cache for the API.
    clearPasswordCache: function () {
      'use strict';
      knownPasswords = {};
      knownIdentities = {};
    },

    // Utility to run arbitrary SQL in validation, beforeupdate, afterupdate, etc..
    executeSQL: pgExec,
    prepareSQL: queryobject.prepareSQL,

    generateError: generateError,

    /*
        Add references from a different resource to this resource.
        * type : the resource type that has a reference to the retrieved elements.
        * column : the database column that contains the foreign key.
        * key : the name of the key to add to the retrieved elements.
    */
    addReferencingResources: function (type, column, targetkey) {
      'use strict';
      return function (database, elements) {
        var tablename, query, elementKeys, elementKeysToElement;
        var permalink, elementKey;
        var deferred = Q.defer();

        if (elements && elements.length && elements.length > 0) {
          tablename = type.split('/')[1];
          query = prepare();
          elementKeys = [];
          elementKeysToElement = {};
          elements.forEach(function (element) {
            permalink = element.$$meta.permalink;
            elementKey = permalink.split('/')[2];
            elementKeys.push(elementKey);
            elementKeysToElement[elementKey] = element;
          });

          query.sql('select key, \"' + column + '\" as fkey from ' +
                    tablename + ' where \"' + column + '\" in (').array(elementKeys).sql(')');
          pgExec(database, query, logsql, logdebug).then(function (result) {
            result.rows.forEach(function (row) {
              var element = elementKeysToElement[row.fkey];
              if (!element[targetkey]) {
                element[targetkey] = [];
              }
              element[targetkey].push({href: type + '/' + row.key});
            });
            deferred.resolve();
          }).fail(function (e) {
            cl(e.stack);
            deferred.reject();
          });
        } else {
          deferred.resolve();
        }

        return deferred.promise;
      };
    }
  },

  queryUtils: require('./js/queryUtils.js'),
  mapUtils: require('./js/mapUtils.js'),
  schemaUtils: require('./js/schemaUtils.js')
};
