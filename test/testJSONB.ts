// Utility methods for calling the SRI interface
import * as uuid from 'uuid';
import { assert } from 'chai';
import { debug } from '../js/common';
import { THttpClient } from './httpClient';

module.exports = function (httpClient: THttpClient) {

  describe('JSONB support', function () {
    it('should allow reading JSON column as objects', async function () {
      const response = await httpClient.get({ path: '/jsonb/10f00e9a-f953-488b-84fe-24b31ee9d504' });
      assert.equal(response.status, 200);
      debug('mocha', response.body);
      assert.equal(response.body.details.productDeliveryOptions[0].product,
                   '/store/products/f02a30b0-0bd9-49a3-9a14-3b71130b187c');
    });

    it('should support PUT with sub-objects', async function () {
      const key = uuid.v4();
      const x = {
        key: key,
        details: {
          productDeliveryOptions: [
            {
              product: '/store/products/f02a30b0-0bd9-49a3-9a14-3b71130b187c',
              deliveryOption: '/store/deliveryoptions/362c4fd7-42e1-4668-8cfc-a479cc8e374a'
            }
          ]
        },
        foo: { href: '/foo/00000000-0000-0000-0000-000000000000' }
      };

      const responsePut = await httpClient.put({ path: '/jsonb/' + key, body: x, auth: 'sabine' });
      assert.equal(responsePut.status, 201);

      const responseGet = await httpClient.get({ path: '/jsonb/' + key, auth: 'sabine' });
      assert.equal(responseGet.status, 200);
      debug('mocha', typeof responseGet.body.details);
      if (typeof responseGet.body.details !== 'object') {
        assert.fail('should be object');
      }
    });
  });
};
