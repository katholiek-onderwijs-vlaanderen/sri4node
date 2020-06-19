// Utility methods for calling the SRI interface
const pMap = require('p-map'); 
const assert = require('assert');
const { cl } = require('../js/common.js');
const sriClientFactory = require('@kathondvla/sri-client/node-sri-client');
const uuid = require('uuid');

exports = module.exports = function (base, logverbose) {
  'use strict';
  var communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';
  var personSabine = '/persons/9abe4102-6a29-4978-991e-2a30655030e6';

  const sriClientConfig = {
    baseUrl: base,
    username: 'sabine@email.be',
    password: 'pwd',
    // headers: { authorization: utils.makeBasicAuthHeader('sabine@email.be', 'pwd') },
  }
  const api = sriClientFactory(sriClientConfig);
  const doGet = function() { return api.getRaw(...arguments) };
  const doPut = function() { return api.put(...arguments) };
  const doDelete = function() { return api.delete(...arguments) };
  const doPatch = function() { return api.patch(...arguments) };

  const utils =  require('./utils.js')(api);

  const auth = utils.makeBasicAuthHeader('sabine@email.be', 'pwd')



  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  function generateRandomCommunity(key) {
    return {
      key: key,
      name: 'LETS ' + key,
      street: 'Leuvensesteenweg',
      streetnumber: '34',
      zipcode: '1040',
      city: 'Brussel',
      phone: '0492882277',
      email: key + '@email.com',
      adminpassword: 'secret',
      currencyname: 'pluimen'
    };
  }

  describe('DELETE regular resource', function () {

    var key = uuid.v4();
    var body = generateRandomCommunity(key);

    before(async function () {
      return doPut('/communities/' + key, body, { headers: { authorization: auth } })
    });

    it('should be possible to delete a newly created resource', async function () {
      await doDelete('/communities/' + key, { headers: { authorization: auth } })
    });

    it('retrieving a deleted resource should return 410 - Gone', async function () {
      await utils.testForStatusCode(
        async () => {
          await doGet('/communities/' + key, null,  { headers: { authorization: auth } })
        }, 
        (error) => {
          assert.equal(error.status, 410);
        })
    });

    it('deleting a deleted resource should return 200 - OK', async function () {
      await doDelete('/communities/' + key, { headers: { authorization: auth } })
    });

    it('updating a deleted resource should return 410 - Gone', async function () {
      await utils.testForStatusCode(
        async () => {
          await doPut('/communities/' + key, body,  { headers: { authorization: auth } })
        }, 
        (error) => {
          assert.equal(error.status, 410);
        })
    });

    it('retrieving a deleted resource with deleted=true should return the resource', async function () {
      const response = await doGet('/communities/' + key + '?$$meta.deleted=true', null,  { headers: { authorization: auth } })
      assert.equal(response.email, key + '@email.com');
      assert.equal(response.$$meta.deleted, true);
    });

    it('listing a deleted resource should not return it', async function () {
      const response = await doGet('/communities?email=' + key + '@email.com', null,  { headers: { authorization: auth } })
      assert.equal(response.results.length, 0);
    });

    it('listing a deleted resource with deleted=true should return it only', async function () {
      const response = await doGet('/communities?$$meta.deleted=true&email=' + key + '@email.com', null,  { headers: { authorization: auth } })
      assert.equal(response.results.length, 1);
      assert.equal(response.results[0].$$expanded.email, key + '@email.com');
      assert.equal(response.results[0].$$expanded.$$meta.deleted, true);
    });

    it('listing a deleted resource with deleted=any should return everything', async function () {
      const response = await doGet('/communities?$$meta.deleted=any&email=' + key + '@email.com', null,  { headers: { authorization: auth } })
      assert.equal(response.results.length, 1);
      assert.equal(response.results[0].$$expanded.email, key + '@email.com');
      assert.equal(response.results[0].$$expanded.$$meta.deleted, true);
    });

    it('listing a deleted resource with deleted=false should not return it', async function () {
      const response = await doGet('/communities?$$meta.deleted=false&email=' + key + '@email.com', null,  { headers: { authorization: auth } })
      assert.equal(response.results.length, 0);
    });


    // // does not work out-of-the-box with logical delete ==> TODO?
    // it('deleting resource resulting in foreign key error should return 409 - Conflict', async function () {
    //   await utils.testForStatusCode(
    //     async () => {
    //       await doDelete(communityDendermonde, { headers: { authorization: auth } })
    //     }, 
    //     (error) => {
    //       assert.equal(error.status, 409);
    //     })
    // });    
  });

};