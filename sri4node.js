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
var express = require('express');

// Utility function.
var common = require('./js/common.js');
var secureCache = require('./js/secureCache');
var informationSchema = require('./js/informationSchema.js');
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

function error(x) {
  'use strict';
  cl(x);
}

var generateError = function (status, type, errors) {
  'use strict';
  // errors can be array with errors or a string, in which case error array with one element will be created
  if (typeof errors == 'string') {
    errors = [{code: type, message: errors}];
  }
  return {
    type: type,
    status: status,
    body: {
      errors: errors,
      status: status
    }
  };
};

// apply extra parameters on request URL for a list-resource to a select.
function applyRequestParameters(mapping, urlparameters, select, database, count) {
  'use strict';
  var deferred = Q.defer();

  var standardParameters = ['orderBy', 'descending', 'limit', 'offset', 'expand', 'hrefs', 'modifiedSince'];

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
              status: 404,
              body: {
                errors: [{code: 'invalid.query.parameter', parameter: key}]
              }
            });
            break;
          }
        } else if (key === 'hrefs' && urlparameters.hrefs) {
          promises.push(exports.queryUtils.filterHrefs(urlparameters.hrefs, select, key, database, count));
        } else if (key === 'modifiedSince') {
          promises.push(exports.queryUtils.modifiedSince(urlparameters.modifiedSince, select, key, database, count, mapping));
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
          status: 404,
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

function queryByKey(config, db, mapping, key, wantsDeleted) {
  'use strict';
  debug('** queryByKey()');
  var columns = sqlColumnNames(mapping);
  var table = mapping.table ? mapping.table : mapping.type.split('/')[mapping.type.split('/').length - 1];
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
  var sql = 'select ' + columns + ', "$$meta.deleted", "$$meta.created", "$$meta.modified" from "';
  sql += table + '" where "key" = ';
  query.sql(sql).param(key);
  return pgExec(db, query, logsql, logdebug).then(function (queryResult) {
    var queryDeferred = Q.defer();

    var rows = queryResult.rows;
    if (rows.length === 1) {
      row = queryResult.rows[0];
      if (row['$$meta.deleted'] && !wantsDeleted) {
        queryDeferred.reject({
          type: 'resource.gone',
          status: 410,
          body: 'Resource is gone'
        });
      } else {
        output = {};
        debug('** mapping columns to JSON object');
        mapColumnsToObject(config, mapping, row, output);
        debug('** executing onread functions');
        executeOnFunctions(config, mapping, 'onread', output);
        debug('** queryResult of queryByKey() : ');
        debug(output);
        queryDeferred.resolve({
          object: output,
          $$meta: {
            deleted: row['$$meta.deleted'],
            created: row['$$meta.created'],
            modified: row['$$meta.modified']
          }
        });
      }

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

// Force https in production.
function forceSecureSockets(req, res, next) {
  'use strict';
  var isHttps = req.headers['x-forwarded-proto'] === 'https';
  if (!isHttps && req.get('Host').indexOf('localhost') < 0 && req.get('Host').indexOf('127.0.0.1') < 0) {
    return res.redirect('https://' + req.get('Host') + req.url);
  }

  next();
}

function postAuthenticationFailed(req, res, me, errorResponse) {
  'use strict';
  var status;
  var body;

  if (!me) {
    status = 401;
    body = 'Unauthorized';
    res.header('WWW-Authenticate', 'Basic realm="User Visible Realm"');
  } else if (errorResponse && errorResponse.status && errorResponse.body) {
    status = errorResponse.status;
    body = errorResponse.body;
  } else {
    status = 403;
  }

  res.status(status).send(body);
}

function doBasicAuthentication(authenticator) {
  'use strict';
  return function (req, res, next) {
    var basic, encoded, decoded, firstColonIndex, username, password;
    var typeToMapping, type, mapping;
    var path = req.route.path;
    var database;

    if (path !== '/me' && path !== '/batch' && path !== '/validate') {
      typeToMapping = typeToConfig(resources);
      type = req.route.path.split(':')[0].replace(/\/$/, '').replace('/validate','');
      mapping = typeToMapping[type];
      if (mapping.public) {
        next();
        return;
      }
    }

    if (req.headers.authorization) {
      basic = req.headers.authorization;
      encoded = basic.substr(6);
      decoded = new Buffer(encoded, 'base64').toString('utf-8');
      firstColonIndex = decoded.indexOf(':');
      if (firstColonIndex !== -1) {
        username = decoded.substr(0, firstColonIndex);
        password = decoded.substr(firstColonIndex + 1);
        if (username && password && username.length > 0 && password.length > 0) {
          pgConnect(postgres, configuration).then(function (db) {
            database = db;
            return authenticator(database, username, password).then(function (result) {
              if (result) {
                req.user = username;
                next();
              } else {
                debug('Authentication failed, wrong password');
                postAuthenticationFailed(req, res);
              }
            });
          }).then(function () {
            database.done();
          }).fail(function (err) {
            debug('checking basic authentication against database failed.');
            debug(err);
            debug(err.stack);
            database.done(err);
            postAuthenticationFailed(req, res);
          });
        } else {
          postAuthenticationFailed(req, res);
        }
      } else {
        postAuthenticationFailed(req, res);
      }
    } else {
      debug('No authorization header received from client. Rejecting.');
      postAuthenticationFailed(req, res);
    }
  };
}

function checkBasicAuthentication(authenticator) {
  'use strict';
  return function (req, res, next) {
    var basic, encoded, decoded, firstColonIndex, username, password;
    var typeToMapping, type, mapping;
    var path = req.route.path;
    var database;

    if (path !== '/me' && path !== '/batch') {
      typeToMapping = typeToConfig(resources);
      type = req.route.path.split(':')[0].replace(/\/$/, '');
      mapping = typeToMapping[type];
      if (mapping.public) {
        next();
        return;
      }
    }

    if (req.headers.authorization) {
      basic = req.headers.authorization;
      encoded = basic.substr(6);
      decoded = new Buffer(encoded, 'base64').toString('utf-8');
      firstColonIndex = decoded.indexOf(':');
      if (firstColonIndex !== -1) {
        username = decoded.substr(0, firstColonIndex);
        password = decoded.substr(firstColonIndex + 1);
        if (username && password && username.length > 0 && password.length > 0) {
          pgConnect(postgres, configuration).then(function (db) {
            database = db;
            return authenticator(database, username, password);
          }).then(function () {
            database.done();
            next();
          }).fail(function (err) {
            debug('checking basic authentication against database failed.');
            debug(err);
            debug(err.stack);
            database.done(err);
            next();
          });
        } else {
          next();
        }
      } else {
        next();
      }
    } else {
      debug('No authorization header received from client');
      next();
    }
  };
}

function logRequests(req, res, next) {
  'use strict';
  var start;
  if (configuration.logrequests) {
    debug(req.method + ' ' + req.path + ' starting.'
              + (req.headers['x-request-id'] ? ' req_id: ' + req.headers['x-request-id'] : '') + ' '
              + common.pgPoolInfo(postgres, configuration));
    start = Date.now();
    res.on('finish', function () {
      var duration = Date.now() - start;
      debug(req.method + ' ' + req.path + ' took ' + duration + ' ms. '
                + (req.headers['x-request-id'] ? ' req_id: ' + req.headers['x-request-id'] : '') + ' '
                + common.pgPoolInfo(postgres, configuration));
    });
  }
  next();
}

function postProcess(functions, db, body, req, path) {
  'use strict';
  var promises;
  var deferred = Q.defer();

  // special case for validate
  if (path.indexOf('validate') != -1) {
    path = path.replace('validate', body.key);
  }

  var elements = [{path: path, body: body}];

  if (functions && functions.length > 0) {
    promises = [];

    configuration.identify(req, db).then(function (me) {

      functions.forEach(function (f) {
        promises.push(f(db, elements, me));
      });

      Q.all(promises).then(function () {
        debug('all post processing functions resolved.');
        deferred.resolve();
      }).catch(function (err) {
        debug('one of the post processing functions rejected.');
        deferred.reject(err);
      });
    }).catch(function (err) {
      debug('Error during one of the post processing functions.');
      deferred.reject(err);
    });

  } else {
    debug('no post processing functions registered.');
    deferred.resolve();
  }

  return deferred.promise;
}

/* eslint-disable */
function executePutInsideTransaction(db, url, body, req, res) {
    'use strict';
    var deferred, element, errors;
    var type = url.split('/').slice(0, url.split('/').length - 1).join('/');
    var key = url.replace(type, '').substr(1);

    // special case - validation
    if (key == 'validate') {
      key = body.key;
    }

  debug('PUT processing starting. Request body :');
  debug(body);
  debug('Key received on URL : ' + key);

    var typeToMapping = typeToConfig(resources);
    var mapping = typeToMapping[type];
    var table = mapping.table ? mapping.table : mapping.type.split('/')[mapping.type.split('/').length - 1];

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
        if (body.hasOwnProperty(k)) {
          element[k] = body[k];
        }
      }
    }
    debug('Mapped incomming object according to configuration');

      // check and remove types from references.
      for (k in mapping.map) {
        if (mapping.map.hasOwnProperty(k)) {
          if (mapping.map[k].references && typeof element[k] != 'undefined') {
            value = element[k].href;
            if (!value) {
              throw new Error('No href found inside reference ' + k);
            }
            referencedType = mapping.map[k].references;
            referencedMapping = typeToMapping[referencedType];
            type = value.replace(value.split(referencedType)[1], '');
            refkey = value.replace(type, '').substr(1);
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

      var count = parseInt(results.rows[0].count, 10);

      if (count === 1) {
        executeOnFunctions(resources, mapping, 'onupdate', element);

        var update = prepare('update-' + table);
        update.sql('update "' + table + '" set "$$meta.modified" = current_timestamp ');
        for (var k in element) {
          if (k !== '$$meta.created' && k !== '$$meta.modified' && element.hasOwnProperty(k)) {
            update.sql(',\"' + k + '\"' + '=').param(element[k]);
          }
        }
        update.sql(' where "$$meta.deleted" = false and "key" = ').param(key);

        return pgExec(db, update, logsql, logdebug).then(function (results) {
          if (results.rowCount !== 1) {
            debug('No row affected - resource is gone');
            throw 'resource.gone';
          } else {
            res.status(200);
            return postProcess(mapping.afterupdate, db, body, req, url);
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
            res.status(201);
            return postProcess(mapping.afterinsert, db, body, req, url);
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

function executeAfterReadFunctions(database, elements, mapping, me, route, headerFn) {
  'use strict';
  var promises, i, ret;
  debug('executeAfterReadFunctions');
  var deferred = Q.defer();

  if (elements.length > 0 && mapping.afterread && mapping.afterread.length > 0) {
    promises = [];
    for (i = 0; i < mapping.afterread.length; i++) {
      promises.push(mapping.afterread[i](database, elements, me, route, headerFn));
    }

    Q.allSettled(promises).then(function (results) {
      debug('allSettled :');
      debug(results);
      var errors = [];
      var j;

      for (j = 0; j < results.length; j++) {
        if (results[j].state === 'rejected') {
          if (results[j].reason) {
            if (results[j].reason.statusCode) {
              deferred.reject({
                type: 'afterread.failed',
                status: results[j].reason.statusCode,
                body: results[j].reason.body
              });
            } else {
              errors.push(results[j].reason.message);
            }
          } else {
            errors.push(results[j].state);
          }

        }
      }

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
  var type = req.route.path.split('/').slice(0, req.route.path.split('/').length - 1).join('/');
  var mapping = typeToMapping[type];

  resp.set('Content-Type', 'application/json');
  resp.send(mapping.schema);
}

/* Handle GET /docs and /{type}/docs */
function getDocs(req, resp) {
  'use strict';
  var typeToMapping = typeToConfig(resources);
  var type = req.route.path.split('/').slice(0, req.route.path.split('/').length - 1).join('/');
  var mapping;
  if (type in typeToMapping) {
    mapping = typeToMapping[type];
    resp.locals.path = req._parsedUrl.pathname;
    resp.render('resource', {resource: mapping, queryUtils: exports.queryUtils});
  } else if (req.route.path === '/docs') {
    resp.render('index', {config: configuration});
  } else {
    resp.status(404).send('Not Found');
  }
}

function getSQLFromListResource(path, parameters, count, database, query) {
  'use strict';

  var typeToMapping = typeToConfig(resources);
  var type = path;
  var mapping = typeToMapping[type];

  var sql;
  var table = mapping.table ? mapping.table : mapping.type.split('/')[mapping.type.split('/').length - 1];
  var columns;

  if (parameters.expand && parameters.expand.toLowerCase() === 'none') {
    columns = '"key"';
  } else {
    columns = sqlColumnNames(mapping);
  }

  if (count) {
    if (parameters['$$meta.deleted'] === 'true') {
      sql = 'select count(*) from "' + table + '" where "' + table + '"."$$meta.deleted" = true ';
    } else if (parameters['$$meta.deleted'] === 'any') {
      sql = 'select count(*) from "' + table + '" where 1=1 ';
    } else {
      sql = 'select count(*) from "' + table + '" where "' + table + '"."$$meta.deleted" = false ';
    }
    query.sql(sql);
  } else {
    if (parameters['$$meta.deleted'] === 'true') {
      sql = 'select ' + columns + ', "$$meta.deleted", "$$meta.created", "$$meta.modified" from "';
      sql += table + '" where "' + table + '"."$$meta.deleted" = true ';
    } else if (parameters['$$meta.deleted'] === 'any') {
      sql = 'select ' + columns + ', "$$meta.deleted", "$$meta.created", "$$meta.modified" from "';
      sql += table + '" where 1=1 ';
    } else {
      sql = 'select ' + columns + ', "$$meta.deleted", "$$meta.created", "$$meta.modified" from "';
      sql += table + '" where "' + table + '"."$$meta.deleted" = false ';
    }
    query.sql(sql);
  }

  debug('* applying URL parameters to WHERE clause');
  return applyRequestParameters(mapping, parameters, query, database, count);

}

function getListResource(executeExpansion, defaultlimit, maxlimit) {
  'use strict';
  return function (req, resp) {
    var typeToMapping = typeToConfig(resources);
    var type = req.route.path;
    var mapping = typeToMapping[type];

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
      countquery = prepare();
      return getSQLFromListResource(req.route.path, req.query, true, database, countquery);
    }).then(function () {
      debug('* executing SELECT COUNT query on database');
      return pgExec(database, countquery, logsql, logdebug);
    }).then(function (results) {
      count = parseInt(results.rows[0].count, 10);
      query = prepare();
      return getSQLFromListResource(req.route.path, req.query, false, database, query);
    }).then(function () {
      // All list resources support orderBy, limit and offset.
      var orderBy = req.query.orderBy;
      var descending = req.query.descending;

      if (orderBy) {
        valid = true;
        orders = orderBy.split(',');
        orderBy = '';
        for (o = 0; o < orders.length; o++) {
          order = orders[o];

          if (!mapping.map[order]) {
            if (order === '$$meta.created' || order === '$$meta.modified') {
              orders[o] = order;
            } else {
              valid = false;
              break;
            }
          }

          if (orderBy.length === 0) {
            orderBy = orders[o];
          } else {
            orderBy = orderBy + ',' + orders[o];
          }

        }
        if (valid) {
          query.sql(' order by "' + orders + '"');
          if (descending && descending === 'true') {
            query.sql(' desc ');
          } else {
            query.sql(' asc ');
          }
        } else {
          cl('Can not order by [' + orderBy + ']. One or more unknown properties. Ignoring orderBy.');
        }
      } else {
        query.sql(' order by "$$meta.created", "key"');
      }

      queryLimit = req.query.limit || defaultlimit;

      offset = req.query.offset || 0;
      var err;

      if (queryLimit > maxlimit || (queryLimit === '*' && req.query.expand !== 'NONE')) {

        err = {
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

        throw err;
      }

      if (!(queryLimit === '*' && req.query.expand === 'NONE')) {
        // limit condition is always added except special case where the paremeter limit=* and expand is NONE (#104)
        query.sql(' limit ').param(queryLimit);
      }

      if (offset) {
        query.sql(' offset ').param(offset);
      }

      debug('* executing SELECT query on database');
      return pgExec(database, query, logsql, logdebug);
    }).then(function (result) {
      var deferred;
      debug('pgExec select ... OK');
      debug(result);

      elements = [];
      if (mapping.handlelistqueryresult) {
        deferred = Q.defer();
        mapping.handlelistqueryresult(req, result).then(function (ret) {
          output = ret;
          deferred.resolve();
        }).catch(function (err) {
          deferred.reject(err);
        });
        return deferred.promise;
      }
      var rows = result.rows;
      var results = [];
      var row, currentrow;
      var element, msg;

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
          if (currentrow['$$meta.deleted']) {
            element.$$expanded.$$meta.deleted = true;
          }
          element.$$expanded.$$meta.created = currentrow['$$meta.created'];
          element.$$expanded.$$meta.modified = currentrow['$$meta.modified'];
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
          schema: mapping.type + '/schema',
          docs: mapping.type + '/docs'
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
      return executeExpansion(database, elements, mapping, resources, req.query.expand, req, resp.header.bind(resp));
    }).then(function () {
      debug('* sending response to client :');
      debug(output);
      resp.set('Content-Type', 'application/json');
      resp.database = database;
      return resp.send(output);
    }).fail(function (err) {
      if (err.type && err.status && err.body) {
        resp.status(err.status).send(err.body);
      } else {
        cl('GET processing had errors. Removing pg client from pool. Error : ');
        if (err.stack) {
          cl(err.stack);
        } else {
          cl(err);
        }
        if (err.message) {
          resp.status(409).send({
            errors: [
              {
                type: 'ERROR',
                code: 'invalid.query.parameter',
                message: err.message
              }
            ]
          });
        } else {
          resp.status(500).send('Internal Server Error. [' + err.toString() + ']');
        }

      }
    }).finally(function () {
      database.client.query('ROLLBACK', function (err) {
        // If err is defined, client will be removed from pool.
        if (err) {
          database.done(err);
        } else {
          database.done();
          if (req.headers['x-request-id']) {
            debug('Freed db of list req_id: ' + req.headers['x-request-id'] + ' '
                      + common.pgPoolInfo(postgres, configuration));
          }
        }
      });
    });
  };
}

function getRegularResource(executeExpansion) {
  'use strict';
  return function (req, resp) {
    var typeToMapping = typeToConfig(resources);
    var type = req.route.path.split(':')[0].replace(/\/$/, '');
    var mapping = typeToMapping[type];
    var key = req.params.key;

    var database;
    var element;
    var elements;
    var field;
    pgConnect(postgres, configuration).then(function (db) {
      database = db;
    }).then(function () {
      debug('* query by key');
      return queryByKey(resources, database, mapping, key,
        req.query['$$meta.deleted'] === 'true' || req.query['$$meta.deleted'] === 'any');
    }).then(function (result) {
      element = result.object;
      if (!element.$$meta) {
        element.$$meta = {};
      }
      element.$$meta.permalink = mapping.type + '/' + key;
      if (result.$$meta) {
        for (field in result.$$meta) {
          if (result.$$meta.hasOwnProperty(field) && result.$$meta[field]) {
            element.$$meta[field] = result.$$meta[field];
          }
        }
      }
      elements = [];
      elements.push(element);
      debug('* executing expansion : ' + req.query.expand);
      return executeExpansion(database, elements, mapping, resources, req.query.expand, req, resp.header.bind(resp));
    }).then(function () {
      debug('* sending response to the client :');
      debug(element);
      resp.set('Content-Type', 'application/json');
      resp.database = database;
      return resp.send(element);
    }).fail(function (err) {
      if (err.type && err.status && err.body) {
        resp.status(err.status).send(err.body);
        //database.done();
      } else {
        cl('GET processing had errors. Removing pg client from pool. Error : ');
        cl(err);
        //database.done(err);
        resp.status(500).send('Internal Server Error. [' + err.toString() + ']');
      }
    }).finally(function () {
      database.done();
      if (req.headers['x-request-id']) {
        debug('Freed db of resource req_id: ' + req.headers['x-request-id'] + ' '
                  + common.pgPoolInfo(postgres, configuration));
      }
    });
  };
}

function createOrUpdate(req, res) {
  'use strict';
  debug('* sri4node PUT processing invoked.');
  var url = req.path;
  pgConnect(postgres, configuration).then(function (db) {
    var begin = prepare('begin-transaction');
    begin.sql('BEGIN');
    return pgExec(db, begin, logsql, logdebug).then(function () {
      return executePutInsideTransaction(db, url, req.body, req, res);
    }).then(function () {
      debug('PUT processing went OK. Committing database transaction.');
      db.client.query('COMMIT', function (err) {
        // If err is defined, client will be removed from pool.
        db.done(err);
        debug('COMMIT DONE.');
        res.send(true);
      });
    }).fail(function (puterr) {
      cl('PUT processing failed. Rolling back database transaction. Error was :');
      cl(puterr && puterr.stack ? puterr.stack : puterr);
      db.client.query('ROLLBACK', function (rollbackerr) {
        // If err is defined, client will be removed from pool.
        db.done(rollbackerr);
        cl('ROLLBACK DONE.');
        if (puterr === 'resource.gone') {
          res.status(410).send();
        } else if (puterr && puterr.statusCode) {
          res.status(puterr.statusCode).send(puterr.body);
        } else {
          res.status(409).send(puterr);
        }
      });
    });
  }); // pgConnect
}

function validate(req, res) {
  'use strict';
  debug('* sri4node VALIDATE processing invoked.');
  var url = req.path;
  pgConnect(postgres, configuration).then(function (db) {
    var begin = prepare('begin-transaction');
    begin.sql('BEGIN');
    return pgExec(db, begin, logsql, logdebug).then(function () {
      return executePutInsideTransaction(db, url, req.body, req, res);
    }).then(function () {
      debug('VALIDATE processing went OK. Rolling back database transaction.');
      db.client.query('ROLLBACK', function (err) {
        // If err is defined, client will be removed from pool.
        db.done(err);
        debug('ROLLBACK DONE.');
        res.send(true);
      });
    }).fail(function (puterr) {
      cl('VALIDATE processing failed. Rolling back database transaction. Error was :');
      cl(puterr && puterr.stack ? puterr.stack : puterr);
      db.client.query('ROLLBACK', function (rollbackerr) {
        // If err is defined, client will be removed from pool.
        db.done(rollbackerr);
        cl('ROLLBACK DONE.');
        if (puterr === 'resource.gone') {
          res.status(410).send();
        } else if (puterr && puterr.statusCode) {
          res.status(puterr.statusCode).send(puterr.body);
        } else {
          res.status(409).send(puterr);
        }
      });
    });
  }); // pgConnect
}

function deleteResource(req, resp) {
  'use strict';
  debug('sri4node DELETE invoked');
  var typeToMapping = typeToConfig(resources);
  var type = req.route.path.split(':')[0].replace(/\/$/, '');
  var mapping = typeToMapping[type];
  var table = mapping.table ? mapping.table : mapping.type.split('/')[mapping.type.split('/').length - 1];

  var database;

  pgConnect(postgres, configuration).then(function (db) {
    database = db;
    var begin = prepare('begin-transaction');
    begin.sql('BEGIN');
    return pgExec(database, begin, logsql, logdebug);
  }).then(function () {
    var deletequery = prepare('delete-by-key-' + table);
    var sql = 'update ' + table + ' set "$$meta.deleted" = true, "$$meta.modified" = current_timestamp ';
    sql += 'where "$$meta.deleted" = false and "key" = ';
    deletequery.sql(sql)
      .param(req.params.key);
    return pgExec(database, deletequery, logsql, logdebug);
  }).then(function (results) {
    if (results.rowCount === 0) {
      debug('No row affected - the resource is already gone');
      resp.status(410);
    } else { // eslint-disable-line
      debug('Processing afterdelete');
      return postProcess(mapping.afterdelete, database, req.route.path, req, req.originalUrl);
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
    cl(delerr && delerr.stack ? delerr.stack : delerr);
    database.client.query('ROLLBACK', function (rollbackerr) {
      // If err is defined, client will be removed from pool.
      database.done(rollbackerr);
      if (delerr && delerr.statusCode) {
        resp.status(delerr.statusCode).send(delerr.body);
      } else {
        cl('ROLLBACK DONE. Sending 500 Internal Server Error. [' + delerr + ']');
        resp.status(500).send('Internal Server Error. [' + delerr + ']');
      }

    });
  });
}

function wrapCustomRouteHandler(customRouteHandler, config) {
  'use strict';

  return function (req, res) {
    var database;
    var me;

    debug('Start processing of custom route. [' + req.url + ']');
    debug('Connecting to database.');
    pgConnect(postgres, configuration).then(function (db) {
      if (!db) {
        throw new Error('No database connection !');
      }
      database = db;
      debug('Database connection ok.');
      debug('Establishing security context through the config.identify function.');
      return config.identify(req, database);
    }).then(function (identity) {
      me = identity;
      debug('Handing control to the custom route handler.');
      res.database = database;
      return customRouteHandler(req, res, database, me);
    }).then(function () {
      debug('Processing of custom route went OK. Returning database client to pool.');
      database.done();
    }).catch(function (err) {
      debug('Error on processing of custom route. Discarding database client.');
      debug('Sending internal server error 500 to client');
      database.done(err);
      res.status(500).end();
    });
  };
}

function handleBatchOperations(secureCacheFns) {
  'use strict';

  return function (req, res, next) {
    var batch = req.body.slice();
    batch.reverse();
    var i;
    var batches = [];
    var url;
    var type;

    // split batch into different response handlers (per resource)
    for (i = 0; i < batch.length; i++) {
      url = batch[i].href;
      type = url.split('/').slice(0, url.split('/').length - 1).join('/');
      batches.push({
        type: type,
        batch: batch[i]
      });
    }

    function nextElement() {
      var element;
      var elementReq;

      if (batches.length > 0) {
        element = batches.pop();
        type = element.type;
        elementReq = {
          method: element.batch.verb,
          path: 'batch',
          originalUrl: element.batch.href,
          body: element.batch,
          user: req.user,
          headers: req.headers
        };
        secureCacheFns[type](elementReq, res, nextElement);
      } else {
        return next();
      }
    }

    return nextElement();
  };

}

function batchOperation(req, resp) {
  'use strict';
  var database;
  var batchVerb;
  var batchType;
  var hrefs = [];

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
        batchVerb = verb;
        batchType = url;
        if (verb === 'PUT') {
          // we continue regardless of an individual error
          return executePutInsideTransaction(database, url, body, req, resp).finally(function () {
            return recurse();
          });
        } else if (verb === 'GET') {
          hrefs.push(element.href);
          recurse();
        } else { // eslint-disable-line
          // To Do : Implement other operations here too.
          cl('UNIMPLEMENTED - /batch ONLY SUPPORTS PUT OPERATIONS !!!');
          throw new Error();
        }
      }
    }

    return recurse(batch);
  }).then(function () {
    if (batchVerb === 'PUT') {
      cl('PUT processing went OK. Committing database transaction.');
      database.client.query('COMMIT', function (err) {
        // If err is defined, client will be removed from pool.
        database.done(err);
        cl('COMMIT DONE.');
        resp.send(true);
      });
    } else if (batchVerb === 'GET') {
      var executeExpansion = require('./js/expand.js')(false, prepare, pgExec, executeAfterReadFunctions, null);
      req.query.hrefs = hrefs.join(',');
      req.route.path = batchType.split('/').slice(0, -1).join('/');
      getListResource(executeExpansion, 1000, 1000)(req, resp);
    }
  }).fail(function (err) {
    cl('Batch processing failed. Rolling back database transaction. Error was :');
    cl(err);
    database.client.query('ROLLBACK', function (rollbackerr) {
      // If err is defined, client will be removed from pool.
      database.done(rollbackerr);
      cl('ROLLBACK DONE.');
      resp.status(500).send(err);
    });
  });
}

function checkRequiredFields(mapping, information) {
  'use strict';
  var mandatoryFields = ['key', '$$meta.created', '$$meta.modified', '$$meta.deleted'];
  var i;
  var table, idx;
  for (i = 0; i < mandatoryFields.length; i++) {
    table = mapping.table ? mapping.table : mapping.type.split('/')[mapping.type.split('/').length - 1];
    idx = '/' + table;
    if (!information[idx]) {
      throw new Error('Table \'' + table + '\' seems to be missing in the database.');
    }
    if (!information[idx].hasOwnProperty(mandatoryFields[i])) {
      throw new Error('Mapping ' + mapping.type + ' lacks mandatory field ' + mandatoryFields[i]);
    }
  }

}

function registerCustomRoutes(mapping, app, config, secureCacheFn) {
  'use strict';
  var i;
  var customroute;
  var wrapped;
  var msg;
  var authentication = config.checkAuthentication ? config.checkAuthentication : config.authenticate;

  var customMiddleware = function (req, res, next) {
    next();
  };
  for (i = 0; i < mapping.customroutes.length; i++) {
    customroute = mapping.customroutes[i];
    if (customroute.route && customroute.handler) {

      if (!customroute.method) {
        customroute.method = 'GET';
      }

      if (customroute.middleware) {
        // Can be an array or a single function. Express.js handles this
        // gracefully.
        customMiddleware = customroute.middleware;
      }

      if (customroute.method === 'GET') {
        wrapped = wrapCustomRouteHandler(customroute.handler, config);
        // Only for GET we allow for public resources
        app.get(customroute.route, logRequests, authentication, secureCacheFn, compression(),
          customMiddleware, wrapped);
      } else if (customroute.method === 'PUT') {
        wrapped = wrapCustomRouteHandler(customroute.handler, config);
        app.put(customroute.route, logRequests, config.authenticate, secureCacheFn, compression(),
          customMiddleware, wrapped);
      } else if (customroute.method === 'DELETE') {
        wrapped = wrapCustomRouteHandler(customroute.handler, config);
        app.delete(customroute.route, logRequests, config.authenticate, secureCacheFn, compression(),
          customMiddleware, wrapped);
      } else {
        msg = 'Method not supported on custom routes : ' + customroute.method;
        error(msg);
        throw new Error(msg);
      }
    }
  }
}

/* express.js application, configuration for roa4node */
exports = module.exports = {
  configure: function (app, pg, config) {
    'use strict';
    var executeExpansion = require('./js/expand.js')(config.logdebug, prepare, pgExec, executeAfterReadFunctions,
      config.identify);
    var configIndex, mapping, url;
    var defaultlimit;
    var maxlimit;
    var secureCacheFn;
    var i;
    var secureCacheFns = {};
    var msg;
    var database;
    var authentication;
    var relationFilters;
    var d = Q.defer();

    configuration = config;
    resources = config.resources;
    logsql = config.logsql;
    logdebug = config.logdebug;
    postgres = pg;

    if (configuration.forceSecureSockets) {
      // All URLs force SSL and allow cross origin access.
      app.use(forceSecureSockets);
    }

    app.use(bodyParser.json());

    //to parse html pages
    app.use('/docs/static', express.static(__dirname + '/js/docs/static'));
    app.engine('.jade', require('jade').__express);
    app.set('view engine', 'jade');
    app.set('views', __dirname + '/js/docs');

    var emt;

    if (config.logmiddleware) {
      process.env.TIMER = true; //eslint-disable-line
      emt = require('express-middleware-timer');
      // init timer
      app.use(emt.init(function emtReporter(req, res) {
        // Write report to file.
        var report = emt.calculate(req, res);
        var out = 'middleware timing: ';
        var timer;
        var timers = [];

        for (timer in report.timers) {
          if (report.timers.hasOwnProperty(timer)) {
            timers.push('[' + timer + ' took ' + report.timers[timer].took + ']');
          }
        }

        console.log(out + timers.join(',')); //eslint-disable-line

      }));
    } else {
      emt = {
        instrument: function noop(middleware) {
          return middleware;
        }
      };
    }

    // a global error handler to catch among others JSON errors
    //  => log stack trace and send JSON error message tp client
    // (unfortunatly the JSON errors cannot be distinguished from other errors ?!)
    app.use(function (err, req, res, next) {
      var body;
      if (err) {
        body = {
          errors: [{code: 'generic.error', message: err.name + ':' + err.message, body: err.body}],
          status: err.status || 500
        };
        res.status(err.status || 500).send(body);
      } else {
        next();
      }
    });

    if (!config.authenticate) {
      msg = 'No authenticate function installed !';
      cl(msg);
      throw new Error(msg);
    }
    if (!config.identify) {
      msg = 'No identify function installed !';
      cl(msg);
      throw new Error(msg);
    }

    url = '/me';
    app.get(url, logRequests, config.authenticate, function (req, resp) {
      pgConnect(postgres, configuration).then(function (db) {
        database = db;
      }).then(function () {
        return config.identify(req, database);
      }).then(function (me) {
        resp.set('Content-Type', 'application/json');
        resp.send(me);
        resp.end();
        database.done();
      }).fail(function (err) {
        resp.status(500).send('Internal Server Error. [' + err.toString() + ']');
        database.done(err);
      });
    });

    app.put('/log', function (req, resp) {
      var j;
      var err = req.body;
      cl('Client side error :');
      var lines = err.stack.split('\n');
      for (j = 0; i < lines.length; j++) {
        cl(lines[j]);
      }
      resp.end();
    });

    app.get('/docs', logRequests, getDocs);

    app.get('/resources', logRequests, function (req, resp) {
      resp.set('Content-Type', 'application/json');
      var resourcesToSend = {};
      resources.forEach(function (value) {

        resourcesToSend[value.type.substring(1)] = {
          docs: value.type + '/docs',
          schema: value.type + '/schema',
          href: value.type
        };

        if (value.schema) {
          resourcesToSend[value.type.substring(1)].description = value.schema.title;
        }

      });
      resp.send(resourcesToSend);
    });

    pgConnect(postgres, configuration).then(function (db) {
      database = db;
      return informationSchema(database, configuration);
    }).then(function (information) {

        for (configIndex = 0; configIndex < resources.length; configIndex++) {
          mapping = resources[configIndex];

          try {
            checkRequiredFields(mapping, information);

            // register schema for external usage. public.
            url = mapping.type + '/schema';
            app.use(url, logRequests);
            app.get(url, getSchema);

            //register docs for this type
            app.get(mapping.type + '/docs', logRequests, getDocs);
            app.use(mapping.type + '/docs/static', express.static(__dirname + '/js/docs/static'));
            app.use(mapping.type + '/docs/docs/static', express.static(__dirname + '/js/docs/static'));

            // register list resource for this type.
            url = mapping.type;

            secureCacheFn = secureCache(mapping, configuration, postgres, executeAfterReadFunctions);
            secureCacheFns[url] = secureCacheFn;

            // register list resource for this type.
            maxlimit = mapping.maxlimit || MAX_LIMIT;
            defaultlimit = mapping.defaultlimit || DEFAULT_LIMIT;

            authentication = config.checkAuthentication ? config.checkAuthentication : config.authenticate;

            // app.get - list resource
            app.get(url, emt.instrument(logRequests), emt.instrument(authentication, 'authenticate'),
              emt.instrument(secureCacheFn, 'secureCache'), emt.instrument(compression()),
              emt.instrument(getListResource(executeExpansion, defaultlimit, maxlimit), 'list'));

            // register single resource
            url = mapping.type + '/:key';

            app.route(url)
              .get(logRequests, emt.instrument(authentication, 'authenticate'),
                emt.instrument(secureCacheFn, 'secureCache'), emt.instrument(compression()),
                emt.instrument(getRegularResource(executeExpansion), 'getResource'))
              .put(logRequests, config.authenticate, secureCacheFn, createOrUpdate)
              .delete(logRequests, config.authenticate, secureCacheFn, deleteResource); // app.delete

            // validation route
            url = mapping.type + '/validate';
            app.post(url, logRequests, config.authenticate, secureCacheFn, validate);

            // register custom routes (if any)

            if (mapping.customroutes && mapping.customroutes instanceof Array) {
              registerCustomRoutes(mapping, app, config, secureCacheFn);
            }

            // append relation filters if auto-detected a relation resource
            if (mapping.map.from && mapping.map.to) {

              //mapping.query.relationsFilter = mapping.query.relationsFilter(mapping.map.from, mapping.map.to);
              relationFilters = require('./js/relationsFilter.js');
              if (!mapping.query) {
                mapping.query = {};
              }

              for (var key in relationFilters) {
                if (relationFilters.hasOwnProperty(key)) {
                  mapping.query[key] = relationFilters[key];
                }
              }
            }
          } catch (err) {
            cl('\n\nSRI4NODE FAILURE: \n');
            cl(err.stack);
            d.reject(err);
          }

        } // for all mappings.

      })
      .then(function () {
        url = '/batch';
        app.put(url, logRequests, config.authenticate, handleBatchOperations(secureCacheFns), batchOperation);
        app.post(url, logRequests, config.authenticate, handleBatchOperations(secureCacheFns), batchOperation);
        d.resolve();
      })
      .fail(function (err) {
        cl('\n\nSRI4NODE FAILURE: \n');
        cl(err.stack);
        d.reject(err);
      })
      .finally(function () {
        database.done();
      });

    return d.promise;
  },

  utils: {
    // Utility to run arbitrary SQL in validation, beforeupdate, afterupdate, etc..
    executeSQL: pgExec,
    getConnection: pgConnect,
    prepareSQL: queryobject.prepareSQL,

    generateError: generateError,

    convertListResourceURLToSQL: getSQLFromListResource,

    /*
     Add references from a different resource to this resource.
     * type : the resource type that has a reference to the retrieved elements.
     * column : the database column that contains the foreign key.
     * key : the name of the key to add to the retrieved elements.
     */
    addReferencingResources: function (type, column, targetkey, expand) {
      'use strict';
      return function (database, elements) {
        var tablename, query, elementKeys, elementKeysToElement;
        var permalink, elementKey;
        var deferred = Q.defer();
        var typeToMapping = typeToConfig(resources);
        var mapping = typeToMapping[type];

        if (elements && elements.length && elements.length > 0) {
          tablename = type.split('/')[type.split('/').length - 1];
          query = prepare();
          elementKeys = [];
          elementKeysToElement = {};
          elements.forEach(function (element) {
            permalink = element.$$meta.permalink;
            elementKey = permalink.split('/')[2];
            elementKeys.push(elementKey);
            elementKeysToElement[elementKey] = element;
            element[targetkey] = [];
          });

          query.sql('select *, \"' + column + '\" as fkey from ' +
            tablename + ' where \"' + column + '\" in (').array(elementKeys)
            .sql(') and \"$$meta.deleted\" = false');
          pgExec(database, query, logsql, logdebug).then(function (result) {
            result.rows.forEach(function (row) {
              var element = elementKeysToElement[row.fkey];
              var target = {href: type + '/' + row.key};
              var key, referencedType;
              if (expand) {
                target.$$expanded = {};
                for (key in row) {
                  if (row.hasOwnProperty(key) && row[key] && key.indexOf('$$meta.') === -1 && key !== 'fkey') {
                    if (mapping.map[key] && mapping.map[key].references) {
                      referencedType = mapping.map[key].references;
                      target.$$expanded[key] = {href: typeToMapping[referencedType].type + '/' + row[key]};
                    } else {
                      target.$$expanded[key] = row[key];
                    }
                  }
                }

                target.$$expanded.$$meta = {
                  permalink: type + '/' + row.key,
                  schema: type + '/schema',
                  created: row['$$meta.created'],
                  modified: row['$$meta.modified']
                };
              }
              element[targetkey].push(target);
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
    },

    basicAuthentication: doBasicAuthentication,
    checkBasicAuthentication: checkBasicAuthentication,
    postAuthenticationFailed: postAuthenticationFailed
  },

  queryUtils: require('./js/queryUtils.js'),
  mapUtils: require('./js/mapUtils.js'),
  schemaUtils: require('./js/schemaUtils.js')
};
