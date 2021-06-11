
// Utility methods for calling the SRI interface
const assert = require('assert');

exports = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doPost = function() { return api.post(...arguments) };

  const utils =  require('./utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }

  describe('isPartOf', function () {

    it('should fail on missing resource A', async function () {
      await utils.testForStatusCode(
          async () => {
            await doPost('/countries/isPartOf', {}, authHdrObj);
          }, 
          (error) => {
            assert.equal(error.status, 400);
            assert.equal(error.body.errors[0].code, 'a.href.and.b.hrefs.needs.to.specified');
          })
    });

    it('should fail on missing resource B', async function () {
      await utils.testForStatusCode(
          async () => {
            await doPost('/countries/isPartOf', {  "a": { "href": "/countries?unexistingPara=5" } }, authHdrObj);
          }, 
          (error) => {
            assert.equal(error.status, 400);
            assert.equal(error.body.errors[0].code, 'a.href.and.b.hrefs.needs.to.specified');
          })
    });

  
    it('should fail on invalid resource A', async function () {
      await utils.testForStatusCode(
          async () => {
            const r = await doPost('/countries/isPartOf', {
              "a": { "href": "/countries?unexistingPara=5" },
              "b": { "hrefs": [ "/countries" ] }
            }, authHdrObj);
            console.log('R:');
            console.log(r)
          }, 
          (error) => {
            assert.equal(error.status, 400);
            assert.equal(error.body.errors[0].code, 'resource.a.raised.error');
          })
    });

    it('should fail on invalid resource in B list', async function () {
      await utils.testForStatusCode(
          async () => {
            await doPost('/countries/isPartOf', {  
              "a": { "href": "/countries" },
              "b": { "hrefs": [ "/countries?unexistingPara=5" ] }
            }, authHdrObj);
          }, 
          (error) => {
            assert.equal(error.status, 400);
            assert.equal(error.body.errors[0].code, 'resource.b.raised.error');
          })
    });

    it('should fail on not matching resource in B list', async function () {
      await utils.testForStatusCode(
          async () => {
            await doPost('/countries/isPartOf', {  
              "a": { "href": "/countries" },
              "b": { "hrefs": [ "/unexisting_resource" ] }
            }, authHdrObj);
          }, 
          (error) => {
            assert.equal(error.status, 400);
            assert.equal(error.body.errors[0].code, 'unknown.resource.type');
          })
    });

    it('should fail if A is an array', async function () {
      await utils.testForStatusCode(
          async () => {
            await doPost('/countries/isPartOf', {  
              "a": { "href": [ "/countries?unexistingPara=5" ] },
              "b": { "hrefs": [ "/countries" ] }
            }, authHdrObj);
          }, 
          (error) => {
            assert.equal(error.status, 400);
            assert.equal(error.body.errors[0].code, 'a.href.must.be.single.value');
          })
    });


    it('should fail if hrefs of B is not an array', async function () {
      await utils.testForStatusCode(
          async () => {
            await doPost('/countries/isPartOf', {  
              "a": { "href": "/countries?unexistingPara=5" },
              "b": { "hrefs": "/countries" }
            }, authHdrObj);
          }, 
          (error) => {
            assert.equal(error.status, 400);
            assert.equal(error.body.errors[0].code, 'b.hrefs.must.be.array');
          })
    });

    it('lists - match', async function () {
      const r = await doPost('/countries/isPartOf', {  
                        "a": { "href": "/countries?nameRegEx=^be.*$" },
                        "b": { "hrefs": [ "/countries" ] }
                      }, authHdrObj);

      assert.equal(r.length, 1);
      assert.equal(r[0], '/countries');
    });

    it('lists - no match', async function () {
      const r = await doPost('/countries/isPartOf', {  
                        "a": { "href": "/countries" },
                        "b": { "hrefs": [ "/countries?nameRegEx=^be.*$" ] }
                      }, authHdrObj);

      assert.equal(r.length, 0);
    });

    it('string key - single resource - match', async function () {
      const r = await doPost('/countries/isPartOf', {  
                        "a": { "href": "/countries/be" },
                        "b": { "hrefs": [ "/countries?nameRegEx=^be.*$" ] }
                      }, authHdrObj);

      assert.equal(r.length, 1);
    });

    it('uuid key - single resource - match', async function () {
      const r = await doPost('/messages/isPartOf', {  
                        "a": { "href": "/messages/ad9ff799-7727-4193-a34a-09f3819c3479" },
                        "b": { "hrefs": [ "/messages" ] }
                      }, authHdrObj);

      assert.equal(r.length, 1);
    });

    it('numeric key - single resource - match', async function () {
      const r = await doPost('/cities/isPartOf', {  
                        "a": { "href": "/cities/38002" },
                        "b": { "hrefs": [ "/cities" ] }
                      }, authHdrObj);

      assert.equal(r.length, 1);
    });

    it('uuid key - single resource - multiple matches from list', async function () {
      const r = await doPost('/messages/isPartOf', {  
                        "a": { "href": "/messages/ad9ff799-7727-4193-a34a-09f3819c3479" },
                        "b": { "hrefs": [ "/messages?descriptionRegEx=^NOMATCH.*$"
                                        , "/messages"
                                        , "/messages?type=request"
                                        , "/messages?titleRegEx=^Wie.*$" ] }
                      }, authHdrObj);

      assert.equal(r.length, 2);
    });

    it('list resource - multiple matches from list', async function () {
      const r = await doPost('/messages/isPartOf', {  
                        "a": { "href": "/messages?descriptionRegEx=^Ik.*$" },
                        "b": { "hrefs": [ "/messages?descriptionRegEx=^NOMATCH.*$"
                                        , "/messages"
                                        , "/messages?type=request"
                                        , "/messages?titleRegEx=^Wie.*$" ] }
                      }, authHdrObj);

      assert.equal(r.length, 2);
    });

    it('list resource - exact match', async function () {
      const r = await doPost('/messages/isPartOf', {
                        "a": { "href": "/messages?descriptionRegEx=^Ik.*$" },
                        "b": { "hrefs": [ "/messages?descriptionRegEx=^Ik.*$" ] }
                      }, authHdrObj);

      assert.equal(r.length, 1);
    });

    it('single resource - exact match', async function () {
      const r = await doPost('/messages/isPartOf', {
                        "a": { "href": "/messages/ad9ff799-7727-4193-a34a-09f3819c3479" },
                        "b": { "hrefs": [ "/messages/ad9ff799-7727-4193-a34a-09f3819c3479" ] }
                      }, authHdrObj);

      assert.equal(r.length, 1);
    });

  });
};
