var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var uuid = require('node-uuid');
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

  function generateRandomProduct(key, packageKey) {
    return {
      key: key,
      name: 'Traussers',
      category: 'Cloth',
      package: {
        href: '/store/packages/' + packageKey
      }
    };
  }

  // Will use resources products and packages which are configured with types: /store/products and /store/packages
  describe('Combined resource type', function () {

    describe(' get by "key" on resource with references', function () {
      it('should succeed with correct referenced link.', function () {
        return doGet(base + '/store/products/1edb2754-5684-1234-ae5b-ec33c903ee4d', 'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.package.href, '/store/packages/1edb2754-5684-4996-ae5b-ec33c903ee4d');
        });
      });
    });

    describe(' put new resource with references', function () {
      it('should succeed with correct referenced link.', function () {
        var key = uuid.v4();
        var packageKey = '2edb2754-1598-4996-ae5b-ec33c903ee4d';
        var body = generateRandomProduct(key, packageKey);
        return doPut(base + '/store/products/' + key, body, 'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 201);
          assert.equal(response.body, true);
        });
      });
    });
  });

  // Will use resources persons and communities which are configured with types: /persons and /communities
  describe('Simple resource type', function () {

    // Test basic resource get
    describe(' get by "key" on resource with references', function () {
      it('should succeed with correct referenced link.', function () {
        return doGet(base + '/persons/9abe4102-6a29-4978-991e-2a30655030e6', 'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.community.href, '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849');
        });
      });
    });
  });
};
