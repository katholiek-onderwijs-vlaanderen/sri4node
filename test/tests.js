var roa = require('../sri4node.js');
var context = require('./context.js');

var port = 5000;
var logsql, logrequests, logdebug;
logsql = logrequests = logdebug = false;

var base = 'http://localhost:' + port;
context.serve(roa, port, logsql, logrequests, logdebug);

require('./testExpand.js')(base, logdebug);
require('./testQueryUtils.js')(base, logdebug);
require('./testCTE.js')(base, logdebug);
require('./testListResource.js')(base, logdebug);
require('./testRegularResource.js')(base, logdebug);
require('./testAfterRead.js')(base, logdebug);
require('./testSecurityContext.js')(base, logdebug);
require('./testPutAndDelete.js')(base, logdebug);
require('./testJSONB.js')(base, logdebug);
require('./testInformationSchema.js')(logdebug);
require('./testCustomRoutes.js')(base, logdebug);
require('./defaultFilter/testDefaultFilterExact.js')(base, logdebug);
require('./defaultFilter/testDefaultFilterCombination.js')(base, logdebug);
require('./defaultFilter/testDefaultFilterContains.js')(base, logdebug);
require('./defaultFilter/testDefaultFilterGreater.js')(base, logdebug);
require('./defaultFilter/testDefaultFilterGreaterOrEqual.js')(base, logdebug);
require('./defaultFilter/testDefaultFilterIn.js')(base, logdebug);
require('./defaultFilter/testDefaultFilterLess.js')(base, logdebug);
require('./defaultFilter/testDefaultFilterLessOrEqual.js')(base, logdebug);
require('./defaultFilter/testDefaultFilterQ.js')(base, logdebug);
require('./defaultFilter/testDefaultFilterRegEx.js')(base, logdebug);
require('./defaultFilter/testDefaultFilterInvalidParameter.js')(base, logdebug);

/*
var sriclient = require('sri4node-client');
var doGet = sriclient.get;
var assert = require('assert');

describe('/persons/{key} from different community', function () {
    it('should be 403 Forbidden', function () {
        return doGet(base + '/persons/82565813-943e-4d1a-ac58-8b4cbc865bdb',
            'kevin@email.be', 'pwd').then(function (response) {
                assert.equal(response.statusCode, 403);
            });
    });
});
*/
