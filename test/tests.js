var roa = require('../sri4node.js');
var context = require('./context.js');

var port = 5000;
var logsql, logrequests, logdebug, logmiddleware;
logsql = logrequests = logdebug = logmiddleware = false;
// logdebug=true
// logsql = true

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

    server = await context.serve(roa, port, logsql, logrequests, logdebug, logmiddleware);
  });

  after(async () => {
    // uncomment this keep server running for manual inspection
    // await new Promise(function(resolve, reject){});

    console.log('Stopping express server.')
    await server.close();
    console.log('Done.')
  });

  require('./testOrderBy.js')(base, logdebug);
  require('./testAfterRead.js')(base, logdebug);
  require('./testCTE.js')(base, logdebug);
  require('./testListResource.js')(base, logdebug);
  require('./testPublicResources.js')(base, logdebug);
  require('./testRegularResource.js')(base, logdebug);
  require('./testPutAndPatch.js')(base, logdebug);
  require('./testDelete.js')(base, logdebug);
  require('./testJSONB.js')(base, logdebug);

  require('./testQueryUtils.js')(base, logdebug);
  require('./testModified.js')(base, logdebug);
  require('./testResourceType.js')(base, logdebug);

  require('./testExpand.js')(base, logdebug);
  require('./testErrorHandling.js')(base, logdebug);
  require('./testCustomRoutes.js')(base, logdebug); 
  require('./testIsPartOf.js')(base, logdebug);   
  require('./testBatch.js')(base, logdebug);

  require('./defaultFilter/testDefaultFilterGreater.js')(base, logdebug);
  require('./defaultFilter/testDefaultFilterCombination.js')(base, logdebug);
  require('./defaultFilter/testDefaultFilterContains.js')(base, logdebug);
  require('./defaultFilter/testDefaultFilterExact.js')(base, logdebug);
  require('./defaultFilter/testDefaultFilterGreaterOrEqual.js')(base, logdebug);
  require('./defaultFilter/testDefaultFilterIn.js')(base, logdebug);
  require('./defaultFilter/testDefaultFilterLess.js')(base, logdebug);
  require('./defaultFilter/testDefaultFilterLessOrEqual.js')(base, logdebug);
  require('./defaultFilter/testDefaultFilterQ.js')(base, logdebug);
  require('./defaultFilter/testDefaultFilterRegEx.js')(base, logdebug);
  require('./defaultFilter/testDefaultFilterInvalidParameter.js')(base, logdebug);

  require('./relationsFilter/testRelationsFilterFromTypes.js')(base, logdebug);
  require('./relationsFilter/testRelationsFilterToTypes.js')(base, logdebug);
  require('./relationsFilter/testRelationsFilterNoType.js')(base, logdebug);


  require('./testDocs.js')(base, logdebug);
  require('./testInformationSchema.js')(logdebug);

});
