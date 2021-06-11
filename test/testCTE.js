// Utility methods for calling the SRI interface
const assert = require('assert');
const { debug } = require('../js/common.js');

exports = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function() { return api.getRaw(...arguments) };

  const utils =  require('./utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;


  describe('query parameters', function () {
    describe('that use a CTE', function () {
      it('to limit to a single key, should only return 1 row.', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        const response = await doGet('/messages?cteOneGuid=true', null, { headers: { authorization: auth } })
        assert.equal(response.results.length, 1);
      });
    });

    // Test re-ordering of query parameters.
    describe('that use a CTE and other parameter', function () {
      it('to limit to a single key + another parameter, should handle re-sequencing of parameters well', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        const response = await doGet('/messages?hrefs=/messages/d70c98ca-9559-47db-ade6-e5da590b2435&cteOneGuid=true',
                                      null, { headers: { authorization: auth } })
        assert.equal(response.results.length, 1);
      });
    });

    // Test applying 2 CTEs
    describe('that use a TWO CTEs', function () {
      it('to limit to a single key, should handle both CTEs well', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        const response = await doGet('/messages?cteOneGuid=true&cteOneGuid2=true',
                                      null, { headers: { authorization: auth } })
        assert.equal(response.results.length, 1);
      });
    });

    // TODO: fix and reenable recursion cases
    // // Test recursive CTE
    // describe('that require recursion', function () {
    //   it('should find parents', async function () {
    //     const response = await doGet('/selfreferential?allParentsOf=/selfreferential/ab142ea6-7e79-4f93-82d3-8866b0c8d46b')
    //     debug('mocha', response);
    //     assert.equal(response.$$meta.count, 4);
    //   });
    // });

    // describe('that require recursion', function () {
    //   it('should find parents', async function () {
    //     const response = await doGet('/selfreferential?allParentsOf=/selfreferential/b8c020bf-0505-407c-a8ad-88044d741712')
    //     debug('mocha', response);
    //     assert.equal(response.$$meta.count, 2);
    //   });
    // });
  });
};
