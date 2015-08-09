/* Cache middleware */

var DEFAULT_TTL = 120;

var NodeCache = require('node-cache');
var cacheStore = [];

function responseIsList(response) {
  'use strict';
  return response.$$meta && response.$$meta.count;
}

function store(url, cache, res) {
  'use strict';

  var send = res.send; // hijack!
  var isList;
  var cacheSection;

  // proxy

  res.send = function (output) {

    // express first send call tranforms a json into a string and calls send again
    // we only process the first send to store the object
    if (typeof output === 'object') {
      // first call
      isList = responseIsList(output);

      cacheSection = isList ? 'list' : 'resources';

      cache[cacheSection].set(url, output);
    }

    return send.call(this, output);
  };

}

exports = module.exports = function (resource, ttl) {
  'use strict';

  cacheStore[resource] = {
    resources: new NodeCache({stdTTL: ttl || DEFAULT_TTL}),
    list: new NodeCache({stdTTL: ttl || DEFAULT_TTL})
  };

  return function (req, res, next) {

    var value;

    if (req.method === 'GET') {

      value = cacheStore[resource].resources.get(req.originalUrl) || cacheStore[resource].list.get(req.originalUrl);

      if (value) {
        res.set('Content-Type', 'application/json');
        res.send(value);
        res.end();
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
