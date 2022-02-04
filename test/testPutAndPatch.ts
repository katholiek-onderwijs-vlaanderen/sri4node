// Utility methods for calling the SRI interface
const pMap = require('p-map'); 
const assert = require('assert');
import { debug } from '../js/common';
const sriClientFactory = require('@kathondvla/sri-client/node-sri-client');
const uuid = require('uuid');

export = module.exports = function (base) {
  'use strict';
  var communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';
  var personSabine = '/persons/9abe4102-6a29-4978-991e-2a30655030e6';

  const sriClientConfig = {
    baseUrl: base,
  }
  const api = sriClientFactory(sriClientConfig);
  const doGet = function(...args) { return api.getRaw(...args) };
  const doPut = function(...args) { return api.put(...args) };
  const doPatch = function(...args) { return api.patch(...args) };

  const utils =  require('./utils')(api);

  const auth = utils.makeBasicAuthHeader('sabine@email.be', 'pwd')

  function generateRandomPerson(key, communityPermalink, firstname = 'Sabine', lastname = 'Eeckhout') {
    return {
      key,
      firstname,
      lastname,
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

  function generateRandomCommunity(key):any {
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

  function generateRandomAllDatatypes(key) {
    return {
      key: key,
      id: 40,
      numberbigserial: BigInt(40), // 40n,
      numberserial:40,
      numbersmallserial:40,
      text2:'b2kx2rzb8q9',
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


  describe('PUT', function () {

    describe('schema validation', function () {
      it('should detect if a field is too long', async function () {
        await utils.testForStatusCode(
          async () => {
            const key = uuid.v4();
            const body = generateRandomCommunity(key);
            body.email = body.email + body.email + body.email;

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

            await doPut('/communities/' + key, body,  { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.body.errors[0].errors.validationErrors[0].code, 'must.have.required.property.name');
          })
      });
    });

    describe('with a numeric value of 0', function () {
      it('should work and not skip 0 as a null value', async function () {
        const key = uuid.v4();
        var body = generateTransaction(key, '/persons/2f11714a-9c45-44d3-8cde-cd37eb0c048b', '/persons/9abe4102-6a29-4978-991e-2a30655030e6', 0);

        await doPut('/transactions/' + key, body, { headers: { authorization: auth } })
      });
    });

    describe('with a float', function () {
        it('should work', async function () {
            const key = uuid.v4();
            var body = generateRandomAllDatatypes(key);
            body.id = 40.95;
            await doPut('/alldatatypes/' + key, body, { headers: { authorization: auth } })
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

            await doPut('/communities/' + key + '?dryRun=true', body, { headers: { authorization: auth } })
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

            await doPut('/communities/' + key + '?dryRun=true', body, { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.body.errors[0].errors.validationErrors[0].code, 'must.have.required.property.name');
          })
      });
    });

    describe('with a numeric value of 0', function () {
      it('should work and not skip 0 as a null value', async function () {
        const key = uuid.v4();
        var body = generateTransaction(key, '/persons/2f11714a-9c45-44d3-8cde-cd37eb0c048b', '/persons/9abe4102-6a29-4978-991e-2a30655030e6', 0);

        await doPut('/transactions/' + key + '?dryRun=true', body, { headers: { authorization: auth } })
      });
    });

    describe('should have no side effects', function () {
      const key = uuid.v4();
      const person = generateRandomPerson(key, communityDendermonde, 'Rodrigo', 'Uroz');

      it('must return 201 on a new resource but the person must not be persisted', async function () {
        await doPut('/persons/' + key + '?dryRun=true', person, { headers: { authorization: auth } })
        await utils.testForStatusCode(
          async () => {
            await doGet('/persons/' + key, null, { headers: { authorization: auth } })
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
        const keyp1 = uuid.v4();
        const p1 = generateRandomPerson(keyp1, communityDendermonde);
        await doPut('/persons/' + keyp1, p1, { headers: { authorization: auth } })
        debug('mocha', 'p1 created');
        const keyp2 = uuid.v4();
        const p2 = generateRandomPerson(keyp2, communityDendermonde);
        await doPut('/persons/' + keyp2, p2, { headers: { authorization: auth } })
        debug('mocha', 'p2 created');
        const keyt = uuid.v4();
        const t = generateTransaction(keyt, '/persons/' + keyp1, '/persons/' + keyp2, 20);
        await doPut('/transactions/' + keyt, t, { headers: { authorization: auth } })
        debug('mocha', 't created');

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
            const keyp1 = 'invalid'
            const p1 = generateRandomPerson(keyp1, communityDendermonde);
            await doPut('/persons/' + keyp1, p1, { headers: { authorization: auth }, maxAttempts: 1  })
          }, 
          (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.body.errors[0].code, 'validation.errors');
            assert.equal( error.body.errors[0].errors.validationErrors[0].code.substring(0, 22)
                        , 'must.match.pattern');
          })
    });
  });

  describe('permalink reference in PUT', function () {
    it('should return error in case of invalid UUID', async function () {
      await utils.testForStatusCode(
          async () => {
            const keyp = uuid.v4();
            const p = generateRandomPerson(keyp, '/communities/foo-bar');
            await doPut('/persons/' + keyp, p, { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 409);
            assert.equal( error.body.errors[0].errors.validationErrors[0].code.substring(0, 22)
                        , 'must.match.pattern');
          })
    });
  });

  describe('PUT (insert) resulting in foreign key error', function () {
    it('should return 409 conflict', async function () {
      await utils.testForStatusCode(
          async () => {
            const keyp = uuid.v4();
            const p = generateRandomPerson(keyp, '/communities/00000000-0000-0000-0000-000000000000');
            await doPut('/persons/' + keyp, p, { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.body.errors[0].code, 'db.constraint.violation');
          })
    });
  });


  describe('PUT (update) resulting in foreign key error', function () {
    it('should return 409 conflict', async function () {
      await utils.testForStatusCode(
          async () => {
            const keyp = uuid.v4();
            const p = generateRandomPerson(keyp, communityDendermonde);
            await doPut('/persons/' + keyp, p, { headers: { authorization: auth } })
            p.community.href = '/communities/00000000-0000-0000-0000-000000000000';
            await doPut('/persons/' + keyp, p, { headers: { authorization: auth } })
          }, 
          (error) => {
            assert.equal(error.status, 409);
            assert.equal(error.body.errors[0].code, 'db.constraint.violation');
          })
    });
  });



  describe('PUT must distinguish between create (201) and update (200)', function () {

    const key = uuid.v4();
    const p = generateRandomPerson(key, communityDendermonde);

    it('must return 201 on a new resource', async function () {
      const response = await doPut('/persons/' + key, p, { headers: { authorization: auth } } )
      debug('mocha', response);
      assert.equal(response.getStatusCode(), 201);
    });

    it('must return 200 on an update without changes', async function () {
      const response = await doPut('/persons/' + key, p, { headers: { authorization: auth } })
      debug('mocha', response);
      assert.equal(response.getStatusCode(), 200);
    });

    it('must return 200 on an update with changes', async function () {
        const p1 = await doGet('/persons/' + key, null, { headers: { authorization: auth } });
        p1.city = 'Borsbeek';
        const response = await doPut('/persons/' + key, p1, { headers: { authorization: auth } })
        debug('mocha', response);
        assert.equal(response.getStatusCode(), 200);
        const p2 = await doGet('/persons/' + key, null, { headers: { authorization: auth } });
        assert.notStrictEqual( p1.$$meta.modified, p2.$$meta.modified )
      });
  });

  describe('PUT of 100 items ', function () {
    it('should be allowed in parallel.', async function () {
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

  // PATCH specific tests
  // TODO: finish them properly, right now they don't make sense
  describe( 'PATCH', () => {


    describe('PATCH resulting in foreign key error', function () {
      it('should return 409 conflict', async function () {
        await utils.testForStatusCode(
            async () => {
              const keyp = '692fa054-33ec-4a28-87eb-53df64e3d09d';
              const p = [ { op: 'replace', path: '/community/href', value: '/communities/00000000-0000-0000-0000-000000000000' } ];
              await doPatch('/persons/' + keyp, p, { headers: { authorization: auth } })
            },
            (error) => {
              assert.equal(error.status, 409);
              assert.equal(error.body.errors[0].code, 'db.constraint.violation');
            })
      });
    });


    describe('simple working PATCH', function () {
      it('should return 200 ok', async function () {
        const patch = [
          { op: 'replace', path: '/streetnumber', value: '5' },
          { op: 'add', path: '/streetbus', value: 'a' },
        ]
        try {
          await doPatch(personSabine, patch, { headers: { authorization: auth } })
        }
        catch (e) {
          assert.fail('shouldn\'t have thrown an error', e);
        }
      });
      it('should be idempotent', async function () {
        const patch = [
          { op: 'replace', path: '/streetnumber', value: '5' },
          { op: 'add', path: '/streetbus', value: 'a' },
        ]
        try {
          await doPatch(personSabine, patch, { headers: { authorization: auth } })
          const patched = await doGet(personSabine,null, { headers: { authorization: auth } })

          await doPatch(personSabine, patch, { headers: { authorization: auth } })
          const patched2 = await doGet(personSabine,null, { headers: { authorization: auth } })

          assert.equal( patched.$$meta.modified, patched2.$$meta.modified )
        }
        catch (e) {
          assert.fail('shouldn\'t have thrown an error', e);
        }
      });
    });

    describe('PATCH causing schema failures', function () {
      it('should return 409 conflict because schema will fail', async function () {
        await utils.testForStatusCode(
            async () => {
              const patch = [
                { op: 'replace', path: '/community/href', value: 'INVALID' }
              ]
              await doPatch(personSabine, patch, { headers: { authorization: auth } })
            },
            (error) => {
              assert.equal(error.status, 409);
              assert.equal(error.body.errors[0].code, 'validation.errors');
            })
      });
    });

    describe('PATCH with single object instead of array should fail', function () {
        it('should return 400 bad request', async function () {
          await utils.testForStatusCode(
              async () => {
                const patch = { op: 'replace', path: '/streetnumber', value: '5' };
                await doPatch(personSabine, patch, { headers: { authorization: auth } })
              },
              (error) => {
                assert.equal(error.status, 400);
                assert.equal(error.body.errors[0].code, 'patch.invalid');
              })
        });
      });


  });

};
