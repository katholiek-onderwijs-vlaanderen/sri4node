const sleep = require('await-sleep')

exports = module.exports = function (roa, extra) {
  'use strict';

  var ret = {
    type: '/customStreaming',
    customRoutes: [
      { routePostfix: ''
      , httpMethods: ['GET']
      , streamingHandler: async (tx, sriRequest, stream) => {
          if (sriRequest.query['superslowstart'] !== undefined) {
            await sleep(70000);
            stream.push("foo");
          } else {
            await sleep(5000);
            stream.push("f");
            await sleep(10000);
            stream.push("o");
            await sleep(20000);
            stream.push("o");
            await sleep(20000);
            stream.push("b");
            await sleep(20000);
            stream.push("a");
            await sleep(20000);
            stream.push("r");
            await sleep(20000);
            stream.push("!");
          }
        }
      }
    ],
    onlyCustom: true
  };

  return ret;
};

