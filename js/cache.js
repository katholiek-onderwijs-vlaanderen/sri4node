/* Cache middleware */

var DEFAULT_TTL = 120;

var NodeCache = require('node-cache');
var cacheStore = [];

// used to determine where to store the cached object (there are two stores, list
// and resource. The purge logic is different)
function responseIsList(response) {
  'use strict';
  return response.$$meta && response.$$meta.hasOwnProperty('count');
}

function createStorableObject(res, buffer) {
  'use strict';
  var object = {
    headers: [],
    data: buffer
  };

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

function store(url, cache, res) {
  'use strict';

  var send = res.send; // hijack!
  var write = res.write;
  var end = res.end;
  var isList;
  var cacheSection = 'custom';
  var buffer;
  var ended = false;

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
        cache[cacheSection].set(url, createStorableObject(res, new Buffer(chunk)));
      } else if (buffer) {
        cache[cacheSection].set(url, createStorableObject(res, buffer));
      }
    }

    return end.call(this, chunk, encoding);

  };

  res.send = function (output) {

    // express first send call tranforms a json into a string and calls send again
    // we only process the first send to store the object
    if (typeof output === 'object') {
      // first call
      isList = responseIsList(output);

      cacheSection = isList ? 'list' : 'resources';
    }

    return send.call(this, output);
  };

}

exports = module.exports = function (resource, ttl) {
  'use strict';

  var header;

  cacheStore[resource] = {
    resources: new NodeCache({stdTTL: ttl || DEFAULT_TTL}),
    list: new NodeCache({stdTTL: ttl || DEFAULT_TTL}),
    custom: new NodeCache({stdTTL: ttl || DEFAULT_TTL})
  };

  return function (req, res, next) {

    var value;

    if (req.method === 'GET') {

      value = cacheStore[resource].resources.get(req.originalUrl) || cacheStore[resource].list.get(req.originalUrl) ||
        cacheStore[resource].custom.get(req.originalUrl);

      if (value) {
        // we're only caching the API responses
        res.set('Content-Type', 'application/json');

        for (header in value.headers) {

          if (value.headers.hasOwnProperty(header)) {

            res.set(header, value.headers[header]);
          }
        }

        res.send(value.data);
      } else {
        // register handler to store in cache when responding
        store(req.originalUrl, cacheStore[resource], res);
        next();
      }
    } else if (req.method === 'PUT' || req.method === 'DELETE') {
      cacheStore[resource].resources.del(req.originalUrl);
      // TODO do this more efficiently?
      cacheStore[resource].list.flushAll();

      next();
    } else {
      next();
    }

  };

};
