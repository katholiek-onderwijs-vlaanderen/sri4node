// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doPut = sriclient.put;
var uuid = require('node-uuid');
var Q = require('q');

exports = module.exports = function (base) {
  'use strict';

  var communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';

  function generateRandomPerson(key, communityPermalink) {
    return {
      firstname: 'Sabine',
      lastname: 'Eeckhout',
      street: 'Stationstraat',
      streetnumber: '17',
      zipcode: '9280',
      city: 'Lebbeke',
      phone: '0492882277',
      email: key + '@email.com',
      balance: 0,
      mail4elas: 'weekly',
      community: {
        href: communityPermalink
      }
    };
  }

  describe('PUT of 100 items ', function () {
    it('should be allowed in parallel.', function () {
      var i, p, key;
      var promises = [];
      for (i = 0; i < 100; i++) {
        key = uuid.v4();
        p = generateRandomPerson(key, communityDendermonde);
        promises.push(doPut(base + '/persons/' + key, p, 'sabine@email.be', 'pwd'));
      }
      return Q.allSettled(promises).then(function (results) {
        for (i = 0; i < 100; i++) {
          assert.equal(results[i].state, 'fulfilled');
        }
      });
    });
  });
};
