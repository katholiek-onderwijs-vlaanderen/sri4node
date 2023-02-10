// Utility methods for calling the SRI interface
import { assert } from 'chai';
import { THttpClient } from '../httpClient';

module.exports = function (httpClient: THttpClient) {
  describe('Relations Filters', () => {
    describe('Persons resource referenced has no type property', () => {
      it('should fail with error message', async () => {
        const response = await httpClient.get({ path: '/personrelations?toTypes=ADULT' });
        assert.equal(response.status, 409);
        assert.equal(response.body.errors[0].code, 'invalid.query.parameter');
      });
    });
  });
};
