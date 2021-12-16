var roa = require('../sri4node');
var context = require('./context');

var port = 5000;
const logdebug = false;
// const logdebug = { channels: 'all' };

var base = 'http://localhost:' + port;

const { spawn } = require('child_process');


function asyncSpawn(command, args:string[] = []) {
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
  let server:any = null;

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
    if (server) {
      await server.close();
    }
    console.log('Done.')
  });

  require('./testOrderBy')(base);
  require('./testAfterRead')(base);
  require('./testCTE')(base);
  require('./testListResource')(base);
  require('./testPublicResources')(base);
  require('./testRegularResource')(base);
  require('./testPutAndPatch')(base);
  require('./testDelete')(base);
  require('./testJSONB')(base);

  require('./testQueryUtils')(base);
  require('./testModified')(base);
  require('./testResourceType')(base);

  require('./testExpand')(base);
  require('./testErrorHandling')(base);
  require('./testCustomRoutes')(base);
  require('./testIsPartOf')(base);
  require('./testBatch')(base);

  require('./testInternalRequest')(base);

  require('./defaultFilter/testDefaultFilterGreater')(base);
  require('./defaultFilter/testDefaultFilterCombination')(base);
  require('./defaultFilter/testDefaultFilterContains')(base);
  require('./defaultFilter/testDefaultFilterExact')(base);
  require('./defaultFilter/testDefaultFilterGreaterOrEqual')(base);
  require('./defaultFilter/testDefaultFilterIn')(base);
  require('./defaultFilter/testDefaultFilterLess')(base);
  require('./defaultFilter/testDefaultFilterLessOrEqual')(base);
  require('./defaultFilter/testDefaultFilterQ')(base);
  require('./defaultFilter/testDefaultFilterRegEx')(base);
  require('./defaultFilter/testDefaultFilterInvalidParameter')(base);
  require('./defaultFilter/testDefaultFilterOverlaps')(base);

  require('./relationsFilter/testRelationsFilterFromTypes')(base);
  require('./relationsFilter/testRelationsFilterToTypes')(base);
  require('./relationsFilter/testRelationsFilterNoType')(base);

  require('./testServerTiming')(base);
  require('./testLogging')(base);
  require('./testSriType')(base);

  require('./testDocs')(base);
  require('./testInformationSchema')();

});

export = module.exports = {};