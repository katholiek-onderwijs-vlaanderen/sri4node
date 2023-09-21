// Utility methods for calling the SRI interface
import assert from 'assert';
import _ from 'lodash';
import { THttpClient, THttpResponse } from './httpClient';

module.exports = function (httpClient: THttpClient) {

  /**
   * Gets a list from an sri api page-by-page (following the next links) and then
   * applies an asynchronous function to each batch received from the API.
   * The function will not work in parallel, so we wait to call the next one until
   * the current one has finished processing.
   *
   * @param asyncFunctionToApply the function that will be applied to each 'page'
   *  we get from the API (following the next links). Its parameters will be
   *  - an array of api resource objects (or strings containing hrefs if expand=NONE)
   *  - isLastPage boolean indicating no more pages will follow
   *  - current page
   *  - nr of resources handled so far
   * @param url
   * @param options options for the internal http wrapper (httpClient)
   */
  async function applyFunctionToList(
      asyncFunctionToApply:(apiResponse:Array<string | Record<string, unknown>>, lastPage:boolean, pageNum:number, countBeforeCurrentPage:number) => any,
      url:string,
      options:Record<string,unknown> = {},
  ) {
    let nextPath:string | null = url;
    let nextJsonDataPromise:Promise<THttpResponse> | null = httpClient.get({ path: url, ...options });
    let pageNum = 0;
    let countBeforeCurrentPage = 0;
    while (nextJsonDataPromise) {
      // console.log(`Trying to get ${nextPath}`);
      // eslint-disable-next-line no-await-in-loop
      const jsonData = (await nextJsonDataPromise).body;
      if (jsonData.$$meta && jsonData.$$meta.next) {
        nextPath = jsonData.$$meta.next;
      } else {
        nextPath = null;
      }
      // already start fetching the next url
      nextJsonDataPromise = nextPath ? httpClient.get({ path: `${nextPath}`, ...options }) : null;

      // apply async function to batch
      try {
        // eslint-disable-next-line no-await-in-loop
        await asyncFunctionToApply(jsonData, nextJsonDataPromise === null, pageNum, countBeforeCurrentPage);
        countBeforeCurrentPage += jsonData.results.length;
      } catch (e) {
        console.log('Error while trying to apply the given function to the current page', e.stack);
        throw e;
      }

      pageNum += 1;
    }
    return countBeforeCurrentPage;
  }



  describe('GET public list resource', function () {
    describe('without authentication', function () {
      it('should return a list of 4 communities', async function () {
        const response = await httpClient.get({ path: '/communities' })
        if (!response.body.$$meta.count) {
          assert.fail();
        }
      });
    });

    describe('with authentication', function () {
      it('should return a list of 4 communities', async function () {
        const response = await httpClient.get({ path: '/communities', auth: 'sabine' });
        if (!response.body.$$meta.count) {
          assert.fail();
        }
      });
    });

    describe('with single value ?hrefs=...', function () {
      it('should work', async function () {
        const response = await httpClient.get({ path: '/communities?hrefs=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d', auth: 'sabine' });
        assert.equal(response.body.$$meta.count, 1);
        assert.equal(response.body.results[0].href, '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d');
      });
    });

    describe('with two values ?hrefs=...', function () {
      it('should work', async function () {
        const response = await httpClient.get({ path: '/communities?hrefs=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d' +
                     ',/communities/6531e471-7514-43cc-9a19-a72cf6d27f4c', auth: 'sabine' });
        assert.equal(response.body.$$meta.count, 2);
        const hrefs = [response.body.results[0].href, response.body.results[1].href];
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
          const response = await httpClient.get({ path: '/communities?invalidParam=abc' })
          assert.equal(response.status, 404);
        });
      });
    });
  });

  describe('GET private list resource', function () {
    describe('/persons without authentication', function () {
      it('should be 401 Unauthorized', async function () {
        const response = await httpClient.get({ path: '/persons' })
        assert.equal(response.status, 401);
      });
    });

    describe('/persons with authentication', function () {
      it('should be 200 Ok', async function () {
        // Must restrict to the community of the user logged in (restictReadPersons enforces this)
        const response = await httpClient.get({ path: '/persons?communities=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849', auth: 'sabine' });
        if (response.body.results.length === 0) {
          assert.fail();
        }
      });
    });
  });

  describe('URL parameters', function () {
    describe('that thow error', function () {
      it('should return 404 and the error message.', async function () {
        const response = await httpClient.get({ path: '/communities?invalidQueryParameter=true' });
        assert.equal(response.status, 404);
        assert.equal(response.body.errors[0].code, 'invalid.query.parameter');
      });
    });

    describe('that were not configured', function () {
      it('should return 404 with code [invalid.query.parameter]', async function () {
        const response = await httpClient.get({ path: '/communities?nonexistingparameter=x' })
        assert.equal(response.status, 404);
        assert.equal(response.body.errors[0].code, 'invalid.query.parameter');
        assert.equal(response.body.errors[0].parameter, 'nonexistingparameter');
      });
    });

  });

  describe('escaping', function () {
    describe('should do proper escaping', function () {
      it('on table \'table\' and column \'from\'', async function () {
        const response = await httpClient.get({ path: '/table' })
        assert.equal(response.body.results[0].$$expanded.from, 'from-value');
        assert.equal(response.body.results[0].$$expanded.select, 'select-value');
      });
    });
  });


  describe('Paging', function () {

    it('should offset resources', async function () {
      const response = await httpClient.get({ path: '/alldatatypes?offset=3', auth: 'kevin' });
      assert.equal(response.body.results[0].$$expanded.id, 4);
    });

    it('should limit resources by default', async function () {
      const response = await httpClient.get({ path: '/alldatatypes', auth: 'kevin' });
      assert.equal(response.body.results.length, 5);
      assert.equal(response.body.$$meta.next.startsWith('/alldatatypes?keyOffset'), true );
    });

    it('should limit resources', async function () {
      const response = await httpClient.get({ path: '/alldatatypes?limit=3', auth: 'kevin' });
      assert.equal(response.body.results.length, 3);
      assert.equal(response.body.$$meta.next.startsWith('/alldatatypes?limit=3&keyOffset'), true );
    });

    it('should use key of last value in the resultlist as key offset', async function () {
      const response = await httpClient.get({ path: '/alldatatypes', auth: 'kevin' });
      assert.equal(response.body.$$meta.next.endsWith(encodeURIComponent(response.body.results[4].$$expanded.$$meta.created)
                                                  + ',' + response.body.results[4].$$expanded.key), true );
    });

    it('should use key of last value in the resultlist as key offset (descending)', async function () {
      const response = await httpClient.get({ path: '/alldatatypes?descending=true', auth: 'kevin' });
      assert.equal(response.body.$$meta.next.endsWith(encodeURIComponent(response.body.results[4].$$expanded.$$meta.created)
                                                  + ',' + response.body.results[4].$$expanded.key), true );
    });

    it('should use key of last value in the resultlist as key offset (ascending)', async function () {
      const response = await httpClient.get({ path: '/alldatatypes?descending=false', auth: 'kevin' });
      assert.equal(response.body.$$meta.next.endsWith(encodeURIComponent(response.body.results[4].$$expanded.$$meta.created)
                                                  + ',' + response.body.results[4].$$expanded.key), true );
    });

    it('should return all resources without duplicates', async function () {
      const hrefsFound:string[] = []
      let count = 0
      const traverse = async (url) => {
        const response = await httpClient.get({ path: url, auth: 'kevin' });
        hrefsFound.push(...response.body.results.map( e => e.href ))
        if (response.body.$$meta.next !== undefined ) {
          await traverse(response.body.$$meta.next)
        } else {
          count = response.body.$$meta.count
        }
      }
      await traverse('/alldatatypes?limit=2')
      assert.equal(hrefsFound.length, _.uniq(hrefsFound).length);
      assert.equal(count, _.uniq(hrefsFound).length);
    });

    it('should return all resources without duplicates (descending)', async function () {
      const hrefsFound:string[] = []
      let count = 0
      const traverse = async (url) => {
        const response = await httpClient.get({ path: url, auth: 'kevin' });
        hrefsFound.push(...response.body.results.map( e => e.href ))
        if (response.body.$$meta.next !== undefined ) {
          await traverse(response.body.$$meta.next)
        } else {
          count = response.body.$$meta.count
        }
      }
      await traverse('/alldatatypes?limit=3&descending=true')
      assert.equal(hrefsFound.length, _.uniq(hrefsFound).length);
      assert.equal(count, _.uniq(hrefsFound).length);
    });

    it('should return all resources without duplicates (ascending)', async function () {
      const hrefsFound:string[] = []
      let count = 0
      const traverse = async (url) => {
        const response = await httpClient.get({ path: url, auth: 'kevin' });
        hrefsFound.push(...response.body.results.map( e => e.href ))
        if (response.body.$$meta.next !== undefined ) {
          await traverse(response.body.$$meta.next)
        } else {
          count = response.body.$$meta.count
        }
      }
      await traverse('/alldatatypes?limit=3&descending=false')
      assert.equal(hrefsFound.length, _.uniq(hrefsFound).length);
      assert.equal(count, _.uniq(hrefsFound).length);
    });    

    it('should also return all resources with created timestamp in microseconds', async function () {
      const hrefsFound:string[] = []
      let count = 0
      const traverse = async (url) => {
        const response = await httpClient.get({ path: url, auth: 'kevin' });
        hrefsFound.push(...response.body.results.map( e => e.href ))
        if (response.body.$$meta.next !== undefined ) {
          await traverse(response.body.$$meta.next)
        } else {
          count = response.body.$$meta.count
        }
      }
      await traverse('/cities?limit=2')
      assert.equal(count, _.uniq(hrefsFound).length);
    });

    it('should work incombination with orderBy', async function () {
      const response = await httpClient.get({ path: '/alldatatypes?orderBy=key&limit=10', auth: 'kevin' });
      const keys = response.body.results.map( r => r.$$expanded.key )

      assert.equal(_.isEqual(keys, _.sortBy(keys)), true );
    });

    it('should work incombination with orderBy and descending', async function () {
      const response = await httpClient.get({ path: '/alldatatypes?orderBy=id&descending=true&limit=40', auth: 'kevin' });
      const ids = response.body.results.map( r => parseInt(r.$$expanded.id) )

      assert.equal(_.isEqual(_.reverse(ids), _.sortBy(ids)), true );
    });


    it('orderBy should produce url-encoded next links', async function () {
      const hrefsFound:string[] = []
      let count = 0
      const traverse = async (url) => {
        const response = await httpClient.get({ path: url, auth: 'kevin' });
        hrefsFound.push(...response.body.results.map( e => e.href ))
        if (response.body.$$meta.next !== undefined ) {
          await traverse(response.body.$$meta.next)
        } else {
          count = response.body.$$meta.count
        }
      }
      // all community names in the test data contain spaces in their names and result in incorrect urls when not url-encoded
      //   ==> traverse will fail if next url is not url-encoded
      await traverse('/communities?orderBy=name&limit=2')
      assert.equal(count, _.uniq(hrefsFound).length);
    });


    it('should forbid a limit over the maximum', async function () {
      const response = await httpClient.get({ path: '/alldatatypes?limit=100', auth: 'kevin' });
      assert.equal(response.status, 409);
      assert.equal(response.body.errors[0].code, 'invalid.limit.parameter');
      assert.equal(response.body.errors[0].message, 'The maximum allowed limit is 50');
    });

    it('should generate proper next links with expand=NONE', async function () {
      let metaCount:number;
      await applyFunctionToList(
        (apiResponse, isLastPage, _pageNum, countBeforeCurrentPage) => {
          metaCount = metaCount === undefined ? (apiResponse as any).$$meta.count : metaCount;
          if (! (apiResponse as any).results || ! Array.isArray((apiResponse as any).results)) {
            assert.fail('No results found');
          }

          // do some final checks on the last page (no $$meta.next link anymore)
          if (isLastPage) {
            assert.equal(countBeforeCurrentPage + (apiResponse as any).results.length, metaCount);
          }
        },
        '/alldatatypes?limit=2&expand=none&$$includeCount=true',
        { auth: 'kevin'},
      );
    });

    it('should work when expand=NONE is combined with orderBy (only using properties that are never NULL)', async function () {
      // let metaCount:number | undefined;
      await applyFunctionToList(
        (apiResponse, isLastPage, _pageNum, countBeforeCurrentPage) => {
          // metaCount = metaCount === undefined ? (apiResponse as any).$$meta.count : metaCount;
          if (! (apiResponse as any).results || ! Array.isArray((apiResponse as any).results)) {
            assert.fail('No results found');
          }

          // do some final checks on the last page (no $$meta.next link anymore)
          if (isLastPage) {
            assert.equal(countBeforeCurrentPage + (apiResponse as any).results.length, (apiResponse as any).$$meta.count);
          }
        },
        '/alldatatypes?limit=2&expand=none&$$includeCount=true&orderBy=key,$$meta.modified,$$meta.created',
        { auth: 'kevin'},
      );
    });

    it.skip('should work when expand=NONE is combined with orderBy, and the orderBy contains a property that can have NULL values in the DB', async function () {
      // in this case we'll check what happens if one of the orderBy keys can contain NULL values
      // (the 'number' property of /alldatatypes is somtimes null)
      // does the keyOffset still work in these cases?
      await applyFunctionToList(
        (apiResponse, isLastPage, _pageNum, countBeforeCurrentPage) => {
          if (! (apiResponse as any).results || ! Array.isArray((apiResponse as any).results)) {
            assert.fail('No results found');
          }

          // do some final checks on the last page (no $$meta.next link anymore)
          if (isLastPage) {
            assert.equal(countBeforeCurrentPage + (apiResponse as any).results.length, (apiResponse as any).$$meta.count);
          }
        },
        '/alldatatypes?limit=2&expand=none&$$includeCount=true&orderBy=key,$$meta.modified,number',
        { auth: 'kevin'},
      );
    });

    it.skip('should not generate an empty page', async function () {
      await applyFunctionToList(
        (apiResponse, _isLastPage, _pageNum, _countBeforeCurrentPage) => {
          assert(Array.isArray((apiResponse as any).results), 'results property is not an array');
          assert.notStrictEqual((apiResponse as any).results?.length, 0, 'we got a response with a results array containing zero elements');
        },
        '/alldatatypes?limit=1&expand=none&$$includeCount=true',
        { auth: 'kevin'},
      );
      await applyFunctionToList(
        (apiResponse, _isLastPage, _pageNum, _countBeforeCurrentPage) => {
          assert(Array.isArray((apiResponse as any).results), 'results property is not an array');
          assert.notStrictEqual((apiResponse as any).results?.length, 0, 'we got a response with a results array containing zero elements');
        },
        '/alldatatypes?limit=1',
        { auth: 'kevin'},
      );
    });

    it('should allow unlimited resources with expand none', async function () {
      const response = await httpClient.get({ path: '/alldatatypes?limit=*&expand=none', auth: 'kevin' });
      assert.equal(response.body.results.length, 38);
    });

    it('should allow unlimited resources with expand NONE', async function () {
      const response = await httpClient.get({ path: '/alldatatypes?limit=*&expand=NONE', auth: 'kevin' });
      assert.equal(response.body.results.length, 38);
    });

    it('should forbid unlimited resources with expand different to NONE', async function () {
      const response = await httpClient.get({ path: '/alldatatypes?limit=*', auth: 'kevin' });
      assert.equal(response.status, 409);
      assert.equal(response.body.errors[0].code, 'invalid.limit.parameter');
      assert.equal(response.body.errors[0].message, 'The maximum allowed limit is 50');
    });

    it('should propagate parameters in the next page', async function () {
      const response = await httpClient.get({ path: '/alldatatypes?textContains=a&limit=2', auth: 'kevin' });
      assert.equal(response.body.results.length, 2);
      assert.equal(response.body.$$meta.next.startsWith('/alldatatypes?textContains=a&limit=2&keyOffset'), true );
    });

    it('should be able to deal with limit=0 and no results', async function () {
      const response = await httpClient.get({ path: '/persons?firstname=unexisting&limit=0', auth: 'sabine' });
      assert.equal(response.status, 200);
    });  

  });

  describe('Count ', function () {

    it('should be present by default', async function () {
      const response = await httpClient.get({ path: '/alldatatypes', auth: 'kevin' });
      assert.equal(response.body.$$meta.count!==undefined, true);
    });

    it('should be present when explicitely requested', async function () {
      const response = await httpClient.get({ path: '/alldatatypes?$$includeCount=true', auth: 'kevin' });
      assert.equal(response.body.$$meta.count!==undefined, true);
    });

    it('should be omitted when explicitely requested', async function () {
      const response = await httpClient.get({ path: '/alldatatypes?$$includeCount=false', auth: 'kevin' });
      assert.equal(response.body.$$meta.count===undefined, true);
    });

    it('should be omitted by default (resource with includeCount=false as default)', async function () {
      const response = await httpClient.get({ path: '/messages', auth: 'sabine' });
      assert.equal(response.body.$$meta.count===undefined, true);
    });

    it('should be present when explicitely requested (resource with includeCount=false as default)', async function () {
      const response = await httpClient.get({ path: '/messages?$$includeCount=true', auth: 'sabine' });
      assert.equal(response.body.$$meta.count!==undefined, true);
    });

    it('should be omitted when explicitely requested (resource with includeCount=false as default)', async function () {
      const response = await httpClient.get({ path: '/messages?$$includeCount=false', auth: 'sabine' });
      assert.equal(response.body.$$meta.count===undefined, true);
    });

  });

  describe('Prefixed resource should also work', function () {
    it('should return all resources', async function () {
        const response = await httpClient.get({ path: '/prefix/countries2', auth: 'sabine' });
        assert.equal(response.body.results.length, 3);
    });
    it('paging should work', async function () {
        const response = await httpClient.get({ path: '/prefix/countries2?limit=2', auth: 'sabine' });
        assert.equal(response.body.results.length, 2);
    });
  });

  describe('Custom query parameter', function () {
    it('should return all resources', async function () {
        const response1 = await httpClient.get({ path: '/personrelations', auth: 'sabine' });
        assert.equal(response1.body.results.length, 7);
        const response2 = await httpClient.get({ path: '/personrelations?status=ABOLISHED', auth: 'sabine' });
        assert.equal(response2.body.results.length, 1);
        const response3 = await httpClient.get({ path: '/personrelations?status=ACTIVE', auth: 'sabine' });
        console.log(response3)
        assert.equal(response3.body.results.length, 6);
      });
    it('error', async function () {
        const response = await httpClient.get({ path: '/personrelations?status=foo', auth: 'sabine' });
        assert.equal(response.status, 409);
        assert.equal(response.body.errors[0].code, 'status.filter.value.unknown');
    });
    it('unkown query parameter', async function () {
      const response = await httpClient.get({ path: '/personrelations?unkown_para=55', auth: 'sabine' });
      assert.equal(response.status, 404);
      assert.equal(response.body.errors[0].code, 'unknown.query.parameter');
    });
  });


};
