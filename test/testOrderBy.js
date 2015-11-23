// Utility methods for calling the SRI interface
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var sriclient = require('sri4node-client');
var doGet = sriclient.get;
var needle = require('needle');
var Q = require('q');

exports = module.exports = function (base, logverbose) {
  'use strict';

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('Order by', function () {
    describe('no specific order', function () {
      it('should sort LETS Aalst-Oudenaarde BEFORE LETS Zele', function () {
        return doGet(base + '/communities?orderBy=name').then(function (response) {
          var names = [];
          var i,c;
          debug(response.body);
          assert.equal(response.statusCode, 200);
          
          for(i=0; i<response.body.results.length; i++) {
            c = response.body.results[i];
            names.push(c.$$expanded.name);
          }
          
          assert(names.indexOf('LETS Aalst-Oudenaarde') < names.indexOf('LETS Zele'), 'Aalst occur before Zele');
        });
      });
    });
    
    describe('no specific order', function () {
      it('should sort LETS Aalst-Oudenaarde BEFORE LETS Zele', function () {
        return doGet(base + '/communities?orderBy=name&descending=false').then(function (response) {
          var names = [];
          var i,c;
          debug(response.body);
          assert.equal(response.statusCode, 200);
          
          for(i=0; i<response.body.results.length; i++) {
            c = response.body.results[i];
            names.push(c.$$expanded.name);
          }
          
          assert(names.indexOf('LETS Aalst-Oudenaarde') < names.indexOf('LETS Zele'), 'Aalst occur before Zele');
        });
      });
    });
    
    describe('ascending', function () {
      it('should sort LETS Aalst-Oudenaarde AFTER LETS Zele', function () {
        return doGet(base + '/communities?orderBy=name&descending=true').then(function (response) {
          var names = [];
          var i,c;
          debug(response.body);
          assert.equal(response.statusCode, 200);
          
          for(i=0; i<response.body.results.length; i++) {
            c = response.body.results[i];
            names.push(c.$$expanded.name);
          }
          
          assert(names.indexOf('LETS Aalst-Oudenaarde') > names.indexOf('LETS Zele'), 'Zele should occur before Aalst');
        });
      });
    });
  });
};
