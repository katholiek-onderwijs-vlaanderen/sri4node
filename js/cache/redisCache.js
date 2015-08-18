/* Redis cache implementation */

var DEFAULT_TTL = 120;

var Redis = require('ioredis');
var Q = require('q');

exports = module.exports = function (ttl, url) {
  'use strict';

  var objectTTL;

  if (typeof ttl !== 'undefined') {
    objectTTL = ttl;
  } else {
    objectTTL = DEFAULT_TTL;
  }

  var cacheStore = new Redis(url);

  return {
    set: function (key, object) {
      object.data = object.data.toString('binary');
      if (objectTTL) {
        cacheStore.set(key, JSON.stringify(object), 'ex', objectTTL);
      } else {
        cacheStore.set(key, JSON.stringify(object));
      }

    },
    get: function (key) {
      var deferred = Q.defer();
      var tmp;
      cacheStore.get(key, function (err, result) {
        if (err) {
          return deferred.reject(err);
        }
        if (result) {

          result = JSON.parse(result);
          tmp = new Buffer(result.data.length);
          tmp.write(result.data, 0, 'binary');
          result.data = tmp;
          return deferred.resolve(result);
        }

        return deferred.resolve(null);

      });

      return deferred.promise;
    },
    del: function (key) {
      cacheStore.del(key);
    },
    flushAll: function () {
      cacheStore.flushall();
    }
  };

};
