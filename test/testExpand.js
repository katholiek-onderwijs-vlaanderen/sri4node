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

  describe('Expansion', function () {
    // Test expand=none
    describe(' with "none" on list resources', function () {
      it('should succeed with $$expanded in results array.', function () {
        return doGet(base + '/messages?expand=none', 'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          if (response.body.results[0].$$expanded) {
            assert.fail('Expansion was performed !');
          }
          if (response.body.results[1].$$expanded) {
            assert.fail('Expansion was performed !');
          }
          if (response.body.results[2].$$expanded) {
            assert.fail('Expansion was performed !');
          }
        });
      });
    });

    // Test expand=full on list resources (all elements href expanded)
    describe(' with "full" on list resources', function () {
      it('should succeed with $$expanded in results array.', function () {
        return doGet(base + '/messages?expand=full', 'sabine@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            if (!response.body.results[0].$$expanded) {
              assert.fail('Expansion was not performed !');
            }
            if (!response.body.results[1].$$expanded) {
              assert.fail('Expansion was not performed !');
            }
            if (!response.body.results[2].$$expanded) {
              assert.fail('Expansion was not performed !');
            }
          });
      });
    });

    // Test expand=href on list resources
    describe(' with results on list resources', function () {
      it('should succeed with $$expanded in results array.', function () {
        return doGet(base + '/messages?expand=results', 'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          if (!response.body.results[0].$$expanded) {
            assert.fail('Expansion was not performed !');
          }
          if (!response.body.results[1].$$expanded) {
            assert.fail('Expansion was not performed !');
          }
          if (!response.body.results[2].$$expanded) {
            assert.fail('Expansion was not performed !');
          }
        });
      });
    });

    // Test expand=community on regular message resource
    describe('on regular resources', function () {
      it('should succeed with $$expanded as result.', function () {
        return doGet(base + '/messages/ad9ff799-7727-4193-a34a-09f3819c3479?expand=community',
          'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.permalink, '/messages/ad9ff799-7727-4193-a34a-09f3819c3479');
          if (!response.body.community.$$expanded) {
            assert.fail('Expansion was not performed !');
          }
        });
      });

      it('should fail due to secure function on expanded resource', function () {
        return doGet(base + '/messages/7f5f646c-8f0b-4ce6-97ce-8549b8b78234?expand=person',
          'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 403);
        });
      });
    });

    // Test expand=results.href,results.href.community on lists of messages
    describe('on list resources', function () {
      it('should succeed with $$expanded as result.', function () {
        return doGet(base + '/messages?expand=results.community', 'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          debug(response.body.results[0].$$expanded);
          if (response.body.results[0].$$expanded.community.$$expanded === null) {
            assert.fail('Expansion was not performed !');
          }
          if (response.body.results[1].$$expanded.community.$$expanded === null) {
            assert.fail('Expansion was not performed !');
          }
          if (response.body.results[2].$$expanded.community.$$expanded === null) {
            assert.fail('Expansion was not performed !');
          }
        });
      });

      it('should fail due to secure function on expanded resource', function () {
        return doGet(base + '/messages?expand=results.person',
          'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 403);
        });
      });
    });

    // Test expand=invalid send 404 Not Found.
    describe('with invalid', function () {
      it('should say \'not found\'.', function () {
        return doGet(base + '/messages/ad9ff799-7727-4193-a34a-09f3819c3479?expand=invalid',
          'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 404);
        });
      });
    });

    // Test expand=results.href.community,results.href.person
    describe('on list resources', function () {
      it('should allow expanding multiple keys.', function () {
        return doGet(base + '/messages?expand=results.person,results.community',
          'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          debug(response.body.results[0].$$expanded);
          if (response.body.results[0].$$expanded.community.$$expanded === null) {
            assert.fail('Expansion was not performed !');
          }
          if (response.body.results[1].$$expanded.community.$$expanded === null) {
            assert.fail('Expansion was not performed !');
          }
          if (response.body.results[2].$$expanded.community.$$expanded === null) {
            assert.fail('Expansion was not performed !');
          }
          if (response.body.results[0].$$expanded.person.$$expanded === null) {
            assert.fail('Expansion was not performed !');
          }
          if (response.body.results[1].$$expanded.person.$$expanded === null) {
            assert.fail('Expansion was not performed !');
          }
          if (response.body.results[2].$$expanded.person.$$expanded === null) {
            assert.fail('Expansion was not performed !');
          }
        });
      });
    });

    describe('on list resource', function () {
      it('should have executed afterread on expanded resources.', function () {
        return doGet(base + '/messages?expand=results.person,results.community',
          'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          if (response.body.results[0].$$expanded.community.$$expanded.$$messagecount == null) {
            assert.fail('afterread was not executed on expanded resource !');
          }
        });
      });
    });

    describe('with 2 level path (x.y)', function () {
      it('should expand recursively.', function () {
        return doGet(base + '/messages?expand=results.person.community,results.community',
          'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          if (response.body.results[0].$$expanded.community.$$expanded === null) {
            assert.fail('Expansion was not performed !');
          }
          if (response.body.results[0].$$expanded.person.$$expanded === null) {
            assert.fail('Expansion was not performed !');
          }
          if (response.body.results[0].$$expanded.person.$$expanded.community.$$expanded === null) {
            assert.fail('Expansion was not performed !');
          }
        });
      });
    });

  });
};
