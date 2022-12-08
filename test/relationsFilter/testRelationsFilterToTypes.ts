// Utility methods for calling the SRI interface
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory from '../utils';

import { assert } from 'chai';

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
    describe('To types match', () => {
      it('should find relations where to resource is of type', async () => {
        const response = await doGet('/relations?toTypes=offer', null, authHdrObj);
        assert.equal(response.results.length, 3);
        assert.equal(response.results[0].$$expanded.type, 'IS_RELATED');
        assert.equal(response.results[1].$$expanded.type, 'IS_RELATED');
        assert.equal(response.results[2].$$expanded.type, 'IS_PART_OF');
      });

      it('should not find relations where to resource is not of type', async () => {
        const response = await doGet('/relations?toTypes=response', null, authHdrObj);
        assert.equal(response.results.length, 0);
      });
    });
  });
};
