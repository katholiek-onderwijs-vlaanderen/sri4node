/* Response handler (cache and validation) middleware */

var localCacheImpl = require('./cache/localCache');
var redisCacheImpl = require('./cache/redisCache');
var Q = require('q');
var common = require('./common.js');
var cl = common.cl;
var pgConnect = common.pgConnect;
var configuration;
var postgres;
var executeAfterReadFunctions;

// used to determine where to store the cached object (there are two stores, list
// and resource. The purge logic is different)
function responseIsList(response) {
  'use strict';
  return response.$$meta && response.$$meta.hasOwnProperty('count');
}

function validateRequest(config, mapping, req, res, batch) {
  'use strict';
  var promises;
  var deferred = Q.defer();
  var database;

  if (!mapping.public && mapping.secure && mapping.secure.length > 0) {
    pgConnect(postgres, configuration).then(function (db) {
      database = db;
    }).then(function () {
      return config.identify(req, database);
    }).then(function (me) {
      promises = [];
      mapping.secure.forEach(function (f) {
        promises.push(f(req, res, database, me, batch));
      });

      return Q.all(promises);
    }).then(function () {
      deferred.resolve();
    }).catch(function () {
      deferred.reject({
        type: 'Secure.failed',
        status: 403,
        body: '<h1>403 Forbidden</h1>'
      });
    }).finally(function () {
      database.done();
    });
  } else {
    deferred.resolve();
  }

  return deferred.promise;
}

function createStorableObject(res, buffer, resources) {
  'use strict';
  var object = {
    headers: {},
    data: buffer
  };

  if (resources) {
    object.resources = resources;
  }

  if (res.getHeader('Content-Type')) {
    object.headers['Content-Type'] = res.getHeader('Content-Type');
  }

  // used to know if the stored object is compressed or not
  if (res.getHeader('Content-Encoding')) {
    object.headers['Content-Encoding'] = res.getHeader('Content-Encoding');
  }

  return object;

}

function getResources(response) {
  'use strict';
  var i;
  var results = [];

  if (response.$$meta) {
    if (response.$$meta.permalink) {
      return [response];
    } else if (response.results) {
      for (i = 0; i < response.results.length; i++) {
        // only check access on expanded resources, anyone can see a href
        if (response.results[i].$$expanded) {
          results.push(response.results[i].$$expanded);
        }
      }
    }
  }

  return results;
}

function createBatch(resources, verb) {
  'use strict';
  var batch = [];
  var i;

  for (i = 0; i < resources.length; i++) {
    batch.push({
      href: resources[i].$$meta.permalink,
      verb: verb
    });
  }

  return batch;
}

function store(url, cache, req, res, config, mapping) {
  'use strict';

  var send = res.send; // hijack!
  var write = res.write;
  var end = res.end;
  var isList;
  var cacheSection;
  var buffer;
  var ended = false;
  var resources;
  var validated = false;

  // proxy

  if (cache) {
    res.write = function (chunk, encoding) {

      if (!ended && chunk) {
        if (!buffer) {
          buffer = new Buffer(chunk);
        } else {
          buffer = Buffer.concat([buffer, chunk]);
        }
      }

      return write.call(this, chunk, encoding);

    };

    res.end = function (chunk, encoding) {
      ended = true;

      if (res.statusCode === 200 && cacheSection) {
        if (chunk) {
          cache[cacheSection].set(url, createStorableObject(res, new Buffer(chunk), resources));
        } else if (buffer) {
          cache[cacheSection].set(url, createStorableObject(res, buffer, resources));
        }
      }

      return end.call(this, chunk, encoding);

    };
  }

  res.send = function (output) {

    var self;
    var batch;
    var database;

    // express first send call tranforms a json into a string and calls send again
    // we only process the first send to store the object
    if (typeof output === 'object' && cache) {
      // first call
      isList = responseIsList(output);
      resources = getResources(output);

      cacheSection = isList ? 'list' : 'resources';
    }

    if (!validated) {
      validated = true;
      self = this; //eslint-disable-line

      if (resources) {
        batch = createBatch(resources, 'GET');
      }

      validateRequest(config, mapping, req, res, batch)
      .then(function () {
        if (!mapping.public) {
          return pgConnect(postgres, configuration);
        }
        send.call(self, output);
      }).then(function (db) {
        database = db;
        return config.identify(req, db);
      }).then(function (me) {
        if (resources) {
          return executeAfterReadFunctions(database, resources, mapping, me);
        }
        return true;
      }).then(function () {
        send.call(self, output);
      }).catch(function (error) {
        if (error && error.type && error.status && error.body) {
          res.status(error.status).send(error.body);
        } else {
          res.status(403).send({
            type: 'access.denied',
            status: 403,
            body: 'Forbidden'
          });
        }
      }).finally(function () {
        database.done();
      });
    } else {
      send.call(this, output);
    }

  };

}

exports = module.exports = function (mapping, config, pg, afterReadFunctionsFn) {
  'use strict';

  var header;

  var cache = false;
  var cacheImpl;
  var cacheStore;
  configuration = config;
  postgres = pg;
  executeAfterReadFunctions = afterReadFunctionsFn;

  if (mapping.cache) {
    cache = true;
    cl('sri4node cache active for resource ' + mapping.type);
    switch (mapping.cache.type) {
    case 'redis':
      cacheImpl = redisCacheImpl(mapping.cache.ttl, mapping.cache.redis);
      break;
    default:
      cacheImpl = localCacheImpl(mapping.cache.ttl);
      break;
    }
  }

  if (cache) {
    cacheStore = {
      resources: cacheImpl,
      list: cacheImpl
    };
  }

  return function (req, res, next) {

    function handleResponse(value) {
      var i;
      var database;

      if (req.method === 'GET') {
        if (value) {
          validateRequest(config, mapping, req, res, createBatch(value.resources, 'GET'))
          .then(function () {
            if (!mapping.public) {
              return pgConnect(postgres, configuration);
            }
            for (header in value.headers) {
              if (value.headers.hasOwnProperty(header)) {
                res.set(header, value.headers[header]);
              }
            }

            res.send(value.data);
          }).then(function (db) {
            database = db;
            return config.identify(req, db);
          }).then(function (me) {
            return executeAfterReadFunctions(database, value.resources, mapping, me);
          })
          .then(function () {
            for (header in value.headers) {
              if (value.headers.hasOwnProperty(header)) {
                res.set(header, value.headers[header]);
              }
            }

            res.send(value.data);
          }).catch(function (error) {
            if (error && error.type && error.status && error.body) {
              res.status(error.status).send(error.body);
            } else {
              res.status(403).send({
                type: 'access.denied',
                status: 403,
                body: 'Forbidden'
              });
            }
          }).finally(function () {
            database.done();
          });
        } else {
          // register handler to process response when responding
          store(req.originalUrl, cacheStore, req, res, config, mapping);
          next();
        }

      } else if (req.method === 'PUT') {
        // is it a batch?
        if (req.path === 'batch') {
          validateRequest(config, mapping, req, res, req.body).then(function () {
            if (cache) {
              for (i = 0; i < req.body.length; i++) {
                cacheStore.resources.del(req.body[i].href);
              }

              // TODO do this more efficiently? (only delete the entries where this resource is present)
              cacheStore.list.flushAll();
            }
            next();
          }).catch(function (error) {
            if (error && error.type && error.status && error.body) {
              res.status(error.status).send(error.body);
            } else {
              res.status(403).send({
                type: 'access.denied',
                status: 403,
                body: 'Forbidden'
              });
            }
          });
        } else {
          validateRequest(config, mapping, req, res).then(function () {
            if (cache) {
              cacheStore.resources.del(req.originalUrl);
              // TODO do this more efficiently? (only delete the entries where this resource is present)
              cacheStore.list.flushAll();
            }
            next();
          }).catch(function (error) {
            if (error && error.type && error.status && error.body) {
              res.status(error.status).send(error.body);
            } else {
              res.status(403).send({
                type: 'access.denied',
                status: 403,
                body: 'Forbidden'
              });
            }
          });
        }

      } else if (req.method === 'DELETE') {
        validateRequest(config, mapping, req, res).then(function () {
          if (cache) {
            cacheStore.resources.del(req.originalUrl);
            // TODO do this more efficiently? (only delete the entries where this resource is present)
            cacheStore.list.flushAll();
          }
          next();
        }).catch(function (error) {
          if (error && error.type && error.status && error.body) {
            res.status(error.status).send(error.body);
          } else {
            res.status(403).send({
              type: 'access.denied',
              status: 403,
              body: 'Forbidden'
            });
          }
        });
      } else {
        next();
      }
    }

    if (cache && req.method === 'GET') {
      Q.allSettled([cacheStore.resources.get(req.originalUrl), cacheStore.list.get(req.originalUrl)]).done(
        function (results) {
          if (results[0].state === 'rejected' || results[1].state === 'rejected') {
            cl('cache promise rejected !');
            cl(results);
          }
          handleResponse(results[0].value || results[1].value);
        });
    } else {
      handleResponse();
    }
  };
};
