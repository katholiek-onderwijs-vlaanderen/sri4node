exports = module.exports = function (roa, extra) {
  'use strict';

  var ret = {
    type: '/onlyCustom',
    customRoutes: [
      { routePostfix: ''
      , httpMethods: ['GET']
      , handler: async(tx, sriRequest, mapping) => {
            return { status: 200, body: '{ "bar": "foo" }' }
        }
      },
    ],
    onlyCustom: true
  };

  return ret;
};

