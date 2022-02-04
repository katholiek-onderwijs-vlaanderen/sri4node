// Utility methods for calling the SRI interface
var uuid = require('uuid');
var assert = require('assert');
import { debug } from '../js/common';

export = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function(...args) { return api.getRaw(...args) };
  const doPut = function(...args) { return api.put(...args) };

  const utils =  require('./utils')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;


  describe('JSONB support', function () {
    it('should allow reading JSON column as objects', async function () {
      const response = await doGet('/jsonb/10f00e9a-f953-488b-84fe-24b31ee9d504')
      debug('mocha', response);
      assert.equal(response.details.productDeliveryOptions[0].product,
                   '/store/products/f02a30b0-0bd9-49a3-9a14-3b71130b187c');
    });

    it('should support PUT with sub-objects', async function () {
      var key = uuid.v4();
      var x = {
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

      const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
      const responsePut = await doPut('/jsonb/' + key, x, { headers: { authorization: auth } })
      assert.equal(responsePut.getStatusCode(), 201);

      const responseGet = await doGet('/jsonb/' + key, null, { headers: { authorization: auth } })
      debug('mocha', typeof responseGet.details);
      if (typeof responseGet.details !== 'object') {
        assert.fail('should be object');
      }
    });
  });
};
