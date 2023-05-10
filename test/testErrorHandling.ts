// Utility methods for calling the SRI interface
import assert from 'assert';
import * as uuid from 'uuid';
import { THttpClient } from './httpClient';

module.exports = function (httpClient: THttpClient) {

  const communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';

  function generateRandomPerson(key, communityPermalink) {
    return {
      firstname: 'Sabine',
      lastname: 'Eeckhout',
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

  describe('Error handling', () => {
    const key = uuid.v4();
    const p = generateRandomPerson(key, communityDendermonde);

    describe('After Read', () => {
      it('should return 500 (server error) when rejecting without an error object', async () => {
        const response = await httpClient.get({ path: '/persons/9abe4102-6a29-4978-991e-2a30655030e6', auth: 'daniella' });
        assert.equal(response.status, 500);
      });

      it('should return 403 (forbidden) when rejecting with an error object', async () => {
        const response = await httpClient.get({ path: '/persons/9abe4102-6a29-4978-991e-2a30655030e6', auth: 'ingrid' });
        assert.equal(response.status, 403);
      });
    });

    describe('After Insert', () => {
      it('should return 500 (server error) when rejecting without an error object', async () => {
        const response = await httpClient.put({ path: `/persons/${key}`, body: p, auth: 'daniella' });
        assert.equal(response.status, 500);
      });

      it('should return 403 (forbidden) when rejecting with an error object', async () => {
        const response = await httpClient.put({ path: `/persons/${key}`, body: p, auth: 'ingrid' });
        assert.equal(response.status, 403);
      });
    });

    describe('After Update', () => {
      before(async () => {
        const response = await httpClient.put({ path: `/persons/${key}`, body: p, auth: 'sabine' });
        assert.equal(response.status, 201);
      });

      it('should return 500 (server error) when rejecting without an error object', async () => {
        const response = await httpClient.put({ path: `/persons/${key}`, body: p, auth: 'daniella' });
        assert.equal(response.status, 500);
      });

      it('should return 403 (forbidden) when rejecting with an error object', async () => {
        const response = await httpClient.put({ path: `/persons/${key}`, body: p, auth: 'ingrid' });
        assert.equal(response.status, 403);
      });
    });

    describe('After Delete', () => {
      const key2 = uuid.v4();
      const p2 = generateRandomPerson(key2, communityDendermonde);

      before(async () => {
        const response = await httpClient.put({ path: `/persons/${key2}`, body: p2, auth: 'sabine' });
        assert.equal(response.status, 201);
      });

      it('should return 500 (server error) when rejecting without an error object', async () => {
        const response = await httpClient.delete({ path: `/persons/${key2}`, auth: 'daniella' });
        assert.equal(response.status, 500);
      });

      it('should return 403 (forbidden) when rejecting with an error object', async () => {
        const response = await httpClient.delete({ path: `/persons/${key2}`, auth: 'ingrid' });
        assert.equal(response.status, 403);
      });
    });

    // TODO: find another way to trigger an SQL error as duplicates generate now a 409 conflict
    // describe('SQL error ', function () {

    //   const key = uuid.v4();
    //   const p = generateRandomPerson(key, communityDendermonde);
    //   p.email = 'sabine@email.be';

    //   it('should return 500 (server error) [regular request]', async function () {
    //     await utils.testForStatusCode(
    //       async () => {
    //         const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
    //         await httpClient.put({ path:'/persons/' + key, p, { headers: { authorization: auth }, maxAttempts: 1  });
    //       },
    //       (error) => {
    //         assert.equal(error.status, 500);
    //       })
    //   });

    //   it('should return 500 (server error) [batch request]', async function () {
    //     const batch = [
    //         { "href": '/persons/' + key
    //         , "verb": "PUT"
    //         , "body": p
    //         }]

    //     await utils.testForStatusCode(
    //       async () => {
    //         const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
    //         await httpClient.put({ path:'/batch', batch, { headers: { authorization: auth }, maxAttempts: 1 });
    //       },
    //       (error) => {
    //         assert.equal(error.status, 500);
    //       })
    //   });

    // });
  });
};
