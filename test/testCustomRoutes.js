// Utility methods for calling the SRI interface
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;

exports = module.exports = function (base, logdebug) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = api.get;

  const utils =  require('./utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }
  const authHdrObjIngrid = { headers: { authorization: makeBasicAuthHeader('ingrid@email.be', 'pwd') } }

  function debug(x) {
    if (logdebug) {
      cl(x);
    }
  }

  describe('Custom routes', function () {

    it('should return the response for the custom route', async function () {
      const response = await doGet('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple', null,  authHdrObj)
      assert.equal(response.firstname, 'Kevin');
      assert.equal(response.lastname, 'Boon');
    });

    it('should forbid the custom route because of a secure function', async function () {
      await utils.testForStatusCode( 
          async () => {
            await doGet('/persons/da6dcc12-c46f-4626-a965-1a00536131b2/simple', null,  authHdrObjIngrid)
          }, 
          (error) => {
            assert.equal(error.status, 403);
          })
    });

    it('should return a server error for a problematic custom handler', async function () {
      await utils.testForStatusCode( 
          async () => {
            const auth = makeBasicAuthHeader('kevin@email.be', 'pwd')
            await doGet('/persons/00000000-0000-0000-0000-000000000000/simple', null,  { headers: { authorization: auth }, maxAttempts: 1 })
          }, 
          (error) => {
            assert.equal(error.status, 500);
          })
    });


    it('should return the response for the custom \'like\' route', async function () {
      const response = await doGet('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike', null,  authHdrObj)
      assert.equal(Object.keys(response).length, 2);
      assert.equal(response.firstname, 'Kevin');
      assert.equal(response.lastname, 'Boon');
    });

    it('should return the response for the custom \'like\' route for forbidden user in \'original\' route', async function () {
      await doGet('/persons/da6dcc12-c46f-4626-a965-1a00536131b2/simpleLike', null,  authHdrObjIngrid)
    });

    it('no auth should be forbidden for the custom \'like\' route', async function () {
      await utils.testForStatusCode( 
          async () => {
            await doGet('/persons/da6dcc12-c46f-4626-a965-1a00536131b2/simpleLike', null,  {})
          }, 
          (error) => {
            assert.equal(error.status, 401);
          })
    });

  });
};
