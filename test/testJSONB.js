// Utility methods for calling the SRI interface
var uuid = require('node-uuid');
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var sriclient = require('sri4node-client');
var doGet = sriclient.get;
var doPut = sriclient.put;

exports = module.exports = function (base, logverbose) {
  'use strict';

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('JSONB support', function () {
    it('should allow reading JSON column as objects', function () {
      return doGet(base + '/jsonb/10f00e9a-f953-488b-84fe-24b31ee9d504').then(function (response) {
        debug(response.body);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.details.productDeliveryOptions[0].product,
                     '/store/products/f02a30b0-0bd9-49a3-9a14-3b71130b187c');
      });
    });

    it('should support PUT with sub-objects', function () {
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
        }
      };
      return doPut(base + '/jsonb/' + key, x, 'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        return doGet(base + '/jsonb/' + key, 'sabine@email.be', 'pwd');
      }).then(function (response) {
        debug(response.statusCode);
        debug(typeof response.body.details);
        assert.equal(response.statusCode, 200);
        if (typeof response.body.details !== 'object') {
          assert.fail('should be object');
        }
      });
    });
  });
};
