export = module.exports = function (roa, extra) {
  'use strict';

  var ret = {
    type: '/onlyCustom',
    customRoutes: [
      { routePostfix: ''
      , httpMethods: ['GET']
      , handler: async(tx, sriRequest, mapping) => {
            if (sriRequest.userObject.email === 'sam@email.be') {
                return { status: 200, body: `{ "sriType": "${sriRequest.sriType}" }` }
            } else  {
                return { status: 200, body: '{ "bar": "foo" }' }
            }
        }
      },
    ],
    onlyCustom: true
  };

  return ret;
};

