module.exports = function (sri4node) {
  return {
    type: '/onlyCustom',
    customRoutes: [
      {
        routePostfix: '',
        httpMethods: ['GET'],
        beforeHandler: async (tx, sriRequest) => {
          // just a very basic query to test if we can speak with the database
          const result = await tx.query('SELECT 1 AS foo;');
          if (result[0].foo !== 1) {
            throw new sriRequest.SriError({ status: 500, errors: [{ code: 'unexpected.query.result.in.before.handler' }] });
          }
        },
        handler: async (tx, sriRequest, mapping) => {
          if (sriRequest.userObject.email === 'sam@email.be') {
            return { status: 200, body: `{ "sriType": "${sriRequest.sriType}" }`, headers: {'content-type': 'application/json; charset=utf-8'} }
          } else {
            return { status: 200, body: '{ "bar": "foo" }', headers: {'content-type': 'application/json; charset=utf-8'} }
          }
        }
      },
    ],
    onlyCustom: true
  };
};

