var assert = require('assert');
var uuid = require('node-uuid');
var sriclient = require('@kathondvla/sri-client/node-sri-client');
var doGet = sriclient.get;
var doPut = sriclient.put;
var doPost = sriclient.post;
var doDelete = sriclient.delete;

exports = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = api.get;
  const doPut = api.put;
  const doDelete = api.delete;

  const utils =  require('./utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('sabine@email.be', 'pwd') } }


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
      it('should succeed with correct referenced link.', async function () {
        const response = await doGet('/store/products/1edb2754-5684-1234-ae5b-ec33c903ee4d', null, authHdrObj )
        assert.equal(response.package.href, '/store/packages/1edb2754-5684-4996-ae5b-ec33c903ee4d');
      });
    });

    describe(' get resource list', function () {
      it('should succeed with correct count.', async function () {
        const response = await doGet('/store/packages', null, authHdrObj)
        assert.equal(response.$$meta.count, 2);
      });
    });

    describe(' put new resource with references', function () {
      it('should succeed with correct referenced link.', async function () {
        const key = uuid.v4();
        const packageKey = '2edb2754-1598-4996-ae5b-ec33c903ee4d';        
        const body = generateRandomProduct(key, packageKey);
        const response = await doPut('/store/products/' + key, body, authHdrObj)
        assert.equal(response.getStatusCode(), 201);
      });
    });

    describe(' batch put new resources', function () {
      it('should succeed all of them with correct status.', async function () {
        const batch = ['p1', 'p2'].map(function () {
          const key = uuid.v4();
          const packageKey = '2edb2754-1598-4996-ae5b-ec33c903ee4d';
          const body = generateRandomProduct(key, packageKey);
          return {
            verb: 'PUT',
            href: '/store/products/' + key,
            body: body
          };
        });

        const response = await doPut('/store/products/batch', batch, authHdrObj)
        assert.equal(response.getStatusCode(), 201);
        response.forEach( subResponse => assert.equal(subResponse.status, 201) )
      });
    });

    describe(' batch get resources', function () {
      it('should succeed all of them with correct status.', async function () {
        var batch = ['2f11714a-9c45-44d3-8cde-cd37eb0c048b', '692fa054-33ec-4a28-87eb-53df64e3d09d']
          .map(function (key) {
            return {
              verb: 'GET',
              href: '/persons/' + key
            };
        });

        const response = await doPut('/persons/batch', batch, authHdrObj)
        response.forEach( subResponse => assert.equal(subResponse.status, 200) )
        assert.equal(response.length, 2);
      });
    });

    describe(' delete resource', function () {

      var key = uuid.v4();

      before(async function (done) {
        var pack = {key: key,
                    name: 'ToDelete-' + key};
        await doPut('/store/packages/' + key, pack, authHdrObj)
        done();
      });

      it('should succeed with correct status.', async function () {
        await doDelete('/store/packages/' + key, authHdrObj)
      });

      it('retrieving a deleted resource should return 410 - Gone', async function () {
        await utils.testForStatusCode( 
          async () => {
            await doGet('/store/packages/' + key, null,  authHdrObj)
          }, 
          (error) => {
            assert.equal(error.status, 410);
          })
      });
    });

    describe(' get docs', function () {
      it('should succeed with correct documentation.', async function () {
        await doGet('/docs', authHdrObj)
      });
    });
  });

  // Will use resources persons and communities which are configured with types: /persons and /communities
  describe('Simple resource type', function () {

    // Test basic resource get
    describe(' get by "key" on resource with references', function () {
      it('should succeed with correct referenced link.', async function () {
        const response = await doGet('/persons/9abe4102-6a29-4978-991e-2a30655030e6', null,  authHdrObj)
        assert.equal(response.community.href, '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849');
      });
    });
  });
};
