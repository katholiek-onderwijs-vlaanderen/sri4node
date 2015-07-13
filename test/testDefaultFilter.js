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
/*
  describe('Default Filter', function() {
    it('should support exact match.', function() {
      return doGet(base + '/alldatatypes?text=abc', function (response) {
        assert.equal(response.statusCode, 200);
      });
    };
  });*/
};
