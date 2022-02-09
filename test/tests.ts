import { TDebugChannel } from '../js/typeDefinitions';

const sri4node = require('..');
const context = require('./context');

const port = 5000;
const logdebug = false;
// const logdebug = { channels: 'all' };
// const logdebug:{ channels: TDebugChannel[] } = { channels: ['phaseSyncer'] };

const base = `http://localhost:${port}`;

const { spawn } = require('child_process');

function asyncSpawn(command, args:string[] = []) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args);

    let output = '';
    let errors = '';

    childProcess.stdout.on('data', (data) => {
      output = `${output + data}\n`;
    });

    childProcess.stderr.on('data', (data) => {
      // console.log(`stderr: ${data}`);
      errors = `${errors + data}\n`;
    });

    childProcess.on('close', (code) => {
      // console.log(`child process ${command} exited with code ${code}`);
      if (code === 0) {
        resolve(output);
      } else {
        reject(errors);
      }
    });
  });
}

/**
 * after --pick on the command line, list the names of test files you want to run
 *
 * makes it easier to filter out specific tests instead of running all of them al the times
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

describe('Sri4node SERVER TESTS', function () {
  this.timeout(0);
  let server:any = null;

  before(async () => {
    // init testing DB
    try {
      await asyncSpawn(`${__dirname}/../createdb.sh`);
    } catch (e) {
      console.log(`Problem while trying to initialize the testing DB: ${e}`);
      throw new Error(`Problem while trying to initialize the testing DB: ${e}`);
    }

    server = await context.serve(sri4node, port, logdebug);
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
  runTestIfNeeded('./testAfterRead.ts', [base]);
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

export = module.exports = {};
