// Utility methods for calling the SRI interface
import * as assert from 'assert';
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory from './utils';

export = module.exports = function (base) {
  const sriClientConfig = {
    baseUrl: base,
  };
  const api = sriClientFactory(sriClientConfig);

  const doGet = function (...args) { return api.getRaw(...args); };

  const utils = utilsFactory(api);
  const { makeBasicAuthHeader } = utils;

  describe('test call via internal interface on protected resource', () => {
    describe('without authentication', () => {
      it('should fail', async () => {
        await utils.testForStatusCode(
          async () => {
            await doGet('/communities/customroute_via_internal_interface');
          },
          (error) => {
            assert.equal(error.status, 401);
          },
        );
      });
    });

    describe('with authentication', () => {
      it('should return resource', async () => {
        const auth = makeBasicAuthHeader('kevin@email.be', 'pwd');
        const response = await doGet('/communities/customroute_via_internal_interface', null, { headers: { authorization: auth } });
        assert.equal(response.firstname, 'Kevin');
      });
    });
  });
};
