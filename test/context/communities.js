var Q = require('q');
var common = require('../../js/common.js');
var cl = common.cl;

exports = module.exports = function (roa, logverbose, extra) {
  'use strict';

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  var $m = roa.mapUtils;
  var $s = roa.schemaUtils;
  var $q = roa.queryUtils;
  var $u = roa.utils;

  function invalidQueryParameter() {
    var deferred = Q.defer();
    deferred.reject({
      code: 'invalid.query.parameter'
    });
    return deferred.promise;
  }

  function disallowOneCommunity(forbiddenKey) {
    return function (req) {
      var deferred = Q.defer();
      var key;

      if (req.method === 'GET') {
        key = req.params.key;
        if (req.params.key === forbiddenKey || req.path == '/communities/6531e471-7514-43cc-9a19-a72cf6d27f4c') {
          cl('security method disallowedOneCommunity for ' + forbiddenKey + ' denies access');
          deferred.reject();
        } else {
          deferred.resolve();
        }
      } else {
        deferred.resolve();
      }

      return deferred.promise;
    };
  }

  // Don't really need the extra parameters when using CTE.
  function parameterWithExtraQuery(value, select, param, database, count) {
    var deferred = Q.defer();
    var q;

    if (count) {
      q = $u.prepareSQL('create-allcommunitykeys');
      q.sql('CREATE TEMPORARY TABLE allcommunitykeys ON COMMIT DROP AS SELECT key FROM communities');
      $u.executeSQL(database, q).then(function () {
        select.sql(' AND "key" NOT IN (SELECT "key" FROM "allcommunitykeys") ');
        deferred.resolve();
      }).catch(function (error) {
        debug('Catch creating temp table');
        debug(error);
        deferred.reject(error);
      }).fail(function (error) {
        debug('Fail creating temp table');
        debug(error);
        deferred.reject(error);
      });
    } else {
      select.sql(' AND "key" NOT IN (SELECT "key" FROM "allcommunitykeys") ');
      deferred.resolve();
    }

    return deferred.promise;
  }

  function parameterWithExtraQuery2(value, select, param, database, count) {
    var deferred = Q.defer();
    var q;

    if (count) {
      q = $u.prepareSQL('create-allcommunitykeys2');
      q.sql('CREATE TEMPORARY TABLE allcommunitykeys2 ON COMMIT DROP AS SELECT key FROM communities');
      $u.executeSQL(database, q).then(function () {
        select.sql(' AND "key" NOT IN (SELECT "key" FROM "allcommunitykeys2") ');
        deferred.resolve();
      }).catch(function (error) {
        debug('Catch creating temp table');
        debug(error);
        deferred.reject(error);
      }).fail(function (error) {
        debug('Fail creating temp table');
        debug(error);
        deferred.reject(error);
      });
    } else {
      select.sql(' AND "key" NOT IN (SELECT "key" FROM "allcommunitykeys2") ');
      deferred.resolve();
    }

    return deferred.promise;
  }

  function addMessageCountToCommunities(database, elements) {
    debug('addMessageCountToCommunities');
    debug(elements);
    var deferred = Q.defer();
    var query, keyToElement, keys, i, element, key;
    var row;

    // Lets do this efficiently. Remember that we receive an array of elements.
    // We query the message counts in a single select.
    // e.g. select community,count(*) from messages group by community having
    // community in ('8bf649b4-c50a-4ee9-9b02-877aa0a71849','57561082-1506-41e8-a57e-98fee9289e0c');
    if (elements && elements.length > 0) {
      query = $u.prepareSQL();
      keyToElement = {};
      keys = [];
      for (i = 0; i < elements.length; i++) {
        element = elements[i];
        key = element.$$meta.permalink.split('/')[2];
        keys.push(key);
        keyToElement[key] = element;
        // Default to 0, The query will not return a row for those.
        element.$$messagecount = 0;
      }
      query.sql('SELECT community, count(*) as messagecount FROM messages GROUP BY community HAVING community in (');
      query.array(keys);
      query.sql(')');

      $u.executeSQL(database, query).then(function (result) {
        debug(result);
        var rows = result.rows;
        for (i = 0; i < rows.length; i++) {
          row = rows[i];
          keyToElement[row.community].$$messagecount = parseInt(row.messagecount, 10);
        }
        deferred.resolve();
      }).fail(function (error) {
        debug(error);
        deferred.reject(error);
      });
    } else {
      // No elements in array, resolve promise.
      deferred.resolve();
    }

    return deferred.promise;
  }

  var ret = {
    type: '/communities',
    'public': false, // eslint-disable-line
    secure: [disallowOneCommunity('6531e471-7514-43cc-9a19-a72cf6d27f4c')],
    cache: {
      ttl: 0,
      type: 'local'
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A local group in the LETS system.',
      type: 'object',
      properties: {
        name: $s.string('Name of this group. Normally named \'LETS [locale]\'.'),
        street: $s.string('Street of the organisational seat address.'),
        streetnumber: $s.string('Street number of the organisational seat address.'),
        streetbus: $s.string('Postal box of the organisational seat address.'),
        zipcode: $s.belgianzipcode('4 digit postal code of the city for the organisational seat address.'),
        city: $s.string('City for the organisational seat address.'),
        phone: $s.phone('Contact phone number for the group.'),
        email: $s.email('Contact email for the group.'),
        adminpassword: $s.string('Administrative password for the group.'),
        website: $s.url('Website URL for the group.'),
        facebook: $s.url('URL to the facebook page of the group.'),
        currencyname: $s.string('Name of the local currency for the group.')
      },
      required: ['name', 'street', 'streetnumber', 'zipcode',
                 'city', 'phone', 'email', 'adminpassword', 'currencyname']
    },
    validate: [],
    map: {
      name: {},
      street: {},
      streetnumber: {},
      streetbus: {
        onread: $m.removeifnull
      },
      zipcode: {},
      city: {},
      // Only allow create/update to set adminpassword, never show on output.
      adminpassword: {
        onread: $m.remove
      },
      phone: {
        onread: $m.removeifnull
      },
      email: {},
      facebook: {
        onread: $m.removeifnull
      },
      website: {
        onread: $m.removeifnull
      },
      currencyname: {}
    },
    query: {
      invalidQueryParameter: invalidQueryParameter,
      parameterWithExtraQuery: parameterWithExtraQuery,
      parameterWithExtraQuery2: parameterWithExtraQuery2,
      hrefs: $q.filterHrefs,
      defaultFilter: $q.defaultFilter
    },
    afterread: [
      // Add the result of a select query to the outgoing resource
      // SELECT count(*) FROM messages where community = [this community]
      // For example :
      // $$messagecount: 17
      addMessageCountToCommunities
    ]
  };

  common.mergeObject(extra, ret);
  return ret;
};
