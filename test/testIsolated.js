// Utility methods for calling the SRI interface
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var sriclient = require('sri4node-client');
var doPut = sriclient.put;
var uuid = require('node-uuid');

exports = module.exports = function (base, logverbose) {
  'use strict';

  function generateRandomCommunity(key) {
    return {
      name: 'LETS ' + key,
      street: 'Leuvensesteenweg',
      streetnumber: '34',
      zipcode: '1040',
      city: 'Brussel',
      phone: '0492882277',
      email: key + '@email.com',
      adminpassword: 'secret',
      currencyname: 'pluimen'
    };
  }


  describe('with a missing field (community without name)', function () {
    it('should return a 409 Conflict', function () {
      var key = uuid.v4();
      var body = generateRandomCommunity(key);
      delete body.name;
      if (logverbose) {
        cl(body);
      }
      return doPut(base + '/communities/' + key, body, 'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 409);
      });
    });
  });
};
