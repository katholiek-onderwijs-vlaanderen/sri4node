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
    describe('Persons resource referenced has no type property', () => {
      it('should fail with error message', async () => {
        await utils.testForStatusCode(
          async () => {
            await doGet('/personrelations?toTypes=ADULT', null, authHdrObj);
          },
          (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.body.errors[0].code, 'invalid.query.parameter');
          },
        );
      });
    });
  });
};
