// Utility methods for calling the SRI interface
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
const sriclientFactory = require('@kathondvla/sri-client/node-sri-client');

exports = module.exports = function (base, logverbose) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = sriclientFactory(sriClientConfig)
  const doGet = function() { return api.getRaw(...arguments) };

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('Order by', function () {
    describe('no specific order', function () {
      it('should sort LETS Aalst-Oudenaarde BEFORE LETS Zele', async function () {
        const response = await api.getList('/communities?orderBy=name')
        const names = response.map(r => r.name);

        assert(names.indexOf('LETS Aalst-Oudenaarde') < names.indexOf('LETS Zele'), 'Aalst occur before Zele');
      });
    });

    describe('descending', function () {
      it('should sort LETS Aalst-Oudenaarde BEFORE LETS Zele', async function () {
        const response = await api.getList('/communities?orderBy=name&descending=false')
        const names = response.map(r => r.name);

        assert(names.indexOf('LETS Aalst-Oudenaarde') < names.indexOf('LETS Zele'), 'Aalst occur before Zele');
      });
    });

    describe('ascending', function () {
      it('should sort LETS Aalst-Oudenaarde AFTER LETS Zele', async function () {
        const response = await api.getList('/communities?orderBy=name&descending=true')
        const names = response.map(r => r.name);

        assert(names.indexOf('LETS Aalst-Oudenaarde') > names.indexOf('LETS Zele'), 'Zele should occur before Aalst');
      });
    });
  });
};
