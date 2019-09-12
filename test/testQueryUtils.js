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
        assert.equal(response.$$transactionsExpanded.length, 1);
        assert.equal(response.$$transactionsExpanded[0].$$expanded.key, '147d360c-2bdf-4b6e-a210-3cb8ddf3ce9d');
      });
    });
  });
};
