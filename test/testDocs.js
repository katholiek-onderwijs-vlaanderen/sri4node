// Utility methods for calling the SRI interface

exports = module.exports = function (base) {
  'use strict';

  describe('Docs', function () {

    const sriClientConfig = {
      baseUrl: base
    }
    const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
    const doGet = function() { return api.getRaw(...arguments) };

    it('should return general API documentation', async function () {
      await doGet('/docs')
    });

    it('should return persons documentation', async function () {
      await doGet('/persons/docs')
    });

    it('should return alldatatypes documentation', async function () {
      await doGet('/alldatatypes/docs')
    });

    it('should return communities documentation', async function () {
      await doGet('/communities/docs')
    });

    it('should return jsonb documentation', async function () {
      await doGet('/jsonb/docs')
    });

    it('should return messages documentation', async function () {
      await doGet('/messages/docs')
    });

    it('should return selfreferential documentation', async function () {
      await doGet('/selfreferential/docs')
    });

    it('should return table documentation', async function () {
      await doGet('/table/docs')
    });

    it('should return transactions documentation', async function () {
      await doGet('/transactions/docs')
    });

  });
};
