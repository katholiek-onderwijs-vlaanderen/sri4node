import { TLogDebugExternal, TSriServerInstance } from "../js/typeDefinitions";

import devNull from "dev-null";
import { Console } from "console";

import * as context from "./context";

import httpClientMod from "./httpClient";
import { Server } from "http";

// option 1: use the typescript files to test against
import * as sri4nodeTS from "../index"; // index is needed, otherwise it will use what is indicated in package.json/main !!!
// option 2: use the CommonJS Module compiled bundle to test against
import * as sri4nodeCJS from "../dist/sri4node.cjs.js";
import path from "path";
// option 3: use the EcmaScript Module compiled bundle to test against
// import * as sri4nodeESM from '../dist/sri4node.esm.mjs';

const dummyLogger = new Console({
  stdout: devNull(),
  stderr: devNull(),
  ignoreErrors: true,
  colorMode: false,
});

const port = 5000;
// const logdebug: TLogDebugExternal = { channels: [] };
const logdebug: TLogDebugExternal = {
  channels: "all",
  statuses: [400, 401, 403, 404, 405, 406, 408, 409, 410, 500, 501, 502, 503, 504, 505, 509, 511],
};
// const logdebug: TLogDebugExternal = { channels: [ 'general' | 'hooks' | ''] };
// const logdebug: TLogDebugExternal = { channels: ['phaseSyncer', 'hooks'] };

const base = `http://localhost:${port}`;
const httpClient = httpClientMod.httpClientFactory(base);

/**
 * after --pick on the command line, list the names of test files you want to run
 *
 * makes it easier to filter out specific tests instead of running all of them all the time
 *
 * @param testFileName
 * @param args
 */
function runTestIfNeeded(testFileName: string, args: any[] | undefined = undefined) {
  const testFileNameFull = path.resolve(path.join("test", testFileName));
  const underscoresIndex = process.argv.indexOf("--pick");
  const testsToRun = underscoresIndex >= 0 ? process.argv.slice(underscoresIndex + 1) : [];
  const testsToRunFull = testsToRun.map((p) => path.resolve(p));
  if (underscoresIndex < 0 || testsToRunFull.includes(testFileNameFull)) {
    const t = require(testFileNameFull);
    if (args !== undefined) {
      t(...args);
    }
  } else {
    describe(`tests ${testFileName}`, () => {
      it.skip(`⛔ will not run because not found in ${testsToRun.join()}`, () => {
        // Do nothing
      });
    });
  }
}

/**
 * This is needed in case sri4node is loaded asynchronously!
 */
const sri4nodeHolder: { sri4node: typeof sri4nodeTS } = {
  sri4node: sri4nodeCJS, // the default, but can be replaced in the before() method!
};

/**
 * In the before() function, we will decide which sri4node to use
 * based on the process.env.SRI4NODE_TEST_MODULE_TYPE environment variable
 *
 * This way we can run the tests on all bundled versions of the library
 * in order to make sure the bundling went well for all versions!
 */
before(async () => {
  // process.env.SRI4NODE_TEST_MODULE_TYPE = 'ESM';

  const sri4nodeModuleMap = {
    TS: sri4nodeTS,
    CJS: sri4nodeCJS,
    // ESM: sri4nodeESM,
    ESM: await import("../dist/sri4node.esm.mjs"),
  };

  const moduleType = process.env.SRI4NODE_TEST_MODULE_TYPE || "CJS";
  sri4nodeHolder.sri4node = sri4nodeModuleMap[moduleType];
  console.log(`>>>>>>>> sri4node '${moduleType}' module has been loaded successfully <<<<<<<<`);
});

describe("Sri4node PURE UNIT TESTS (running on Node ${process.version})", () => {
  runTestIfNeeded("./common/test_hrefToNormalizedUrl.ts");
});

describe("Sri4node VALIDATION AT STARTUP TESTS (running on Node ${process.version})", function () {
  runTestIfNeeded("./testValidationAtStartup.ts", [sri4nodeHolder, port, logdebug, dummyLogger]);
});

describe(`Sri4node SERVER TESTS (running on Node ${process.version})`, function () {
  this.timeout(0);
  // let server:any = null;
  // let sriServerInstance:TSriServerInstance | null = null;
  const testContext: {
    server: null | Server;
    sriServerInstance: null | TSriServerInstance;
    context: typeof context;
  } = {
    server: null,
    sriServerInstance: null,
    context,
  };

  before(async () => {
    try {
      const { server, sriServerInstance } = await context.serve(
        sri4nodeHolder.sri4node,
        port,
        logdebug,
        dummyLogger,
        [
          "./context/persons",
          "./context/messages",
          "./context/communities",
          "./context/transactions",
          "./context/table",
          "./context/jsonb",
          "./context/alldatatypes",
          "./context/products",
          "./context/packages",
          "./context/relations",
          "./context/personrelations",
          "./context/cities",
          "./context/selfreferential",
          "./context/countries",
          "./context/countries_with_prefix",
          "./context/onlycustom",
          "./context/customStreaming",
          "./context/foos",
          "./context/bars",
          "./context/complexSchema",
        ],
      );
      testContext.server = server;
      testContext.sriServerInstance = sriServerInstance;
    } catch (err) {
      console.log(err);
    }
  });

  after(async () => {
    const { server, sriServerInstance } = testContext;
    // uncomment this keep server running for manual inspection
    // await new Promise(function(resolve, reject){});

    console.log("Stopping the server.");
    server && (await server.close());
    sriServerInstance && (await sriServerInstance.close());
    console.log("Done.");
  });

  runTestIfNeeded("./testSri4nodeConfigure.ts", [testContext, httpClient]);
  runTestIfNeeded("./testPlugins.ts", [httpClient, dummyLogger]);

  runTestIfNeeded("./testOrderBy.ts", [httpClient]);
  runTestIfNeeded("./testHooks.ts", [httpClient, dummyLogger]);
  runTestIfNeeded("./testCTE.ts", [httpClient]);
  runTestIfNeeded("./testListResource.ts", [httpClient]);
  runTestIfNeeded("./testPublicResources.ts", [httpClient]);
  runTestIfNeeded("./testRegularResource.ts", [httpClient]);
  runTestIfNeeded("./testPutAndPatch.ts", [httpClient]);
  runTestIfNeeded("./testDelete.ts", [httpClient]);
  runTestIfNeeded("./testJSONB.ts", [httpClient]);
  runTestIfNeeded("./testQueryUtils.ts", [httpClient]);
  runTestIfNeeded("./testModified.ts", [httpClient]);
  runTestIfNeeded("./testResourceType.ts", [httpClient]);
  runTestIfNeeded("./testExpand.ts", [httpClient]);
  runTestIfNeeded("./testErrorHandling.ts", [httpClient, testContext]);
  runTestIfNeeded("./testIsPartOf.ts", [httpClient]);
  runTestIfNeeded("./testBatch.ts", [httpClient]);
  runTestIfNeeded("./testInternalRequest.ts", [httpClient]);

  runTestIfNeeded("./defaultFilter/testDefaultFilterCombination.ts", [httpClient]);
  runTestIfNeeded("./defaultFilter/testDefaultFilterContains.ts", [httpClient]);
  runTestIfNeeded("./defaultFilter/testDefaultFilterExact.ts", [httpClient]);
  runTestIfNeeded("./defaultFilter/testDefaultFilterGreater.ts", [httpClient]);
  runTestIfNeeded("./defaultFilter/testDefaultFilterGreaterOrEqual.ts", [httpClient]);
  runTestIfNeeded("./defaultFilter/testDefaultFilterIn.ts", [httpClient]);
  runTestIfNeeded("./defaultFilter/testDefaultFilterInvalidParameter.ts", [httpClient]);
  runTestIfNeeded("./defaultFilter/testDefaultFilterLess.ts", [httpClient]);
  runTestIfNeeded("./defaultFilter/testDefaultFilterLessOrEqual.ts", [httpClient]);
  runTestIfNeeded("./defaultFilter/testDefaultFilterOverlaps.ts", [httpClient]);
  runTestIfNeeded("./defaultFilter/testDefaultFilterQ.ts", [httpClient]);
  runTestIfNeeded("./defaultFilter/testDefaultFilterRegEx.ts", [httpClient]);

  runTestIfNeeded("./relationsFilter/testRelationsFilterFromTypes.ts", [httpClient]);
  runTestIfNeeded("./relationsFilter/testRelationsFilterToTypes.ts", [httpClient]);
  runTestIfNeeded("./relationsFilter/testRelationsFilterNoType.ts", [httpClient]);

  runTestIfNeeded("./testReqId.ts", [httpClient]);
  runTestIfNeeded("./testServerTiming.ts", [httpClient]);
  runTestIfNeeded("./testLogging.ts", [httpClient]);
  runTestIfNeeded("./testSriType.ts", [httpClient]);

  runTestIfNeeded("./testDocs.ts", [httpClient]);
  runTestIfNeeded("./testInformationSchema.ts", [testContext]);
  runTestIfNeeded("./testCustomRoutes.ts", [httpClient]);

  runTestIfNeeded("./testDbError.ts", [httpClient, testContext]);
});

export {};
