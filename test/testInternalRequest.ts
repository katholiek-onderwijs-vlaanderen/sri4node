// Utility methods for calling the SRI interface
const assert = require('assert');

export = module.exports = function (base) {
    'use strict';

    const sriClientConfig = {
        baseUrl: base
    }
    const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
    const doGet = function (...args) { return api.getRaw(...args) };

    const utils = require('./utils')(api);
    const makeBasicAuthHeader = utils.makeBasicAuthHeader;


    describe('test call via internal interface on protected resource', function () {

        describe('without authentication', function () {
            it('should fail', async function () {
                await utils.testForStatusCode(
                    async () => {
                        await doGet('/communities/customroute_via_internal_interface')
                    },
                    (error) => {
                        assert.equal(error.status, 401);
                    })
            });
        });

        describe('with authentication', function () {
            it('should return resource', async function () {
                const auth = makeBasicAuthHeader('kevin@email.be', 'pwd')
                const response = await doGet('/communities/customroute_via_internal_interface', null, { headers: { authorization: auth } })
                assert.equal(response.firstname, 'Kevin');
            });
        });

    });

};
