// Utility methods for calling the SRI interface
var uuid = require('node-uuid');
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;

exports = module.exports = function (base, logverbose) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function() { return api.getRaw(...arguments) };
  const doPut = function() { return api.put(...arguments) };

  const utils =  require('./utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;


  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('JSONB support', function () {
    it('should allow reading JSON column as objects', async function () {
      const response = await doGet('/jsonb/10f00e9a-f953-488b-84fe-24b31ee9d504')
      debug(response);
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
      debug(typeof responseGet.details);
      if (typeof responseGet.details !== 'object') {
        assert.fail('should be object');
      }
    });
  });
};
