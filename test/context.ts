/*
Reference SRI interface used in the test suite for sri4node.
You can require it, and start serving the reference API :

var context = require('./context');
context.serve();
*/

// External includes
import express from "express";
import { getParentSriRequestFromRequestMap } from "../js/common";

import {
  TSriConfig,
  SriError,
  TSriRequest,
  TLogDebug,
  TSriServerInstance,
} from "../js/typeDefinitions";
import utils from "./utils";
import { Server } from "http";
import { IDatabase, IMain } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";

let configCache: TSriConfig;

function config(sri4node, logdebug, dummyLogger, resourceFiles) {
  const config: TSriConfig = {
    // For debugging SQL can be logged.
    logdebug,
    databaseConnectionParameters: {
      // use network_mode=local when tests run in docker container
      // => connectionString stays the same (see docker-compose.yml)
      connectionString: "postgres://sri4node:sri4node@localhost:15432/postgres",
      ssl: false,
      schema: "sri4node",
      connectionInitSql: 'INSERT INTO "db_connections" DEFAULT VALUES RETURNING *;',
    },

    resources: resourceFiles.map((file) => require(file)(sri4node)),

    startUp: [
      async (db: IDatabase<unknown, IClient>, pgp: IMain) => {
        // crash if either db or pgp is undefined
        if (!db?.connect) {
          throw new Error("startUp hook error: db parameter is not what we expected");
        }
        if (!pgp?.pg) {
          throw new Error("startUp hook error: pgp parameter is not what we expected");
        }

        // add a useless trigger to the countries table
        // in order to test whether the startup hook gets executed
        // and can be used to make changes to the database
        return await db.query(`
          DO $___$
          BEGIN
            -- create trigger 'vsko_do_nothing_trigger_countries' if not yet present
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.triggers
                WHERE trigger_name = 'vsko_do_nothing_trigger_countries'
                  AND trigger_schema = 'sri4node'
                  AND event_object_table = 'countries'
              ) THEN
                CREATE TRIGGER vsko_do_nothing_trigger_countries BEFORE UPDATE ON "countries"
                FOR EACH ROW EXECUTE PROCEDURE vsko_do_nothing_function();
            END IF;
          END
          $___$
          LANGUAGE 'plpgsql';
              `);
      },
    ],
    beforePhase: [
      async (sriRequestMap, _jobMap, pendingJobs) => {
        (Array.from(sriRequestMap) as Array<[string, TSriRequest]>).forEach(
          ([psId, sriRequest]) => {
            if (pendingJobs.has(psId)) {
              if (sriRequest.generateError === true) {
                sriRequest.generateError = false;
                throw new SriError({
                  status: 400,
                  errors: [{ code: "foo" }],
                  sriRequestID: sriRequest.id,
                });
              }
            }
          },
        );
      },

      // count the number of calls to beforePhase
      async (sriRequestMap: Map<string, TSriRequest>, _jobMap, _pendingJobs) => {
        // find parent sriRequest
        const sriRequest = getParentSriRequestFromRequestMap(sriRequestMap, true);
        if (sriRequest.userData.beforePhaseCntr === undefined) {
          if (sriRequest.userData) {
            sriRequest.userData.beforePhaseCntr = 0;
          } else {
            sriRequest.userData = {
              beforePhaseCntr: 0,
            };
          }
        }
        sriRequest.userData.beforePhaseCntr += 1;
      },
    ],

    transformRequest: [utils.lookForBasicAuthUser],
    transformInternalRequest: [utils.copyUserInfo],

    afterRequest: [
      (sriRequest) => {
        dummyLogger.log(`afterRequest hook of ${sriRequest.id}`);
        dummyLogger.log(`final beforePhaseCntr: ${sriRequest.userData.beforePhaseCntr}`);
      },
    ],

    // temporarily global batch for samenscholing
    enableGlobalBatch: true,

    // send keep alive characters every 3 seconds, so we can more quickly test
    // if this mechanism works
    streamingKeepAliveTimeoutMillis: 3_000,
  };

  configCache = config;
  return config;
}

async function serve(
  sri4node,
  port,
  logdebug: TLogDebug,
  dummyLogger,
  resourceFiles,
): Promise<{ server: Server; sriServerInstance: TSriServerInstance }> {
  const theConfig = config(sri4node, logdebug, dummyLogger, resourceFiles);

  // Need to pass in express.js and node-postgress as dependencies.
  const app = express();

  const sriServerInstance = await sri4node.configure(app, theConfig);

  try {
    const server = await app.listen(port);
    console.log(`Node app is running at localhost:${port}`);
    return { server, sriServerInstance };
  } catch (error) {
    console.log(`Node app failed to initialize: ${error}`);
    process.exit(1);
  }
}

function getConfiguration() {
  if (!configCache) {
    throw new Error("please first configure the context");
  }

  return configCache;
}

export { config, serve, getConfiguration };
