// Utility methods for calling the SRI interface
import * as assert from 'assert';
import { THttpClient } from './httpClient';

module.exports = function (httpClient: THttpClient) {

  describe('utils.addReferencingResources ', () => {
    describe('on afterread /persons', () => {
      it('should include related transactions', async () => {
        const response = await httpClient.get({ path: '/persons/9abe4102-6a29-4978-991e-2a30655030e6', auth: 'sabine' });
        assert.equal(response.status, 200);
        assert.equal(response.body.$$transactions.length, 1);
        assert.equal(response.body.$$transactionsBackwardsCompatibleT.length, 1);
        assert.equal(response.body.$$transactionsBackwardsCompatibleF.length, 1);
        assert.equal(response.body.$$transactionsExcludeOnSummary.length, 1);
        assert.equal(response.body.$$transactionsEmptyExclude.length, 1);
        assert.equal(response.body.$$transactions[0].$$expanded.key, '147d360c-2bdf-4b6e-a210-3cb8ddf3ce9d');

        assert.equal(response.body.$$transactionsExcludeOnFull, undefined);
        assert.equal(response.body.$$transactionsExcludeOnFullAndSummary, undefined);
      });
      it('should NOT include related transactions if expand=none', async () => {
        const response = await httpClient.get({ path: '/persons/9abe4102-6a29-4978-991e-2a30655030e6?expand=none', auth: 'sabine' });
        assert.equal(response.status, 200);
        assert.equal(response.body.$$transactions, undefined);
        assert.equal(response.body.$$transactionsBackwardsCompatibleT, undefined);
        assert.equal(response.body.$$transactionsBackwardsCompatibleF, undefined);
        assert.equal(response.body.$$transactionsExcludeOnSummary, undefined);
        assert.equal(response.body.$$transactionsExcludeOnFull, undefined);
        assert.equal(response.body.$$transactionsEmptyExclude, undefined);
        assert.equal(response.body.$$transactionsExcludeOnFullAndSummary, undefined);
      });
      it('should include related transactions in list expansion according to expand types (0)', async () => {
        const response = await httpClient.get({ path: '/persons?key=9abe4102-6a29-4978-991e-2a30655030e6', auth: 'sabine' });
        assert.equal(response.status, 200);
        assert.equal(response.body.results[0].$$expanded.$$transactions.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsBackwardsCompatibleT.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsBackwardsCompatibleF.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsExcludeOnSummary.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsEmptyExclude.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactions[0].$$expanded.key, '147d360c-2bdf-4b6e-a210-3cb8ddf3ce9d');

        assert.equal(response.body.results[0].$$expanded.$$transactionsExcludeOnFull, undefined);
        assert.equal(response.body.results[0].$$expanded.$$transactionsExcludeOnFullAndSummary, undefined);
      });
      it('should include related transactions in list expansion according to expand types (1)', async () => {
        const response = await httpClient.get({ path: '/persons?key=9abe4102-6a29-4978-991e-2a30655030e6&expand=summary', auth: 'sabine' });
        assert.equal(response.status, 200);
        assert.equal(response.body.results[0].$$expanded.$$transactions.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsBackwardsCompatibleT.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsBackwardsCompatibleF.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsExcludeOnFull.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsEmptyExclude.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsExcludeOnSummary, undefined);
        assert.equal(response.body.results[0].$$expanded.$$transactionsExcludeOnFullAndSummary, undefined);
      });
      it('should include related transactions in list expansion according to expand types (2)', async () => {
        const response = await httpClient.get({ path: '/persons?key=9abe4102-6a29-4978-991e-2a30655030e6&expand=full', auth: 'sabine' });
        assert.equal(response.status, 200);
        assert.equal(response.body.results[0].$$expanded.$$transactions.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsBackwardsCompatibleT.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsBackwardsCompatibleF.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsEmptyExclude.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsExcludeOnSummary.length, 1);
        assert.equal(response.body.results[0].$$expanded.$$transactionsExcludeOnFull, undefined);
        assert.equal(response.body.results[0].$$expanded.$$transactionsExcludeOnFullAndSummary, undefined);
      });
    });
  });
};
