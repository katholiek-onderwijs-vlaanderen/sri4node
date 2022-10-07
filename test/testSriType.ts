// Utility methods for calling the SRI interface
import * as assert from 'assert';
import * as sriclientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory from './utils';

const makeAuthHeader = (user, pw) => 
  'Basic ' + Buffer.from(user + ':' + pw).toString('base64');

const specialSriTypeUser = '838524ec-d267-11eb-bbb0-8f3f35e5f1f8'

module.exports = function (base) {


  const sriClientConfig = {
    baseUrl: base,
  }

  const api = sriclientFactory(sriClientConfig)
  const doGet = function(...args) { return api.getRaw(...args) };
  const doPut = function(...args) { return api.put(...args) };

  const utils =  utilsFactory(api);


  describe('sriType should be present in sriRequest passed to hooks', function () {

      it('Regular GET', async function () {
        const auth = makeAuthHeader('sam@email.be', 'pwd')
        const response = await doGet('/persons/838524ec-d267-11eb-bbb0-8f3f35e5f1f8', null, { headers: { authorization: auth } })
        assert.equal(response.errors[0].sriType, '/persons');
      });

      it('GET with custom route', async function () {
        const auth = makeAuthHeader('sam@email.be', 'pwd')
        const response = await doGet('/persons/838524ec-d267-11eb-bbb0-8f3f35e5f1f8/sritype', null, { headers: { authorization: auth } })
        assert.equal(response.errors[0].sriType, '/persons');
      });

      it('List GET', async function () {
        const auth = makeAuthHeader('sam@email.be', 'pwd')
        const response = await doGet('/persons?communities=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d', null, { headers: { authorization: auth } })
        assert.equal(response.errors[0].sriType, '/persons');
      });

      it('Batch GET', async function () {
        const auth = makeAuthHeader('sam@email.be', 'pwd')
        const batch = [
            { "href": '/persons/838524ec-d267-11eb-bbb0-8f3f35e5f1f8'
            , "verb": "GET"
            }
        ]
        const response = await doPut('/persons/batch', batch,  { headers: { authorization: auth } });
        assert.equal(response[0].body.errors[0].sriType, '/persons');
      });

      it('onlyCustom route', async function () {
        const auth = makeAuthHeader('sam@email.be', 'pwd')
        const response = await doGet('/onlyCustom', null, { headers: { authorization: auth } })
        assert.equal(response.sriType, '/onlyCustom');
      });

  });

};
