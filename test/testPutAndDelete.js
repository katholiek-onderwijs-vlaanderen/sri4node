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
      amount: 1,
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


  describe('DELETE regular resource', function () {

    var key = uuid.v4();
    var body = generateRandomCommunity(key);

    before(async function (done) {
      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      await doPut('/communities/' + key, body, { headers: { authorization: auth } })
      done();      
    });

    it('should be possible to delete a newly created resource', async function () {
      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      await doDelete('/communities/' + key, { headers: { authorization: auth } })
    });

    it('retrieving a deleted resource should return 410 - Gone', async function () {
      await utils.testForStatusCode( 
        async () => {
          const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
          await doGet('/communities/' + key, null,  { headers: { authorization: auth } })
        }, 
        (error) => {
          assert.equal(error.status, 410);
        })
    });

    it('deleting a deleted resource should return 200 - OK', async function () {
      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      await doDelete('/communities/' + key, { headers: { authorization: auth } })
    });

    it('updating a deleted resource should return 410 - Gone', async function () {
      await utils.testForStatusCode( 
        async () => {
          const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
          await doPut('/communities/' + key, body,  { headers: { authorization: auth } })
        }, 
        (error) => {
          assert.equal(error.status, 410);
        })
    });

    it('retrieving a deleted resource with deleted=true should return the resource', async function () {
      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      const response = await doGet('/communities/' + key + '?$$meta.deleted=true', null,  { headers: { authorization: auth } })
      assert.equal(response.email, key + '@email.com');
      assert.equal(response.$$meta.deleted, true);
    });

    it('listing a deleted resource should not return it', async function () {
      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      const response = await doGet('/communities?email=' + key + '@email.com', null,  { headers: { authorization: auth } })
      assert.equal(response.results.length, 0);
    });

    it('listing a deleted resource with deleted=true should return it only', async function () {
      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      const response = await doGet('/communities?$$meta.deleted=true&email=' + key + '@email.com', null,  { headers: { authorization: auth } })
      assert.equal(response.results.length, 1);
      assert.equal(response.results[0].$$expanded.email, key + '@email.com');
      assert.equal(response.results[0].$$expanded.$$meta.deleted, true);
    });

    it('listing a deleted resource with deleted=any should return everything', async function () {
      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      const response = await doGet('/communities?$$meta.deleted=any&email=' + key + '@email.com', null,  { headers: { authorization: auth } })
      assert.equal(response.results.length, 1);
      assert.equal(response.results[0].$$expanded.email, key + '@email.com');
      assert.equal(response.results[0].$$expanded.$$meta.deleted, true);
    });

    it('listing a deleted resource with deleted=false should not return it', async function () {
      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      const response = await doGet('/communities?$$meta.deleted=false&email=' + key + '@email.com', null,  { headers: { authorization: auth } })
      assert.equal(response.results.length, 0);
    });
  });


  describe('PUT', function () {
    describe('schema validation', function () {
      it('should detect if a field is too long', async function () {
        await utils.testForStatusCode( 
          async () => {
            const key = uuid.v4();
            const body = generateRandomCommunity(key);
            body.email = body.email + body.email + body.email;

            const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
            await doPut('/communities/' + key, body,  { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 409);
          })
      });
    });

    describe('with rejecting custom validation function', function () {
      it('should return a 409 Conflict', async function () {
        await utils.testForStatusCode( 
          async () => {
            const key = uuid.v4();
            var body = generateRandomMessage(key, personSabine, communityDendermonde);

            const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
            await doPut('/messages/' + key, body,  { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.body.errors[0].code, 'not.enough');
          })
      });
    });

    describe('with a missing field (community without name)', function () {
      it('should return a 409 Conflict', async function () {
        await utils.testForStatusCode( 
          async () => {
            const key = uuid.v4();
            var body = generateRandomCommunity(key);
            delete body.name;

            const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
            await doPut('/communities/' + key, body,  { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.body.errors[0].errors.validationErrors.errors[0].code, 'requires.property.name');
          })
      });
    });

    describe('with a numeric value of 0', function () {
      it('should work and not skip 0 as a null value', async function () {
        const key = uuid.v4();
        var body = generateTransaction(key, '/persons/2f11714a-9c45-44d3-8cde-cd37eb0c048b', '/persons/9abe4102-6a29-4978-991e-2a30655030e6', 0);

        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        await doPut('/transactions/' + key, body,  { headers: { authorization: auth } })
      });
    });
  });

  describe('VALIDATION', function () {
    describe('schema validation', function () {
      it('should detect if a field is too long', async function () {
        await utils.testForStatusCode( 
          async () => {
            const key = uuid.v4();
            const body = generateRandomCommunity(key);
            body.email = body.email + body.email + body.email;

            const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
            await doPut('/communities/' + key + '?dryRun=true', body,  { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 409);
          })
      });
    });

    describe('with rejecting custom validation function', function () {
      it('should return a 409 Conflict', async function () {
        await utils.testForStatusCode( 
          async () => {
            const key = uuid.v4();
            var body = generateRandomMessage(key, personSabine, communityDendermonde);

            const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
            await doPut('/messages/' + key + '?dryRun=true', body,  { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.body.errors[0].code, 'not.enough');
          })
      });
    });

    describe('with a missing field (community without name)', function () {
      it('should return a 409 Conflict', async function () {
        await utils.testForStatusCode( 
          async () => {
            const key = uuid.v4();
            var body = generateRandomCommunity(key);
            delete body.name;

            const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
            await doPut('/communities/' + key + '?dryRun=true', body,  { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.body.errors[0].errors.validationErrors.errors[0].code, 'requires.property.name');
          })
      });
    });

    describe('with a numeric value of 0', function () {
      it('should work and not skip 0 as a null value', async function () {
        const key = uuid.v4();
        var body = generateTransaction(key, '/persons/2f11714a-9c45-44d3-8cde-cd37eb0c048b', '/persons/9abe4102-6a29-4978-991e-2a30655030e6', 0);

        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        await doPut('/transactions/' + key + '?dryRun=true', body,  { headers: { authorization: auth } })
      });
    });

    describe('should have no side effects', function () {
      const key = uuid.v4();
      const person = generateRandomPerson(key, communityDendermonde, 'Rodrigo', 'Uroz');

      it('must return 201 on a new resource but the person must not be persisted', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        await doPut('/persons/' + key + '?dryRun=true', person, { headers: { authorization: auth } })
        await utils.testForStatusCode( 
          async () => {
            await doGet('/persons/' + key, null,  { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 404);
          })
      });
    });
  });

  describe('afterupdate', function () {
    describe('should support', function () {
      it('multiple functions', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        const keyp1 = uuid.v4();
        const p1 = generateRandomPerson(keyp1, communityDendermonde);
        await doPut('/persons/' + keyp1, p1, { headers: { authorization: auth } })
        debug('p1 created');
        const keyp2 = uuid.v4();
        const p2 = generateRandomPerson(keyp2, communityDendermonde);
        await doPut('/persons/' + keyp2, p2, { headers: { authorization: auth } })
        debug('p2 created');
        const keyt = uuid.v4();
        const t = generateTransaction(keyt, '/persons/' + keyp1, '/persons/' + keyp2, 20);
        await doPut('/transactions/' + keyt, t, { headers: { authorization: auth } })
        debug('t created');

        const responseP1 = await doGet('/persons/' + keyp1, null, { headers: { authorization: auth } });
        assert.equal(responseP1.balance, -20);
        const responseP2 = await doGet('/persons/' + keyp2, null, { headers: { authorization: auth } });
        assert.equal(responseP2.balance, 20);
      });
    });
  });



  describe('key in PUT ', function () {
    it('should return error in case of url and permalink mismatch', async function () {
      await utils.testForStatusCode( 
          async () => {
            const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
            const keyp1 = uuid.v4();
            const keyp2 = uuid.v4();
            const p1 = generateRandomPerson(keyp1, communityDendermonde);
            await doPut('/persons/' + keyp2, p1, { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 400);
            assert.equal(error.body.errors[0].code, 'key.mismatch');
          })
    });
  
    it('should return error for invalid UUID', async function () {
      await utils.testForStatusCode( 
          async () => {      
            const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
            const keyp1 = 'invalid'
            const p1 = generateRandomPerson(keyp1, communityDendermonde);
            await doPut('/persons/' + keyp1, p1, { headers: { authorization: auth }, maxAttempts: 1  })
          }, 
          (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.body.errors[0].code, 'validation.errors');
            assert.equal( error.body.errors[0].errors.validationErrors.errors[0].code.substring(0, 22)
                        , 'does.not.match.pattern');
          })
    });
  });

  describe('permalink reference in PUT', function () {
    it('should return error in case of invalid UUID', async function () {
      await utils.testForStatusCode( 
          async () => {
            const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
            const keyp = uuid.v4();
            const p = generateRandomPerson(keyp, '/communities/foo-bar');
            await doPut('/persons/' + keyp, p, { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 409);
            assert.equal( error.body.errors[0].errors.validationErrors.errors[0].code.substring(0, 22)
                        , 'does.not.match.pattern');
          })
    });
  });



  describe('PUT must distinguish between create (201) and update (200)', function () {

    const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
    const key = uuid.v4();
    const p = generateRandomPerson(key, communityDendermonde);

    it('must return 201 on a new resource', async function () {
      const response = await doPut('/persons/' + key, p, { headers: { authorization: auth } } )
      debug(response);
      assert.equal(response.getStatusCode(), 201);
    });

    it('must return 200 on an update', async function () {
      const response = await doPut('/persons/' + key, p, { headers: { authorization: auth } })
      debug(response);     
      assert.equal(response.getStatusCode(), 200);
    });
  });

  describe('PUT of 100 items ', function () {
    it('should be allowed in parallel.', async function () {
      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      const results = await pMap(
        Array(100),
        async (i) => {
          const key = uuid.v4();
          const person = generateRandomPerson(key, communityDendermonde);
          await doPut('/persons/' + key, person, { headers: { authorization: auth } })
        },
        { concurrency: 100 }
      )
    });
  });
};
