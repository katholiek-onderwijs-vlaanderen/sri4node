// Utility methods for calling the SRI interface
import pMap from 'p-map';
import { assert } from 'chai';
import * as uuid from 'uuid';
import { THttpClient } from './httpClient';
const expect = require('expect.js')

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
module.exports = function (httpClient: THttpClient) {
  const communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';
  const communityHamme = '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d';
  const personSabine = '/persons/9abe4102-6a29-4978-991e-2a30655030e6';

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

      const response = await httpClient.put({ path:'/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 200);
      response.body.forEach((x) => assert.equal(x.status, 200));
    });

    it.skip('create community and immediately delete', async () => {
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

      const responsePut = await httpClient.put({ path:'/communities/batch', body: batch, auth: 'sabine' });
      assert.equal(responsePut.status, 201);

      // RESOURCE SHOULD BE GONE, but the way it's implemented now could be unpredictable (parallel)
      const responseGet = await httpClient.get({ path:communityHref, auth: 'sabine' });
      assert.equal(responseGet.status, 410);
      // assert.equal(responseGet.body.key, key);
      // assert.equal(responseGet.body.streetnumber, newStreetNumber);
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
      const response = await httpClient.put({ path:'/communities/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 201);
      assert.equal(response.body[0].href, `/communities/${key}`);
      assert.equal(response.body[0].verb, 'PUT');
      assert.equal(response.body[1].href, `/communities/${key}`);
      assert.equal(response.body[1].verb, 'DELETE');
    });

    it('single PATCH on existing person', async () => {
      const key = uuid.v4();
      const personHref = `/persons/${key}`;
      const body = generateRandomPerson(key, communityDendermonde, 'John', 'Doe');
      const newStreetNumber = '999';

      const responsePut1 = await httpClient.put({ path:personHref, body, auth: 'sabine' });
      assert.equal(responsePut1.status, 201);

      // create a batch array
      const batch = [
        {
          href: personHref,
          verb: 'PATCH',
          body: [{ op: 'replace', path: '/streetnumber', value: newStreetNumber }],
        },
      ];

      const responsePut2 = await httpClient.put({ path:'/persons/batch', body: batch, auth: 'sabine' });
      assert.equal(responsePut2.status, 200);
      responsePut2.body.forEach((x) => assert.equal(x.status, 200));

      const responseGet = await httpClient.get({ path:personHref, auth: 'sabine' });
      assert.equal(responseGet.body.key, key);
      assert.equal(responseGet.body.streetnumber, newStreetNumber);
    });

    it('2 consecutive PATCHes on existing person', async () => {
      const key = uuid.v4();
      const personHref = `/persons/${key}`;
      const body = generateRandomPerson(key, communityDendermonde, 'John', 'Doe');
      const newStreetNumber = '999';
      const newStreetBus = 'b';

      const responsePut1 = await httpClient.put({ path:personHref, body, auth: 'sabine' });
      assert.equal(responsePut1.status, 201);

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

      const responsePut2 = await httpClient.put({ path:'/persons/batch', body: batch, auth: 'sabine' });
      assert.equal(responsePut2.status, 200);
      responsePut2.body.forEach((x) => (x.status
        ? assert.equal(x.status, 200)
        : x.forEach((x) => assert.equal(x.status, 200))));

      const responseGet = await httpClient.get({ path:personHref, auth: 'sabine' });
      assert.equal(responseGet.body.key, key);
      assert.equal(responseGet.body.streetnumber, newStreetNumber, 'seems like the second patch operation on streetbus undid the previous patch on streetnumber');
      assert.equal(responseGet.body.streetbus, newStreetBus);
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

      const responsePut = await httpClient.put({ path:'/persons/batch', body: batch, auth: 'sabine' });
      assert.equal(responsePut.status, 201);
      responsePut.body.forEach((x) => (x.status
        ? assert.equal(true, x.status === 200 || x.status === 201)
        : x.forEach((x) => assert.equal(true, x.status === 200 || x.status === 201))));

      const responseGet = await httpClient.get({ path:personHref, auth: 'sabine' });
      assert.equal(responseGet.body.key, key);
      assert.equal(responseGet.body.streetnumber, newStreetNumber);
      assert.equal(responseGet.body.streetbus, newStreetBus);
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
      const reponsePut = await httpClient.put({ path: '/communities/batch', body: batch, auth: 'sabine' });
      // expected to fail because property 'name' is missing
      assert.equal(reponsePut.status, 409);
      assert.equal(reponsePut.body[1].body.errors[0].errors.validationErrors[0].code, 'must.have.required.property.name');

      const reponseGet = await httpClient.get({ path: `/communities/${keyC1}`, auth: 'sabine' });
      // expected to fail because this resource should have been rollbacked
      assert.equal(reponseGet.status, 404);
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
      const responsePut = await httpClient.put({ path: '/communities/batch', body: batch, auth: 'sabine' });
      // expected to fail: bodyC2 is missing required name
      assert.equal(responsePut.status, 409);
      assert.equal(responsePut.body[1].body.errors[0].errors.validationErrors[0].code, 'must.have.required.property.name');

      const responseGet = await httpClient.get({ path: `/communities/${keyC1}`, auth: 'sabine' });
      // expected to fail: should not be created but rollbacked
      assert.equal(responseGet.status, 404);
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
      const response = await httpClient.put({ path: '/communities/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 400);
      assert.equal(response.body.errors[0].code, 'no.verb');
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
      const response = await httpClient.put({ path: '/communities/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 400);
      assert.equal(response.body.errors[0].code, 'href.across.boundary');
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
      const response = await httpClient.put({ path: '/communities/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 409);
      assert.equal(response.body[0].body.errors[0].code, 'validation.errors');
      assert.equal(response.body[0].body.errors[0].errors.validationErrors[0].code, 'must.have.required.property.name');
      assert.equal(response.body[1].status, 202);
      assert.equal(response.body[1].body.errors[0].code, 'cancelled');
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
      const response = await httpClient.put({ path: '/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 404);
      assert.equal(response.body.errors[0].code, 'no.matching.route');
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

      const response = await httpClient.put({ path:'/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 201);
    });

    it('\'big\' batch', async () => {
      // create a batch array
      const batch = await pMap(
        Array(100),
        async () => {
          const keyC1 = uuid.v4();
          const bodyC1 = generateRandomCommunity(keyC1);
          return {
            href: `/communities/${keyC1}`,
            verb: 'PUT',
            body: bodyC1,
          };
        },
      );

      const response = await httpClient.put({ path:'/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 201);
    });

    it('\'big\' batch_streaming', async () => {
      // create a batch array
      const batch = await pMap(
        Array(1000),
        async () => {
          const keyC1 = uuid.v4();
          const bodyC1 = generateRandomCommunity(keyC1);
          return {
            href: `/communities/${keyC1}`,
            verb: 'PUT',
            body: bodyC1,
          };
        },
      );

      const response = await httpClient.put({ path:'/batch_streaming', body: batch, auth: 'sabine' });
      assert.equal(response.body.status, 201); // in streaming mode responsePut.status will always be 200 -> check response.body.status
    });

    it('\'big\' batch with sub-batches', async () => {
      // create a batch array
      const batch = await pMap(
        Array(100),
        async () => {
          const keyC1 = uuid.v4();
          const bodyC1 = generateRandomCommunity(keyC1);
          return [{
            href: `/communities/${keyC1}`,
            verb: 'PUT',
            body: bodyC1,
          }];
        },
      );

      const response = await httpClient.put({ path:'/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 201);
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
      const responsePut1 = await httpClient.put({ path:'/cities/batch', body: batch, auth: 'sabine' });
      assert.equal(responsePut1.status, 201);

      batch[0].body.name = 'Foobar';

      const responsePut2 = await httpClient.put({ path:'/cities/batch', body: batch, auth: 'sabine' });
      assert.equal(responsePut2.status, 200);
      assert.equal(responsePut2.body[0].status, 200);
      assert.equal(responsePut2.body[1].status, 200);
      assert.equal(responsePut2.body[2].status, 200);
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
      const responsePut = await httpClient.put({ path: '/batch', body: batch, auth: 'ingrid' });
      assert.equal(responsePut.status, 403);

      const responseGet = await httpClient.get({ path: '/cities/52074', auth: 'ingrid' });
      assert.equal(responseGet.status, 200);
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
      const responsePut = await httpClient.put({ path:'/batch_streaming', body: batch, auth: 'ingrid' });
      assert.equal(responsePut.body.status, 403); // in streaming mode responsePut.status will always be 200 -> check responsePut.body.status
      const responseGet = await httpClient.get({ path:'/cities/52074', auth: 'ingrid' });
      assert.equal(responseGet.status, 200);
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

      const response = await httpClient.put({ path: '/cities/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 400);
      assert.equal(response.body[3].status, 400);
      assert.strictEqual(response.body[3].body.errors[0].code, 'foo');
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
      const response = await httpClient.put({ path:'/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 201);
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

      const response = await httpClient.put({ path: '/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 409);
      assert.strictEqual(response.body[0].status, 409);
      assert.strictEqual(response.body[0].body.errors[0].code, 'db.constraint.violation');
      assert.strictEqual(response.body[1].status, 202);
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
      const response = await httpClient.put({ path: '/batch', body: batch, auth: 'sabine' });
      // this is a multi insert for which one row fails -> sri4node cannot determine which rows failed
      // and all insert elements will receive a 409 error explaining this.
      assert.equal(response.status, 409);
      assert.strictEqual(response.body[0].status, 409);
      assert.strictEqual(response.body[0].body.errors[0].code, 'multi.insert.failed');
      assert.strictEqual(response.body[1].status, 409);
      assert.strictEqual(response.body[1].body.errors[0].code, 'multi.insert.failed');
      expect([200, 202]).to.contain(response.body[2].status);
      assert.strictEqual(response.body[0].href, `/persons/${keyp1}`);
      assert.strictEqual(response.body[1].href, `/persons/${keyp2}`);
      assert.strictEqual(response.body[2].href, '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple');
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
      const response = await httpClient.put({ path: '/batch', body: batch2, auth: 'sabine' });
      // this is a multi insert for which one row fails -> sri4node cannot determine which rows failed
      // and all insert elements will receive a 409 error explaining this.
      expect([200, 202]).to.contain(response.body[0].status);
      assert.equal(response.status, 409);
      assert.strictEqual(response.body[1].status, 409);
      assert.strictEqual(response.body[1].body.errors[0].code, 'multi.insert.failed');
      assert.strictEqual(response.body[2].status, 409);
      assert.strictEqual(response.body[2].body.errors[0].code, 'multi.insert.failed');
      assert.strictEqual(response.body[0].href, '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple');
      assert.strictEqual(response.body[1].href, `/persons/${keyp2}`);
      assert.strictEqual(response.body[2].href, `/persons/${keyp1}`);
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
      const responsePut1 = await httpClient.put({ path:'/batch', body: batch, auth: 'sabine' });
      assert.equal(responsePut1.status, 201);

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
      const responsePut2 = await httpClient.put({ path: '/batch', body: updateBatch, auth: 'sabine' });
      // this is a multi update for which one row fails -> sri4node cannot determine which rows failed
      // and all update elements will receive a 409 error explaining this.
      assert.equal(responsePut2.status, 409);
      assert.strictEqual(responsePut2.body[0].status, 409);
      assert.strictEqual(responsePut2.body[0].body.errors[0].code, 'multi.update.failed');
      assert.strictEqual(responsePut2.body[1].status, 409);
      assert.strictEqual(responsePut2.body[1].body.errors[0].code, 'multi.update.failed');
      expect([200, 202]).to.contain(responsePut2.body[2].status);
      assert.strictEqual(responsePut2.body[0].href, `/persons/${keyp1}`);
      assert.strictEqual(responsePut2.body[1].href, `/persons/${keyp2}`);
      assert.strictEqual(responsePut2.body[2].href, '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple');
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
      const response = await httpClient.put({ path: '/batch', body: batch, auth: 'sabine' });
      // this is a multi delete for which one row fails -> sri4node cannot determine which rows failed
      // and all delete elements will receive a 409 error explaining this.
      assert.equal(response.status, 409);
      assert.strictEqual(response.body[0].status, 409);
      assert.strictEqual(response.body[0].body.errors[0].code, 'multi.delete.failed');
      assert.strictEqual(response.body[1].status, 409);
      assert.strictEqual(response.body[1].body.errors[0].code, 'multi.delete.failed');
      expect([200, 202]).to.contain(response.body[2].status);
      assert.strictEqual(response.body[0].href, '/foos/7c85b45a-7ddd-11ec-8a3d-4742839ee2fd');
      assert.strictEqual(response.body[1].href, '/foos/cd6a4678-7dcf-11ec-b41e-0faad76b288d');
      assert.strictEqual(response.body[2].href, '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple');
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
      const response = await httpClient.put({ path: '/batch', body: batch, auth: 'sabine' });
      // this is a multi delete for which one row fails -> sri4node cannot determine which rows failed
      // and all delete elements will receive a 409 error explaining this.
      assert.equal(response.status, 409);
      expect([200, 202]).to.contain(response.body[0].status);
      expect([200, 202]).to.contain(response.body[1].status);
      assert.strictEqual(response.body[2].status, 409);
      assert.strictEqual(response.body[2].body.errors[0].code, 'multi.delete.failed');
      assert.strictEqual(response.body[3].status, 409);
      assert.strictEqual(response.body[3].body.errors[0].code, 'multi.delete.failed');
      assert.strictEqual(response.body[0].href, `/persons/${keyp1}`);
      assert.strictEqual(response.body[1].href, `/persons/${keyp2}`);
      assert.strictEqual(response.body[2].href, '/foos/7c85b45a-7ddd-11ec-8a3d-4742839ee2fd');
      assert.strictEqual(response.body[3].href, '/foos/cd6a4678-7dcf-11ec-b41e-0faad76b288d');
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
      const response = await httpClient.put({ path: '/batch', body: batch, auth: 'sabine' });
      // this is a multi delete for which one row fails -> sri4node cannot determine which rows failed
      // and all delete elements will receive a 409 error explaining this.
      assert.equal(response.status, 409);
      assert.strictEqual(response.body[0].status, 409);
      assert.strictEqual(response.body[0].body.errors[0].code, 'multi.delete.failed');
      assert.strictEqual(response.body[1].status, 409);
      assert.strictEqual(response.body[1].body.errors[0].code, 'multi.delete.failed');
      expect([200, 202]).to.contain(response.body[2].status);
      expect([200, 202]).to.contain(response.body[3].status);
      assert.strictEqual(response.body[0].href, '/foos/7c85b45a-7ddd-11ec-8a3d-4742839ee2fd');
      assert.strictEqual(response.body[1].href, '/foos/cd6a4678-7dcf-11ec-b41e-0faad76b288d');
      assert.strictEqual(response.body[2].href, `/persons/${keyp1}`);
      assert.strictEqual(response.body[3].href, `/persons/${keyp2}`);
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
      const response = await httpClient.put({ path: '/batch', body: batch, auth: 'sabine' });
      // this is a multi insert for which one row fails -> sri4node cannot determine which rows failed
      // and all insert elements will receive a 409 error explaining this.
      assert.equal(response.status, 409);
      assert.strictEqual(response.body[0].status, 409);
      assert.strictEqual(response.body[0].body.errors[0].code, 'multi.insert.failed');
      assert.strictEqual(response.body[1].status, 409);
      assert.strictEqual(response.body[1].body.errors[0].code, 'multi.insert.failed');
      expect([200, 202]).to.contain(response.body[2].status);
      expect([200, 202]).to.contain(response.body[3].status);
      assert.strictEqual(response.body[0].href, `/persons/${keyp1}`);
      assert.strictEqual(response.body[1].href, `/persons/${keyp2}`);
      assert.strictEqual(response.body[2].href, '/cities/61003');
      assert.strictEqual(response.body[3].href, '/cities/73001');
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
      const response = await httpClient.put({ path: '/batch', body: batch, auth: 'sabine' });
      // this is a multi insert for which one row fails -> sri4node cannot determine which rows failed
      // and all insert elements will receive a 409 error explaining this.
      assert.equal(response.status, 409);
      expect([200, 202]).to.contain(response.body[0].status);
      expect([200, 202]).to.contain(response.body[1].status);
      assert.strictEqual(response.body[2].status, 409);
      assert.strictEqual(response.body[2].body.errors[0].code, 'multi.insert.failed');
      assert.strictEqual(response.body[3].status, 409);
      assert.strictEqual(response.body[3].body.errors[0].code, 'multi.insert.failed');
      assert.strictEqual(response.body[0].href, '/cities/61003');
      assert.strictEqual(response.body[1].href, '/cities/73001');
      assert.strictEqual(response.body[2].href, `/persons/${keyp1}`);
      assert.strictEqual(response.body[3].href, `/persons/${keyp2}`);
    });

    it('batch with multiple single updates with one constraint error', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, communityDendermonde);
      await httpClient.put({ path:`/persons/${keyp1}`, body: p1, auth: 'sabine' });
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      await httpClient.put({ path:`/persons/${keyp2}`, body: p2, auth: 'sabine' });
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

      const response = await httpClient.put({ path: '/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 409);
      assert.strictEqual(response.body[0].status, 409);
      assert.strictEqual(response.body[0].body.errors[0].code, 'db.constraint.violation');
      assert.strictEqual(response.body[1].status, 202);
    });

    it('batch with multi row update and a constraint error', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, communityDendermonde);
      await httpClient.put({ path:`/persons/${keyp1}`, body: p1, auth: 'sabine' });
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      await httpClient.put({ path:`/persons/${keyp2}`, body: p2, auth: 'sabine' });
      const keyp3 = uuid.v4();
      const p3 = generateRandomPerson(keyp3, communityDendermonde);
      await httpClient.put({ path:`/persons/${keyp3}`, body: p3, auth: 'sabine' });

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
      const response = await httpClient.put({ path: '/batch', body: batch, auth: 'sabine' });
      // this is a multi update for which one row fails -> sri4node cannot determine which rows failed
      // and all update elements will receive a 409 error explaining this.
      assert.equal(response.status, 409);
      assert.strictEqual(response.body[0].status, 409);
      assert.strictEqual(response.body[0].body.errors[0].code, 'multi.update.failed');
      assert.strictEqual(response.body[1].status, 409);
      assert.strictEqual(response.body[1].body.errors[0].code, 'multi.update.failed');
      assert.strictEqual(response.body[2].status, 202);
    });

    it('batch with multi delete', async () => {
      const keyp1 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, communityDendermonde);
      await httpClient.put({ path:`/persons/${keyp1}`, body: p1, auth: 'sabine' });
      const keyp2 = uuid.v4();
      const p2 = generateRandomPerson(keyp2, communityDendermonde);
      await httpClient.put({ path:`/persons/${keyp2}`, body: p2, auth: 'sabine' });

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
      const response = await httpClient.put({ path:'/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 200);
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

      const response = await httpClient.put({ path: '/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 403);
      assert.strictEqual(response.body[0].status, 403);
      assert.strictEqual(response.body[1].status, 200);
      assert.strictEqual(response.body[2].status, 200);
      assert.strictEqual(response.body[3].status, 200);
      assert.strictEqual(response.body[4].status, 200);
      assert.strictEqual(response.body[5].status, 200);
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

      const response = await httpClient.put({ path: '/batch', body: batch, auth: 'sabine' });
      assert.equal(response.status, 403);
      assert.strictEqual(response.body[0].status, 403);
      assert.strictEqual(response.body[1].status, 200);
      assert.strictEqual(response.body[2].status, 200);
      assert.strictEqual(response.body[3].status, 200);
      assert.strictEqual(response.body[4].status, 200);
      assert.strictEqual(response.body[5].status, 200);
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
      const responsePut1 = await httpClient.put({ path:'/batch', body: batch, auth: 'sabine' });
      assert.equal(responsePut1.status, 201);

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
      const responsePut2 = await httpClient.put({ path: '/batch', body: composedBatch, auth: 'sabine' });
      assert.strictEqual(responsePut2.status, 409);
    });


  });
};
