/* Local cache implementation */

var DEFAULT_TTL = 120;

var NodeCache = require('node-cache');
var Q = require('q');

exports = module.exports = function (ttl) {
  'use strict';

  var cacheStore = new NodeCache({stdTTL: ttl || DEFAULT_TTL});

  return {
    set: function (key, object) {
      cacheStore.set(key, object);
    },
    get: function (key) {
      return Q.fcall(function () {
        return cacheStore.get(key);
      });
    },
    del: function (key) {
      cacheStore.del(key);
    },
    flushAll: function () {
      cacheStore.flushAll();
    }
  };

};
