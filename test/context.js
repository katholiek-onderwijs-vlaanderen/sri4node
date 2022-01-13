/*
Reference SRI interface used in the test suite for sri4node.
You can require it, and start serving the reference API :

var context = require('./context.js');
context.serve();
*/

// External includes
var express = require('express');
var common = require('../js/common.js');
var cl = common.cl;
const utils = require('./utils.js')(null);

var $u;
var configCache = null;

exports = module.exports = {
  serve: async function (roa, port, logdebug) {
    'use strict';
    var config = exports.config(roa, port, logdebug);

    // Need to pass in express.js and node-postgress as dependencies.
    var app = express();
    app.set('port', port);

    await roa.configure(app, config)

    try {
      const port = app.get('port');
      const server = await app.listen(port);
      cl('Node app is running at localhost:' + app.get('port'));
      return server;
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

  config: function (roa, port, logdebug) {
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
      logdebug: logdebug,
      databaseUrl: 'postgres://sri4node:sri4node@localhost:5432/postgres?ssl=false',
      postgresSchema: 'sri4node',

      resources: [
        require('./context/persons.js')(roa, commonResourceConfig),
        require('./context/messages.js')(roa, commonResourceConfig),
        require('./context/communities.js')(roa, commonResourceConfig),
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
        require('./context/countries.js')(roa, commonResourceConfig),
        require('./context/countries_with_prefix.js')(roa, commonResourceConfig),
        require('./context/onlycustom.js')(roa, commonResourceConfig),
        require('./context/customStreaming.js')(roa, commonResourceConfig),
      ],

      beforePhase: [  async (sriRequestMap, jobMap, pendingJobs) => {
            Array.from(sriRequestMap)
            .forEach( ([psId, sriRequest]) => {
                if (pendingJobs.has(psId)) {
                    if (sriRequest.generateError === true) {
                        sriRequest.generateError = false;
                        throw new common.SriError({status: 400, errors: [{code: 'foo'}], sriRequestID: sriRequest.id});
                    }
                }
            });
        }
      ],

      transformRequest: [ utils.lookForBasicAuthUser ],
      transformInternalRequest: [ utils.copyUserInfo ],

      // temporarily global batch for samenscholing
      enableGlobalBatch: true
    };

    configCache = config;
    return config;
  }
};
