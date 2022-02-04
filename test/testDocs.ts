// Utility methods for calling the SRI interface
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';

export = module.exports = function (base) {
  describe('Docs', () => {
    const sriClientConfig = {
      baseUrl: base,
    };

    const api = sriClientFactory(sriClientConfig);

    const doGet = function (...args) { return api.getRaw(...args); };

    it('should return general API documentation', async () => {
      await doGet('/docs');
    });

    it('should return persons documentation', async () => {
      await doGet('/persons/docs');
    });

    it('should return alldatatypes documentation', async () => {
      await doGet('/alldatatypes/docs');
    });

    it('should return communities documentation', async () => {
      await doGet('/communities/docs');
    });

    it('should return jsonb documentation', async () => {
      await doGet('/jsonb/docs');
    });

    it('should return messages documentation', async () => {
      await doGet('/messages/docs');
    });

    it('should return selfreferential documentation', async () => {
      await doGet('/selfreferential/docs');
    });

    it('should return table documentation', async () => {
      await doGet('/table/docs');
    });

    it('should return transactions documentation', async () => {
      await doGet('/transactions/docs');
    });
  });
};
