/*
Reference SRI interface used in the test suite for sri4node.
You can require it, and start serving the reference API :

var context = require('./context.js');
context.serve();
*/

// External includes
var Q = require('q');
var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');
var common = require('../js/common.js');
var cl = common.cl;

var $u;
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

    /*
     Authentication function should return a promise.
     It should resolve it's promise with a single boolean value true/false if it can determine
     the correctness of the username/password combination.
     It should reject it's promise with a standard SRI error object if anything goes wrong.
     */
    var testAuthenticator = function (db, knownPasswords, username, password) {
      var deferred = Q.defer();
      var q;

      if (knownPasswords[username]) {
        if (knownPasswords[username] === password) {
          deferred.resolve(true);
        } else {
          deferred.resolve(false);
        }
      } else {
        q = $u.prepareSQL('select-count-from-persons-where-email-and-password');
        q.sql('select count(*) from persons where email = ').param(username).sql(' and password = ').param(password);
        $u.executeSQL(db, q).then(function (result) {
          var count = parseInt(result.rows[0].count, 10);
          if (count === 1) {
            // Found matching record, add to cache for subsequent requests.
            knownPasswords[username] = password;
            deferred.resolve(true);
          } else {
            deferred.resolve(false);
          }
        });
      }

      return deferred.promise;
    };

    var commonResourceConfig = {
      checkauthentication: $u.basicAuthentication(testAuthenticator)
    };

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
        require('./context/persons.js')(roa, logdebug, commonResourceConfig),
        require('./context/messages.js')(roa, logdebug, commonResourceConfig),
        require('./context/communities.js')(roa, logdebug, commonResourceConfig),
        require('./context/transactions.js')(roa, commonResourceConfig),
        require('./context/table.js')(roa, commonResourceConfig),
        require('./context/selfreferential.js')(commonResourceConfig),
        require('./context/jsonb.js')(commonResourceConfig),
        require('./context/alldatatypes.js')(roa, commonResourceConfig)
      ]
    };

    configCache = config;
    return config;
  }
};
