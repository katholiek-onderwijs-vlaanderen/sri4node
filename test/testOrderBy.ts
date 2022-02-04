// Utility methods for calling the SRI interface
var assert = require('assert');
import * as sriclientFactory from '@kathondvla/sri-client/node-sri-client';

export = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base,
    retry: {
      retries: 1,
    },
    timeout: 10000,
  }
  const api = sriclientFactory(sriClientConfig)


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
