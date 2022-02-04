// Utility methods for calling the SRI interface
import * as assert from 'assert';
import * as _ from 'lodash';

import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory from '../utils';

const sri4node = require('../..');
const alldatatypes = require('../context/alldatatypes')(sri4node, {});

export = module.exports = function (base) {
  const sriClientConfig = {
    baseUrl: base,
  };
  const api = sriClientFactory(sriClientConfig);

  const doGet = function (...args) { return api.getRaw(...args); };

  const utils = utilsFactory(api);
  const { makeBasicAuthHeader } = utils;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } };

  describe('Generic Filters', () => {
    describe('Invalid parameter (non existent)', () => {
      it('should return 404 - not found', async () => {
        await utils.testForStatusCode(
          async () => {
            await doGet('/alldatatypes?wrongParameter=multiple', null, authHdrObj);
          },
          (error) => {
            assert.equal(error.status, 404);
            assert.equal(error.body.errors[0].code, 'invalid.query.parameter');
            assert.equal(error.body.errors[0].parameter, 'wrongParameter');
            assert.equal(error.body.errors[0].type, 'ERROR');
          },
        );
      });

      it('should return the list of possible parameters', async () => {
        await utils.testForStatusCode(
          async () => {
            await doGet('/alldatatypes?wrongParameter=multiple', null, authHdrObj);
          },
          (error) => {
            assert.equal(error.status, 404);
            assert.equal(error.body.errors[0].code, 'invalid.query.parameter');
            assert.equal(error.body.errors[0].parameter, 'wrongParameter');
            assert.equal(error.body.errors[0].type, 'ERROR');

            const possibleParameters = [...new Set([
              ...Object.keys(alldatatypes.schema.properties),
              'key',
              '$$meta.deleted',
              '$$meta.modified',
              '$$meta.created',
              '$$meta.version',
            ])];

            assert.deepEqual(_.orderBy(error.body.errors[0].possibleParameters),
              _.orderBy(possibleParameters));
          },
        );
      });
    });
  });
};
