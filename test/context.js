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
        require('./context/communities.js')(roa, logdebug),
        require('./context/transactions.js')(roa),
        require('./context/table.js')(roa),
        require('./context/selfreferential.js'),
        require('./context/jsonb.js'),
        require('./context/alldatatypes.js')(roa)
      ]
    };

    configCache = config;
    return config;
  }
};
