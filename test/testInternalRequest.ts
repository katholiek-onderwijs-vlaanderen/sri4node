// Utility methods for calling the SRI interface
import assert from 'assert';
import { THttpClient } from './httpClient';

module.exports = function (httpClient: THttpClient) {

  describe('test call via internal interface on protected resource', () => {
    describe('without authentication', () => {
      it('should fail', async () => {
        const response = await httpClient.get({ path: '/communities/customroute_via_internal_interface' });
        assert.equal(response.status, 401);
      });
    });

    describe('with authentication', () => {
      it('should return resource', async () => {
        const response = await httpClient.get({ path: '/communities/customroute_via_internal_interface', auth: 'kevin' });
        assert.equal(response.status, 200);
        assert.equal(response.body.firstname, 'Kevin');
      });
    });
  });
};
