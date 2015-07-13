/*
Reference SRI interface used in the test suite for sri4node.
You can require it, and start serving the reference API :

var context = require('./context.js');
context.serve();
*/

// External includes
var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');
var Q = require('q');
var common = require('../js/common.js');
var cl = common.cl;

var $u, $m, $s;
var configCache = null;

exports = module.exports = {
  serve: function (roa, port, logsql, logrequests, logdebug) {
    'use strict';
    var config = exports.config(roa, port, logsql, logrequests, logdebug);

    // Need to pass in express.js and node-postgress as dependencies.
    var app = express();
    app.set('port', port);
    app.use(bodyParser.json());

    roa.configure(app, pg, config);
    port = app.get('port');
    app.listen(port, function () {
      cl('Node app is running at localhost:' + app.get('port'));
    });
  },

  getConfiguration: function () {
    'use strict';
    if (configCache == null) {
      throw new Error('please first configure the context');
    }

    return configCache;
  },

  config: function (roa, port, logsql, logrequests, logdebug) {
    'use strict';
    if (configCache !== null) {
      cl('config cached');
      return configCache;
    }

    $u = roa.utils;
    $m = roa.mapUtils;
    $s = roa.schemaUtils;

    function debug(x) {
      if (logdebug) {
        cl(x);
      }
    }

    // node-postgres defaults to 10 clients in the pool, but heroku.com allows 20.
    pg.defaults.poolSize = 20;

    var config = {
      // For debugging SQL can be logged.
      logsql: logsql,
      logrequests: logrequests,
      logdebug: logdebug,
      defaultdatabaseurl: 'postgres://sri4node:sri4node@localhost:5432/postgres',
      identity: function (username, database) {
        var query = $u.prepareSQL('me');
        query.sql('select * from persons where email = ').param(username);
        return $u.executeSQL(database, query).then(function (result) {
          var row = result.rows[0];
          var output = {};
          output.$$meta = {};
          output.$$meta.permalink = '/persons/' + row.key;
          output.firstname = row.firstname;
          output.lastname = row.lastname;
          output.email = row.email;
          output.community = {
            href: '/communities/' + row.community
          };
          return output;
        });
      },
      resources: [
        require('./context/persons.js')(roa, logdebug),
        require('./context/messages.js')(roa, logdebug),
        require('./context/communities.js')(roa,logdebug),
        {
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
          secure: [
                    ],
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
        },
        {
          type: '/table',
          'public': true, // eslint-disable-line
          map: {
            select: {},
            from: {}
          },
          secure: [],
          schema: {
            $schema: 'http://json-schema.org/schema#',
            title: 'A table with protected keywords, to check escaping of sri4node',
            type: 'object',
            properties: {
              select: $s.string(''),
              from: $s.string('')
            },
            required: ['select', 'from']
          },
          afterinsert: [],
          afterupdate: []
                },
        require('./context/selfreferential.js'),
        require('./context/jsonb.js'),
        require('./context/alldatatypes.js')
      ]
    };

    configCache = config;
    return config;
  }
};
