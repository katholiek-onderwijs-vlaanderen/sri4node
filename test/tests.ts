import { TDebugChannel, TLogDebug } from '../js/typeDefinitions';

import * as sri4node from '..';
const devNull = require('dev-null');
const { Console } = require('console');

import * as context from './context';
import * as informationSchema from '../js/informationSchema';
import { assert } from 'chai';
import sinon from 'ts-sinon';
// const sinonTest = require("sinon-test");
// const test = sinonTest(sinon);


const sinonSandbox = sinon.createSandbox();

const dummyLogger = new Console({
  stdout: devNull(),
  stderr: devNull(),
  ignoreErrors: true,
  colorMode: false
});



const port = 5000;
const logdebug:TLogDebug = { channels: [] };
// const logdebug = { channels: 'all' };
// const logdebug:{ channels: TDebugChannel[] } = { channels: ['phaseSyncer', 'hooks'] };

const base = `http://localhost:${port}`;







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

describe('Sri4node SCHEMA VALIDATION', function () {
  this.timeout(0);
  let server:any = null;

  after(async () => {
    sinonSandbox.restore();
    if (server) {
      console.log('Stopping express server (was not stopped as we stubbed process.exit !).');
      await server.close();
    }
    console.log('Done.');
  });

  it('sri4node should exit with an invalid schema', async function () {
    const consoleSpy = sinonSandbox.spy(console, 'log');
    const exitStub = sinonSandbox.stub(process, 'exit');
    server = await context.serve(sri4node, port, logdebug, dummyLogger, [ './context/invalidSchema' ]);
    assert.isTrue(exitStub.called, 'expected process.exit to be called');
    assert.isTrue(consoleSpy.calledWith('Compiling JSON schema of /invalidschema failed:'), 'expected logging of schema compilation error');
  });
});


describe('Sri4node SERVER TESTS', function () {
  this.timeout(0);
  let server:any = null;

  before(async () => {
    try {
      /**
       * We need to clear the informationSchema cache as it is currently iniatialized for the configuration of
       * 'Sri4node SCHEMA VALIDATION'.
       */
      informationSchema.clearCache();
      server = await context.serve(sri4node, port, logdebug, dummyLogger, 
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
]);
    } catch (err) {
      console.log(err);
    }
  });

  after(async () => {
    // uncomment this keep server running for manual inspection
    // await new Promise(function(resolve, reject){});

    console.log('Stopping express server.');
    if (server) {
      await server.close();
    }
    console.log('Done.');
  });

  // require('./testOrderBy')(base);
  runTestIfNeeded('./testOrderBy.ts', [base]);
  runTestIfNeeded('./testHooks.ts', [base, dummyLogger]);
  runTestIfNeeded('./testCTE.ts', [base]);
  runTestIfNeeded('./testListResource.ts', [base]);
  runTestIfNeeded('./testPublicResources.ts', [base]);
  runTestIfNeeded('./testRegularResource.ts', [base]);
  runTestIfNeeded('./testPutAndPatch.ts', [base]);
  runTestIfNeeded('./testDelete.ts', [base]);
  runTestIfNeeded('./testJSONB.ts', [base]);

  runTestIfNeeded('./testReqId.ts', [base]);

  runTestIfNeeded('./testQueryUtils.ts', [base]);
  runTestIfNeeded('./testModified.ts', [base]);
  runTestIfNeeded('./testResourceType.ts', [base]);

  runTestIfNeeded('./testExpand.ts', [base]);
  runTestIfNeeded('./testErrorHandling.ts', [base]);
  runTestIfNeeded('./testIsPartOf.ts', [base]);
  runTestIfNeeded('./testBatch.ts', [base]);

  runTestIfNeeded('./testInternalRequest.ts', [base]);

  runTestIfNeeded('./defaultFilter/testDefaultFilterGreater.ts', [base]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterCombination.ts', [base]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterContains.ts', [base]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterExact.ts', [base]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterGreaterOrEqual.ts', [base]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterIn.ts', [base]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterLess.ts', [base]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterLessOrEqual.ts', [base]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterQ.ts', [base]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterRegEx.ts', [base]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterInvalidParameter.ts', [base]);
  runTestIfNeeded('./defaultFilter/testDefaultFilterOverlaps.ts', [base]);

  runTestIfNeeded('./relationsFilter/testRelationsFilterFromTypes.ts', [base]);
  runTestIfNeeded('./relationsFilter/testRelationsFilterToTypes.ts', [base]);
  runTestIfNeeded('./relationsFilter/testRelationsFilterNoType.ts', [base]);

  runTestIfNeeded('./testServerTiming.ts', [base]);
  runTestIfNeeded('./testLogging.ts', [base]);
  runTestIfNeeded('./testSriType.ts', [base]);

  runTestIfNeeded('./testDocs.ts', [base]);
  runTestIfNeeded('./testInformationSchema.ts', []);

  runTestIfNeeded('./testCustomRoutes.ts', [base]);
});

export {};
