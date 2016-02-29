// Utility methods for calling the SRI interface
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base, logverbose) {
  'use strict';

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('GET public list resource', function () {
    describe('without authentication', function () {
      it('should return a list of 4 communities', function () {
        return doGet(base + '/communities').then(function (response) {
          assert.equal(response.statusCode, 200);
          debug(response.body);
          if (!response.body.$$meta.count) {
            assert.fail();
          }
        });
      });
    });

    describe('with authentication', function () {
      it('should return a list of 4 communities', function () {
        return doGet(base + '/communities', 'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          if (!response.body.$$meta.count) {
            assert.fail();
          }
        });
      });
    });

    describe('with single value ?hrefs=...', function () {
      it('should work', function () {
        return doGet(base + '/communities?hrefs=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d',
                     'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 1);
          assert.equal(response.body.results[0].href, '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d');
        });
      });
    });

    describe('with two values ?hrefs=...', function () {
      it('should work', function () {
        return doGet(base + '/communities?hrefs=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d' +
                     ',/communities/6531e471-7514-43cc-9a19-a72cf6d27f4c',
                     'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 2);
          var hrefs = [response.body.results[0].href, response.body.results[1].href];
          if (hrefs.indexOf('/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d') === -1) {
            assert.fail();
          }
          if (hrefs.indexOf('/communities/6531e471-7514-43cc-9a19-a72cf6d27f4c') === -1) {
            assert.fail();
          }
        });
      });
    });

    describe('GET public list resource', function () {
      describe('with unknown URL parameter', function () {
        it('should return 404 Not Found', function () {
          return doGet(base + '/communities?invalidParam=abc').then(function (response) {
            assert.equal(response.statusCode, 404);
          });
        });
      });
    });
  });

  describe('GET private list resource', function () {
    describe('/persons without authentication', function () {
      it('should be 401 Unauthorized', function () {
        return doGet(base + '/persons').then(function (response) {
          assert.equal(response.statusCode, 401);
        });
      });
    });

    describe('/persons with authentication', function () {
      it('should be 200 Ok', function () {
        // Must restrict to the community of the user logged in (restictReadPersons enforces this)
        return doGet(base + '/persons?communities=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849',
                     'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          if (!response.body.$$meta.count) {
            assert.fail();
          }
        });
      });
    });
  });

  describe('URL parameters', function () {
    describe('that reject their promise', function () {
      it('should return 404 and the error message.', function () {
        return doGet(base + '/communities?invalidQueryParameter=true').then(function (response) {
          assert.equal(response.statusCode, 404);
          debug(response.body);
          assert.equal(response.body.errors[0].code, 'invalid.query.parameter');
        });
      });
    });

    describe('that were not configured', function () {
      it('should return 404 with code [invalid.query.parameter]', function () {
        return doGet(base + '/communities?nonexistingparameter=x').then(function (response) {
          assert.equal(response.statusCode, 404);
          assert.equal(response.body.errors[0].code, 'invalid.query.parameter');
          assert.equal(response.body.errors[0].parameter, 'nonexistingparameter');
        });
      });
    });

    describe('that use the database object', function () {
      it('should return correct results (no side-effects)', function () {
        return doGet(base + '/communities?parameterWithExtraQuery=true&parameterWithExtraQuery2=true')
          .then(function (response) {
          assert.equal(response.statusCode, 200);
          // It should return none, we added NOT IN SELECT key FROM temptable
          // Where temptable was first filled to select all keys
          assert.equal(response.body.$$meta.count, 0);
          // And do it again to check that it works more than once.
          return doGet(base + '/communities?parameterWithExtraQuery=true&parameterWithExtraQuery2=true');
        }).then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 0);
        });
      });
    });
  });

  describe('escaping', function () {
    describe('should do proper escaping', function () {
      it('on table \'table\' and column \'from\'', function () {
        return doGet(base + '/table').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results[0].$$expanded.from, 'from-value');
          assert.equal(response.body.results[0].$$expanded.select, 'select-value');
        });
      });
    });
  });

  describe('Paging', function () {

    it('should limit resources by default', function () {
      return doGet(base + '/alldatatypes', 'kevin@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.results.length, 5);
        assert.equal(response.body.$$meta.next, '/alldatatypes?offset=5');
      });
    });

    it('should limit resources', function () {
      return doGet(base + '/alldatatypes?limit=3', 'kevin@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.results.length, 3);
        assert.equal(response.body.$$meta.next, '/alldatatypes?limit=3&offset=3');
      });
    });

    it('should offset resources', function () {
      return doGet(base + '/alldatatypes?offset=3', 'kevin@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.results.length, 5);
        assert.equal(response.body.$$meta.previous, '/alldatatypes');
        assert.equal(response.body.results[0].$$expanded.id, 4);
      });
    });

    it('should limit & offset resources', function () {
      return doGet(base + '/alldatatypes?limit=3&offset=3', 'kevin@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.results.length, 3);
        assert.equal(response.body.$$meta.next, '/alldatatypes?limit=3&offset=6');
        assert.equal(response.body.$$meta.previous, '/alldatatypes?limit=3');
        assert.equal(response.body.results.length, 3);
        assert.equal(response.body.results[0].$$expanded.id, 4);
      });
    });

    it('should forbid a limit over the maximum', function () {
      return doGet(base + '/alldatatypes?limit=100', 'kevin@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 409);
        assert.equal(response.body[0].code, 'invalid.limit.parameter');
        assert.equal(response.body[0].message, 'The maximum allowed limit is 50');
      });
    });

    it('should propagate parameters in the next page', function () {
      return doGet(base + '/alldatatypes?textContains=a&limit=2', 'kevin@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.results.length, 2);
        assert.equal(response.body.$$meta.next, '/alldatatypes?textContains=a&limit=2&offset=2');
      });
    });

    it('should propagate parameters in the previous page', function () {
      return doGet(base + '/alldatatypes?textContains=a&limit=2&offset=2', 'kevin@email.be', 'pwd')
      .then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.results.length, 1);
        assert.equal(response.body.$$meta.previous, '/alldatatypes?textContains=a&limit=2');
      });
    });
  });
};
