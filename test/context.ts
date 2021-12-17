/*
Reference SRI interface used in the test suite for sri4node.
You can require it, and start serving the reference API :

var context = require('./context');
context.serve();
*/

// External includes
// var express = require('express');
import * as express from 'express';

var common = require('../js/common');
var cl = common.cl;
const utils = require('./utils')(null);

var $u;
var configCache:any = null;

export = module.exports = {
  serve: async function (sri4node, port, logdebug) {
    'use strict';
    var config = module.exports.config(sri4node, port, logdebug);

    // Need to pass in express.js and node-postgress as dependencies.
    var app = express();
    app.set('port', port);

    await sri4node.configure(app, config)
    // app.get('/', (req, resp) => resp.end('hello world'));

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

  config: function (sri4node, port, logdebug) {
    'use strict';
    if (configCache !== null) {
      cl('config cached');
      return configCache;
    }

    $u = sri4node.utils;

    var commonResourceConfig = {
    };

    var config = {
      // For debugging SQL can be logged.
      logdebug: logdebug,
      defaultdatabaseurl: 'postgres://sri4node:sri4node@localhost:5432/postgres?ssl=false',

      resources: [
        require('./context/persons')(sri4node, commonResourceConfig),
        require('./context/messages')(sri4node, commonResourceConfig),
        require('./context/communities')(sri4node, commonResourceConfig),
        require('./context/transactions')(sri4node, commonResourceConfig),
        require('./context/table')(sri4node, commonResourceConfig),
        require('./context/jsonb')(commonResourceConfig),
        require('./context/alldatatypes')(sri4node, commonResourceConfig),
        require('./context/products')(sri4node, commonResourceConfig),
        require('./context/packages')(sri4node, commonResourceConfig),
        require('./context/relations')(sri4node, commonResourceConfig),
        require('./context/personrelations')(sri4node, commonResourceConfig),
        require('./context/cities')(sri4node, commonResourceConfig),
        require('./context/selfreferential')(commonResourceConfig),
        require('./context/countries')(sri4node, commonResourceConfig),
        require('./context/countries_with_prefix')(sri4node, commonResourceConfig),
        require('./context/onlycustom')(sri4node, commonResourceConfig),
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
