import { TDebugChannel, TLogDebug } from '../js/typeDefinitions';

import * as sri4node from '..';
const devNull = require('dev-null');
const { Console } = require('console');

import * as context from './context';
import * as informationSchema from '../js/informationSchema';

import httpClientMod from './httpClient';

const dummyLogger = new Console({
  stdout: devNull(),
  stderr: devNull(),
  ignoreErrors: true,
  colorMode: false
});

const port = 5000;
const logdebug:TLogDebug = { channels: [] };
// const logdebug : TLogDebug = { channels: 'all' };
// const logdebug:{ channels: TDebugChannel[] } = { channels: ['phaseSyncer', 'hooks'] };

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
function runTestIfNeeded(testFileName:string, args:any[] | undefined = undefined) {
  const underscoresIndex = process.argv.indexOf('--pick');
  const testsToRun = underscoresIndex >= 0 ? process.argv.slice(underscoresIndex + 1) : [];
  if (underscoresIndex < 0 || testsToRun.includes(testFileName)) {
    const t = require(testFileName);
    if (args !== undefined) {
      t(...args);
    }
  } else {
    describe(`tests ${testFileName}`, () => {
      it(`will not run because not found in ${testsToRun.join()}`, () => {});
    });
  }
}

describe('Sri4node PURE UNIT TESTS', () => {
  runTestIfNeeded('./common/test_hrefToNormalizedUrl.ts');
});

describe('Sri4node VALIDATION AT STARTUP TESTS', function () {
  runTestIfNeeded('./testValidationAtStartup.ts', [ port, logdebug, dummyLogger ]);
});


describe('Sri4node SERVER TESTS', function () {
  this.timeout(0);
  let server:any = null;
  let sri4nodeInstance:any = null;

  before(async () => {
    try {
      // We need to clear the informationSchema cache as it is currently iniatialized for the configuration of Sri4node SCHEMA VALIDATION'.
      informationSchema.clearCache();
      ({server, sri4nodeInstance} = await context.serve(sri4node, port, logdebug, dummyLogger, 
          [ './context/persons',
          './context/messages',
          './context/communities',
          './context/transactions',
          './context/table',
          './context/jsonb',
          './context/alldatatypes',
          './context/products',
          './context/packages',
          './context/relations',
          './context/personrelations',
          './context/cities',
          './context/selfreferential',
          './context/countries',
          './context/countries_with_prefix',
          './context/onlycustom',
          './context/customStreaming',
          './context/foos',
          './context/bars',
          ]));
    } catch (err) {
      console.log(err);
    }
  });

  after(async () => {
    // uncomment this keep server running for manual inspection
    // await new Promise(function(resolve, reject){});

    console.log('Stopping the server.');
    server && (await server.close());
    sri4nodeInstance && (await sri4nodeInstance.close());
    console.log('Done.');
  });

  // // require('./testOrderBy')(base);
  runTestIfNeeded('./testOrderBy.ts', [httpClient]);
  runTestIfNeeded('./testHooks.ts', [httpClient, dummyLogger]);
  runTestIfNeeded('./testCTE.ts', [httpClient]);
  runTestIfNeeded('./testListResource.ts', [httpClient]);
  runTestIfNeeded('./testPublicResources.ts', [httpClient]);
  runTestIfNeeded('./testRegularResource.ts', [httpClient]);
  runTestIfNeeded('./testPutAndPatch.ts', [httpClient]);
  runTestIfNeeded('./testDelete.ts', [httpClient]);
  runTestIfNeeded('./testJSONB.ts', [httpClient]);
  runTestIfNeeded('./testQueryUtils.ts', [httpClient]);
  runTestIfNeeded('./testModified.ts', [httpClient]);
  runTestIfNeeded('./testResourceType.ts', [httpClient]);
  runTestIfNeeded('./testExpand.ts', [httpClient]);
  runTestIfNeeded('./testErrorHandling.ts', [httpClient]);
  runTestIfNeeded('./testIsPartOf.ts', [httpClient]);
  runTestIfNeeded('./testBatch.ts', [httpClient]);
  runTestIfNeeded('./testInternalRequest.ts', [httpClient]);

  runTestIfNeeded('./defaultFilter/testDefaultFilterCombination.ts', [httpClient]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterContains.ts', [httpClient]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterExact.ts', [httpClient]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterGreater.ts', [httpClient]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterGreaterOrEqual.ts', [httpClient]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterIn.ts', [httpClient]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterInvalidParameter.ts', [httpClient]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterLess.ts', [httpClient]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterLessOrEqual.ts', [httpClient]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterOverlaps.ts', [httpClient]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterQ.ts', [httpClient]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterRegEx.ts', [httpClient]);

  runTestIfNeeded('./relationsFilter/testRelationsFilterFromTypes.ts', [httpClient]);
  runTestIfNeeded('./relationsFilter/testRelationsFilterToTypes.ts', [httpClient]);
  runTestIfNeeded('./relationsFilter/testRelationsFilterNoType.ts', [httpClient]);

  runTestIfNeeded('./testReqId.ts', [httpClient]);
  runTestIfNeeded('./testServerTiming.ts', [httpClient]);
  runTestIfNeeded('./testLogging.ts', [httpClient]);
  runTestIfNeeded('./testSriType.ts', [httpClient]);

  runTestIfNeeded('./testDocs.ts', [httpClient]);
  runTestIfNeeded('./testInformationSchema.ts', []);
  runTestIfNeeded('./testCustomRoutes.ts', [httpClient]);
});

export {};
