// Utility methods for calling the SRI interface
var assert = require('assert');
var _ = require('lodash');
var common = require('../js/common.js');
var cl = common.cl;

exports = module.exports = function (base, logverbose) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function() { return api.getRaw(...arguments) };

  const utils =  require('./utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;

  const sriClientOptionsAuthSabine = {
    headers: { authorization: makeBasicAuthHeader('sabine@email.be', 'pwd') }
  }
  const sriClientOptionsAuthKevin = {
    headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') }
  }


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
        const response = await doGet('/communities', null, sriClientOptionsAuthSabine)
        if (!response.$$meta.count) {
          assert.fail();
        }
      });
    });

    describe('with single value ?hrefs=...', function () {
      it('should work', async function () {
        const response = await doGet('/communities?hrefs=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d',
                                        null, sriClientOptionsAuthSabine)
        assert.equal(response.$$meta.count, 1);
        assert.equal(response.results[0].href, '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d');
      });
    });

    describe('with two values ?hrefs=...', function () {
      it('should work', async function () {
        const response = await doGet('/communities?hrefs=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d' +
                     ',/communities/6531e471-7514-43cc-9a19-a72cf6d27f4c',
                     null, sriClientOptionsAuthSabine)
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
        // Must restrict to the community of the user logged in (restictReadPersons enforces this)
        const response = await doGet('/persons?communities=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849',
                                      null, sriClientOptionsAuthSabine)
        if (!response.results.length > 0) {
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

    // test does not work anymore and is not relevant anymore as a list query get a db task 
    // (instead of db transaction) which cannot be used to write to the database
  //   describe('that use the database object', function () {
  //     it('should return correct results (no side-effects)', async function () {
  //       const response1 = await doGet('/communities?parameterWithExtraQuery=true&parameterWithExtraQuery2=true')
  //       // It should return none, we added NOT IN SELECT key FROM temptable
  //       // Where temptable was first filled to select all keys
  //       assert.equal(response1.$$meta.count, 0);
  //       // And do it again to check that it works more than once.
  //       const response2 = await doGet('/communities?parameterWithExtraQuery=true&parameterWithExtraQuery2=true')
  //       assert.equal(response2.$$meta.count, 0);
  //     });
  //   });

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

    it('should offset resources', async function () {
      const response = await doGet('/alldatatypes?offset=3', null, sriClientOptionsAuthKevin)
      assert.equal(response.results[0].$$expanded.id, 4);
    });

    it('should limit resources by default', async function () {
      const response = await doGet('/alldatatypes', null, sriClientOptionsAuthKevin)
      assert.equal(response.results.length, 5);
      assert.equal(response.$$meta.next.startsWith('/alldatatypes?keyOffset'), true );
    });

    it('should limit resources', async function () {
      const response = await doGet('/alldatatypes?limit=3', null, sriClientOptionsAuthKevin)
      assert.equal(response.results.length, 3);
      assert.equal(response.$$meta.next.startsWith('/alldatatypes?limit=3&keyOffset'), true );
    });

    it('should use key of last value in the resultlist as key offset', async function () {
      const response = await doGet('/alldatatypes', null, sriClientOptionsAuthKevin)
      assert.equal(response.$$meta.next.endsWith(encodeURIComponent(response.results[4].$$expanded.$$meta.created)
                                                  + ',' + response.results[4].$$expanded.key), true );
    });

    it('should use key of last value in the resultlist as key offset (descending)', async function () {
      const response = await doGet('/alldatatypes?descending=true', null, sriClientOptionsAuthKevin)
      assert.equal(response.$$meta.next.endsWith(encodeURIComponent(response.results[4].$$expanded.$$meta.created)
                                                  + ',' + response.results[4].$$expanded.key), true );
    });

    it('should use key of last value in the resultlist as key offset (ascending)', async function () {
      const response = await doGet('/alldatatypes?descending=false', null, sriClientOptionsAuthKevin)
      assert.equal(response.$$meta.next.endsWith(encodeURIComponent(response.results[4].$$expanded.$$meta.created)
                                                  + ',' + response.results[4].$$expanded.key), true );
    });

    it('should return all resources without duplicates', async function () {
      const hrefsFound = []
      let count = 0
      const traverse = async (url) => {
        const response = await doGet(url, null, sriClientOptionsAuthKevin)
        hrefsFound.push(...response.results.map( e => e.href ))
        if (response.$$meta.next !== undefined ) {
          await traverse(response.$$meta.next)
        } else {
          count = response.$$meta.count
        }
      }
      await traverse('/alldatatypes?limit=2')     
      assert.equal(hrefsFound.length, _.uniq(hrefsFound).length);
      assert.equal(count, _.uniq(hrefsFound).length);
    });

    it('should return all resources without duplicates (descending)', async function () {
      const hrefsFound = []
      let count = 0
      const traverse = async (url) => {
        const response = await doGet(url, null, sriClientOptionsAuthKevin)
        hrefsFound.push(...response.results.map( e => e.href ))
        if (response.$$meta.next !== undefined ) {
          await traverse(response.$$meta.next)
        } else {
          count = response.$$meta.count
        }
      }
      await traverse('/alldatatypes?limit=3&descending=true')
      assert.equal(hrefsFound.length, _.uniq(hrefsFound).length);
      assert.equal(count, _.uniq(hrefsFound).length);
    });

    it('should return all resources without duplicates (ascending)', async function () {
      const hrefsFound = []
      let count = 0
      const traverse = async (url) => {
        const response = await doGet(url, null, sriClientOptionsAuthKevin)
        hrefsFound.push(...response.results.map( e => e.href ))
        if (response.$$meta.next !== undefined ) {
          await traverse(response.$$meta.next)
        } else {
          count = response.$$meta.count
        }
      }
      await traverse('/alldatatypes?limit=3&descending=false')
      assert.equal(hrefsFound.length, _.uniq(hrefsFound).length);
      assert.equal(count, _.uniq(hrefsFound).length);
    });    

    it('should also return all resources with created timestamp in microseconds', async function () {
      const hrefsFound = []
      let count = 0
      const traverse = async (url) => {
        const response = await doGet(url, null, sriClientOptionsAuthKevin)
        hrefsFound.push(...response.results.map( e => e.href ))
        if (response.$$meta.next !== undefined ) {
          await traverse(response.$$meta.next)
        } else {
          count = response.$$meta.count
        }
      }
      await traverse('/cities?limit=2')
      assert.equal(count, _.uniq(hrefsFound).length);
    });

    it('should work incombination with orderBy', async function () {
      const response = await doGet('/alldatatypes?orderBy=key&limit=10', null, sriClientOptionsAuthKevin)
      const keys = response.results.map( r => r.$$expanded.key )

      assert.equal(_.isEqual(keys, _.sortBy(keys)), true );
    });

    it('should work incombination with orderBy and descending', async function () {
      const response = await doGet('/alldatatypes?orderBy=id&descending=true&limit=40', null, sriClientOptionsAuthKevin)
      const ids = response.results.map( r => parseInt(r.$$expanded.id) )

      assert.equal(_.isEqual(_.reverse(ids), _.sortBy(ids)), true );
    });

    it('should forbid a limit over the maximum', async function () {
      await utils.testForStatusCode(
        async () => {
          await doGet('/alldatatypes?limit=100', null, sriClientOptionsAuthKevin)
        }, 
        (error) => {
          assert.equal(error.status, 409);
          assert.equal(error.body.errors[0].code, 'invalid.limit.parameter');
          assert.equal(error.body.errors[0].message, 'The maximum allowed limit is 50');      
        })
    });

    it('should allow unlimited resources with expand none', async function () {
      const response = await doGet('/alldatatypes?limit=*&expand=none', null, sriClientOptionsAuthKevin)
      assert.equal(response.results.length, 38);
    });

    it('should allow unlimited resources with expand NONE', async function () {
      const response = await doGet('/alldatatypes?limit=*&expand=NONE', null, sriClientOptionsAuthKevin)
      assert.equal(response.results.length, 38);
    });

    it('should forbid unlimited resources with expand different to NONE', async function () {
      await utils.testForStatusCode(
        async () => {
          await doGet('/alldatatypes?limit=*', null, sriClientOptionsAuthKevin)
        }, 
        (error) => {
          assert.equal(error.status, 409);
          assert.equal(error.body.errors[0].code, 'invalid.limit.parameter');
          assert.equal(error.body.errors[0].message, 'The maximum allowed limit is 50');      
        })
    });

    it('should propagate parameters in the next page', async function () {
      const response = await doGet('/alldatatypes?textContains=a&limit=2', null, sriClientOptionsAuthKevin)
      assert.equal(response.results.length, 2);
      assert.equal(response.$$meta.next.startsWith('/alldatatypes?textContains=a&limit=2&keyOffset'), true );
    });

    it('should be able to deal with limit=0 and no results', async function () {
      const response = await doGet('/persons?firstname=unexisting&limit=0', null, sriClientOptionsAuthSabine)
    });  

  });

  describe('Count ', function () {

    it('should be present by default', async function () {
      const response = await doGet('/alldatatypes', null, sriClientOptionsAuthKevin)
      assert.equal(response.$$meta.count!==undefined, true);
    });

    it('should be present when explicitely requested', async function () {
      const response = await doGet('/alldatatypes?$$includeCount=true', null, sriClientOptionsAuthKevin)
      assert.equal(response.$$meta.count!==undefined, true);
    });

    it('should be omitted when explicitely requested', async function () {
      const response = await doGet('/alldatatypes?$$includeCount=false', null, sriClientOptionsAuthKevin)
      assert.equal(response.$$meta.count===undefined, true);
    });

    it('should be omitted by default (resource with includeCount=false as default)', async function () {
      const response = await doGet('/messages', null, sriClientOptionsAuthSabine)
      assert.equal(response.$$meta.count===undefined, true);
    });

    it('should be present when explicitely requested (resource with includeCount=false as default)', async function () {
      const response = await doGet('/messages?$$includeCount=true', null, sriClientOptionsAuthSabine)
      assert.equal(response.$$meta.count!==undefined, true);
    });

    it('should be omitted when explicitely requested (resource with includeCount=false as default)', async function () {
      const response = await doGet('/messages?$$includeCount=false', null, sriClientOptionsAuthSabine)
      assert.equal(response.$$meta.count===undefined, true);
    });

  });  

};
