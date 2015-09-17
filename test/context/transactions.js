var Q = require('q');
var common = require('../../js/common.js');

exports = module.exports = function (roa, extra) {
  'use strict';

  var $m = roa.mapUtils;
  var $s = roa.schemaUtils;
  var $u = roa.utils;

  var ret = {
    type: '/transactions',
    'public': false, // eslint-disable-line
    map: {
      transactiontimestamp: {
        onupdate: $m.now
      },
      fromperson: {
        references: '/persons'
      },
      toperson: {
        references: '/persons'
      },
      description: {},
      amount: {}
    },
    secure: [],
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A single transaction between 2 people.',
      type: 'object',
      properties: {
        transactiontimestamp: $s.timestamp('Date and time when the transaction was recorded.'),
        fromperson: $s.permalink('/persons', 'A permalink to the person that sent currency.'),
        toperson: $s.permalink('/persons', 'A permalink to the person that received currency.'),
        description: $s.string('A description, entered by the person sending, of the transaction.'),
        amount: $s.numeric('The amount of currency sent. ' +
                           'This unit is expressed as 20 units/hour, ' +
                           'irrelevant of the group\'s currency settings.')
      },
      required: ['fromperson', 'toperson', 'description', 'amount']
    },
    afterinsert: [
      function (db, element) {
        var amount = element.amount;
        var tokey = element.toperson.href;
        tokey = tokey.split('/')[2];

        var updateto = $u.prepareSQL();
        updateto.sql('update persons set balance = (balance + ')
          .param(amount).sql(') where key = ').param(tokey);
        return $u.executeSQL(db, updateto);
      },
      function (db, element) {
        var amount = element.amount;
        var fromkey = element.fromperson.href;
        fromkey = fromkey.split('/')[2];

        var updatefrom = $u.prepareSQL();
        updatefrom.sql('update persons set balance = (balance - ')
          .param(amount).sql(') where key = ').param(fromkey);
        return $u.executeSQL(db, updatefrom);
      }
    ],
    // TODO : Check if updates are blocked.
    afterupdate: [
      function () {
        var deferred = Q.defer();
        deferred.reject('Updates on transactions are not allowed.');
        return deferred.promise;
      }
    ]
  };

  common.mergeObject(extra, ret);
  return ret;
};
