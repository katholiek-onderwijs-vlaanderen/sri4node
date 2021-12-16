// Utility methods for calling the SRI interface
const assert = require('assert');
const sriClientFactory = require('@kathondvla/sri-client/node-sri-client');
const uuid = require('uuid');
const _ = require('lodash');

export = module.exports = function (base) {
  'use strict';
  var communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';
  var personSabine = '/persons/9abe4102-6a29-4978-991e-2a30655030e6';

  const sriClientConfig = {
    baseUrl: base,
    username: 'sabine@email.be',
    password: 'pwd',
    maxAttempts: 1, 
    // headers: { authorization: utils.makeBasicAuthHeader('sabine@email.be', 'pwd') },
  }
  const api = sriClientFactory(sriClientConfig);
  const doGet = function(...args) { return api.getRaw(...args) };
  const doPut = function(...args) { return api.put(...args) };
  const doDelete = function(...args) { return api.delete(...args) };
  const doPatch = function(...args) { return api.patch(...args) };

  const utils =  require('./utils')(api);

  const auth = utils.makeBasicAuthHeader('sabine@email.be', 'pwd')


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

    after(function() {
      return doDelete('/communities/' + key, { headers: { authorization: auth } })
    });


    it('should be possible to delete a newly created resource', async function () {
      await doDelete('/communities/' + key, { maxAttempts: 1, headers: { authorization: auth } })
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

    it('PATCH on soft deleted resources should fail', async function () {
        await utils.testForStatusCode(
            async () => {
                const p = [{ op: 'replace', path: 'name', value: 'foo' }];
                await doPatch('/communities/' + key, p, { headers: { authorization: auth } })
            }, 
            (error) => {
              assert.equal(error.status, 410);
            })
    });

      it('updating a deleted resource should have same result as CREATE', async function () {
          const body2 = _.clone(body);
          body2.currencyname = 'pollekes';
          const response = await doPut('/communities/' + key, body2, { headers: { authorization: auth } })

          assert.equal(response.getStatusCode(), 201);

          const response2 = await doGet('/communities/' + key, null,  { headers: { authorization: auth } })
          assert.equal(response2.currencyname, 'pollekes');
          assert.equal(response2.$$meta.deleted, undefined);
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