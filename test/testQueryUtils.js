// Utility methods for calling the SRI interface
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var sriclient = require('@kathondvla/sri-client/node-sri-client');

exports = module.exports = function (base, logverbose) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function() { return api.getRaw(...arguments) };

  const utils =  require('./utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;


  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('utils.addReferencingResources ', function () {
    describe('on afterread /persons', function () {
      it('should include related transactions', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        const response = await doGet('/persons/9abe4102-6a29-4978-991e-2a30655030e6', null, { headers: { authorization: auth } })
        assert.equal(response.$$transactions.length, 1);
        assert.equal(response.$$transactionsBackwardsCompatibleT.length, 1);
        assert.equal(response.$$transactionsBackwardsCompatibleF.length, 1);
        assert.equal(response.$$transactionsExcludeOnSummary.length, 1);
        assert.equal(response.$$transactionsEmptyExclude.length, 1);
        assert.equal(response.$$transactions[0].$$expanded.key, '147d360c-2bdf-4b6e-a210-3cb8ddf3ce9d');

        assert.equal(response.$$transactionsExcludeOnFull, undefined);
        assert.equal(response.$$transactionsExcludeOnFullAndSummary, undefined);
      });
      it('should NOT include related transactions if expand=none', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        const response = await doGet('/persons/9abe4102-6a29-4978-991e-2a30655030e6?expand=none', null, { headers: { authorization: auth } })
        assert.equal(response.$$transactions, undefined);
        assert.equal(response.$$transactionsBackwardsCompatibleT, undefined);
        assert.equal(response.$$transactionsBackwardsCompatibleF, undefined);
        assert.equal(response.$$transactionsExcludeOnSummary, undefined);
        assert.equal(response.$$transactionsExcludeOnFull, undefined);
        assert.equal(response.$$transactionsEmptyExclude, undefined);
        assert.equal(response.$$transactionsExcludeOnFullAndSummary, undefined);
      });
      it('should include related transactions in list expansion according to expand types (0)', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        const response = await doGet('/persons?key=9abe4102-6a29-4978-991e-2a30655030e6', null, { headers: { authorization: auth } })
        assert.equal(response.results[0].$$expanded.$$transactions.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsBackwardsCompatibleT.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsBackwardsCompatibleF.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnSummary.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsEmptyExclude.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactions[0].$$expanded.key, '147d360c-2bdf-4b6e-a210-3cb8ddf3ce9d');

        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnFull, undefined);        
        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnFullAndSummary, undefined);
      });
      it('should include related transactions in list expansion according to expand types (1)', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        const response = await doGet('/persons?key=9abe4102-6a29-4978-991e-2a30655030e6&expand=summary', null, { headers: { authorization: auth } })
        assert.equal(response.results[0].$$expanded.$$transactions.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsBackwardsCompatibleT.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsBackwardsCompatibleF.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnFull.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsEmptyExclude.length, 1);
        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnSummary, undefined);
        assert.equal(response.results[0].$$expanded.$$transactionsExcludeOnFullAndSummary, undefined);
      });
      it('should include related transactions in list expansion according to expand types (2)', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        const response = await doGet('/persons?key=9abe4102-6a29-4978-991e-2a30655030e6&expand=full', null, { headers: { authorization: auth } })
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
