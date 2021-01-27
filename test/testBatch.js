// Utility methods for calling the SRI interface
const pMap = require('p-map'); 
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var sriclient = require('@kathondvla/sri-client/node-sri-client');
var uuid = require('uuid');



/**
 * BATCH should work like this (and now it works the other way around):
 *
 * [ {}, {} ] SHOULD EXECUTE ALL OPERATIONS SEQUENTIALLY and is a shorthand for [ [ {}, {} ] ] !
 * [ [ {}, {} ] ] SHOULD ALSO EXECUTE ALL OPERATIONS SEQUENTIALLY !
 * [ [ {}, {} ], [ {}, {} ] ] SHOULD EXECUTE ALL OPERATIONS WITHIN THE CHILD ARRAY SEQUENTIALLY, but the multiple sequences can be applied in parallel
 *
 * SO IN SHORT: 1 batch is a list of SERIES that can be executed in parallel.
 *   If there's only 1 list, there is NO PARALLELIZATION !!!
 *
 * Because I don't see the use-case in 'do all this in parallel, wait until it's all done, then do some more in parallel'
 *
 * AT THE VERY LEAST: if it stays 'THE OLD WAY' [ {}, {} ] should become equivalent to [ [ {} ], [ {} ] ]
 *   to make sure a simple single-array batch is executed IN SEQUENCE as everybody would expect !!!
 *
 */
exports = module.exports = function (base, logverbose) {
  'use strict';
  var communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';
  var personSabine = '/persons/9abe4102-6a29-4978-991e-2a30655030e6';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function() { return api.getRaw(...arguments) };
  const doPut = function() { return api.put(...arguments) };
  const doPatch = function() { return api.patch(...arguments) };
  const doPost = function() { return api.post(...arguments) };
  const doDelete = function() { return api.delete(...arguments) };

  const utils =  require('./utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;

  const sriClientOptionsAuthSabine = {
    headers: { authorization: makeBasicAuthHeader('sabine@email.be', 'pwd') }
  }
  const sriClientOptionsAuthIngrid = {
    headers: { authorization: makeBasicAuthHeader('ingrid@email.be', 'pwd') }
  }


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

 function generateRandomCity() {
    const key = Math.floor(10000 + Math.random(0)*90000)
    return {
      key: key,
      nisCode: key,
      name: "RandomCity"
    };
  }

  describe('BATCH', function () {

    it('create community and immediately delete', async function () {
      const key = uuid.v4();
      const body = generateRandomCommunity(key);
      const communityHref = '/communities/' + key;
      // create a batch array
      const batch = [
          { "href": communityHref
          , "verb": "PUT"
          , "body": body
          },
          { "href": communityHref
          , "verb": "DELETE" 
          }
      ]

      await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);

      // RESOURCE SHOULD BE GONE, but the way it's implemented now could be unpredictable (parallel)
      const c = await doGet(communityHref, null, sriClientOptionsAuthSabine);
      // assert.equal(c.key, key);
      // assert.equal(c.streetnumber, newStreetNumber);
    });

    it('create community and immediately delete with batchlist', async function () {
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
      const r = await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);
      assert.equal(r[0].href, '/communities/' + key);
      assert.equal(r[0].verb, 'PUT');
      assert.equal(r[1].href, '/communities/' + key);
      assert.equal(r[1].verb, 'DELETE');
    });

    it('single PATCH on existing person', async function () {
      const key = uuid.v4();
      const personHref = '/persons/' + key;
      const body = generateRandomPerson(key, communityDendermonde, 'John', 'Doe');
      const newStreetNumber = '999';

      await doPut(personHref, body, sriClientOptionsAuthSabine);

      // create a batch array
      const batch = [
          { "href": personHref
          , "verb": "PATCH"
          , "body": [ { op: 'replace', path: '/streetnumber', value: newStreetNumber } ]
          },
      ]

      const r = await doPut('/persons/batch', batch, sriClientOptionsAuthSabine);
      r.forEach(x => assert.equal(x.status, 200));

      const c = await doGet(personHref, null, sriClientOptionsAuthSabine);
      assert.equal(c.key, key);
      assert.equal(c.streetnumber, newStreetNumber);
    });

    it('2 consecutive PATCHes on existing person', async function () {
      const key = uuid.v4();
      const personHref = '/persons/' + key;
      const body = generateRandomPerson(key, communityDendermonde, 'John', 'Doe');
      const newStreetNumber = '999';
      const newStreetBus = 'b';

      await doPut(personHref, body, sriClientOptionsAuthSabine);

      // create a batch array
      const batch = [
        [
          { "href": personHref
          , "verb": "PATCH"
          , "body": [ { op: 'replace', path: '/streetnumber', value: newStreetNumber } ]
          },
        ], [
          { "href": personHref
          , "verb": "PATCH"
          , "body": [ { op: 'add', path: '/streetbus', value: newStreetBus } ]
          },
        ]
      ]

      const r = await doPut('/persons/batch', batch, sriClientOptionsAuthSabine);
      r.forEach(x => x.status
        ? assert.equal(x.status, 200)
        : x.forEach(x => assert.equal(x.status, 200))
      );

      const c = await doGet(personHref, null, sriClientOptionsAuthSabine);
      assert.equal(c.key, key);
      assert.equal(c.streetnumber, newStreetNumber, 'seems like the second patch operation on streetbus undid the previous patch on streetnumber');
      assert.equal(c.streetbus, newStreetBus);
    });

    it('create person and immediately PATCH in same batch', async function () {
      const key = uuid.v4();
      const personHref = '/persons/' + key;
      const body = generateRandomPerson(key, communityDendermonde, 'Don', 'Quichotte');
      const newStreetNumber = '999';
      const newStreetBus = 'b';

      // create a batch array
      const batch = [
        [
          { "href": personHref
          , "verb": "PUT"
          , "body": body
          },
        ], [
          { "href": personHref
          , "verb": "PATCH"
          , "body": [ { op: 'replace', path: '/streetnumber', value: newStreetNumber } ]
          },
        ], [
          { "href": personHref
          , "verb": "PATCH"
          , "body": [ { op: 'add', path: '/streetbus', value: newStreetBus } ]
          },
        ]
      ]

      const r = await doPut('/persons/batch', batch, sriClientOptionsAuthSabine);
      r.forEach(x => x.status
        ? assert.equal(true, x.status === 200 || x.status === 201)
        : x.forEach(x => assert.equal(true, x.status === 200 || x.status === 201))
      );

      const c = await doGet(personHref, null, sriClientOptionsAuthSabine);
      assert.equal(c.key, key);
      assert.equal(c.streetnumber, newStreetNumber);
      assert.equal(c.streetbus, newStreetBus);
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
          await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);
        }, 
        (error) => {
          // expected to fail because property 'name' is missing
            assert.equal(error.status, 409);
        })
      await utils.testForStatusCode(
        async () => {
          await doGet('/communities/' + keyC1, null, sriClientOptionsAuthSabine);
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
          await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);
        }, 
        (error) => {
          // expected to fail: bodyC2 is missing required name
            assert.equal(error.status, 409);
        })
      await utils.testForStatusCode(
        async () => {
          await doGet('/communities/' + keyC1, null, sriClientOptionsAuthSabine);
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
          const r = await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);
        }, 
        (error) => {
          assert.equal(error.status, 400);
          assert.equal(error.body.errors[0].code, 'no.verb');
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
          const r = await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);
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
          const r = await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);
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
          const r = await doPut('/batch', batch, sriClientOptionsAuthSabine);
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

      const r = await doPut('/batch', batch, sriClientOptionsAuthSabine);
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

      const r = await doPut('/batch', batch, sriClientOptionsAuthSabine);
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

      const r = await doPut('/batch', batch, sriClientOptionsAuthSabine);
    });    

    it('batch: combination of several identical updates and one real', async function () {
      const body1 = generateRandomCity();
      const body2 = generateRandomCity();
      const body3 = generateRandomCity();      
      // create a batch array
      const batch = [
          { "href": '/cities/' + body1.key
          , "verb": "PUT"
          , "body": body1
          },
          { "href": '/cities/' + body2.key
          , "verb": "PUT"
          , "body": body2
          },
          { "href": '/cities/' + body3.key
          , "verb": "PUT"
          , "body": body3
          }
      ]
      await doPut('/cities/batch', batch,   sriClientOptionsAuthSabine);

      batch[0].body.name = 'Foobar'

      const r = await doPut('/cities/batch', batch,   sriClientOptionsAuthSabine);
      console.log(r)
      assert.equal(r[0].status, 200);
      assert.equal(r[1].status, 200);
      assert.equal(r[2].status, 200);
    });

    it('batch: when one requests fails, everything should rollbacked', async function () {
        const body1 = generateRandomCity();
        // create a batch array
        const batch = [
            { "href": '/cities/' + body1.key
            , "verb": "PUT"
            , "body": body1
            },
            { "href": '/cities/52074'
            , "verb": "GET"
            },
            { "href": '/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a'
            , "verb": "DELETE"  // will fail
            },
            { "href": '/cities/52074'
            , "verb": "DELETE"
            },
        ]
        await utils.testForStatusCode(
            async () => {
                await doPut('/batch', batch, sriClientOptionsAuthIngrid);
            }, 
            async (error) => {
              const r2 = await doGet('/cities/52074', null, sriClientOptionsAuthIngrid)
            });
      });

      it('batch streaming: when one requests fails, everything should rollbacked', async function () {
        const body1 = generateRandomCity();
        // create a batch array
        const batch = [
            { "href": '/cities/' + body1.key
            , "verb": "PUT"
            , "body": body1
            },
            { "href": '/cities/52074'
            , "verb": "GET"
            },
            { "href": '/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a'
            , "verb": "DELETE"   // will fail
            },
            { "href": '/cities/52074'
            , "verb": "DELETE"
            },
        ]
        const r = await doPut('/batch_streaming', batch, sriClientOptionsAuthIngrid);
        const r2 = await doGet('/cities/52074', null, sriClientOptionsAuthIngrid)
      });
  });
};
