// Utility methods for calling the SRI interface
const pMap = require('p-map'); 
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var sriclient = require('@kathondvla/sri-client/node-sri-client');
var uuid = require('node-uuid');

exports = module.exports = function (base, logverbose) {
  'use strict';
  var communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';
  var personSabine = '/persons/9abe4102-6a29-4978-991e-2a30655030e6';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = api.get;
  const doPut = api.put;
  const doPost = api.post;
  const doDelete = api.delete;

  const utils =  require('./utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  function generateRandomPerson(key, communityPermalink, firstname, lastname) {
    return {
      key: key,
      firstname: firstname ? firstname : 'Sabine',
      lastname: lastname ? lastname : 'Eeckhout',
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

  function generateRandomMessage(key, person, community) {
    return {
      key: key,
      person: {
        href: person
      },
      type: 'offer',
      title: 'new message',
      description: 'description for ' + key,
      amount: 50,
      unit: 'stuk',
      community: {
        href: community
      }
    };
  }

  function generateTransaction(key, permalinkFrom, permalinkTo, amount) {
    return {
      key: key,
      fromperson: {
        href: permalinkFrom
      },
      toperson: {
        href: permalinkTo
      },
      amount: amount,
      description: 'description for transaction ' + key
    };
  }


  describe('BATCH', function () {

    it('create person and immediately delete', async function () {
      const key = uuid.v4();
      const body = generateRandomCommunity(key);
      // create a batch array
      const batch = [
          { "href": '/communities/' + key
          , "verb": "PUT"
          , "body": body
          },
          { "href": '/communities/' + key
          , "verb": "DELETE" 
          }
      ]

      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      await doPut('/communities/batch', batch, { headers: { authorization: auth } });
    });

    it('create person and immediately delete with batchlist', async function () {
      const key = uuid.v4();
      const body = generateRandomCommunity(key);
      // create a batch array
      const batch = [
          [{ "href": '/communities/' + key
          , "verb": "PUT"
          , "body": body
          }],
          [{ "href": '/communities/' + key
          , "verb": "DELETE" 
          }]
      ]
      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      const r = await doPut('/communities/batch', batch, { headers: { authorization: auth } });
      assert.equal(r[0].href, '/communities/' + key);
      assert.equal(r[0].verb, 'PUT');
      assert.equal(r[1].href, '/communities/' + key);
      assert.equal(r[1].verb, 'DELETE');
    });

    it('with error should be completely rollbacked', async function () {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomCommunity(keyC2);
      delete bodyC2.name;

      // create a batch array
      const batch = [
          { "href": '/communities/' + keyC1
          , "verb": "PUT"
          , "body": bodyC1
          },
          { "href": '/communities/' + keyC2
          , "verb": "PUT"
          , "body": bodyC2
          }
      ]
      await utils.testForStatusCode( 
        async () => {
          const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
          await doPut('/communities/batch', batch, { headers: { authorization: auth } });
        }, 
        (error) => {
          // expected to fail because property 'name' is missing
            assert.equal(error.status, 409);
        })
      await utils.testForStatusCode( 
        async () => {
          const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
          await doGet('/communities/' + keyC1, null, { headers: { authorization: auth } });
        }, 
        (error) => {
          // expected to fail because this resource should have been rollbacked
            assert.equal(error.status, 404);
        })
    });


    it('with error should be completely rollbacked', async function () {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomCommunity(keyC2);
      delete bodyC2.name;

      // create a batch array
      const batch = [
          [{ "href": '/communities/' + keyC1
          , "verb": "PUT"
          , "body": bodyC1
          }],
          [{ "href": '/communities/' + keyC2
          , "verb": "PUT"
          , "body": bodyC2
          }]
      ]
      await utils.testForStatusCode( 
        async () => {
          const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
          await doPut('/communities/batch', batch, { headers: { authorization: auth } });
        }, 
        (error) => {
          // expected to fail: bodyC2 is missing required name
            assert.equal(error.status, 409);
        })
      await utils.testForStatusCode( 
        async () => {
          const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
          await doGet('/communities/' + keyC1, null, { headers: { authorization: auth } });
        }, 
        (error) => {
          // expected to fail: should not be created but rollbacked
            assert.equal(error.status, 404);
        })
    });



    it('no VERB should result in error', async function () {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomCommunity(keyC2);

      // create a batch array
      const batch = [
          [{ "href": '/communities/' + keyC1
          , "verb": "PUT"
          , "body": bodyC1
          }],
          [{ "href": '/communities/' + keyC2
          , "body": bodyC2
          }]
      ]
      await utils.testForStatusCode( 
        async () => {
          const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
          const r = await doPut('/communities/batch', batch, { headers: { authorization: auth } });
        }, 
        (error) => {
          assert.equal(error.status, 400);
        })
    });    

    it('cross boundary should result in error', async function () {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomMessage(keyC2, personSabine, communityDendermonde);

      // create a batch array
      const batch = [
          [{ "href": '/communities/' + keyC1
          , "verb": "PUT"
          , "body": bodyC1
          }],
          [{ "href": '/messages/' + keyC2
          , "verb": "PUT"          
          , "body": bodyC2
          }]
      ]
      await utils.testForStatusCode( 
        async () => {
          const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
          const r = await doPut('/communities/batch', batch, { headers: { authorization: auth } });
        }, 
        (error) => {
          assert.equal(error.status, 400);
          assert.equal(error.body.errors[0].code, 'href.across.boundary');
        })
    });    

    it('error should result in cancellation of accompanying requests ', async function () {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      delete bodyC1.name;
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomCommunity(keyC2);

      // create a batch array
      const batch = [
          { "href": '/communities/' + keyC1
          , "verb": "PUT"
          , "body": bodyC1
          },
          { "href": '/communities/' + keyC2
          , "verb": "PUT"          
          , "body": bodyC2
          }
      ]
      await utils.testForStatusCode( 
        async () => {
          const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
          const r = await doPut('/communities/batch', batch, { headers: { authorization: auth } });
        }, 
        (error) => {
          assert.equal(error.status, 409);
          assert.equal(error.body[1].status, 202);
          assert.equal(error.body[1].body.errors[0].code, 'cancelled');
        })
    });    

    it('no matching route should result in error', async function () {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomCommunity(keyC2);

      // create a batch array
      const batch = [
          [{ "href": '/coMunities/' + keyC1
          , "verb": "PUT"
          , "body": bodyC1
          }],
          [{ "href": '/communities/' + keyC2
          , "body": bodyC2
          }]
      ]
      await utils.testForStatusCode( 
        async () => {
          const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
          const r = await doPut('/batch', batch, { headers: { authorization: auth } });
        }, 
        (error) => {
          assert.equal(error.status, 404);
          assert.equal(error.body.errors[0].code, 'no.matching.route');
        })
    });    

    // global batch (temporarily for samenscholing)
    it('global batch -- specific for samenscholing', async function () {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomMessage(keyC2, personSabine, communityDendermonde);

      // create a batch array
      const batch = [
          [{ "href": '/communities/' + keyC1
          , "verb": "PUT"
          , "body": bodyC1
          }],
          [{ "href": '/messages/' + keyC2
          , "verb": "PUT"          
          , "body": bodyC2
          }]
      ]

      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      const r = await doPut('/batch', batch, { headers: { authorization: auth } });
    });    

    it('\'big\' batch', async function () {
      // create a batch array
      const batch = await pMap(
        Array(100),
        async (i) => {
          const keyC1 = uuid.v4();
          const bodyC1 = generateRandomCommunity(keyC1);
          return { "href": '/communities/' + keyC1
                 , "verb": "PUT"
                 , "body": bodyC1
                 }
        })

      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      const r = await doPut('/batch', batch, { headers: { authorization: auth } });
    });    

    it('\'big\' batch with sub-batches', async function () {
      // create a batch array
      const batch = await pMap(
        Array(100),
        async (i) => {
          const keyC1 = uuid.v4();
          const bodyC1 = generateRandomCommunity(keyC1);
          return [{ "href": '/communities/' + keyC1
                 , "verb": "PUT"
                 , "body": bodyC1
                 }]
        })

      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      const r = await doPut('/batch', batch, { headers: { authorization: auth } });
    });    



  });
};
