// Utility methods for calling the SRI interface
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var sriclient = require('@kathondvla/sri-client/node-sri-client');

exports = module.exports = function (base, logverbose) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = api.get;

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('Order by', function () {
    describe('no specific order', function () {
      it('should sort LETS Aalst-Oudenaarde BEFORE LETS Zele', async function () {
        const response = await doGet('/communities?orderBy=name')
        var names = [];
        var i, c;
        debug(response);

        for (i = 0; i < response.results.length; i++) {
          c = response.results[i];
          names.push(c.$$expanded.name);
        }

        assert(names.indexOf('LETS Aalst-Oudenaarde') < names.indexOf('LETS Zele'), 'Aalst occur before Zele');
      });
    });

    describe('no specific order', function () {
      it('should sort LETS Aalst-Oudenaarde BEFORE LETS Zele', async function () {
        const response = await doGet('/communities?orderBy=name&descending=false')
        var names = [];
        var i, c;
        debug(response);

        for (i = 0; i < response.results.length; i++) {
          c = response.results[i];
          names.push(c.$$expanded.name);
        }
        assert(names.indexOf('LETS Aalst-Oudenaarde') < names.indexOf('LETS Zele'), 'Aalst occur before Zele');
      });
    });

    describe('ascending', function () {
      it('should sort LETS Aalst-Oudenaarde AFTER LETS Zele', async function () {
        const response = await doGet('/communities?orderBy=name&descending=true')
        var names = [];
        var i, c;
        debug(response);

        for (i = 0; i < response.results.length; i++) {
          c = response.results[i];
          names.push(c.$$expanded.name);
        }

        assert(names.indexOf('LETS Aalst-Oudenaarde') > names.indexOf('LETS Zele'), 'Zele should occur before Aalst');
      });
    });
  });
};
