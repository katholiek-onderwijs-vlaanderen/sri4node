// Utility methods for calling the SRI interface
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory from '../utils';

const assert = require('assert');

export = module.exports = function (base) {
  const sriClientConfig = {
    baseUrl: base,
  };

  const api = sriClientFactory(sriClientConfig);

  const doGet = function (...args) { return api.getRaw(...args); };

  const utils = utilsFactory(api);
  const { makeBasicAuthHeader } = utils;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } };

  describe('Generic Filters', () => {
    describe('Q query', () => {
      it('should find resources with a general match', async () => {
        const response = await doGet('/alldatatypes?q=multiple', null, authHdrObj);
        assert.equal(response.results.length, 2);
        assert.equal(response.results[0].$$expanded.id, 13);
        assert.equal(response.results[1].$$expanded.id, 14);
      });

      it('should find resources of type varchar and char with a general match', async () => {
        const response = await doGet('/alldatatypes?q=char', null, authHdrObj);
        assert.equal(response.results.length, 4);
        assert.equal(response.results[0].$$expanded.id, 34);
        assert.equal(response.results[1].$$expanded.id, 35);
        assert.equal(response.results[2].$$expanded.id, 36);
        assert.equal(response.results[3].$$expanded.id, 37);
      });

      it('should find resources with a general match and multiple values', async () => {
        const response = await doGet('/alldatatypes?q=MULTIPLE+vsko', null, authHdrObj);
        assert.equal(response.results.length, 1);
        assert.equal(response.results[0].$$expanded.id, 13);
      });

      it('should not find resources with a general match', async () => {
        const response = await doGet('/alldatatypes?q=general', null, authHdrObj);
        assert.equal(response.results.length, 0);
      });
    });
  });
};
