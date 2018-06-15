// Utility methods for calling the SRI interface
var assert = require('assert');
var uuid = require('node-uuid');

exports = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = api.get;
  const doPut = api.put;
  const doDelete = api.delete;

  const utils =  require('./utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('sabine@email.be', 'pwd') } }
  const authHdrObjKevin = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }


  var communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';

  function generateRandomPerson(key, communityPermalink) {
    return {
      firstname: 'Sabine',
      lastname: 'Eeckhout',
      street: 'Stationstraat',
      streetnumber: '17',
      zipcode: '9280',
      city: 'Lebbeke',
      phone: '0492882277',
      email: key + '@email.com',
      balance: 0,
      mail4elas: 'weekly',
      community: {
        href: communityPermalink
      }
    };
  }

  describe('Error handling', function () {

    var key = uuid.v4();
    var p = generateRandomPerson(key, communityDendermonde);

    describe('After Read', function () {
      it('should return 500 (server error) when rejecting without an error object', async function () {
        await utils.testForStatusCode( 
          async () => {
            const auth = makeBasicAuthHeader('daniella@email.be', 'pwd')
            await doGet('/persons/9abe4102-6a29-4978-991e-2a30655030e6', null,  { headers: { authorization: auth }, maxAttempts: 1 })
          }, 
          (error) => {
            assert.equal(error.status, 500);
          })
      });

      it('should return 403 (forbidden) when rejecting with an error object', async function () {
        await utils.testForStatusCode( 
          async () => {
            const auth = makeBasicAuthHeader('ingrid@email.be', 'pwd')
            await doGet('/persons/9abe4102-6a29-4978-991e-2a30655030e6', null,  { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 403);
          })

      });
    });

    describe('After Insert', function () {

      it('should return 500 (server error) when rejecting without an error object', async function () {
        await utils.testForStatusCode( 
          async () => {
            const auth = makeBasicAuthHeader('daniella@email.be', 'pwd')
            await doPut('/persons/' + key, p,  { headers: { authorization: auth }, maxAttempts: 1 })
          }, 
          (error) => {
            assert.equal(error.status, 500);
          })
      });

      it('should return 403 (forbidden) when rejecting with an error object', async function () {
        await utils.testForStatusCode( 
          async () => {
            const auth = makeBasicAuthHeader('ingrid@email.be', 'pwd')
            await doPut('/persons/' + key, p,  { headers: { authorization: auth }, maxAttempts: 1 })
          }, 
          (error) => {
            assert.equal(error.status, 403);
          })

      });
    });

    describe('After Update', function () {

      before(async function (done) {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        await doPut('/persons/' + key, p,  { headers: { authorization: auth }})
        done();
      });

      it('should return 500 (server error) when rejecting without an error object', async function () {
        await utils.testForStatusCode( 
          async () => {
            const auth = makeBasicAuthHeader('daniella@email.be', 'pwd')
            await doPut('/persons/' + key, p,  { headers: { authorization: auth }, maxAttempts: 1 })
          }, 
          (error) => {
            assert.equal(error.status, 500);
          })
      });

      it('should return 403 (forbidden) when rejecting with an error object', async function () {
        await utils.testForStatusCode( 
          async () => {
            const auth = makeBasicAuthHeader('ingrid@email.be', 'pwd')
            await doPut('/persons/' + key, p,  { headers: { authorization: auth }, maxAttempts: 1 })
          }, 
          (error) => {
            assert.equal(error.status, 403);
          })
      });
    });


    describe('After Delete', function () {

      const key2 = uuid.v4();
      const p2 = generateRandomPerson(key2, communityDendermonde);

      before(async function (done) {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        await doPut('/persons/' + key2, p2,  { headers: { authorization: auth }})
        done();
      });

      it('should return 500 (server error) when rejecting without an error object', async function () {
        await utils.testForStatusCode( 
          async () => {
            const auth = makeBasicAuthHeader('daniella@email.be', 'pwd')
            await doDelete('/persons/' + key2, { headers: { authorization: auth }, maxAttempts: 1 })
          }, 
          (error) => {
            assert.equal(error.status, 500);
          })
      });

      it('should return 403 (forbidden) when rejecting with an error object', async function () {
        await utils.testForStatusCode( 
          async () => {
            const auth = makeBasicAuthHeader('ingrid@email.be', 'pwd')
            await doDelete('/persons/' + key2, { headers: { authorization: auth }, maxAttempts: 1 })
          }, 
          (error) => {
            assert.equal(error.status, 403);
          })
      });
    });



    describe('SQL error ', function () {

      const key = uuid.v4();
      const p = generateRandomPerson(key, communityDendermonde);
      p.email = 'sabine@email.be';

      it('should return 500 (server error) [regular request]', async function () {
        await utils.testForStatusCode( 
          async () => {
            const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
            await doPut('/persons/' + key, p, { headers: { authorization: auth }, maxAttempts: 1  });
          }, 
          (error) => {
            assert.equal(error.status, 500);
          })
      });

      it('should return 500 (server error) [batch request]', async function () {
        const batch = [
            { "href": '/persons/' + key
            , "verb": "PUT"
            , "body": p
            }]
        
        await utils.testForStatusCode( 
          async () => {
            const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
            await doPut('/batch', batch, { headers: { authorization: auth }, maxAttempts: 1 });
          }, 
          (error) => {
            assert.equal(error.status, 500);
          })
      });

    });


  });
};
