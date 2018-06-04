// Utility methods for calling the SRI interface
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;

exports = module.exports = function (base, logverbose) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = api.get;

  const utils =  require('./utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;


  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('GET public list resource', function () {
    describe('without authentication', function () {
      it('should return a list of 4 communities', async function () {
        const response = await doGet('/communities')
        debug(response);
        if (!response.$$meta.count) {
          assert.fail();
        }
      });
    });

    describe('with authentication', function () {
      it('should return a list of 4 communities', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        const response = await doGet('/communities', null, { headers: { authorization: auth } })
        if (!response.$$meta.count) {
          assert.fail();
        }
      });
    });

    describe('with single value ?hrefs=...', function () {
      it('should work', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        const response = await doGet('/communities?hrefs=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d',
                                        null, { headers: { authorization: auth } })
        assert.equal(response.$$meta.count, 1);
        assert.equal(response.results[0].href, '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d');
      });
    });

    describe('with two values ?hrefs=...', function () {
      it('should work', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        const response = await doGet('/communities?hrefs=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d' +
                     ',/communities/6531e471-7514-43cc-9a19-a72cf6d27f4c',
                     null, { headers: { authorization: auth } })
        assert.equal(response.$$meta.count, 2);
        var hrefs = [response.results[0].href, response.results[1].href];
        if (hrefs.indexOf('/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d') === -1) {
          assert.fail();
        }
        if (hrefs.indexOf('/communities/6531e471-7514-43cc-9a19-a72cf6d27f4c') === -1) {
          assert.fail();
        }
      });
    });

    describe('GET public list resource', function () {
      describe('with unknown URL parameter', function () {
        it('should return 404 Not Found', async function () {
          await utils.testForStatusCode( 
            async () => {
              await doGet('/communities?invalidParam=abc')
            }, 
            (error) => {
              assert.equal(error.status, 404);
            })
        });
      });
    });
  });

  describe('GET private list resource', function () {
    describe('/persons without authentication', function () {
      it('should be 401 Unauthorized', async function () {
        await utils.testForStatusCode( 
          async () => {
            await doGet('/persons')
          }, 
          (error) => {
            assert.equal(error.status, 401);
          })
      });
    });

    describe('/persons with authentication', function () {
      it('should be 200 Ok', async function () {
        const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
        // Must restrict to the community of the user logged in (restictReadPersons enforces this)
        const response = await doGet('/persons?communities=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849',
                                      null, { headers: { authorization: auth } })
        if (!response.$$meta.count) {
          assert.fail();
        }
      });
    });
  });

  describe('URL parameters', function () {
    describe('that thow error', function () {
      it('should return 404 and the error message.', async function () {
        await utils.testForStatusCode( 
          async () => {
            await doGet('/communities?invalidQueryParameter=true')
          }, 
          (error) => {
            assert.equal(error.status, 404);
            assert.equal(error.body.errors[0].code, 'invalid.query.parameter');
          })
      });
    });

    describe('that were not configured', function () {
      it('should return 404 with code [invalid.query.parameter]', async function () {
        await utils.testForStatusCode( 
          async () => {
            await doGet('/communities?nonexistingparameter=x')
          }, 
          (error) => {
            assert.equal(error.status, 404);
            assert.equal(error.body.errors[0].code, 'invalid.query.parameter');
            assert.equal(error.body.errors[0].parameter, 'nonexistingparameter');            
          })
      });
    });

    describe('that use the database object', function () {
      it('should return correct results (no side-effects)', async function () {
        const response1 = await doGet('/communities?parameterWithExtraQuery=true&parameterWithExtraQuery2=true')
        // It should return none, we added NOT IN SELECT key FROM temptable
        // Where temptable was first filled to select all keys
        assert.equal(response1.$$meta.count, 0);
        // And do it again to check that it works more than once.
        const response2 = await doGet('/communities?parameterWithExtraQuery=true&parameterWithExtraQuery2=true')
        assert.equal(response2.$$meta.count, 0);
      });
    });
  });

  describe('escaping', function () {
    describe('should do proper escaping', function () {
      it('on table \'table\' and column \'from\'', async function () {
        const response = await doGet('/table')
        assert.equal(response.results[0].$$expanded.from, 'from-value');
        assert.equal(response.results[0].$$expanded.select, 'select-value');
      });
    });
  });

  describe('Paging', function () {

    it('should limit resources by default', async function () {
      const auth = makeBasicAuthHeader('kevin@email.be', 'pwd')
      const response = await doGet('/alldatatypes', null, { headers: { authorization: auth } })
      assert.equal(response.results.length, 5);
      assert.equal(response.$$meta.next, '/alldatatypes?offset=5');
    });

    it('should limit resources', async function () {
      const auth = makeBasicAuthHeader('kevin@email.be', 'pwd')
      const response = await doGet('/alldatatypes?limit=3', null, { headers: { authorization: auth } })
      assert.equal(response.results.length, 3);
      assert.equal(response.$$meta.next, '/alldatatypes?limit=3&offset=3');
    });

    it('should offset resources', async function () {
      const auth = makeBasicAuthHeader('kevin@email.be', 'pwd')
      const response = await doGet('/alldatatypes?offset=3', null, { headers: { authorization: auth } })
      assert.equal(response.results.length, 5);
      assert.equal(response.$$meta.previous, '/alldatatypes');
      assert.equal(response.results[0].$$expanded.id, 4);
    });

    it('should limit & offset resources', async function () {
      const auth = makeBasicAuthHeader('kevin@email.be', 'pwd')
      const response = await doGet('/alldatatypes?limit=3&offset=3', null, { headers: { authorization: auth } })
      assert.equal(response.results.length, 3);
      assert.equal(response.$$meta.next, '/alldatatypes?limit=3&offset=6');
      assert.equal(response.$$meta.previous, '/alldatatypes?limit=3');
      assert.equal(response.results.length, 3);
      assert.equal(response.results[0].$$expanded.id, 4);
    });

    it('should forbid a limit over the maximum', async function () {
      const auth = makeBasicAuthHeader('kevin@email.be', 'pwd')
      await utils.testForStatusCode( 
        async () => {
          await doGet('/alldatatypes?limit=100', null, { headers: { authorization: auth } })
        }, 
        (error) => {
          assert.equal(error.status, 409);
          assert.equal(error.body.errors[0].code, 'invalid.limit.parameter');
          assert.equal(error.body.errors[0].message, 'The maximum allowed limit is 50');      
        })
    });

    it('should allow unlimited resources with expand none', async function () {
      const auth = makeBasicAuthHeader('kevin@email.be', 'pwd')
      const response = await doGet('/alldatatypes?limit=*&expand=none', null, { headers: { authorization: auth } })
      assert.equal(response.results.length, 38);
    });

    it('should allow unlimited resources with expand NONE', async function () {
      const auth = makeBasicAuthHeader('kevin@email.be', 'pwd')
      const response = await doGet('/alldatatypes?limit=*&expand=NONE', null, { headers: { authorization: auth } })
      assert.equal(response.results.length, 38);
    });

    it('should forbid unlimited  resources with expand different to NONE', async function () {
      const auth = makeBasicAuthHeader('kevin@email.be', 'pwd')
      await utils.testForStatusCode( 
        async () => {
          await doGet('/alldatatypes?limit=*', null, { headers: { authorization: auth } })
        }, 
        (error) => {
          assert.equal(error.status, 409);
          assert.equal(error.body.errors[0].code, 'invalid.limit.parameter');
          assert.equal(error.body.errors[0].message, 'The maximum allowed limit is 50');      
        })
    });

    it('should propagate parameters in the next page', async function () {
      const auth = makeBasicAuthHeader('kevin@email.be', 'pwd')
      const response = await doGet('/alldatatypes?textContains=a&limit=2', null, { headers: { authorization: auth } })
      assert.equal(response.results.length, 2);
      assert.equal(response.$$meta.next, '/alldatatypes?textContains=a&limit=2&offset=2');
    });

    it('should propagate parameters in the previous page', async function () {
      const auth = makeBasicAuthHeader('kevin@email.be', 'pwd')
      const response = await doGet('/alldatatypes?textContains=a&limit=2&offset=2', null, { headers: { authorization: auth } })
      assert.equal(response.results.length, 1);
      assert.equal(response.$$meta.previous, '/alldatatypes?textContains=a&limit=2');
    });
  });
};
