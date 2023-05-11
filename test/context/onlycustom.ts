import { TResourceDefinition } from "../../sri4node";

module.exports = function (_sri4node) {
  const r : TResourceDefinition = {
    type: '/onlyCustom',
    metaType: 'SRI4NODE_ONLY_CUSTOM',
    schema: {},
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
        handler: async (_tx, sriRequest, _mapping) => {
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
  return r;
};

