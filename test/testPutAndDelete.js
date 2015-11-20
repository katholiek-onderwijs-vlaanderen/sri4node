// Utility methods for calling the SRI interface
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var sriclient = require('sri4node-client');
var doGet = sriclient.get;
var doPut = sriclient.put;
var doDelete = sriclient.delete;
var uuid = require('node-uuid');
var Q = require('q');

exports = module.exports = function (base, logverbose) {
  'use strict';
  var communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';
  var personSabine = '/persons/9abe4102-6a29-4978-991e-2a30655030e6';

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

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

  function generateRandomMessage(key, person, community) {
    return {
      person: {
        href: person
      },
      type: 'offer',
      title: 'new message',
      description: 'description for ' + key,
      amount: 1,
      unit: 'stuk',
      community: {
        href: community
      }
    };
  }

  function generateTransaction(key, permalinkFrom, permalinkTo, amount) {
    return {
      fromperson: {
        href: permalinkFrom
      },
      toperson: {
        href: permalinkTo
      },
      amount: amount,
      description: 'description for transaction ' + key
    };
  }


  describe('DELETE regular resource', function () {

    var key = uuid.v4();
    var body = generateRandomCommunity(key);

    before(function (done) {
      doPut(base + '/communities/' + key, body, 'sabine@email.be', 'pwd').then(function () {
        done();
      });
    });

    it('should be possible to delete a newly created resource', function () {
      return doDelete(base + '/communities/' + key, 'sabine@email.be', 'pwd').then(
        function (response) {
          assert.equal(response.statusCode, 200);
        }
      );
    });

    it('retrieving a deleted resource should return 410 - Gone', function () {
      return doGet(base + '/communities/' + key, 'sabine@email.be', 'pwd').then(
        function (response) {
          assert.equal(response.statusCode, 410);
        }
      );
    });

    it('deleting a deleted resource should return 410 - Gone', function () {
      return doDelete(base + '/communities/' + key, 'sabine@email.be', 'pwd').then(
        function (response) {
          assert.equal(response.statusCode, 410);
        }
      );
    });

    it('updating a deleted resource should return 410 - Gone', function () {
      return doPut(base + '/communities/' + key, body, 'sabine@email.be', 'pwd').then(
        function (response) {
          assert.equal(response.statusCode, 410);
        }
      );
    });

    it('retrieving a deleted resource with deleted=true should return the resource', function () {
      return doGet(base + '/communities/' + key + '?$$meta.deleted=true', 'sabine@email.be', 'pwd').then(
        function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.email, key + '@email.com');
          assert.equal(response.body.$$meta.deleted, true);
        }
      );
    });

    it('listing a deleted resource should not return it', function () {
      return doGet(base + '/communities?email=' + key + '@email.com', 'sabine@email.be', 'pwd').then(
        function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        }
      );
    });

    it('listing a deleted resource with deleted=true should return it only', function () {
      return doGet(base + '/communities?$$meta.deleted=true&email=' + key + '@email.com', 'sabine@email.be', 'pwd')
      .then(
        function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.email, key + '@email.com');
          assert.equal(response.body.results[0].$$expanded.$$meta.deleted, true);
        }
      );
    });

    it('listing a deleted resource with deleted=any should return everything', function () {
      return doGet(base + '/communities?$$meta.deleted=any&email=' + key + '@email.com', 'sabine@email.be', 'pwd')
      .then(
        function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.email, key + '@email.com');
          assert.equal(response.body.results[0].$$expanded.$$meta.deleted, true);
        }
      );
    });

    it('listing a deleted resource with deleted=false should not return it', function () {
      return doGet(base + '/communities?$$meta.deleted=false&email=' + key + '@email.com', 'sabine@email.be', 'pwd')
      .then(
        function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        }
      );
    });
  });

  describe('PUT', function () {
    describe('schema validation', function () {
      it('should detect if a field is too long', function () {
        var key = uuid.v4();
        var body = generateRandomCommunity(key);
        body.email = body.email + body.email + body.email;
        return doPut(base + '/communities/' + key, body, 'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 409);
        });
      });
    });

    describe('with rejecting custom validation function', function () {
      it('should return a 409 Conflict', function () {
        var key = uuid.v4();
        var body = generateRandomMessage(key, personSabine, communityDendermonde);
        return doPut(base + '/messages/' + key, body, 'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 409);
          assert.equal(response.body.errors[0].code, 'not.enough');
        });
      });
    });

    describe('with a missing field (community without name)', function () {
      it('should return a 409 Conflict', function () {
        var key = uuid.v4();
        var body = generateRandomCommunity(key);
        delete body.name;
        return doPut(base + '/communities/' + key, body, 'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 409);
          assert.equal(response.body.errors[0].code, 'requires.property.name');
        });
      });
    });
  });

  describe('afterupdate', function () {
    describe('should support', function () {
      it('multiple functions', function () {
        var keyp1 = uuid.v4();
        var keyp2, p2;
        var p1 = generateRandomPerson(keyp1, communityDendermonde);
        return doPut(base + '/persons/' + keyp1, p1, 'sabine@email.be', 'pwd').then(function (response) {
          debug(response);
          assert.equal(response.statusCode, 201);
          debug('p1 created');
          keyp2 = uuid.v4();
          p2 = generateRandomPerson(keyp2, communityDendermonde);
          return doPut(base + '/persons/' + keyp2, p2, 'sabine@email.be', 'pwd');
        }).then(function (response) {
          assert.equal(response.statusCode, 201);
          debug('p2 created');
          var keyt = uuid.v4();
          var t = generateTransaction(keyt, '/persons/' + keyp1, '/persons/' + keyp2, 20);
          return doPut(base + '/transactions/' + keyt, t, 'sabine@email.be', 'pwd');
        }).then(function (response) {
          debug(response.body);
          assert.equal(response.statusCode, 201);
          debug('t created');
          return doGet(base + '/persons/' + keyp1, 'sabine@email.be', 'pwd');
        }).then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.balance, -20);
          return doGet(base + '/persons/' + keyp2, 'sabine@email.be', 'pwd');
        }).then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.balance, 20);
        });
      });
    });
  });

  describe('PUT must distinguish between create (201) and update (200)', function () {

    var key = uuid.v4();
    var p = generateRandomPerson(key, communityDendermonde);

    it('must return 201 on a new resource', function () {
      return doPut(base + '/persons/' + key, p, 'sabine@email.be', 'pwd').then(function (response) {
        debug(response);
        assert.equal(response.statusCode, 201);
      });
    });

    it('must return 200 on an udpdate', function () {
      return doPut(base + '/persons/' + key, p, 'sabine@email.be', 'pwd').then(function (response) {
        debug(response);
        assert.equal(response.statusCode, 200);
      });
    });
  });

  describe('PUT of 100 items ', function() {
    it('should be allowed in parallel.', function() {
      var i,p,key;
      var promises = [];
      for(i=0; i<100; i++) {
        key = uuid.v4();
        p = generateRandomPerson(key, communityDendermonde);
        promises.push(doPut(base + '/persons/' + key, p, 'sabine@email.be', 'pwd'));
      }
      return Q.allSettled(promises).then(function (results) {
        for(i=0; i<100; i++) {
          assert.equal(results[i].state,'fulfilled'); 
        }
      });
    });
  });
};
