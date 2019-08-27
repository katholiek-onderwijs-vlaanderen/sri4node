/*
Reference SRI interface used in the test suite for sri4node.
You can require it, and start serving the reference API :

var context = require('./context.js');
context.serve();
*/

// External includes
var express = require('express');
var bodyParser = require('body-parser');
var common = require('../js/common.js');
var cl = common.cl;

var $u;
var configCache = null;
var knownPasswords = {};

exports = module.exports = {
  serve: async function (roa, port, logsql, logrequests, logdebug, logmiddleware) {
    'use strict';
    var config = exports.config(roa, port, logsql, logrequests, logdebug, logmiddleware);

    // Need to pass in express.js and node-postgress as dependencies.
    var app = express();
    app.set('port', port);
    app.use(bodyParser.json());

    await roa.configure(app, config)

    try {
      const port = app.get('port');
      app.listen(port, function () {
        cl('Node app is running at localhost:' + app.get('port'));
      });
    } catch (error) {
      cl('Node app failed to initialize: ' + error);
      process.exit(1);
    }
  },

  getConfiguration: function () {
    'use strict';
    if (configCache === null) {
      throw new Error('please first configure the context');
    }

    return configCache;
  },

  config: function (roa, port, logsql, logrequests, logdebug, logmiddleware) {
    'use strict';
    if (configCache !== null) {
      cl('config cached');
      return configCache;
    }

    $u = roa.utils;

    var commonResourceConfig = {
    };

    var config = {
      // For debugging SQL can be logged.
      logsql: logsql,
      logrequests: logrequests,
      logdebug: logdebug,
      logmiddleware: logmiddleware,
      defaultdatabaseurl: 'postgres://sri4node:sri4node@localhost:5432/postgres',

      resources: [
        require('./context/persons.js')(roa, logdebug, commonResourceConfig),
        require('./context/messages.js')(roa, logdebug, commonResourceConfig),
        require('./context/communities.js')(roa, logdebug, commonResourceConfig),
        require('./context/transactions.js')(roa, commonResourceConfig),
        require('./context/table.js')(roa, commonResourceConfig),
        require('./context/jsonb.js')(commonResourceConfig),
        require('./context/alldatatypes.js')(roa, commonResourceConfig),
        require('./context/products.js')(roa, commonResourceConfig),
        require('./context/packages.js')(roa, commonResourceConfig),
        require('./context/relations.js')(roa, commonResourceConfig),
        require('./context/personrelations.js')(roa, commonResourceConfig),
        require('./context/cities.js')(roa, commonResourceConfig),
        require('./context/selfreferential.js')(commonResourceConfig),
      ],

      // temporarily global batch for samenscholing
      enableGlobalBatch: true
    };



    configCache = config;
    return config;
  }
};
