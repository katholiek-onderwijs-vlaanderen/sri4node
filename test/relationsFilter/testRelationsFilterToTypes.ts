// Utility methods for calling the SRI interface
var assert = require('assert');

export = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function(...args) { return api.getRaw(...args) };

  const utils =  require('../utils')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }


  describe('Relations Filters', function () {

    describe('To types match', function () {

      it('should find relations where to resource is of type', async function () {
        const response = await doGet('/relations?toTypes=offer', null, authHdrObj)
        assert.equal(response.results.length, 3);
        assert.equal(response.results[0].$$expanded.type, 'IS_RELATED');
        assert.equal(response.results[1].$$expanded.type, 'IS_RELATED');
        assert.equal(response.results[2].$$expanded.type, 'IS_PART_OF');
      });

      it('should not find relations where to resource is not of type', async function () {
        const response = await doGet('/relations?toTypes=response', null, authHdrObj)
        assert.equal(response.results.length, 0);
      });
    });

  });
};
