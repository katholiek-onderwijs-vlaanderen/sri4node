/* Response handler (cache and validation) middleware */

var DEFAULT_TTL = 120;

var NodeCache = require('node-cache');
var cacheStore = [];
var Q = require('q');
var common = require('./common.js');
var pgConnect = common.pgConnect;
var configuration;
var postgres;

// used to determine where to store the cached object (there are two stores, list
// and resource. The purge logic is different)
function responseIsList(response) {
  'use strict';
  return response.$$meta && response.$$meta.hasOwnProperty('count');
}

function validateRequest(mapping, req, res, resources) {
  'use strict';
  var promises;
  var deferred = Q.defer();
  if (!mapping.public && mapping.secure && mapping.secure.length > 0) {

    Q.all([pgConnect(postgres, configuration), mapping.getme(req)]).done(
      function (results) {

        promises = [];
        mapping.secure.forEach(function (f) {
          promises.push(f(req, res, results[0], results[1], resources));
        });

        Q.all(promises).then(function () {
          deferred.resolve();
        }).catch(function () {
          deferred.reject();
        }).fin(function () {
          results[0].done();
        });
      }
    );

  } else {
    deferred.resolve();
  }

  return deferred.promise;
}

function createStorableObject(res, buffer, resources) {
  'use strict';
  var object = {
    headers: [],
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

  // for binary transfers
  if (res.getHeader('Content-Disposition')) {
    object.headers['Content-Disposition'] = res.getHeader('Content-Disposition');
  }

  return object;

}

function getResources(response) {
  'use strict';
  var i;
  var results = [];

  if (response.$$meta) {
    if (response.$$meta.permalink) {
      return [response.$$meta.permalink];
    } else if (response.results) {
      for (i = 0; i < response.results.length; i++) {
        // only check access on expanded resources, anyone can see a href
        if (response.results[i].$$expanded) {
          results.push(response.results[i].href);
        }
      }
    }
  }

  return results;
}

function store(url, cache, req, res, mapping) {
  'use strict';

  var send = res.send; // hijack!
  var write = res.write;
  var end = res.end;
  var isList;
  var cacheSection = 'custom';
  var buffer;
  var ended = false;
  var resources;
  var validated = false;

  // proxy

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

    if (res.statusCode === 200) {
      if (chunk) {
        cache[cacheSection].set(url, createStorableObject(res, new Buffer(chunk), resources));
      } else if (buffer) {
        cache[cacheSection].set(url, createStorableObject(res, buffer, resources));
      }
    }

    return end.call(this, chunk, encoding);

  };

  res.send = function (output) {

    var self;

    // express first send call tranforms a json into a string and calls send again
    // we only process the first send to store the object
    if (typeof output === 'object') {
      // first call
      isList = responseIsList(output);
      resources = getResources(output);

      cacheSection = isList ? 'list' : 'resources';
    }

    if (!validated) {
      validated = true;
      self = this; //eslint-disable-line

      validateRequest(mapping, req, res, resources).then(function () {
        send.call(self, output);
      }).catch(function () {
        res.status(403).send({
          type: 'access.denied',
          status: 403,
          body: 'Forbidden'
        });
      });
    } else {
      send.call(this, output);
    }

  };

}

exports = module.exports = function (mapping, config, pg) {
  'use strict';

  var header;

  var cache = mapping.cacheResource !== false;
  var resource = mapping.type;
  var ttl = mapping.cacheTTL || DEFAULT_TTL;
  configuration = config;
  postgres = pg;

  if (cache) {
    cacheStore[resource] = {
      resources: new NodeCache({stdTTL: ttl}),
      list: new NodeCache({stdTTL: ttl}),
      custom: new NodeCache({stdTTL: ttl})
    };
  }

  return function (req, res, next) {

    var value;

    if (req.method === 'GET') {

      if (cache) {
        value = cacheStore[mapping.type].resources.get(req.originalUrl) ||
          cacheStore[mapping.type].list.get(req.originalUrl) || cacheStore[mapping.type].custom.get(req.originalUrl);
      }

      if (value) {

        validateRequest(mapping, req, res, value.resources).then(function () {
          for (header in value.headers) {

            if (value.headers.hasOwnProperty(header)) {

              res.set(header, value.headers[header]);
            }
          }

          res.send(value.data);
        }).catch(function () {
          res.status(403).send({
            type: 'access.denied',
            status: 403,
            body: 'Forbidden'
          });
        });

      } else {
        // register handler to process response when responding
        store(req.originalUrl, cacheStore[mapping.type], req, res, mapping);
        next();
      }
    } else if (req.method === 'PUT' || req.method === 'DELETE') {

      validateRequest(mapping, req, res).then(function () {
        if (cache) {
          cacheStore[mapping.type].resources.del(req.originalUrl);
          // TODO do this more efficiently? (only delete the entries where this resource is present)
          cacheStore[mapping.type].list.flushAll();
        }
        next();
      }).catch(function () {
        res.status(403).send({
          type: 'access.denied',
          status: 403,
          body: 'Forbidden'
        });
      });

    } else {
      next();
    }

  };

};
