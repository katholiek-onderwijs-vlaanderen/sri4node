// Utility methods for calling the SRI interface
import * as assert from 'assert';
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory from './utils';

module.exports = function (base) {
  const sriClientConfig = {
    baseUrl: base,
  };
  const api = sriClientFactory(sriClientConfig);

  const doGet = function (...args) { return api.getRaw(...args); };

  const utils = utilsFactory(api);
  const { makeBasicAuthHeader } = utils;

  describe('utils.addReferencingResources ', () => {
    describe('on afterread /persons', () => {
      it('should include related transactions', async () => {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd');
        const response = await doGet('/persons/9abe4102-6a29-4978-991e-2a30655030e6', null, { headers: { authorization: auth } });
        assert.equal(response.$$transactions.length, 1);
        assert.equal(response.$$transactionsBackwardsCompatibleT.length, 1);
        assert.equal(response.$$transactionsBackwardsCompatibleF.length, 1);
        assert.equal(response.$$transactionsExcludeOnSummary.length, 1);
        assert.equal(response.$$transactionsEmptyExclude.length, 1);
        assert.equal(response.$$transactions[0].$$expanded.key, '147d360c-2bdf-4b6e-a210-3cb8ddf3ce9d');

        assert.equal(response.$$transactionsExcludeOnFull, undefined);
        assert.equal(response.$$transactionsExcludeOnFullAndSummary, undefined);
      });
      it('should NOT include related transactions if expand=none', async () => {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd');
        const response = await doGet('/persons/9abe4102-6a29-4978-991e-2a30655030e6?expand=none', null, { headers: { authorization: auth } });
        assert.equal(response.$$transactions, undefined);
        assert.equal(response.$$transactionsBackwardsCompatibleT, undefined);
        assert.equal(response.$$transactionsBackwardsCompatibleF, undefined);
        assert.equal(response.$$transactionsExcludeOnSummary, undefined);
        assert.equal(response.$$transactionsExcludeOnFull, undefined);
        assert.equal(response.$$transactionsEmptyExclude, undefined);
        assert.equal(response.$$transactionsExcludeOnFullAndSummary, undefined);
      });
      it('should include related transactions in list expansion according to expand types (0)', async () => {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd');
        const response = await doGet('/persons?key=9abe4102-6a29-4978-991e-2a30655030e6', null, { headers: { authorization: auth } });
        assert.equal(response.results[0].$$expanded.$$transactions.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsBackwardsCompatibleT.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsBackwardsCompatibleF.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnSummary.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsEmptyExclude.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactions[0].$$expanded.key, '147d360c-2bdf-4b6e-a210-3cb8ddf3ce9d');

        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnFull, undefined);
        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnFullAndSummary, undefined);
      });
      it('should include related transactions in list expansion according to expand types (1)', async () => {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd');
        const response = await doGet('/persons?key=9abe4102-6a29-4978-991e-2a30655030e6&expand=summary', null, { headers: { authorization: auth } });
        assert.equal(response.results[0].$$expanded.$$transactions.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsBackwardsCompatibleT.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsBackwardsCompatibleF.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnFull.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsEmptyExclude.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnSummary, undefined);
        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnFullAndSummary, undefined);
      });
      it('should include related transactions in list expansion according to expand types (2)', async () => {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd');
        const response = await doGet('/persons?key=9abe4102-6a29-4978-991e-2a30655030e6&expand=full', null, { headers: { authorization: auth } });
        assert.equal(response.results[0].$$expanded.$$transactions.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsBackwardsCompatibleT.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsBackwardsCompatibleF.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsEmptyExclude.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnSummary.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnFull, undefined);
        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnFullAndSummary, undefined);
      });
    });
  });
};
