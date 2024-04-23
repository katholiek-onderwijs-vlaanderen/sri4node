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
  TSriServerInstance,
  TLogDebugExternal,
} from "../js/typeDefinitions";
import * as utils from "./utils";
import { Server } from "http";
import { IDatabase, IEventContext, IMain } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import _ from "lodash";

/**
 * Type to store args of pgp callbacks, so we can look at then later
 */
type TPgpStats = {
  connect: Array<{ client: IClient; databaseContext; useCount: number }>;
  disconnect: Array<{ client: IClient; databaseContext }>;
  error: Array<{ error; eventContext: IEventContext<IClient> }>;
  query: Array<{ eventContext: IEventContext<IClient> }>;
  task: Array<{ eventContext: IEventContext<IClient> }>;
  transact: Array<{ eventContext: IEventContext<IClient> }>;
};

let configCache: TSriConfig;
let configCacheClone: TSriConfig;

/**
 * We will keep all the event calls here, so that we get a list of
 * everything that has been done on the library.
 */
const pgpStats: TPgpStats = {
  connect: [],
  disconnect: [],
  error: [],
  query: [],
  task: [],
  transact: [],
};

import * as sri4nodeTS from "../index";
import path from "path";
import { readFileSync } from "fs";

/**
 * Wraps the given code in a DO block, so it can be executed as a single statement.
 *
 * @param {string} code
 * @returns string
 */
const sqlPlpgsql = (code) => `
DO $___$
BEGIN
  ${code}
END
$___$
LANGUAGE 'plpgsql';
`;

/**
 * Creates the TSriConfig object.
 *
 * @param sri4node
 * @param logdebug
 * @param dummyLogger
 * @param resourceFiles
 * @returns
 */
function config(
  sri4node: typeof sri4nodeTS,
  logdebug: TLogDebugExternal,
  dummyLogger: Console,
  resourceFiles: Array<string>,
) {
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
      statement_timeout: 5000,
    },
    databaseLibraryInitOptions: {
      connect(client, databaseContext, useCount) {
        // console.log("\x1b[32m", "                                        connect called", "\x1b[0m");
        pgpStats.connect.push({ client, databaseContext, useCount });
      },
      disconnect(client, databaseContext) {
        // console.log("\x1b[32m", "                                        disconnect called", "\x1b[0m");
        pgpStats.disconnect.push({ client, databaseContext });
      },
      error(error, eventContext) {
        // console.log("\x1b[32m", "                                        error called", "\x1b[0m");
        pgpStats.error.push({ error, eventContext });
      },
      query(eventContext) {
        // console.log("\x1b[32m", "                                        query called", "\x1b[0m");
        pgpStats.query.push({ eventContext });
      },
      task(eventContext) {
        // console.log("\x1b[32m", "                                        task called", "\x1b[0m");
        pgpStats.task.push({ eventContext });
      },
      transact(eventContext) {
        // console.log("\x1b[32m", "                                        transact called", "\x1b[0m");
        pgpStats.transact.push({ eventContext });
      },
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

        // read sql/*.sql and execute it to create all the tables and fill in all the test data !
        /////////////////////////////////////////////////////////////////////////////////////////

        // create the schema
        await db.query(readFileSync(path.join(__dirname, "context/sql/schema.sql"), "utf8"));
        // insert test data (if not inserted yet)
        const dbInitialized = await db.one(
          "select EXISTS (SELECT 1 FROM communities) as db_initialized",
        );
        if (!dbInitialized["db_initialized"]) {
          // This hideous code is needed to execute each insert statement a a separate statement
          // otherwise all the $$meta.created dates are the same, and our tests depend on the
          // insert order ($$meta.created is used as the default sort key in sri4node)
          const sqlLines = readFileSync(path.join(__dirname, "context/sql/testdata.sql"), "utf8")
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0 && !l.startsWith("--"));

          for (const l of sqlLines) {
            await db.query(l);
          }
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
  configCacheClone = _.cloneDeep(config);
  return config;
}

async function serve(
  sri4node,
  port,
  logdebug: TLogDebugExternal,
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

/**
 * When calling config, we make a clone, so we can test after calling serve
 * if the config object is not altered by sri4node.configure()
 *
 * @returns a deep clone of the original configuration object
 */
function getConfigurationClone() {
  if (!configCacheClone) {
    throw new Error("please first configure the context");
  }

  return configCacheClone;
}

/**
 * Makes ure all the arrays in the pgpStats object are emptied again.
 *
 * (Just setting the array length to 0, replacing each pgpStats[k] with an empty array seems
 * to break the pg-promise hooks (=> no events recorded anymore).
 */
function resetPgpStats() {
  Object.keys(pgpStats).forEach((k) => (pgpStats[k].length = 0));
}

export { config, serve, getConfiguration, getConfigurationClone, pgpStats, resetPgpStats };
