// Utility methods for calling the SRI interface
import * as pMap from 'p-map';
import { assert } from 'chai';
import * as uuid from 'uuid';
import * as _ from 'lodash';
import * as expect from 'expect.js';
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory from './utils';

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
module.exports = function (base) {
  const communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';
  const communityHamme = '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d';

  const personSabine = '/persons/9abe4102-6a29-4978-991e-2a30655030e6';

  const sriClientConfig = {
    baseUrl: base,
  };

  const api = sriClientFactory(sriClientConfig);

  const doGet = function (...args) { return api.getRaw(...args); };
  const doPut = function (...args) { return api.put(...args); };
  const doPatch = function (...args) { return api.patch(...args); };
  const doPost = function (...args) { return api.post(...args); };
  const doDelete = function (...args) { return api.delete(...args); };

  const utils = utilsFactory(api);
  const { makeBasicAuthHeader } = utils;

  const sriClientOptionsAuthSabine = {
    maxAttempts: 1,
    headers: { authorization: makeBasicAuthHeader('sabine@email.be', 'pwd') },
  };
  const sriClientOptionsAuthIngrid = {
    maxAttempts: 1,
    headers: { authorization: makeBasicAuthHeader('ingrid@email.be', 'pwd') },
  };

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
      email: `${key}@email.com`,
      balance: 0,
      mail4elas: 'weekly',
      community: {
        href: communityPermalink,
      },
    };
  }

  function generateRandomCommunity(key):any {
    return {
      key,
      name: `LETS ${key}`,
      street: 'Leuvensesteenweg',
      streetnumber: '34',
      zipcode: '1040',
      city: 'Brussel',
      phone: '0492882277',
      email: `${key}@email.com`,
      adminpassword: 'secret',
      currencyname: 'pluimen',
    };
  }

  function generateRandomMessage(key, person, community) {
    return {
      key,
      person: {
        href: person,
      },
      type: 'offer',
      title: 'new message',
      description: `description for ${key}`,
      amount: 50,
      unit: 'stuk',
      community: {
        href: community,
      },
    };
  }

  function generateRandomCity() {
    const key = Math.floor(10000 + Math.random() * 90000);
    return {
      key,
      nisCode: key,
      name: 'RandomCity',
    };
  }

  describe('BATCH', () => {
    it('batch: 1 single list request should work', async () => {
      const batch = [
        {
          href: '/countries',
          verb: 'GET',
        },
      ];

      // assert.doesNotThrow(async () => await doPut('/batch', batch, sriClientOptionsAuthSabine));

      try {
        const r = await doPut('/batch', batch, sriClientOptionsAuthSabine);
        r.forEach((x) => assert.equal(x.status, 200));  
      } catch (e) {
        console.log(e, e.stack);
        throw e;
      }
    });

    it('create community and immediately delete', async () => {
      const key = uuid.v4();
      const body = generateRandomCommunity(key);
      const communityHref = `/communities/${key}`;
      // create a batch array
      const batch = [
        {
          href: communityHref,
          verb: 'PUT',
          body,
        },
        {
          href: communityHref,
          verb: 'DELETE',
        },
      ];

      await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);

      // RESOURCE SHOULD BE GONE, but the way it's implemented now could be unpredictable (parallel)
      const c = await doGet(communityHref, null, sriClientOptionsAuthSabine);
      // assert.equal(c.key, key);
      // assert.equal(c.streetnumber, newStreetNumber);
    });

    it('create community and immediately delete with batchlist', async () => {
      const key = uuid.v4();
      const body = generateRandomCommunity(key);
      // create a batch array
      const batch = [
        [{
          href: `/communities/${key}`,
          verb: 'PUT',
          body,
        }],
        [{
          href: `/communities/${key}`,
          verb: 'DELETE',
        }],
      ];
      const r = await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);
      assert.equal(r[0].href, `/communities/${key}`);
      assert.equal(r[0].verb, 'PUT');
      assert.equal(r[1].href, `/communities/${key}`);
      assert.equal(r[1].verb, 'DELETE');
    });

    it('single PATCH on existing person', async () => {
      const key = uuid.v4();
      const personHref = `/persons/${key}`;
      const body = generateRandomPerson(key, communityDendermonde, 'John', 'Doe');
      const newStreetNumber = '999';

      await doPut(personHref, body, sriClientOptionsAuthSabine);

      // create a batch array
      const batch = [
        {
          href: personHref,
          verb: 'PATCH',
          body: [{ op: 'replace', path: '/streetnumber', value: newStreetNumber }],
        },
      ];

      const r = await doPut('/persons/batch', batch, sriClientOptionsAuthSabine);
      r.forEach((x) => assert.equal(x.status, 200));

      const c = await doGet(personHref, null, sriClientOptionsAuthSabine);
      assert.equal(c.key, key);
      assert.equal(c.streetnumber, newStreetNumber);
    });

    it('2 consecutive PATCHes on existing person', async () => {
      const key = uuid.v4();
      const personHref = `/persons/${key}`;
      const body = generateRandomPerson(key, communityDendermonde, 'John', 'Doe');
      const newStreetNumber = '999';
      const newStreetBus = 'b';

      await doPut(personHref, body, sriClientOptionsAuthSabine);

      // create a batch array
      const batch = [
        [
          {
            href: personHref,
            verb: 'PATCH',
            body: [{ op: 'replace', path: '/streetnumber', value: newStreetNumber }],
          },
        ], [
          {
            href: personHref,
            verb: 'PATCH',
            body: [{ op: 'add', path: '/streetbus', value: newStreetBus }],
          },
        ],
      ];

      const r = await doPut('/persons/batch', batch, sriClientOptionsAuthSabine);
      r.forEach((x) => (x.status
        ? assert.equal(x.status, 200)
        : x.forEach((x) => assert.equal(x.status, 200))));

      const c = await doGet(personHref, null, sriClientOptionsAuthSabine);
      assert.equal(c.key, key);
      assert.equal(c.streetnumber, newStreetNumber, 'seems like the second patch operation on streetbus undid the previous patch on streetnumber');
      assert.equal(c.streetbus, newStreetBus);
    });

    it('create person and immediately PATCH in same batch', async () => {
      const key = uuid.v4();
      const personHref = `/persons/${key}`;
      const body = generateRandomPerson(key, communityDendermonde, 'Don', 'Quichotte');
      const newStreetNumber = '999';
      const newStreetBus = 'b';

      // create a batch array
      const batch = [
        [
          {
            href: personHref,
            verb: 'PUT',
            body,
          },
        ], [
          {
            href: personHref,
            verb: 'PATCH',
            body: [{ op: 'replace', path: '/streetnumber', value: newStreetNumber }],
          },
        ], [
          {
            href: personHref,
            verb: 'PATCH',
            body: [{ op: 'add', path: '/streetbus', value: newStreetBus }],
          },
        ],
      ];

      const r = await doPut('/persons/batch', batch, sriClientOptionsAuthSabine);
      r.forEach((x) => (x.status
        ? assert.equal(true, x.status === 200 || x.status === 201)
        : x.forEach((x) => assert.equal(true, x.status === 200 || x.status === 201))));

      const c = await doGet(personHref, null, sriClientOptionsAuthSabine);
      assert.equal(c.key, key);
      assert.equal(c.streetnumber, newStreetNumber);
      assert.equal(c.streetbus, newStreetBus);
    });

    it('with error should be completely rollbacked', async () => {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomCommunity(keyC2);
      delete bodyC2.name; // this wil trigger a validation error

      // create a batch array
      const batch = [
        {
          href: `/communities/${keyC1}`,
          verb: 'PUT',
          body: bodyC1,
        },
        {
          href: `/communities/${keyC2}`,
          verb: 'PUT',
          body: bodyC2,
        },
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);
        },
        (error) => {
          // expected to fail because property 'name' is missing
          assert.equal(error.status, 409);
          assert.equal(error.body[1].body.errors[0].errors.validationErrors[0].code, 'must.have.required.property.name');
        },
      );
      await utils.testForStatusCode(
        async () => {
          await doGet(`/communities/${keyC1}`, null, sriClientOptionsAuthSabine);
        },
        (error) => {
          // expected to fail because this resource should have been rollbacked
          assert.equal(error.status, 404);
        },
      );
    });

    it('with error should be completely rollbacked', async () => {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomCommunity(keyC2);
      delete bodyC2.name; // this will trigger a validation error

      // create a batch array
      const batch = [
        [{
          href: `/communities/${keyC1}`,
          verb: 'PUT',
          body: bodyC1,
        }],
        [{
          href: `/communities/${keyC2}`,
          verb: 'PUT',
          body: bodyC2,
        }],
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);
        },
        (error) => {
          // expected to fail: bodyC2 is missing required name
          assert.equal(error.status, 409);
          assert.equal(error.body[1].body.errors[0].errors.validationErrors[0].code, 'must.have.required.property.name');
        },
      );
      await utils.testForStatusCode(
        async () => {
          await doGet(`/communities/${keyC1}`, null, sriClientOptionsAuthSabine);
        },
        (error) => {
          // expected to fail: should not be created but rollbacked
          assert.equal(error.status, 404);
        },
      );
    });

    it('no VERB should result in error', async () => {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomCommunity(keyC2);

      // create a batch array
      const batch = [
        [{
          href: `/communities/${keyC1}`,
          verb: 'PUT',
          body: bodyC1,
        }],
        [{
          href: `/communities/${keyC2}`,
          body: bodyC2,
        }],
      ];
      await utils.testForStatusCode(
        async () => {
          const r = await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);
        },
        (error) => {
          assert.equal(error.status, 400);
          assert.equal(error.body.errors[0].code, 'no.verb');
        },
      );
    });

    it('cross boundary should result in error', async () => {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomMessage(keyC2, personSabine, communityDendermonde);

      // create a batch array
      const batch = [
        [{
          href: `/communities/${keyC1}`,
          verb: 'PUT',
          body: bodyC1,
        }],
        [{
          href: `/messages/${keyC2}`,
          verb: 'PUT',
          body: bodyC2,
        }],
      ];
      await utils.testForStatusCode(
        async () => {
          const r = await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);
        },
        (error) => {
          assert.equal(error.status, 400);
          assert.equal(error.body.errors[0].code, 'href.across.boundary');
        },
      );
    });

    it('error should result in cancellation of accompanying requests ', async () => {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      delete bodyC1.name; // no name ==> validation error
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomCommunity(keyC2);

      // create a batch array
      const batch = [
        {
          href: `/communities/${keyC1}`,
          verb: 'PUT',
          body: bodyC1,
        },
        {
          href: `/communities/${keyC2}`,
          verb: 'PUT',
          body: bodyC2,
        },
      ];
      await utils.testForStatusCode(
        async () => {
          const r = await doPut('/communities/batch', batch, sriClientOptionsAuthSabine);
        },
        (error) => {
          assert.equal(error.status, 409);
          assert.equal(error.body[0].body.errors[0].code, 'validation.errors');
          assert.equal(error.body[0].body.errors[0].errors.validationErrors[0].code, 'must.have.required.property.name');
          assert.equal(error.body[1].status, 202);
          assert.equal(error.body[1].body.errors[0].code, 'cancelled');
        },
      );
    });

    it('no matching route should result in error', async () => {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomCommunity(keyC2);

      // create a batch array
      const batch = [
        [{
          href: `/coMunities/${keyC1}`,
          verb: 'PUT',
          body: bodyC1,
        }],
        [{
          href: `/communities/${keyC2}`,
          body: bodyC2,
        }],
      ];
      await utils.testForStatusCode(
        async () => {
          const r = await doPut('/batch', batch, sriClientOptionsAuthSabine);
        },
        (error) => {
          assert.equal(error.status, 404);
          assert.equal(error.body.errors[0].code, 'no.matching.route');
        },
      );
    });

    // global batch (temporarily for samenscholing)
    it('global batch -- specific for samenscholing', async () => {
      const keyC1 = uuid.v4();
      const bodyC1 = generateRandomCommunity(keyC1);
      const keyC2 = uuid.v4();
      const bodyC2 = generateRandomMessage(keyC2, personSabine, communityDendermonde);

      // create a batch array
      const batch = [
        [{
          href: `/communities/${keyC1}`,
          verb: 'PUT',
          body: bodyC1,
        }],
        [{
          href: `/messages/${keyC2}`,
          verb: 'PUT',
          body: bodyC2,
        }],
      ];

      const r = await doPut('/batch', batch, sriClientOptionsAuthSabine);
    });

    it('\'big\' batch', async () => {
      // create a batch array
      const batch = await pMap(
        Array(100),
        async (i) => {
          const keyC1 = uuid.v4();
          const bodyC1 = generateRandomCommunity(keyC1);
          return {
            href: `/communities/${keyC1}`,
            verb: 'PUT',
            body: bodyC1,
          };
        },
      );

      const r = await doPut('/batch', batch, sriClientOptionsAuthSabine);
    });

    it('\'big\' batch with sub-batches', async () => {
      // create a batch array
      const batch = await pMap(
        Array(100),
        async (i) => {
          const keyC1 = uuid.v4();
          const bodyC1 = generateRandomCommunity(keyC1);
          return [{
            href: `/communities/${keyC1}`,
            verb: 'PUT',
            body: bodyC1,
          }];
        },
      );

      const r = await doPut('/batch', batch, sriClientOptionsAuthSabine);
    });

    it('batch: combination of several identical updates and one real', async () => {
      const body1 = generateRandomCity();
      const body2 = generateRandomCity();
      const body3 = generateRandomCity();
      // create a batch array
      const batch = [
        {
          href: `/cities/${body1.key}`,
          verb: 'PUT',
          body: body1,
        },
        {
          href: `/cities/${body2.key}`,
          verb: 'PUT',
          body: body2,
        },
        {
          href: `/cities/${body3.key}`,
          verb: 'PUT',
          body: body3,
        },
      ];
      await doPut('/cities/batch', batch, sriClientOptionsAuthSabine);

      batch[0].body.name = 'Foobar';

      const r = await doPut('/cities/batch', batch, sriClientOptionsAuthSabine);
      assert.equal(r[0].status, 200);
      assert.equal(r[1].status, 200);
      assert.equal(r[2].status, 200);
    });

    it('batch: when one requests fails, everything should rollbacked', async () => {
      const body1 = generateRandomCity();
      // create a batch array
      const batch = [
        {
          href: `/cities/${body1.key}`,
          verb: 'PUT',
          body: body1,
        },
        {
          href: '/cities/52074',
          verb: 'GET',
        },
        {
          href: '/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a',
          verb: 'DELETE',
            // will fail (403) as user Ingrid is not allowed to delete persons
        },
        {
          href: '/cities/52074',
          verb: 'DELETE',
        },
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', batch, sriClientOptionsAuthIngrid);
        },
        async (error) => {
          console.log(error)
          const r2 = await doGet('/cities/52074', null, sriClientOptionsAuthIngrid);
        },
      );
    });

    it('batch streaming: when one requests fails, everything should rollbacked', async () => {
      const body1 = generateRandomCity();
      // create a batch array
      const batch = [
        {
          href: `/cities/${body1.key}`,
          verb: 'PUT',
          body: body1,
        },
        {
          href: '/cities/52074',
          verb: 'GET',
        },
        {
          href: '/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a',
          verb: 'DELETE',
            // will fail (403) as user Ingrid is not allowed to delete persons
        },
        {
          href: '/cities/52074',
          verb: 'DELETE',
        },
      ];
      const r = await doPut('/batch_streaming', batch, sriClientOptionsAuthIngrid);
      const r2 = await doGet('/cities/52074', null, sriClientOptionsAuthIngrid);
      // If we get past the GET of '/cities/52074', it means the batch rolled back.
      // Otherwise this GET would have thrown 410 resource.gone error.
    });

    it('batch: errors triggered in the global beforePhase should match the correct request', async () => {
      const body1 = generateRandomCity();
      const body2 = generateRandomCity();
      const body3 = generateRandomCity();
      const body4 = generateRandomCity();
      const body5 = generateRandomCity();
      const body6 = generateRandomCity();
      const body7 = generateRandomCity();
      const body8 = generateRandomCity();
      const body9 = generateRandomCity();
      const body10 = generateRandomCity();
      const body11 = generateRandomCity();
      const body12 = generateRandomCity();
      const body13 = generateRandomCity();
      const body14 = generateRandomCity();
      const body15 = generateRandomCity();
      const body16 = generateRandomCity();
      const body17 = generateRandomCity();
      const body18 = generateRandomCity();
      const body19 = generateRandomCity();
      const body20 = generateRandomCity();
      // create a batch array
      const batch = [
        {
          href: `/cities/${body1.key}`,
          verb: 'PUT',
          body: body1,
        },
        {
          href: `/cities/${body2.key}`,
          verb: 'PUT',
          body: body2,
        },
        {
          href: `/cities/${body3.key}`,
          verb: 'PUT',
          body: body3,
        },
        {
          href: '/cities/100001',  // key 100001 is configured to throw an error 'foo'
          verb: 'PUT',
          body: {
            key: 100001,
            nisCode: 100001,
            name: 'BadCity',
          },
        },
        {
          href: `/cities/${body4.key}`,
          verb: 'PUT',
          body: body4,
        },
        {
          href: `/cities/${body5.key}`,
          verb: 'PUT',
          body: body5,
        },
        {
          href: `/cities/${body6.key}`,
          verb: 'PUT',
          body: body6,
        },
        {
          href: `/cities/${body7.key}`,
          verb: 'PUT',
          body: body7,
        },
        {
          href: `/cities/${body8.key}`,
          verb: 'PUT',
          body: body8,
        },
        {
          href: `/cities/${body9.key}`,
          verb: 'PUT',
          body: body9,
        },
        {
          href: `/cities/${body10.key}`,
          verb: 'PUT',
          body: body10,
        },
        {
          href: `/cities/${body11.key}`,
          verb: 'PUT',
          body: body11,
        },
        {
          href: `/cities/${body12.key}`,
          verb: 'PUT',
          body: body12,
        },
        {
          href: `/cities/${body13.key}`,
          verb: 'PUT',
          body: body13,
        },
        {
          href: `/cities/${body14.key}`,
          verb: 'PUT',
          body: body14,
        },
        {
          href: `/cities/${body15.key}`,
          verb: 'PUT',
          body: body15,
        },
        {
          href: `/cities/${body16.key}`,
          verb: 'PUT',
          body: body16,
        },
        {
          href: `/cities/${body17.key}`,
          verb: 'PUT',
          body: body17,
        },
        {
          href: `/cities/${body18.key}`,
          verb: 'PUT',
          body: body18,
        },
        {
          href: `/cities/${body19.key}`,
          verb: 'PUT',
          body: body19,
        },
        {
          href: `/cities/${body20.key}`,
          verb: 'PUT',
          body: body20,
        },
      ];

      await utils.testForStatusCode(
        async () => {
          await doPut('/cities/batch', batch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          assert.equal(error.body[3].status, 400);
          assert.strictEqual(error.body[3].body.errors[0].code, 'foo');
        },
      );
    });

    it('batch: check if phasesyncing is correctly aligned for all different kinds of requests', async () => {
      const body1 = generateRandomCity();
      // create a batch array
      const batch = [
        {
          href: '/countries/isPartOf',
          verb: 'POST',
          body: {
            a: { href: '/countries/be' },
            b: { hrefs: ['/countries?nameRegEx=^be.*$'] },
          },
        },
        {
          href: '/cities/52074',
          verb: 'GET',
        },
        {
          href: '/cities/52074',
          verb: 'DELETE',
        },
        {
          href: '/countries',
          verb: 'GET',
        },
        {
          href: `/cities/${body1.key}`,
          verb: 'PUT',
          body: body1,
        },
        {
          href: personSabine,
          verb: 'PATCH',
          body: [
            { op: 'replace', path: '/streetnumber', value: '9999' },
            { op: 'add', path: '/streetbus', value: 'Z' },
          ],
        },
        {
          href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple',
          verb: 'GET',
        },
        {
          href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike',
          verb: 'GET',
        },
      ];
      const r = await doPut('/batch', batch, sriClientOptionsAuthSabine);
    });

    it('batch with multiple single inserts with one constraint error', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, '/communities/00000000-0000-0000-0000-000000000000');
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      // create a batch array
      const batch = [
        [{
          href: `/persons/${keyp1}`,
          verb: 'PUT',
          body: p1,
        }],
        [{
          href: `/persons/${keyp2}`,
          verb: 'PUT',
          body: p2,
        }],
      ];

      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', batch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          assert.strictEqual(error.body[0].status, 409);
          assert.strictEqual(error.body[0].body.errors[0].code, 'db.constraint.violation');
          assert.strictEqual(error.body[1].status, 202);
        },
      );
    });

    it('batch with multi row insert and a constraint error', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, '/communities/00000000-0000-0000-0000-000000000000'); // ==> constraint error
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      // create a batch array
      const batch = [
        {
          href: `/persons/${keyp1}`,
          verb: 'PUT',
          body: p1,
        },
        {
          href: `/persons/${keyp2}`,
          verb: 'PUT',
          body: p2,
        },
        {
          href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple',
          verb: 'GET',
        },
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', batch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          // this is a multi insert for which one row fails -> sri4node cannot determine which rows failed
          // and all insert elements will receive a 409 error explaining this.
          assert.strictEqual(error.body[0].status, 409);
          assert.strictEqual(error.object.body[0].body.errors[0].code, 'multi.insert.failed');
          assert.strictEqual(error.body[1].status, 409);
          assert.strictEqual(error.object.body[1].body.errors[0].code, 'multi.insert.failed');
          expect([200, 202]).to.contain(error.body[2].status);
          assert.strictEqual(error.body[0].href, `/persons/${keyp1}`);
          assert.strictEqual(error.body[1].href, `/persons/${keyp2}`);
          assert.strictEqual(error.body[2].href, '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple');
        },
      );
    });

    it('batch with multi row insert and a constraint error (reverse order)', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, '/communities/00000000-0000-0000-0000-000000000000');  // ==> constraint error
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      const batch2 = [
        {
          href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple',
          verb: 'GET',
        },
        {
          href: `/persons/${keyp2}`,
          verb: 'PUT',
          body: p2,
        },
        {
          href: `/persons/${keyp1}`,
          verb: 'PUT',
          body: p1,
        },
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', batch2, sriClientOptionsAuthSabine);
        },
        async (error) => {
          // this is a multi insert for which one row fails -> sri4node cannot determine which rows failed
          // and all insert elements will receive a 409 error explaining this.
          expect([200, 202]).to.contain(error.body[0].status);
          assert.strictEqual(error.body[1].status, 409);
          assert.strictEqual(error.object.body[1].body.errors[0].code, 'multi.insert.failed');
          assert.strictEqual(error.body[2].status, 409);
          assert.strictEqual(error.object.body[2].body.errors[0].code, 'multi.insert.failed');
          assert.strictEqual(error.body[0].href, '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple');
          assert.strictEqual(error.body[1].href, `/persons/${keyp2}`);
          assert.strictEqual(error.body[2].href, `/persons/${keyp1}`);
        },
      );
    });

    it('batch with multi row update and a constraint error', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, communityHamme);
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      // create a batch array
      const batch = [
        {
          href: `/persons/${keyp1}`,
          verb: 'PUT',
          body: p1,
        },
        {
          href: `/persons/${keyp2}`,
          verb: 'PUT',
          body: p2,
        },
      ];
      await doPut('/batch', batch, sriClientOptionsAuthSabine);

      const updateBatchPart = [ ...batch ];
      updateBatchPart[0].body.community.href = '/communities/00000000-0000-0000-0000-000000000000';  // ==> constraint error
      updateBatchPart[1].body.streetnumber = '18'; // will trigger an update
      const updateBatch =  [
        ...updateBatchPart,
        {
          href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple',
          verb: 'GET',
        },
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', updateBatch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          // this is a multi update for which one row fails -> sri4node cannot determine which rows failed
          // and all update elements will receive a 409 error explaining this.
          assert.strictEqual(error.body[0].status, 409);
          assert.strictEqual(error.object.body[0].body.errors[0].code, 'multi.update.failed');
          assert.strictEqual(error.body[1].status, 409);
          assert.strictEqual(error.object.body[1].body.errors[0].code, 'multi.update.failed');
          expect([200, 202]).to.contain(error.body[2].status);
          assert.strictEqual(error.body[0].href, `/persons/${keyp1}`);
          assert.strictEqual(error.body[1].href, `/persons/${keyp2}`);
          assert.strictEqual(error.body[2].href, '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple');
        },
      );
    });

    it('batch with multi row delete and a constraint error', async () => {
      const batch = [
        {
          href: '/foos/7c85b45a-7ddd-11ec-8a3d-4742839ee2fd',  // table foos has the constraint '"$$meta.deleted" != true' => constraint error
          verb: 'DELETE',
        },
        {
          href: '/foos/cd6a4678-7dcf-11ec-b41e-0faad76b288d',  // table foos has the constraint '"$$meta.deleted" != true' => constraint error
          verb: 'DELETE',
        },
        {
          href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple',
          verb: 'GET',
        },
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', batch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          // this is a multi delete for which one row fails -> sri4node cannot determine which rows failed
          // and all delete elements will receive a 409 error explaining this.
          assert.strictEqual(error.body[0].status, 409);
          assert.strictEqual(error.object.body[0].body.errors[0].code, 'multi.delete.failed');
          assert.strictEqual(error.body[1].status, 409);
          assert.strictEqual(error.object.body[1].body.errors[0].code, 'multi.delete.failed');
          expect([200, 202]).to.contain(error.body[2].status);
          assert.strictEqual(error.body[0].href, '/foos/7c85b45a-7ddd-11ec-8a3d-4742839ee2fd');
          assert.strictEqual(error.body[1].href, '/foos/cd6a4678-7dcf-11ec-b41e-0faad76b288d');
          assert.strictEqual(error.body[2].href, '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple');
        },
      );
    });

    it('batch with multi row delete and a constraint error + multi insert ', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, communityHamme);
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      // create a batch array
      const batch = [
        {
          href: `/persons/${keyp1}`,
          verb: 'PUT',
          body: p1,
        },
        {
          href: `/persons/${keyp2}`,
          verb: 'PUT',
          body: p2,
        },
        {
          href: '/foos/7c85b45a-7ddd-11ec-8a3d-4742839ee2fd',  // table foos has the constraint '"$$meta.deleted" != true' => constraint error
          verb: 'DELETE',
        },
        {
          href: '/foos/cd6a4678-7dcf-11ec-b41e-0faad76b288d',  // table foos has the constraint '"$$meta.deleted" != true' => constraint error
          verb: 'DELETE',
        },
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', batch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          // this is a multi delete for which one row fails -> sri4node cannot determine which rows failed
          // and all delete elements will receive a 409 error explaining this.
          expect([200, 202]).to.contain(error.body[0].status);
          expect([200, 202]).to.contain(error.body[1].status);
          assert.strictEqual(error.body[2].status, 409);
          assert.strictEqual(error.object.body[2].body.errors[0].code, 'multi.delete.failed');
          assert.strictEqual(error.body[3].status, 409);
          assert.strictEqual(error.object.body[3].body.errors[0].code, 'multi.delete.failed');
          assert.strictEqual(error.body[0].href, `/persons/${keyp1}`);
          assert.strictEqual(error.body[1].href, `/persons/${keyp2}`);
          assert.strictEqual(error.body[2].href, '/foos/7c85b45a-7ddd-11ec-8a3d-4742839ee2fd');
          assert.strictEqual(error.body[3].href, '/foos/cd6a4678-7dcf-11ec-b41e-0faad76b288d');
        },
      );
    });

    it('batch with multi row delete and a constraint error + multi insert (reverse order)', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, communityHamme);
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      // create a batch array
      const batch = [
        {
          href: '/foos/7c85b45a-7ddd-11ec-8a3d-4742839ee2fd', // table foos has the constraint '"$$meta.deleted" != true' => constraint error
          verb: 'DELETE',
        },
        {
          href: '/foos/cd6a4678-7dcf-11ec-b41e-0faad76b288d',  // table foos has the constraint '"$$meta.deleted" != true' => constraint error
          verb: 'DELETE',
        },
        {
          href: `/persons/${keyp1}`,
          verb: 'PUT',
          body: p1,
        },
        {
          href: `/persons/${keyp2}`,
          verb: 'PUT',
          body: p2,
        },
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', batch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          // this is a multi delete for which one row fails -> sri4node cannot determine which rows failed
          // and all delete elements will receive a 409 error explaining this.
          assert.strictEqual(error.body[0].status, 409);
          assert.strictEqual(error.object.body[0].body.errors[0].code, 'multi.delete.failed');
          assert.strictEqual(error.body[1].status, 409);
          assert.strictEqual(error.object.body[1].body.errors[0].code, 'multi.delete.failed');
          expect([200, 202]).to.contain(error.body[2].status);
          expect([200, 202]).to.contain(error.body[3].status);
          assert.strictEqual(error.body[0].href, '/foos/7c85b45a-7ddd-11ec-8a3d-4742839ee2fd');
          assert.strictEqual(error.body[1].href, '/foos/cd6a4678-7dcf-11ec-b41e-0faad76b288d');
          assert.strictEqual(error.body[2].href, `/persons/${keyp1}`);
          assert.strictEqual(error.body[3].href, `/persons/${keyp2}`);
        },
      );
    });

    it('batch with multi row insert and a constraint error + multi delete', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, '/communities/00000000-0000-0000-0000-000000000000'); // constraint error
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      // create a batch array
      const batch = [
        {
          href: `/persons/${keyp1}`,
          verb: 'PUT',
          body: p1,
        },
        {
          href: `/persons/${keyp2}`,
          verb: 'PUT',
          body: p2,
        },
        {
          href: '/cities/61003',
          verb: 'DELETE',
        },
        {
          href: '/cities/73001',
          verb: 'DELETE',
        },
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', batch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          // this is a multi insert for which one row fails -> sri4node cannot determine which rows failed
          // and all insert elements will receive a 409 error explaining this.
          assert.strictEqual(error.body[0].status, 409);
          assert.strictEqual(error.object.body[0].body.errors[0].code, 'multi.insert.failed');
          assert.strictEqual(error.body[1].status, 409);
          assert.strictEqual(error.object.body[1].body.errors[0].code, 'multi.insert.failed');
          expect([200, 202]).to.contain(error.body[2].status);
          expect([200, 202]).to.contain(error.body[3].status);
          assert.strictEqual(error.body[0].href, `/persons/${keyp1}`);
          assert.strictEqual(error.body[1].href, `/persons/${keyp2}`);
          assert.strictEqual(error.body[2].href, '/cities/61003');
          assert.strictEqual(error.body[3].href, '/cities/73001');
        },
      );
    });

    it('batch with multi row insert and a constraint error + multi delete (reverse order)', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, '/communities/00000000-0000-0000-0000-000000000000'); // ==> constraint error
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      // create a batch array
      const batch = [
        {
          href: '/cities/61003',
          verb: 'DELETE',
        },
        {
          href: '/cities/73001',
          verb: 'DELETE',
        },
        {
          href: `/persons/${keyp1}`,
          verb: 'PUT',
          body: p1,
        },
        {
          href: `/persons/${keyp2}`,
          verb: 'PUT',
          body: p2,
        },
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', batch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          // this is a multi insert for which one row fails -> sri4node cannot determine which rows failed
          // and all insert elements will receive a 409 error explaining this.
          expect([200, 202]).to.contain(error.body[0].status);
          expect([200, 202]).to.contain(error.body[1].status);
          assert.strictEqual(error.body[2].status, 409);
          assert.strictEqual(error.object.body[2].body.errors[0].code, 'multi.insert.failed');
          assert.strictEqual(error.body[3].status, 409);
          assert.strictEqual(error.object.body[3].body.errors[0].code, 'multi.insert.failed');
          assert.strictEqual(error.body[0].href, '/cities/61003');
          assert.strictEqual(error.body[1].href, '/cities/73001');
          assert.strictEqual(error.body[2].href, `/persons/${keyp1}`);
          assert.strictEqual(error.body[3].href, `/persons/${keyp2}`);
        },
      );
    });

    it('batch with multiple single updates with one constraint error', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, communityDendermonde);
      await doPut(`/persons/${keyp1}`, p1, sriClientOptionsAuthSabine);
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      await doPut(`/persons/${keyp2}`, p2, sriClientOptionsAuthSabine);
      p1.community.href = '/communities/00000000-0000-0000-0000-000000000000'; // ==> constraint error
      // create a batch array
      const batch = [
        [{
          href: `/persons/${keyp1}`,
          verb: 'PUT',
          body: p1,
        }],
        [{
          href: `/persons/${keyp2}`,
          verb: 'PUT',
          body: p2,
        }],
      ];

      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', batch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          assert.strictEqual(error.body[0].status, 409);
          assert.strictEqual(error.body[0].body.errors[0].code, 'db.constraint.violation');
          assert.strictEqual(error.body[1].status, 202);
        },
      );
    });

    it('batch with multi row update and a constraint error', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, communityDendermonde);
      await doPut(`/persons/${keyp1}`, p1, sriClientOptionsAuthSabine);
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      await doPut(`/persons/${keyp2}`, p2, sriClientOptionsAuthSabine);
      const keyp3 = uuid.v4();
      const p3 = generateRandomPerson(keyp3, communityDendermonde);
      await doPut(`/persons/${keyp3}`, p3, sriClientOptionsAuthSabine);

      p1.community.href = '/communities/00000000-0000-0000-0000-000000000000'; // ==> constraint error
      p2.community.href = communityHamme; // ==> valid update
      // create a batch array (2 updates and a similar reput)
      const batch = [
        {
          href: `/persons/${keyp1}`,
          verb: 'PUT',
          body: p1,
        },
        {
          href: `/persons/${keyp2}`,
          verb: 'PUT',
          body: p2,
        },
        {
          href: `/persons/${keyp3}`,
          verb: 'PUT',
          body: p3,
        },
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', batch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          // this is a multi update for which one row fails -> sri4node cannot determine which rows failed
          // and all update elements will receive a 409 error explaining this.
          assert.strictEqual(error.body[0].status, 409);
          assert.strictEqual(error.object.body[0].body.errors[0].code, 'multi.update.failed');
          assert.strictEqual(error.body[1].status, 409);
          assert.strictEqual(error.object.body[1].body.errors[0].code, 'multi.update.failed');
          assert.strictEqual(error.body[2].status, 202);
        },
      );
    });

    it('batch with multi delete', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, communityDendermonde);
      await doPut(`/persons/${keyp1}`, p1, sriClientOptionsAuthSabine);
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      await doPut(`/persons/${keyp2}`, p2, sriClientOptionsAuthSabine);

      // create a batch array
      const batch = [
        {
          href: `/persons/${keyp1}`,
          verb: 'DELETE',
        },
        {
          href: `/persons/${keyp2}`,
          verb: 'DELETE',
        },
      ];
      await doPut('/batch', batch, sriClientOptionsAuthSabine);
    });

    it('read-only batch with error should not be cancelled', async () => {
      // create a batch array
      const batch = [
        {
          href: '/persons/82565813-943e-4d1a-ac58-8b4cbc865bdb',
            // 'Steven Plas', community 'LETS Aalst-Oudenaarde' -> only persons from same community can be read
            //   ==> forbidden for Sabine from 'LETS Regio Dendermonde'
          verb: 'GET',
        },
        {
          href: '/cities/56001',
          verb: 'GET',
        },
        {
          href: '/cities/38002',
          verb: 'GET',
        },
        {
          href: '/cities/61003',
          verb: 'GET',
        },
        {
          href: '/cities/92003',
          verb: 'GET',
        },
        {
          href: '/cities/56001',
          verb: 'GET',
        },
      ];

      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', batch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          assert.strictEqual(error.body[0].status, 403);
          assert.strictEqual(error.body[1].status, 200);
          assert.strictEqual(error.body[2].status, 200);
          assert.strictEqual(error.body[3].status, 200);
          assert.strictEqual(error.body[4].status, 200);
          assert.strictEqual(error.body[5].status, 200);
        },
      );
    });

    it('read-only batch (chunked) with error should not be cancelled', async () => {
      // create a batch array
      const batch = [
        [{
          href: '/persons/82565813-943e-4d1a-ac58-8b4cbc865bdb',
            // 'Steven Plas', community 'LETS Aalst-Oudenaarde' -> only persons from same community can be read
            //   ==> forbidden for Sabine from 'LETS Regio Dendermonde'
          verb: 'GET',
        }],
        [{
          href: '/cities/56001',
          verb: 'GET',
        }],
        [{
          href: '/cities/38002',
          verb: 'GET',
        }],
        [{
          href: '/cities/61003',
          verb: 'GET',
        }],
        [{
          href: '/cities/92003',
          verb: 'GET',
        }],
        [{
          href: '/cities/56001',
          verb: 'GET',
        }],
      ];

      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', batch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          assert.strictEqual(error.body[0].status, 403);
          assert.strictEqual(error.body[1].status, 200);
          assert.strictEqual(error.body[2].status, 200);
          assert.strictEqual(error.body[3].status, 200);
          assert.strictEqual(error.body[4].status, 200);
          assert.strictEqual(error.body[5].status, 200);
        },
      );
    });

    it('batch with read and multi row create, re-put, update & delete', async () => {
      // in preparation for being able to do update, run a create batch first
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, communityHamme);
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      const keyp3 = uuid.v4();
      const p3 = generateRandomPerson(keyp3, communityHamme);
      const keyp4 = uuid.v4();
      const p4 = generateRandomPerson(keyp4, communityDendermonde);
      const keyp5 = uuid.v4();
      const p5 = generateRandomPerson(keyp5, communityDendermonde);
      const keyp6 = uuid.v4();
      const p6 = generateRandomPerson(keyp6, communityDendermonde);

      const batch = [
        {
          href: `/persons/${keyp1}`,
          verb: 'PUT',
          body: p1,
        },
        {
          href: `/persons/${keyp2}`,
          verb: 'PUT',
          body: p2,
        },
        {
          href: `/persons/${keyp3}`,
          verb: 'PUT',
          body: p3,
        },
        {
          href: `/persons/${keyp4}`,
          verb: 'PUT',
          body: p4,
        },
        {
          href: `/persons/${keyp5}`,
          verb: 'PUT',
          body: p5,
        },
        {
          href: `/persons/${keyp6}`,
          verb: 'PUT',
          body: p6,
        },
      ];
      await doPut('/batch', batch, sriClientOptionsAuthSabine);

      // create update batch with three updates (one will fail) and three re-puts
      const updateBatchPart = [ ...batch ];
      updateBatchPart[0].body.community.href = '/communities/00000000-0000-0000-0000-000000000000';  // ==> constraint error
      updateBatchPart[1].body.streetnumber = '18'; // will trigger an update
      updateBatchPart[2].body.streetnumber = '18'; // will trigger an update

      // inserts, one will fail
      const keyp11 = uuid.v4();
      const p11 = generateRandomPerson(keyp11, communityHamme);
      const keyp12 = uuid.v4();
      const p12 = generateRandomPerson(keyp12, communityHamme);
      const keyp13 = uuid.v4();
      const p13 = generateRandomPerson(keyp13, communityHamme);
      const keyp14 = uuid.v4();
      const p14 = generateRandomPerson(keyp14, communityHamme);
      const keyp15 = uuid.v4();
      const p15 = generateRandomPerson(keyp15, communityHamme);
      const keyp16 = uuid.v4();
      const p16 = generateRandomPerson(keyp16, communityHamme);
      const keyp17 = uuid.v4();
      const p17 = generateRandomPerson(keyp17, communityHamme);
      const keyp18 = uuid.v4();
      const p18 = generateRandomPerson(keyp18, '/communities/00000000-0000-0000-0000-000000000000'); // ==> constraint error

      // inserts of other type, will succeed
      const keyc1 = uuid.v4();
      const c1 = generateRandomCommunity(keyc1);
      const keyc2 = uuid.v4();
      const c2 = generateRandomCommunity(keyc2);
      const keyc3 = uuid.v4();
      const c3 = generateRandomCommunity(keyc3);
      const keyc4 = uuid.v4();
      const c4 = generateRandomCommunity(keyc4);
      const keyc5 = uuid.v4();
      const c5 = generateRandomCommunity(keyc5);
      const keyc6 = uuid.v4();
      const c6 = generateRandomCommunity(keyc6);


      const composedBatch = [
        // inserts
        {
          href: `/communities/${keyc1}`,
          verb: 'PUT',
          body: c1,
        },
        {
          href: `/communities/${keyc2}`,
          verb: 'PUT',
          body: c2,
        },
        {
          href: `/communities/${keyc3}`,
          verb: 'PUT',
          body: c3,
        },
        {
          href: `/communities/${keyc4}`,
          verb: 'PUT',
          body: c4,
        },
        {
          href: `/communities/${keyc5}`,
          verb: 'PUT',
          body: c5,
        },
        {
          href: `/communities/${keyc6}`,
          verb: 'PUT',
          body: c6,
        },

        {
          href: `/persons/${keyp11}`,
          verb: 'PUT',
          body: p11,
        },
        {
          href: `/persons/${keyp12}`,
          verb: 'PUT',
          body: p12,
        },
        {
          href: `/persons/${keyp13}`,
          verb: 'PUT',
          body: p13,
        },
        {
          href: `/persons/${keyp14}`,
          verb: 'PUT',
          body: p14,
        },
        {
          href: `/persons/${keyp15}`,
          verb: 'PUT',
          body: p15,
        },
        {
          href: `/persons/${keyp16}`,
          verb: 'PUT',
          body: p16,
        },
        {
          href: `/persons/${keyp17}`,
          verb: 'PUT',
          body: p17,
        },
        {
          href: `/persons/${keyp18}`,
          verb: 'PUT',
          body: p18,
        },
        // deletes
        {
          href: '/foos/7c85b45a-7ddd-11ec-8a3d-4742839ee2fd',  // table foos has the constraint '"$$meta.deleted" != true' => constraint error
          verb: 'DELETE',
        },
        {
          href: '/cities/52074',
          verb: 'DELETE',
        },
        {
           href: '/cities/52075', // does not exists
           verb: 'DELETE',
        },
        // gets
        {
          href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple',
          verb: 'GET',
        },
        {
          href: '/foos/7c85b45a-7ddd-11ec-8a3d-4742839ee2fd',
          verb: 'GET',
        },
        {
          href: '/foos/cd6a4678-7dcf-11ec-b41e-0faad76b288d',
          verb: 'GET',
        },
        // updates
        ...updateBatchPart,
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/batch', composedBatch, sriClientOptionsAuthSabine);
        },
        async (error) => {
          // console.log(error)
          // console.log(JSON.stringify(error, null, 2));
          assert.strictEqual(error.status, 409);
        },
      );
    });


  });
};
