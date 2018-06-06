// Utility methods for calling the SRI interface
var assert = require('assert');

exports = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = api.get;

  const utils =  require('../utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }


  describe('Relations Filters', function () {

    describe('Persons resource referenced has no type property', function () {

      it('should fail with error message', async function () {
        await utils.testForStatusCode( 
          async () => {
            await doGet('/personrelations?toTypes=ADULT', null, authHdrObj)
          }, 
          (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.body.errors[0].code, 'invalid.query.parameter');
          })
      });
    });

  });
};
