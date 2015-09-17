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

  var clearPasswordCache = function () {
    var deferred = Q.defer();
    $u.clearPasswordCache();
    deferred.resolve();
    return deferred.promise;
  };

  var restrictReadPersons = function (req, resp, db, me) {
    // A secure function must take into account that a GET operation
    // can be either a GET for a regular resource, or a GET for a
    // list resource.
    var url, key, myCommunityKey, query;

    debug('** restrictReadPersons ');
    var deferred = Q.defer();
    if (req.method === 'GET') {
      debug('** req.path = ' + req.path);
      url = req.path;
      if (url === '/persons') {
        // Should allways restrict to /me community.
        debug('** req.query :');
        debug(req.query);
        if (req.query.communities) {
          debug('** me :');
          debug(me);
          if (req.query.communities === me.community.href) {
            debug('** restrictReadPersons resolves.');
            deferred.resolve();
          } else {
            debug('** restrictReadPersons rejecting - can only request persons from your own community.');
            deferred.reject();
          }
        } else {
          cl('** restrictReadPersons rejecting - must specify ?communities=... for GET on list resources');
          deferred.reject();
        }
      } else {
        key = url.split('/')[2];
        myCommunityKey = me.community.href.split('/')[2];
        debug('community key = ' + myCommunityKey);

        query = $u.prepareSQL('check-person-is-in-my-community');
        query.sql('select count(*) from persons where key = ')
          .param(key).sql(' and community = ').param(myCommunityKey);
        $u.executeSQL(db, query).then(function (result) {
          if (parseInt(result.rows[0].count, 10) === 1) {
            debug('** restrictReadPersons resolves.');
            deferred.resolve();
          } else {
            debug('results.rows[0].count = ' + result.rows[0].count);
            cl('** security method restrictedReadPersons denies access.');
            deferred.reject();
          }
        }).fail(function (error) {
          debug('Unable to execute query for restrictedReadPersons :');
          debug(error);
          debug(error.stack);
        });
      } /* end handling regular resource request */
    } else {
      deferred.resolve();
    }

    return deferred.promise;
  };

  function disallowOnePerson(forbiddenKey) {
    return function (req) {
      var deferred = Q.defer();
      var key;

      if (req.method === 'GET') {
        key = req.params.key;
        if (key === forbiddenKey) {
          cl('security method disallowedOnePerson for ' + forbiddenKey + ' denies access');
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

  function simpleOutput(req, res, db) {

    var query;

    query = $u.prepareSQL('get-simple-person');
    query.sql('select firstname, lastname from persons where key = ')
      .param(req.params.key);
    $u.executeSQL(db, query).then(function (result) {
      db.done();
      if (result.rows.length === 1) {
        res.send({firstname: result.rows[0].firstname, lastname: result.rows[0].lastname});
      } else {
        res.status(409).end();
      }
    });

  }

  function wrongHandler(req, res, db) {

    var query;

    query = $u.prepareSQL('get-simple-person');
    query.sql('select firstname, lastname from person where key = ')
      .param(req.params.key);
    $u.executeSQL(db, query).then(function (result) {
      db.done();
      if (result.rows.length === 1) {
        res.send({firstname: result.rows[0].firstname, lastname: result.rows[0].lastname});
      } else {
        res.status(409).end();
      }
    }).catch(function () {
      res.status(500).end();
    });

  }

  var ret = {
    type: '/persons',
    'public': false, // eslint-disable-line
    map: {
      firstname: {},
      lastname: {},
      street: {},
      streetnumber: {},
      streetbus: {
        onread: $m.removeifnull
      },
      zipcode: {},
      city: {},
      phone: {
        onread: $m.removeifnull
      },
      email: {
        onread: $m.removeifnull
      },
      balance: {
        oninsert: $m.value(0),
        onupdate: $m.remove
      },
      mail4elas: {},
      community: {
        references: '/communities'
      }
    },
    secure: [
      restrictReadPersons,
      // Ingrid Ohno
      disallowOnePerson('da6dcc12-c46f-4626-a965-1a00536131b2')
    ],
    customroutes: [
      {route: '/persons/:key/simple', handler: simpleOutput},
      {route: '/persons/:key/wrong-handler', handler: wrongHandler}
    ],
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'An object representing a person taking part in the LETS system.',
      type: 'object',
      properties: {
        firstname: $s.string('First name of the person.'),
        lastname: $s.string('Last name of the person.'),
        street: $s.string('Streetname of the address of residence.'),
        streetnumber: $s.string('Street number of the address of residence.'),
        streetbus: $s.string('Postal box of the address of residence.'),
        zipcode: $s.belgianzipcode('4 digit postal code of the city for the address of residence.'),
        city: $s.string('City for the address of residence.'),
        phone: $s.phone('The telephone number for this person. Can be a fixed or mobile phone number.'),
        email: $s.email('The email address the person can be reached on. ' +
          'It should be unique to this person. ' +
          'The email should not be shared with others.'),
        mail4elas: {
          type: 'string',
          description: 'Describes if, and how often this person wants messages to be emailed.',
          enum: ['never', 'daily', 'weekly', 'instant']
        }
      },
      required: ['firstname', 'lastname', 'street', 'streetnumber', 'zipcode', 'city', 'mail4elas']
    },
    validate: [],
    query: {
      communities: $q.filterReferencedType('/communities', 'community'),
      firstnameILike: $q.filterILike('firstname'),
      firstnameIn: $q.filterIn('firstname'),
      defaultFilter: $q.defaultFilter
    },
    afterread: [
      $u.addReferencingResources('/transactions', 'fromperson', '$$transactions')
    ],
    afterupdate: [
      clearPasswordCache
    ],
    afterinsert: [],
    afterdelete: [
      clearPasswordCache
    ]
  };

  common.mergeObject(extra, ret);
  return ret;
};
