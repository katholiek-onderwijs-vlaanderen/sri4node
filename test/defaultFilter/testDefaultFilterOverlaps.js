// Utility methods for calling the SRI interface
var assert = require('assert');

exports = module.exports = function (base) {
    'use strict';

    const sriClientConfig = {
        baseUrl: base
    }
    const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
    const doGet = function () { return api.getRaw(...arguments) };

    const utils = require('../utils.js')(api);
    const makeBasicAuthHeader = utils.makeBasicAuthHeader;
    const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }


    describe('Generic Filters', function () {

        describe('Overlaps', function () {

            describe('Array fields', function () {

                it('should find strings(1)', async function () {
                    const response = await doGet('/alldatatypes?textsOverlaps=Standard', null, authHdrObj)
                    assert.equal(response.results.length, 1);
                    assert.equal(response.results[0].$$expanded.id, 7);
                });

                it('should find strings(2)', async function () {
                    const response = await doGet('/alldatatypes?textsOverlaps=interface', null, authHdrObj)
                    assert.equal(response.results.length, 1);
                    assert.equal(response.results[0].$$expanded.id, 7);
                });

                it('should find strings(3)', async function () {
                    const response = await doGet('/alldatatypes?textsOverlaps=Standard,interface', null, authHdrObj)
                    assert.equal(response.results.length, 1);
                    assert.equal(response.results[0].$$expanded.id, 7);
                });


                it('should not find strings', async function () {
                    const response = await doGet('/alldatatypes?textsOverlaps=foo', null, authHdrObj)
                    assert.equal(response.results.length, 0);
                });

                it('should find strings with a not match(1)', async function () {
                    const response = await doGet('/alldatatypes?textsNotOverlaps=Standard,interface', null, authHdrObj)
                    assert.equal(response.results.length, 1);
                    assert.equal(response.results[0].$$expanded.id, 8);
                });

                it('should find strings with a not match(2)', async function () {
                    const response = await doGet('/alldatatypes?textsNotOverlaps=interface', null, authHdrObj)
                    assert.equal(response.results.length, 1);
                    assert.equal(response.results[0].$$expanded.id, 8);
                });

                it('should find strings with a not match(3)', async function () {
                    const response = await doGet('/alldatatypes?textsNotOverlaps=Standard', null, authHdrObj)
                    assert.equal(response.results.length, 1);
                    assert.equal(response.results[0].$$expanded.id, 8);
                });

                it('should find numbers(1)', async function () {
                    const response = await doGet('/alldatatypes?numbersOverlaps=5,3', null, authHdrObj)
                    assert.equal(response.results.length, 2);
                    assert.equal(response.results[0].$$expanded.id, 9);
                    assert.equal(response.results[1].$$expanded.id, 10);
                });

                it('should find numbers(2)', async function () {
                    const response = await doGet('/alldatatypes?numbersOverlaps=5', null, authHdrObj)
                    assert.equal(response.results.length, 2);
                    assert.equal(response.results[0].$$expanded.id, 9);
                    assert.equal(response.results[1].$$expanded.id, 10);
                });

                it('should find numbers(3)', async function () {
                    const response = await doGet('/alldatatypes?numbersOverlaps=3', null, authHdrObj)
                    assert.equal(response.results.length, 2);
                    assert.equal(response.results[0].$$expanded.id, 9);
                    assert.equal(response.results[1].$$expanded.id, 10);
                });

                it('should not find numbers', async function () {
                    const response = await doGet('/alldatatypes?numbersOverlaps=12', null, authHdrObj)
                    assert.equal(response.results.length, 0);
                });

                it('should find numbers with a not match(1)', async function () {
                    const response = await doGet('/alldatatypes?numbersNotOverlaps=5,3', null, authHdrObj)
                    assert.equal(response.results.length, 0);
                });
                it('should find numbers with a not match(2)', async function () {
                    const response = await doGet('/alldatatypes?numbersNotOverlaps=3', null, authHdrObj)
                    assert.equal(response.results.length, 0);
                });
                it('should find numbers with a not match(3)', async function () {
                    const response = await doGet('/alldatatypes?numbersNotOverlaps=5', null, authHdrObj)
                    assert.equal(response.results.length, 0);
                });

                it('should find timestamps(1)', async function () {
                    var q = '/alldatatypes?publicationsOverlaps=2015-04-01T00:00:00%2B02:00,2015-01-01T00:00:00%2B02:00';
                    const response = await doGet(q, null, authHdrObj)
                    assert.equal(response.results.length, 1);
                    assert.equal(response.results[0].$$expanded.id, 11);
                });

                it('should find timestamps(2)', async function () {
                    var q = '/alldatatypes?publicationsOverlaps=2015-01-01T00:00:00%2B02:00';
                    const response = await doGet(q, null, authHdrObj)
                    assert.equal(response.results.length, 1);
                    assert.equal(response.results[0].$$expanded.id, 11);
                });

                it('should find timestamps(3)', async function () {
                    var q = '/alldatatypes?publicationsOverlaps=2015-04-01T00:00:00%2B02:00';
                    const response = await doGet(q, null, authHdrObj)
                    assert.equal(response.results.length, 1);
                    assert.equal(response.results[0].$$expanded.id, 11);
                });

                it('should not find timestamps', async function () {
                    const response = await doGet('/alldatatypes?publicationsOverlaps=2012-01-01T00:00:00%2B02:00', null, authHdrObj)
                    assert.equal(response.results.length, 0);
                });

                it('should find timestamps with a not match(1)', async function () {
                    var q = '/alldatatypes?publicationsNotOverlaps=2015-04-01T00:00:00%2B02:00,2015-01-01T00:00:00%2B02:00';
                    const response = await doGet(q, null, authHdrObj)
                    assert.equal(response.results.length, 1);
                    assert.equal(response.results[0].$$expanded.id, 12);
                });

                it('should find timestamps with a not match(2)', async function () {
                    var q = '/alldatatypes?publicationsNotOverlaps=2015-01-01T00:00:00%2B02:00';
                    const response = await doGet(q, null, authHdrObj)
                    assert.equal(response.results.length, 1);
                    assert.equal(response.results[0].$$expanded.id, 12);
                });

                it('should find timestamps with a not match(3)', async function () {
                    var q = '/alldatatypes?publicationsNotOverlaps=2015-04-01T00:00:00%2B02:00';
                    const response = await doGet(q, null, authHdrObj)
                    assert.equal(response.results.length, 1);
                    assert.equal(response.results[0].$$expanded.id, 12);
                });

            });

        });
    });
};
