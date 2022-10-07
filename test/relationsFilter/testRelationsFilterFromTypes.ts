// Utility methods for calling the SRI interface
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory from '../utils';

const assert = require('assert');

module.exports = function (base) {
  const sriClientConfig = {
    baseUrl: base,
  };

  const api = sriClientFactory(sriClientConfig);

  const doGet = function (...args) { return api.getRaw(...args); };

  const utils = utilsFactory(api);
  const { makeBasicAuthHeader } = utils;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } };

  describe('Relations Filters', () => {
    describe('From types match', () => {
      it('should find relations where from resource is of type', async () => {
        const response = await doGet('/relations?fromTypes=request', null, authHdrObj);
        assert.equal(response.results.length, 2);
        assert.equal(response.results[0].$$expanded.type, 'IS_RELATED');
        assert.equal(response.results[1].$$expanded.type, 'IS_RELATED');
      });

      it('should find relations where from resource is one of types', async () => {
        const response = await doGet('/relations?fromTypes=request,offer', null, authHdrObj);
        assert.equal(response.results.length, 4);
      });

      it('should not find relations where from resource is not of type', async () => {
        const response = await doGet('/relations?fromTypes=response', null, authHdrObj);
        assert.equal(response.results.length, 0);
      });
    });
  });
};
