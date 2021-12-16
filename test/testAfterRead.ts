// Utility methods for calling the SRI interface
const assert = require('assert');
const { debug } = require('../js/common');


export = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)

  const utils =  require('./utils')(api);

  describe('Afterread methods', function () {
    describe('should be executed on regular resources', function () {
      it('should have a correct messagecount.', async function () {
        const response = await api.getRaw('/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849');
        if (!response.$$messagecount || response.$$messagecount < 5) {
            assert.fail('Should have at least 5 messages for community LETS Regio Dendermonde');
        }
      });
    });

    describe('should be executed on list resources', function () {
      it('should have a correct messagecount.', async function () {
        const response = await api.getRaw('/communities?hrefs=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849');
        debug('mocha', response);
        assert.equal(response.$$meta.count, 1);
        assert.equal(response.results[0].$$expanded.$$messagecount, 5);
      });
    });

    describe('should be executed on lists with many resources', function () {
      it('should have correct messagecounts on all items', async function () {
        const response = await api.getRaw('/communities?limit=4')
        debug('mocha', 'response body');
        debug('mocha', response);
        debug('mocha', response.results[2].$$expanded);
        debug('mocha', response.results[3].$$expanded);
        if (response.results[0].$$expanded.$$messagecount === null) {
          assert.fail('should have $$messagecount');
        }
        if (response.results[1].$$expanded.$$messagecount === null) {
          assert.fail('should have $$messagecount');
        }
        if (response.results[2].$$expanded.$$messagecount === null) {
          assert.fail('should have $$messagecount');
        }
        if (response.results[3].$$expanded.$$messagecount === null) {
          assert.fail('should have $$messagecount');
        }
      });
    });

    describe('Should be able to modify response headers', function () {
      it('should have a test header when reading a specific resource', async function (){
        await utils.testForStatusCode(
          function() { return api.getRaw('/alldatatypes/3d3e6b7a-67e3-11e8-9298-e7ebb66610b3') },
          (error) => {
            assert.equal(error.getResponseHeader('test'), 'TestHeader');
          })
      });
    });
  });
};
