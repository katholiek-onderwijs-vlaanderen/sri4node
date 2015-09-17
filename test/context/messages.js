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

  function messagesPostedSince(value, select) {
    var deferred = Q.defer();
    select.sql(' and posted > ').param(value);
    deferred.resolve();
    return deferred.promise;
  }

  function validateMoreThan(field, max) {
    return function (body) {
      var deferred = Q.defer();
      if (body.amount <= max) {
        debug('Should be more, or equal to ' + max);
        deferred.reject({
          path: field,
          code: 'not.enough'
        });
      } else {
        deferred.resolve();
      }

      return deferred.promise;
    };
  }

  function addExtraKeysAfterRead(database, elements) {
    var deferred = Q.defer();
    var i;

    for (i = 0; i < elements.length; i++) {
      elements[i].$$afterread = 'added by afterread method';
    }
    deferred.resolve();

    return deferred.promise;
  }

  var cteOneGuid = function (value, select) {
    var deferred = Q.defer();

    var cte = $u.prepareSQL();
    cte.sql('SELECT "key" FROM messages where title = ').param('Rabarberchutney');
    select.with(cte, 'cte');
    select.sql(' AND "key" IN (SELECT key FROM cte)');
    deferred.resolve();

    return deferred.promise;
  };

  var cteOneGuid2 = function (value, select) {
    var deferred = Q.defer();

    var cte = $u.prepareSQL();
    cte.sql('SELECT "key" FROM messages where title = ').param('Rabarberchutney');
    select.with(cte, 'cte2');
    select.sql(' AND "key" IN (SELECT key FROM cte2)');
    deferred.resolve();

    return deferred.promise;
  };

  var ret = {
    type: '/messages',
    'public': false, // eslint-disable-line
    map: {
      person: {
        references: '/persons'
      },
      posted: {
        onupdate: $m.now
      },
      type: {},
      title: {},
      description: {
        onread: $m.removeifnull
      },
      amount: {
        onread: $m.removeifnull
      },
      unit: {
        onread: $m.removeifnull
      },
      community: {
        references: '/communities'
      }
    },
    secure: [],
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A messages posted to the LETS members.',
      type: 'object',
      properties: {
        person: $s.permalink('/persons', 'A permalink to the person that placed the message.'),
        type: {
          type: 'string',
          description: 'Is this message offering something, or is it requesting something ?',
          enum: ['offer', 'request']
        },
        title: $s.string('A short summary of the message. A plain text string.'),
        description: $s.string('A more elaborate description. An HTML string.'),
        amount: $s.numeric('Amount suggested by the author.'),
        unit: $s.string('Unit in which amount was suggested by the author.'),
        community: $s.permalink('/communities', 'In what community was the message placed ? ' +
                                'The permalink to the community.')
      },
      required: ['person', 'type', 'title', 'community']
    },
    validate: [
      validateMoreThan('amount', 10),
      validateMoreThan('amount', 20)
    ],
    query: {
      communities: $q.filterReferencedType('/communities', 'community'),
      postedSince: messagesPostedSince, // For compatability, to be removed.
      modifiedsince: messagesPostedSince,
      cteOneGuid: cteOneGuid,
      cteOneGuid2: cteOneGuid2
    },
    afterread: [
      addExtraKeysAfterRead
    ]
  };

  common.mergeObject(extra, ret);
  return ret;
};
