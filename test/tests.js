var roa = require('../sri4node.js');
var context = require('./context.js');

var port = 5000;
const logdebug = false;
// const logdebug = { channels: 'all' };

var base = 'http://localhost:' + port;

const { spawn } = require('child_process');


function asyncSpawn(command, args) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args);

    let output = '';
    let errors = '';

    childProcess.stdout.on('data', (data) => {
      output = output + data + '\n';
    });

    childProcess.stderr.on('data', (data) => {
      // console.log(`stderr: ${data}`);
      errors = errors + data + '\n';
    });

    childProcess.on('close', (code) => {
      // console.log(`child process ${command} exited with code ${code}`);
      if (code === 0) {
        resolve(output)
      }
      else {
        reject(errors)
      }
    });
  })
}

describe('Sri4node testing', function () {
  'use strict';
  this.timeout(0);
  let server = null;

  before(async function () {
    // init testing DB
    try {
      await asyncSpawn(`${__dirname}/../createdb.sh`);
    }
    catch (e) {
      console.log(`Problem while trying to initialize the testing DB: ${e}`)
      throw new Error(`Problem while trying to initialize the testing DB: ${e}`)
    }

    server = await context.serve(roa, port, logdebug);
  });

  after(async () => {
    // uncomment this keep server running for manual inspection
    // await new Promise(function(resolve, reject){});

    console.log('Stopping express server.')
    await server.close();
    console.log('Done.')
  });

  require('./testOrderBy.js')(base);
  require('./testAfterRead.js')(base);
  require('./testCTE.js')(base);
  require('./testListResource.js')(base);
  require('./testPublicResources.js')(base);
  require('./testRegularResource.js')(base);
  require('./testPutAndPatch.js')(base);
  require('./testDelete.js')(base);
  require('./testJSONB.js')(base);

  require('./testQueryUtils.js')(base);
  require('./testModified.js')(base);
  require('./testResourceType.js')(base);

  require('./testExpand.js')(base);
  require('./testErrorHandling.js')(base);
  require('./testCustomRoutes.js')(base);
  require('./testIsPartOf.js')(base);
  require('./testBatch.js')(base);

  require('./testInternalRequest.js')(base);

  require('./defaultFilter/testDefaultFilterGreater.js')(base);
  require('./defaultFilter/testDefaultFilterCombination.js')(base);
  require('./defaultFilter/testDefaultFilterContains.js')(base);
  require('./defaultFilter/testDefaultFilterExact.js')(base);
  require('./defaultFilter/testDefaultFilterGreaterOrEqual.js')(base);
  require('./defaultFilter/testDefaultFilterIn.js')(base);
  require('./defaultFilter/testDefaultFilterLess.js')(base);
  require('./defaultFilter/testDefaultFilterLessOrEqual.js')(base);
  require('./defaultFilter/testDefaultFilterQ.js')(base);
  require('./defaultFilter/testDefaultFilterRegEx.js')(base);
  require('./defaultFilter/testDefaultFilterInvalidParameter.js')(base);
  require('./defaultFilter/testDefaultFilterOverlaps.js')(base);

  require('./relationsFilter/testRelationsFilterFromTypes.js')(base);
  require('./relationsFilter/testRelationsFilterToTypes.js')(base);
  require('./relationsFilter/testRelationsFilterNoType.js')(base);

  require('./testServerTiming.js')(base);
  require('./testLogging.js')(base);
  require('./testSriType.js')(base);

  require('./testDocs.js')(base);
  require('./testInformationSchema.js')();

});
