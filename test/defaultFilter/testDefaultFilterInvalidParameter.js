// Utility methods for calling the SRI interface
const assert = require('assert');
const _ = require('lodash');
const roa = require('../../sri4node.js');
const alldatatypes = require('../context/alldatatypes.js')(roa, {});

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


  describe('Generic Filters', function () {

    describe('Invalid parameter (non existent)', function () {

      it('should return 404 - not found', async function () {
        await utils.testForStatusCode( 
          async () => {
            await doGet('/alldatatypes?wrongParameter=multiple', null, authHdrObj)
          }, 
          (error) => {
            assert.equal(error.status, 404);
            assert.equal(error.body.errors[0].code, 'invalid.query.parameter');
            assert.equal(error.body.errors[0].parameter, 'wrongParameter');
            assert.equal(error.body.errors[0].type, 'ERROR');            
          })
      });

      it('should return the list of possible parameters', async function () {
        await utils.testForStatusCode( 
          async () => {
            await doGet('/alldatatypes?wrongParameter=multiple', null, authHdrObj)
          }, 
          (error) => {          
            assert.equal(error.status, 404);
            assert.equal(error.body.errors[0].code, 'invalid.query.parameter');
            assert.equal(error.body.errors[0].parameter, 'wrongParameter');
            assert.equal(error.body.errors[0].type, 'ERROR');            

            const possibleParameters = Object.keys(alldatatypes.schema.properties).concat(
                  [ 'key'
                  , '$$meta.deleted'
                  , '$$meta.modified'
                  , '$$meta.created'
                  , '$$meta.version' ])

            assert.deepEqual( _.orderBy(error.body.errors[0].possibleParameters),
                              _.orderBy(possibleParameters) );
          })
      });

    });
  });
};
