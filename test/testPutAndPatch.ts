// Utility methods for calling the SRI interface
import * as pMap from 'p-map';
import * as assert from 'assert';
import * as uuid from 'uuid';
import { debug } from '../js/common';
import { THttpClient } from './httpClient';

module.exports = function (httpClient: THttpClient) {
  const communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';
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
      amount: 1,
      unit: 'stuk',
      community: {
        href: community,
      },
    };
  }

  function generateRandomAllDatatypes(key) {
    return {
      key,
      id: 40,
      numberbigserial: BigInt(40), // 40n,
      numberserial: 40,
      numbersmallserial: 40,
      text2: 'b2kx2rzb8q9',
    };
  }

  function generateTransaction(key, permalinkFrom, permalinkTo, amount) {
    return {
      key,
      fromperson: {
        href: permalinkFrom,
      },
      toperson: {
        href: permalinkTo,
      },
      amount,
      description: `description for transaction ${key}`,
    };
  }

  describe('PUT', () => {
    describe('schema validation', () => {
      it('should detect if a field is too long', async () => {
        const key = uuid.v4();
        const body = generateRandomCommunity(key);
        body.email = body.email + body.email + body.email;

        const response = await httpClient.put({ path: `/communities/${key}`, body, auth: 'sabine' });
        assert.equal(response.status, 409);
      });
    });

    describe('with rejecting custom validation function', () => {
      it('should return a 409 Conflict', async () => {
        const key = uuid.v4();
        const body = generateRandomMessage(key, personSabine, communityDendermonde);

        const response = await httpClient.put({ path: `/messages/${key}`, body, auth: 'sabine' });
        assert.equal(response.status, 409);
        assert.equal(response.body.errors[0].code, 'not.enough');
      });
    });

    describe('with a missing field (community without name)', () => {
      it('should return a 409 Conflict', async () => {
        const key = uuid.v4();
        const body = generateRandomCommunity(key);
        delete body.name;

        const response = await httpClient.put({ path: `/communities/${key}`, body, auth: 'sabine' });
        assert.equal(response.status, 409);
        assert.equal(response.body.errors[0].errors.validationErrors[0].code, 'must.have.required.property.name');
      });
    });

    describe('with a numeric value of 0', () => {
      it('should work and not skip 0 as a null value', async () => {
        const key = uuid.v4();
        const body = generateTransaction(key, '/persons/2f11714a-9c45-44d3-8cde-cd37eb0c048b', '/persons/9abe4102-6a29-4978-991e-2a30655030e6', 0);

        const response = await httpClient.put({ path: `/transactions/${key}`, body, auth: 'sabine' });
        assert.equal(response.status, 201);
      });
    });

    describe('with a float', () => {
      it('should work', async () => {
        const key = uuid.v4();
        const body = generateRandomAllDatatypes(key);
        body.id = 40.95;
        const response = await httpClient.put({ path: `/alldatatypes/${key}`, body, auth: 'sabine' });
        assert.equal(response.status, 201);
      });
    });
  });

  describe('VALIDATION', () => {
    describe('schema validation', () => {
      it('should detect if a field is too long', async () => {
            const key = uuid.v4();
            const body = generateRandomCommunity(key);
            body.email = body.email + body.email + body.email;

            const response = await httpClient.put({ path: `/communities/${key}?dryRun=true`, body, auth: 'sabine' });
            assert.equal(response.status, 409);
      });
    });

    describe('with rejecting custom validation function', () => {
      it('should return a 409 Conflict', async () => {
        const key = uuid.v4();
        const body = generateRandomMessage(key, personSabine, communityDendermonde);

        const response = await httpClient.put({ path: `/messages/${key}?dryRun=true`, body, auth: 'sabine' });
        assert.equal(response.status, 409);
        assert.equal(response.body.errors[0].code, 'not.enough');
      });
    });

    describe('with a missing field (community without name)', () => {
      it('should return a 409 Conflict', async () => {
        const key = uuid.v4();
        const body = generateRandomCommunity(key);
        delete body.name;

        const result = await httpClient.put({ path: `/communities/${key}?dryRun=true`, body, auth: 'sabine' });
        assert.equal(result.status, 409);
        assert.equal(result.body.errors[0].errors.validationErrors[0].code, 'must.have.required.property.name');
      });
    });

    describe('with a numeric value of 0', () => {
      it('should work and not skip 0 as a null value', async () => {
        const key = uuid.v4();
        const body = generateTransaction(key, '/persons/2f11714a-9c45-44d3-8cde-cd37eb0c048b', '/persons/9abe4102-6a29-4978-991e-2a30655030e6', 0);
        const response = await httpClient.put({ path: `/transactions/${key}?dryRun=true`, body, auth: 'sabine' });
        assert.equal(response.status, 201);
      });
    });

    describe('should have no side effects', () => {
      const key = uuid.v4();
      const person = generateRandomPerson(key, communityDendermonde, 'Rodrigo', 'Uroz');

      it('must return 201 on a new resource but the person must not be persisted', async () => {
        await httpClient.put({ path: `/persons/${key}?dryRun=true`, body: person, auth: 'sabine' });
        const response = await httpClient.get({ path: `/persons/${key}`, auth: 'sabine' });
        assert.equal(response.status, 404);
      });
    });
  });

  describe('afterupdate', () => {
    describe('should support', () => {
      it('multiple functions', async () => {
        const keyp1 = uuid.v4();
        const p1 = generateRandomPerson(keyp1, communityDendermonde);
        const responsePut1 = await httpClient.put({ path: `/persons/${keyp1}`, body: p1, auth: 'sabine' });
        assert.equal(responsePut1.status, 201);
        debug('mocha', 'p1 created');
        const keyp2 = uuid.v4();
        const p2 = generateRandomPerson(keyp2, communityDendermonde);
        const responsePut2 = await httpClient.put({ path: `/persons/${keyp2}`, body: p2, auth: 'sabine' });
        assert.equal(responsePut2.status, 201);
        debug('mocha', 'p2 created');
        const keyt = uuid.v4();
        const t = generateTransaction(keyt, `/persons/${keyp1}`, `/persons/${keyp2}`, 20);
        const responsePut3 = await httpClient.put({ path: `/transactions/${keyt}`, body: t, auth: 'sabine' });
        assert.equal(responsePut3.status, 201);
        debug('mocha', 't created');

        const responseGet1 = await httpClient.get({ path: `/persons/${keyp1}`, auth: 'sabine' });
        assert.equal(responseGet1.status, 200);
        assert.equal(responseGet1.body.balance, -20);
        const responseGet2 = await httpClient.get({ path: `/persons/${keyp2}`, auth: 'sabine' });
        assert.equal(responseGet2.status, 200);
        assert.equal(responseGet2.body.balance, 20);
      });
    });
  });

  describe('key in PUT ', () => {
    it('should return error in case of url and permalink mismatch', async () => {
      const keyp1 = uuid.v4();
      const keyp2 = uuid.v4();
      const p1 = generateRandomPerson(keyp1, communityDendermonde);
      const response = await httpClient.put({ path: `/persons/${keyp2}`, body: p1, auth: 'sabine' });
      assert.equal(response.status, 400);
      assert.equal(response.body.errors[0].code, 'key.mismatch');
    });

    it('should return error for invalid UUID', async () => {
      const keyp1 = 'invalid';
      const p1 = generateRandomPerson(keyp1, communityDendermonde);
      const response = await httpClient.put({ path: `/persons/${keyp1}`, body: p1, auth: 'sabine' });
      assert.equal(response.status, 409);
      assert.equal(response.body.errors[0].code, 'validation.errors');
      assert.equal(response.body.errors[0].errors.validationErrors[0].code.substring(0, 22), 'must.match.pattern');
    });
  });

  describe('permalink reference in PUT', () => {
    it('should return error in case of invalid UUID', async () => {
      const keyp = uuid.v4();
      const p = generateRandomPerson(keyp, '/communities/foo-bar');
      const response = await httpClient.put({ path: `/persons/${keyp}`, body: p, auth: 'sabine' });
      assert.equal(response.status, 409);
      assert.equal(response.body.errors[0].errors.validationErrors[0].code.substring(0, 22), 'must.match.pattern');
    });
  });

  describe('PUT (insert) resulting in foreign key error', () => {
    it('should return 409 conflict', async () => {
      const keyp = uuid.v4();
      const p = generateRandomPerson(keyp, '/communities/00000000-0000-0000-0000-000000000000');
      const response = await httpClient.put({ path: `/persons/${keyp}`, body: p, auth: 'sabine' });
      assert.equal(response.status, 409);
      assert.equal(response.body.errors[0].code, 'db.constraint.violation');
    });
  });

  describe('PUT (update) resulting in foreign key error', () => {
    it('should return 409 conflict', async () => {
      const keyp = uuid.v4();
      const p = generateRandomPerson(keyp, communityDendermonde);
      const responsePut1 = await httpClient.put({ path: `/persons/${keyp}`, body: p, auth: 'sabine' });
      assert.equal(responsePut1.status, 201);
      p.community.href = '/communities/00000000-0000-0000-0000-000000000000';
      const responsePut2 = await httpClient.put({ path: `/persons/${keyp}`, body: p, auth: 'sabine' });
      assert.equal(responsePut2.status, 409);
      assert.equal(responsePut2.body.errors[0].code, 'db.constraint.violation');
    });
  });

  describe('PUT must distinguish between create (201) and update (200)', () => {
    const key = uuid.v4();
    const p = generateRandomPerson(key, communityDendermonde);

    it('must return 201 on a new resource', async () => {
      const response = await httpClient.put({ path: `/persons/${key}`, body: p, auth: 'sabine' });
      debug('mocha', response.body);
      assert.equal(response.status, 201);
    });

    it('must return 200 on an update without changes', async () => {
      const response = await httpClient.put({ path: `/persons/${key}`, body: p, auth: 'sabine' });
      debug('mocha', response.body);
      assert.equal(response.status, 200);
    });

    it('must return 200 on an update with changes', async () => {
      const p1 = await httpClient.get({ path: `/persons/${key}`, auth: 'sabine' });
      p1.body.city = 'Borsbeek';
      const response = await httpClient.put({ path: `/persons/${key}`, body: p1.body, auth: 'sabine' });
      debug('mocha', response.body);
      assert.equal(response.status, 200);
      const p2 = await httpClient.get({ path: `/persons/${key}`, auth: 'sabine' });
      assert.notStrictEqual(p1.body.$$meta.modified, p2.body.$$meta.modified);
    });
  });

  describe('PUT of 100 items ', () => {
    it('should be allowed in parallel.', async () => {
      await pMap(
        Array(100),
        async () => {
          const key = uuid.v4();
          const person = generateRandomPerson(key, communityDendermonde);
          const response = await httpClient.put({ path: `/persons/${key}`, body: person, auth: 'sabine' });
          assert.equal(response.status, 201);
        },
        { concurrency: 100 },
      );
    });
  });

  // PATCH specific tests
  // TODO: finish them properly, right now they don't make sense
  describe('PATCH', () => {
    describe('PATCH resulting in foreign key error', () => {
      it('should return 409 conflict', async () => {
        const keyp = '692fa054-33ec-4a28-87eb-53df64e3d09d';
        const p = [{ op: 'replace', path: '/community/href', value: '/communities/00000000-0000-0000-0000-000000000000' }];
        const response = await httpClient.patch({ path: `/persons/${keyp}`, body: p, auth: 'sabine' });
        assert.equal(response.status, 409);
        assert.equal(response.body.errors[0].code, 'db.constraint.violation');
      });
    });

    describe('simple working PATCH', () => {
      it('should return 200 ok', async () => {
        const patch = [
          { op: 'replace', path: '/streetnumber', value: '5' },
          { op: 'add', path: '/streetbus', value: 'a' },
        ];
        const response = await httpClient.patch({ path: personSabine, body: patch, auth: 'sabine' });
        assert.equal(response.status, 200);
      });
      it('should be idempotent', async () => {
        const patch = [
          { op: 'replace', path: '/streetnumber', value: '5' },
          { op: 'add', path: '/streetbus', value: 'a' },
        ];
        const responsePatch1 = await httpClient.patch({ path: personSabine, body: patch, auth: 'sabine' });
        assert.equal(responsePatch1.status, 200);
        const patched = await httpClient.get({ path: personSabine, auth: 'sabine' });

        const responsePatch2 = await httpClient.patch({ path: personSabine, body: patch, auth: 'sabine' });
        assert.equal(responsePatch2.status, 200);
        const patched2 = await httpClient.get({ path: personSabine, auth: 'sabine' });

        assert.equal(patched.body.$$meta.modified, patched2.body.$$meta.modified);
      });
    });

    describe('PATCH causing schema failures', () => {
      it('should return 409 conflict because schema will fail', async () => {
        const patch = [
          { op: 'replace', path: '/community/href', value: 'INVALID' },
        ];
        const response = await httpClient.patch({ path: personSabine, body: patch, auth: 'sabine' });
        assert.equal(response.status, 409);
        assert.equal(response.body.errors[0].code, 'validation.errors');
      });
    });

    describe('PATCH with single object instead of array should fail', () => {
      it('should return 400 bad request', async () => {
        const patch = { op: 'replace', path: '/streetnumber', value: '5' };
        const response = await httpClient.patch({ path: personSabine, body: patch, auth: 'sabine' });
        assert.equal(response.status, 400);
        assert.equal(response.body.errors[0].code, 'patch.invalid');
      });
    });
  });
};
