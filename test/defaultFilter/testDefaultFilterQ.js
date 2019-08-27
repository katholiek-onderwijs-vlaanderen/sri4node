// Utility methods for calling the SRI interface
var assert = require('assert');

exports = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function() { return api.getRaw(...arguments) };

  const utils =  require('../utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }

  describe('Generic Filters', function () {

    describe('Q query', function () {

      it('should find resources with a general match', async function () {
        const response = await doGet('/alldatatypes?q=multiple', null, authHdrObj)
        assert.equal(response.results.length, 2);
        assert.equal(response.results[0].$$expanded.id, 13);
        assert.equal(response.results[1].$$expanded.id, 14);
      });

      it('should find resources of type varchar and char with a general match', async function () {
        const response = await doGet('/alldatatypes?q=char', null, authHdrObj)
        assert.equal(response.results.length, 4);
        assert.equal(response.results[0].$$expanded.id, 34);
        assert.equal(response.results[1].$$expanded.id, 35);
        assert.equal(response.results[2].$$expanded.id, 36);
        assert.equal(response.results[3].$$expanded.id, 37);
      });

      it('should find resources with a general match and multiple values', async function () {
        const response = await doGet('/alldatatypes?q=MULTIPLE+vsko', null, authHdrObj)
        assert.equal(response.results.length, 1);
        assert.equal(response.results[0].$$expanded.id, 13);
      });

      it('should not find resources with a general match', async function () {
        const response = await doGet('/alldatatypes?q=general', null, authHdrObj)
        assert.equal(response.results.length, 0);
      });

    });
  });
};
