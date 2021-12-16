/*
Reference SRI interface used in the test suite for sri4node.
You can require it, and start serving the reference API :

var context = require('./context');
context.serve();
*/

// External includes
var express = require('express');
var common = require('../js/common');
var cl = common.cl;
const utils = require('./utils')(null);

var $u;
var configCache:any = null;

export = module.exports = {
  serve: async function (roa, port, logdebug) {
    'use strict';
    var config = module.exports.config(roa, port, logdebug);

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
      defaultdatabaseurl: 'postgres://sri4node:sri4node@localhost:5432/postgres?ssl=false',

      resources: [
        require('./context/persons')(roa, commonResourceConfig),
        require('./context/messages')(roa, commonResourceConfig),
        require('./context/communities')(roa, commonResourceConfig),
        require('./context/transactions')(roa, commonResourceConfig),
        require('./context/table')(roa, commonResourceConfig),
        require('./context/jsonb')(commonResourceConfig),
        require('./context/alldatatypes')(roa, commonResourceConfig),
        require('./context/products')(roa, commonResourceConfig),
        require('./context/packages')(roa, commonResourceConfig),
        require('./context/relations')(roa, commonResourceConfig),
        require('./context/personrelations')(roa, commonResourceConfig),
        require('./context/cities')(roa, commonResourceConfig),
        require('./context/selfreferential')(commonResourceConfig),
        require('./context/countries')(roa, commonResourceConfig),
        require('./context/countries_with_prefix')(roa, commonResourceConfig),
        require('./context/onlycustom')(roa, commonResourceConfig),
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
