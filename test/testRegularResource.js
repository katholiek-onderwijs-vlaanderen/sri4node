// Utility methods for calling the SRI interface
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
const sriclientFactory = require('@kathondvla/sri-client/node-sri-client');

const makeAuthHeader = (user, pw) => 
  'Basic ' + Buffer.from(user + ':' + pw).toString('base64');

exports = module.exports = function (base, logverbose) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base,
  }
  const sriClientConfigLoggedIn = {
    ...sriClientConfig,
    username: 'sabine@email.be',
    password: 'pwd',
  }
  const api = sriclientFactory(sriClientConfig)
  const doGet = function() { return api.getRaw(...arguments) };

  const apiLoggedIn = sriclientFactory(sriClientConfigLoggedIn)
  const doLoggedInGet = function() { return apiLoggedIn.getRaw(...arguments) };

  const utils =  require('./utils.js')(api);



  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('GET public regular resource', function () {
    describe('without authentication', function () {
      it('should return LETS Regio Dendermonde', async function () {
        const response = await doGet('/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849')
        debug(response);
        assert.equal(response.name, 'LETS Regio Dendermonde');
      });
    });

    describe('with authentication', function () {
      it('should return LETS Hamme', async function () {
        const auth = makeAuthHeader('sabine@email.be', 'pwd')
        const response = await doGet('/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d', null, { headers: { authorization: auth } })
        // const response = await doLoggedInGetGet('/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d' /*, null, { headers: { authorization: auth } }*/)
        assert.equal(response.name, 'LETS Hamme');
      });
    });

    describe('with invalid authentication - non-existing user', function () {
      it('should return LETS Hamme', async function () {
        const auth = makeAuthHeader('unknown@email.be', 'pwd')
        const response = await doGet('/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d', null, { headers: { authorization: auth } })
        assert.equal(response.name, 'LETS Hamme');
      });
    });

    describe('with invalid authentication - existing user, wrong password', function () {
      it('should return LETS Hamme', async function () {
        const auth = makeAuthHeader('sabine@email.be', 'INVALID')
        const response = await doGet('/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d', null, { headers: { authorization: auth } })
        assert.equal(response.name, 'LETS Hamme');
      });
    });
  });

  describe('GET private regular resource', function () {
    describe('/persons/{key} from my community', function () {
      it('should return Kevin Boon', async function () {
        const auth = makeAuthHeader('kevin@email.be', 'pwd')
        const response = await doGet('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d', null, { headers: { authorization: auth } })          
        assert.equal(response.firstname, 'Kevin');
        assert.equal(response.lastname, 'Boon');
      });
    });

    describe('/persons/{key} from different community', function () {
      it('should be 403 Forbidden', async function () {
        utils.testForStatusCode(
          () => doLoggedInGet('/persons/82565813-943e-4d1a-ac58-8b4cbc865bdb'),
          (error) => {
            assert.equal(error.status, 403);
          })
      })
    });

    describe('two secure functions', function () {
      it('should disallow read on Ingrid Ohno', async function () {
        utils.testForStatusCode(
          () => doLoggedInGet('/persons/da6dcc12-c46f-4626-a965-1a00536131b2'),
          (error) => {
            assert.equal(error.status, 403);
          })
      });
    });

    describe('with invalid authentication - non-existing user', function () {
      it('should disallow read', async function () {
        const auth = makeAuthHeader('unknown@email.be', 'pwd')

        utils.testForStatusCode(
          () => doGet('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d', null, { headers: { authorization: auth } }),
          (error) => {
            assert.equal(error.status, 401);
          })
      });
    });

    describe('with invalid authentication - existing user, wrong password', function () {
      it('should disallow read', async function () {

        const auth = makeAuthHeader('sabine@email.be', 'INVALID')

        utils.testForStatusCode(
          () => doGet('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d', null, { headers: { authorization: auth } }),
          (error) => {
            assert.equal(error.status, 401);
          })

      });
    });

    describe('without authentication', function () {
      it('should disallow read', async function () {

        utils.testForStatusCode(
          () => doGet('/persons/da6dcc12-c46f-4626-a965-1a00536131b2'),
          (error) => {
            assert.equal(error.status, 401);
          })

      });
    });
  });

  describe('Prefixed resource should also work', function () {
    it('get by "key" on resource', async function () {
        const auth = makeAuthHeader('sabine@email.be', 'pwd')
        const response = await doGet('/prefix/countries2/be', null, { headers: { authorization: auth } })
        assert.equal(response.name, 'Belgium');
    });
  });
};
