import * as assert from 'assert';
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory, { debugLog } from './utils';

export = module.exports = function (base) {
  const sriClientConfig = {
    baseUrl: base,
  };
  const api = sriClientFactory(sriClientConfig);

  const doGet = function (...args) { return api.getRaw(...args); };

  const utils = utilsFactory(api);
  const { makeBasicAuthHeader } = utils;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('sabine@email.be', 'pwd') } };
  const authHdrObjKevin = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } };

  describe('Expansion', () => {
    // Test expand=none
    describe(' with "none" on list resources', () => {
      it('should succeed without $$expanded in results array.', async () => {
        const response = await doGet('/messages?expand=none', null, authHdrObj);
        if (response.results[0].$$expanded) {
          assert.fail('Expansion was performed !');
        }
        if (response.results[1].$$expanded) {
          assert.fail('Expansion was performed !');
        }
        if (response.results[2].$$expanded) {
          assert.fail('Expansion was performed !');
        }
      });
    });

    describe(' with "none" on list resources with \'addReferencingResources\' configured', () => {
      it('should succeed without $$expanded in results array.', async () => {
        const response = await doGet('/persons?expand=none&communities=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849', null, authHdrObj);
        if (response.results[0].$$expanded) {
          assert.fail('Expansion was performed !');
        }
      });
    });

    // Test expand=full on list resources (all elements href expanded)
    describe(' with "full" on list resources', () => {
      it('should succeed with $$expanded in results array.', async () => {
        const response = await doGet('/messages?expand=full', null, authHdrObj);
        if (!response.results[0].$$expanded) {
          assert.fail('Expansion was not performed !');
        }
        if (!response.results[1].$$expanded) {
          assert.fail('Expansion was not performed !');
        }
        if (!response.results[2].$$expanded) {
          assert.fail('Expansion was not performed !');
        }
      });
    });

    // Test expand=href on list resources
    describe(' with results on list resources', () => {
      it('should succeed with $$expanded in results array.', async () => {
        const response = await doGet('/messages?expand=results', null, authHdrObj);
        if (!response.results[0].$$expanded) {
          assert.fail('Expansion was not performed !');
        }
        if (!response.results[1].$$expanded) {
          assert.fail('Expansion was not performed !');
        }
        if (!response.results[2].$$expanded) {
          assert.fail('Expansion was not performed !');
        }
      });
    });

    // Test expand=community on regular message resource
    describe('on regular resources', () => {
      it('should succeed with $$expanded as result.', async () => {
        const response = await doGet('/messages/ad9ff799-7727-4193-a34a-09f3819c3479?expand=community', null, authHdrObj);
        assert.equal(response.$$meta.permalink, '/messages/ad9ff799-7727-4193-a34a-09f3819c3479');
        if (!response.community.$$expanded) {
          assert.fail('Expansion was not performed !');
        }
      });

      it('should fail due to secure function on expanded resource', async () => {
        await utils.testForStatusCode(
          async () => doGet('/messages/7f5f646c-8f0b-4ce6-97ce-8549b8b78234?expand=person', null, authHdrObj),
          (error) => {
            assert.equal(error.status, 403);
          },
        );
      });

      it('should succeed since the expanded resource is valid', async () => {
        await doGet('/messages/5a2747d4-ed99-4ceb-9058-8152e34f4cd5?expand=person', null, authHdrObjKevin);
      });

      /**
       * in context/communities.js, an afterRead function will disallow getting 1 single community
       * which is why this test should fail.
       */
      it('should fail since 1 of the expandeded chained resources will throw due to an afterRead function in communities', async () => {
        await utils.testForStatusCode(
          async () => doGet('/messages/5a2747d4-ed99-4ceb-9058-8152e34f4cd5?expand=person.community', null, authHdrObjKevin),
          (error) => {
            assert.equal(error.status, 403);
          },
        );
      });
    });

    // Test expand=results.href,results.href.community on lists of messages
    describe('on list resources', () => {
      it('should succeed with $$expanded as result.', async () => {
        const response = await doGet('/messages?limit=3&expand=results.community', null, authHdrObj);
        if (response.results[0].$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.results[1].$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.results[2].$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
      });

      it('should fail due to secure function on expanded resource', async () => {
        await utils.testForStatusCode(
          async () => doGet('/messages?expand=results.person', null, authHdrObj),
          (error) => {
            assert.equal(error.status, 403);
          },
        );
      });

      it('should succeed since the expanded resource is valid', async () => {
        await doGet('/messages?titleContains=Vervoer&expand=results.person', null, authHdrObjKevin);
      });

      it('should fail since 1 of the expandeded chained resources will throw due to an afterRead function in communities', async () => {
        await utils.testForStatusCode(
          async () => doGet('/messages?titleContains=Vervoer&expand=results.person.community', null, authHdrObjKevin),
          (error) => {
            assert.equal(error.status, 403);
          },
        );
      });
    });

    // Test expand=invalid send 404 Not Found.
    describe('with invalid', () => {
      it('should say \'not found\'.', async () => {
        await utils.testForStatusCode(
          async () => doGet('/messages/ad9ff799-7727-4193-a34a-09f3819c3479?expand=invalid', null, authHdrObj),
          (error) => {
            assert.equal(error.status, 404);
          },
        );
      });
    });

    // Test expand=results.href.community,results.href.person
    describe('on list resources', () => {
      it('should allow expanding multiple keys.', async () => {
        const response = await doGet('/messages?limit=3&expand=results.person,results.community', null, authHdrObj);
        if (response.results[0].$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.results[1].$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.results[2].$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.results[0].$$expanded.person.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.results[1].$$expanded.person.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.results[2].$$expanded.person.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
      });
    });

    describe('on list resource', () => {
      it('should have executed afterread on expanded resources.', async () => {
        const response = await doGet('/messages?limit=3&expand=results.person,results.community', null, authHdrObj);
        if (response.results[0].$$expanded.community.$$expanded === null
          || response.results[0].$$expanded.community.$$expanded === undefined) {
          assert.fail('Expansion was not performed !');
        }
        if (response.results[0].$$expanded.community.$$expanded.$$messagecount == null) {
          assert.fail('afterread was not executed on expanded resource !');
        }
      });
    });

    describe('with 2 level path (x.y)', () => {
      it('should expand recursively.', async () => {
        const response = await doGet('/messages?limit=3&expand=results.person.community,results.community', null, authHdrObj);
        if (response.results[0].$$expanded.community.$$expanded === null
          || response.results[0].$$expanded.community.$$expanded === undefined) {
          assert.fail('Expansion was not performed !');
        }
        if (response.results[0].$$expanded.person.$$expanded === null
          || response.results[0].$$expanded.person.$$expanded === undefined) {
          assert.fail('Expansion was not performed !');
        }
        if (response.results[0].$$expanded.person.$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
      });
    });

    describe(' on missing non-mandatory property', () => {
      it(' should result in null value for null value.', async () => {
        try {
          const response = await doGet('/store/products?expand=results.package2', null, authHdrObj);
          if (response.results[0].$$expanded.package2 === null) {
            assert.fail('Expansion was performed !');
          }
          if (response.results[3].$$expanded.package2 !== null) {
            assert.fail('Should be null !');
          }
        } catch (err) {
          debugLog(err.stack);
          throw err;
        }
      });
      it(' should result in null value for undefined.', async () => {
        const response = await doGet('/store/products?expand=results.package3', null, authHdrObj);
        if (response.results[0].$$expanded.package3 === null) {
          assert.fail('Expansion was performed !');
        }
        if (response.results[3].$$expanded.package3 !== undefined) {
          assert.fail('Should be undefined !');
        }
      });
    });
  });
};
