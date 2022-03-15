/*
Reference SRI interface used in the test suite for sri4node.
You can require it, and start serving the reference API :

var context = require('./context');
context.serve();
*/

// External includes
// var express = require('express');
import * as express from 'express';

import { TSriConfig, SriError, TSriRequest } from '../src/typeDefinitions';
import utilsFactory, { debugLog } from './utils';

const utils = utilsFactory(null);

let $u;
let configCache: any = null;

function config(sri4node, port, logdebug) {
  if (configCache !== null) {
    debugLog('config cached');
    return configCache;
  }

  $u = sri4node.utils;

  const commonResourceConfig = {
  };


  const config:TSriConfig = {
    // For debugging SQL can be logged.
    logdebug,
    databaseConnectionParameters: {
      // connectionString: 'postgres://sri4node:sri4node@localhost:5434/postgres?ssl=false',
      // ssl: false,
      user: 'sri4node',
      password: 'sri4node',
      host: 'localhost',
      port: 5432,
      database: "postgres",
      schema: 'sri4node',
      // FOR DOCKER
      // user: 'user',
      // password: 'password',
      // host: 'localhost',
      // port: 5434,
      // schema: 'postgres',
    },

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
      require('./context/customStreaming')(sri4node, commonResourceConfig),
      require('./context/foos')(sri4node, commonResourceConfig),
    ],

    beforePhase: [
      async (sriRequestMap, jobMap, pendingJobs) => {
        (Array.from(sriRequestMap) as Array<[string, TSriRequest]>)
          .forEach(([psId, sriRequest]) => {
          // .forEach((keyValueTuple:any) => {
          //   const [psId, sriRequest] = keyValueTuple;
            if (pendingJobs.has(psId)) {
              if (sriRequest.generateError === true) {
                sriRequest.generateError = false;
                throw new SriError({ status: 400, errors: [{ code: 'foo' }], sriRequestID: sriRequest.id });
              }
            }
          });
      },
    ],

    transformRequest: [utils.lookForBasicAuthUser],
    transformInternalRequest: [utils.copyUserInfo],

    // temporarily global batch for samenscholing
    enableGlobalBatch: true,

    // send keep alive characters every 3 seconds, so we can more quickly test
    // if this mechanism works
    streamingKeepAliveTimeoutMillis: 3_000,
  };

  configCache = config;
  return config;
}

async function serve(sri4node, port, logdebug) {
  const theConfig = config(sri4node, port, logdebug);

  // Need to pass in express.js and node-postgress as dependencies.
  const app = express();
  app.set('port', port);

  await sri4node.configure(app, theConfig);
  // app.get('/', (req, resp) => resp.end('hello world'));

  try {
    const port = app.get('port');
    const server = await app.listen(port);
    debugLog(`Node app is running at localhost:${app.get('port')}`);
    return server;
  } catch (error) {
    debugLog(`Node app failed to initialize: ${error}`);
    process.exit(1);
  }
}

function getConfiguration() {
  if (configCache === null) {
    throw new Error('please first configure the context');
  }

  return configCache;
}

export {
  config,
  serve,
  getConfiguration,
};
