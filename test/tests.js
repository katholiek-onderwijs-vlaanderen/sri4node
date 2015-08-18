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
require('./testDefaultFilter.js')(base, logdebug);
require('./testCustomRoutes.js')(base, logdebug);
