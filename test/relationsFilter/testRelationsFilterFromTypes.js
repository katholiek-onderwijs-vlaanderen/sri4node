// Utility methods for calling the SRI interface
var assert = require('assert');

exports = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function() { return api.getRaw(...arguments) };

  const utils =  require('../utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }


  describe('Relations Filters', function () {

    describe('From types match', function () {

      it('should find relations where from resource is of type', async function () {
        const response = await doGet('/relations?fromTypes=request', null, authHdrObj)
        assert.equal(response.results.length, 2);
        assert.equal(response.results[0].$$expanded.type, 'IS_RELATED');
        assert.equal(response.results[1].$$expanded.type, 'IS_RELATED');
      });

      it('should find relations where from resource is one of types', async function () {
        const response = await doGet('/relations?fromTypes=request,offer', null, authHdrObj)
        assert.equal(response.results.length, 4);
      });

      it('should not find relations where from resource is not of type', async function () {
        const response = await doGet('/relations?fromTypes=response', null, authHdrObj)
        assert.equal(response.results.length, 0);
      });
    });

  });
};
