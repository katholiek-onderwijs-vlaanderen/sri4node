// Utility methods for calling the SRI interface
var assert = require('assert');

export = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function(...args) { return api.getRaw(...args) };

  const utils =  require('../utils')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }


  describe('Generic Filters', function () {

    describe('Combination match', function () {

      it('should find resources with a combined match', async function () {
        const response = await doGet('/alldatatypes?text=vsko&number=450', null, authHdrObj)
        assert.equal(response.results.length, 1);
        assert.equal(response.results[0].$$expanded.text, 'VSKO');
        assert.equal(response.results[0].$$expanded.number, 450);
      });

      it('should find resources with a combined match and modifiers', async function () {
        const response = await doGet('/alldatatypes?textCaseSensitiveNot=VSKO&numberAfter=230', null, authHdrObj)        
        assert.equal(response.results.length, 2);
        assert.equal(response.results[0].$$expanded.text, 'dienst informatica');
        assert.equal(response.results[0].$$expanded.number, 230);
        assert.equal(response.results[1].$$expanded.text, 'combined unit');
        assert.equal(response.results[1].$$expanded.number, 1000);
      });

      it('should not find resources with a combined match', async function () {
        const response = await doGet('/alldatatypes?textCaseSensitive=vsko&number=230', null, authHdrObj)
        assert.equal(response.results.length, 0);
      });

    });
  });

};
