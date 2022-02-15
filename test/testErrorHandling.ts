// Utility methods for calling the SRI interface
import * as assert from 'assert';
import * as uuid from 'uuid';
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory from './utils';

export = module.exports = function (base) {
  const sriClientConfig = {
    baseUrl: base,
  };

  const api = sriClientFactory(sriClientConfig);

  const doGet = function (...args) { return api.getRaw(...args); };
  const doPut = function (...args) { return api.put(...args); };
  const doDelete = function (...args) { return api.delete(...args); };

  const utils = utilsFactory(api);
  const { makeBasicAuthHeader } = utils;

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
        await utils.testForStatusCode(
          async () => {
            const auth = makeBasicAuthHeader('daniella@email.be', 'pwd');
            await doGet('/persons/9abe4102-6a29-4978-991e-2a30655030e6', null, { headers: { authorization: auth }, maxAttempts: 1 });
          },
          (error) => {
            assert.equal(error.status, 500);
          },
        );
      });

      it('should return 403 (forbidden) when rejecting with an error object', async () => {
        await utils.testForStatusCode(
          async () => {
            const auth = makeBasicAuthHeader('ingrid@email.be', 'pwd');
            await doGet('/persons/9abe4102-6a29-4978-991e-2a30655030e6', null, { headers: { authorization: auth } });
          },
          (error) => {
            assert.equal(error.status, 403);
          },
        );
      });
    });

    describe('After Insert', () => {
      it('should return 500 (server error) when rejecting without an error object', async () => {
        await utils.testForStatusCode(
          async () => {
            const auth = makeBasicAuthHeader('daniella@email.be', 'pwd');
            await doPut(`/persons/${key}`, p, { headers: { authorization: auth }, maxAttempts: 1 });
          },
          (error) => {
            assert.equal(error.status, 500);
          },
        );
      });

      it('should return 403 (forbidden) when rejecting with an error object', async () => {
        await utils.testForStatusCode(
          async () => {
            const auth = makeBasicAuthHeader('ingrid@email.be', 'pwd');
            await doPut(`/persons/${key}`, p, { headers: { authorization: auth }, maxAttempts: 1 });
          },
          (error) => {
            assert.equal(error.status, 403);
          },
        );
      });
    });

    describe('After Update', () => {
      before(async () => {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd');
        await doPut(`/persons/${key}`, p, { headers: { authorization: auth } });
      });

      it('should return 500 (server error) when rejecting without an error object', async () => {
        await utils.testForStatusCode(
          async () => {
            const auth = makeBasicAuthHeader('daniella@email.be', 'pwd');
            await doPut(`/persons/${key}`, p, { headers: { authorization: auth }, maxAttempts: 1 });
          },
          (error) => {
            assert.equal(error.status, 500);
          },
        );
      });

      it('should return 403 (forbidden) when rejecting with an error object', async () => {
        await utils.testForStatusCode(
          async () => {
            const auth = makeBasicAuthHeader('ingrid@email.be', 'pwd');
            await doPut(`/persons/${key}`, p, { headers: { authorization: auth }, maxAttempts: 1 });
          },
          (error) => {
            assert.equal(error.status, 403);
          },
        );
      });
    });

    describe('After Delete', () => {
      const key2 = uuid.v4();
      const p2 = generateRandomPerson(key2, communityDendermonde);

      before(async () => {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd');
        await doPut(`/persons/${key2}`, p2, { headers: { authorization: auth } });
      });

      it('should return 500 (server error) when rejecting without an error object', async () => {
        await utils.testForStatusCode(
          async () => {
            const auth = makeBasicAuthHeader('daniella@email.be', 'pwd');
            await doDelete(`/persons/${key2}`, { headers: { authorization: auth }, maxAttempts: 1 });
          },
          (error) => {
            assert.equal(error.status, 500);
          },
        );
      });

      it('should return 403 (forbidden) when rejecting with an error object', async () => {
        await utils.testForStatusCode(
          async () => {
            const auth = makeBasicAuthHeader('ingrid@email.be', 'pwd');
            await doDelete(`/persons/${key2}`, { headers: { authorization: auth }, maxAttempts: 1 });
          },
          (error) => {
            assert.equal(error.status, 403);
          },
        );
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
    //         await doPut('/persons/' + key, p, { headers: { authorization: auth }, maxAttempts: 1  });
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
    //         await doPut('/batch', batch, { headers: { authorization: auth }, maxAttempts: 1 });
    //       },
    //       (error) => {
    //         assert.equal(error.status, 500);
    //       })
    //   });

    // });
  });
};
