// Utility methods for calling the SRI interface
import * as assert from 'assert';
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import * as uuid from 'uuid';
import * as sinon from 'sinon';
import * as request from 'request';
import * as sleep from 'await-sleep';
import * as pEvent from 'p-event';
import * as fs from 'fs';
import * as util from 'util';

import { debug } from '../js/common';
import utilsFactory from './utils';

const nrPhasesInRequest = 7;
const communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';


function generateRandomPerson(key, communityPermalink, firstname = 'Sabine', lastname = 'Eeckhout') {
  return {
    key,
    firstname,
    lastname,
    street: 'Stationstraat',
    streetnumber: '17',
    zipcode: '9280',
    city: 'Lebbeke',
    phone: '0492882277',
    email: `${key}@email.com`,
    balance: 0,
    mail4elas: 'weekly',
    community: {
      href: communityPermalink,
    },
  };
}



module.exports = function (base, dummyLogger) {
  const sriClientConfig = {
    baseUrl: base,
    username: 'kevin@email.be',
    password: 'pwd',
  };
  const api = sriClientFactory(sriClientConfig);
  const doGet = function (...args) { return api.getRaw(...args) };
  const doPut = function (...args) { return api.put(...args); };
  const doPatch = function (...args) { return api.patch(...args); };
  const doPost = function (...args) { return api.post(...args); };
  const doDelete = function (...args) { return api.delete(...args); };

  const utils = utilsFactory(api);
  const { makeBasicAuthHeader } = utils;
  const authHdrKevin = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } };

  describe('HOOKS', () => {

    describe('Global hooks', () => {

      describe('transformRequest/transformInternalRequest', () => {
         // There is a transformRequest and transformInternalRequest hooks added to all requests in
         // the test suite. Without them, nu user would be set and they both do a basic database test
         // which throws an error in case of db failure. So failure would cause other testcase to fail.
         // ==> no extra tests are needed
      });

      describe('beforePhase & afterRequest', () => {
        // In this tests we combine testing the beforePhase and afterRequest hooks
        // The test configuration has a beforePhase hooks which counts how many times it is called
        // (stored in the parent sriRequest). The afterRequests logs the final number of calls to
        // the beforePhase hook.

        const dummyLoggerSpy = sinon.spy(dummyLogger, 'log');

        it('single request', async () => {
          // read single
          dummyLoggerSpy.resetHistory();
          await doGet('/store/products/1edb2754-5684-1234-ae5b-ec33c903ee4d');
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);


          // read list
          dummyLoggerSpy.resetHistory();
          await doGet('/store/products');
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // create
          dummyLoggerSpy.resetHistory();
          const keyp1 = uuid.v4();
          const p1 = generateRandomPerson(keyp1, communityDendermonde, 'Sara', 'Hermelink');
          await doPut(`/persons/${keyp1}`, p1);
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // put whithout changes
          dummyLoggerSpy.resetHistory();
          await doPut(`/persons/${keyp1}`, p1);
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // update
          dummyLoggerSpy.resetHistory();
          const p1update = {
            ...p1,
            firstname: 'Sarah',
          }
          await doPut(`/persons/${keyp1}`, p1update);
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // patch
          dummyLoggerSpy.resetHistory();
          const patch = [
            { op: 'replace', path: '/streetnumber', value: '25' },
          ];
          await doPatch(`/persons/${keyp1}`, patch);
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // delete existing
          dummyLoggerSpy.resetHistory();
          await doDelete(`/persons/${keyp1}`, {});
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);
          // delete already deleted
          dummyLoggerSpy.resetHistory();
          await doDelete(`/persons/${keyp1}`, {});
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);
          // delete  unexisting
          dummyLoggerSpy.resetHistory();
          await doDelete(`/persons/${uuid.v4()}`, {});
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);


          // custom -- onlyCustom
          dummyLoggerSpy.resetHistory();
          await doGet('/onlyCustom');
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // custom -- normal
          dummyLoggerSpy.resetHistory();
          await doGet('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple', {});
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // custom -- like
          dummyLoggerSpy.resetHistory();
          await doGet('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike', {});
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);


          // For the streaming cases below it is not expect that beforePhase is called more then once as streaming request cannot be
          // part of a batch and so do not need to be phaseSynced.
          // But we do expect the afterRequest being called after closing the stream.

          // custom -- streaming handler JSON
          dummyLoggerSpy.resetHistory();
          const r1 = request.get(`${base}/persons/downStreamJSON`, authHdrKevin);
          await pEvent(r1, 'end');
          // as we are in streaming mode, the after handler still run after closing the stream -> just wait a moment for it to complete
          await sleep(200);
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: 1`), true);

          // custom -- streaming handler binary
          dummyLoggerSpy.resetHistory();
          const r2 = request.get(`${base}/persons/downStreamBinary`, authHdrKevin);
          await pEvent(r2, 'end');
          // as we are in streaming mode, the after handler still run after closing the stream -> just wait a moment for it to complete
          await sleep(200);
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: 1`), true);

          // custom -- streaming file upload (multipart form)
          dummyLoggerSpy.resetHistory();
          const r3 = request.post(`${base}/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a/upStream`, {
            formData: {
              image: fs.createReadStream('test/files/test.jpg'),
              pdf: fs.createReadStream('test/files/test.pdf'),
            },
          });
          await pEvent(r3, 'end');
          // as we are in streaming mode, the after handler still run after closing the stream -> just wait a moment for it to complete
          await sleep(200);
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: 1`), true);


          // isPartOf
          dummyLoggerSpy.resetHistory();
          await doPost('/countries/isPartOf', {
            a: { href: '/countries?nameRegEx=^be.*$' },
            b: { hrefs: ['/countries'] },
          });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // request with internal request
          dummyLoggerSpy.resetHistory();
          await doGet('/communities/customroute_via_internal_interface');
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest * 2}`), true);
        });
        it('batch request - parallel', async () => {
          const keypA = uuid.v4();
          const pA = generateRandomPerson(keypA, communityDendermonde, 'Oona', 'Hazelhof');
          await doPut(`/persons/${keypA}`, pA);

          const keypB = uuid.v4();
          const pB = generateRandomPerson(keypB, communityDendermonde, 'Rosemarijn', 'van der Boon');
          await doPut(`/persons/${keypB}`, pB);

          const keypC = uuid.v4();
          const pC = generateRandomPerson(keypC, communityDendermonde, 'Sonja', 'Lambert');
          await doPut(`/persons/${keypC}`, pC);

          const keypD = uuid.v4();
          const pD = generateRandomPerson(keypD, communityDendermonde, 'Elena', 'van der Hagen');
          await doPut(`/persons/${keypD}`, pD);

          const keypE = uuid.v4();
          const pE = generateRandomPerson(keypE, communityDendermonde, 'Stijn', 'Lindhout');
          await doPut(`/persons/${keypE}`, pE);
          await doDelete(`/persons/${keypE}`, {});

          dummyLoggerSpy.resetHistory();
          const keypN = uuid.v4();
          const pN = generateRandomPerson(keypN, communityDendermonde, 'Sara', 'Hermelink');
          const batch = [
            { // read single
              href: '/store/products/1edb2754-5684-1234-ae5b-ec33c903ee4d',
              verb: 'GET',
            },
            { // read list
              href: '/store/products',
              verb: 'GET',
            },
            { // create
              href: `/persons/${keypN}`,
              verb: 'PUT',
              body: pN,
            },
            { // reput same
              href: `/persons/${keypA}`,
              verb: 'PUT',
              body: pA,
            },
            { // update
              href: `/persons/${keypB}`,
              verb: 'PUT',
              body: {
                ...pB,
                firstname: 'Rozemarijn',
              }
            },
            { // patch
              href: `/persons/${keypC}`,
              verb: 'PATCH',
              body: [ { op: 'replace', path: '/streetnumber', value: '88' } ],
            },
            { // delete existing
              href: `/persons/${keypD}`,
              verb: 'DELETE',
            },
            { // delete already deleted
              href: `/persons/${keypE}`,
              verb: 'DELETE',
            },
            { // delete unexisting
              href: `/persons/${uuid.v4()}`,
              verb: 'DELETE',
            },
            { // custom -- onlyCustom
              href: '/onlyCustom',
              verb: 'GET',
            },
            { // custom -- normal
              href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple',
              verb: 'GET',
            },
            { // custom -- like
              href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike',
              verb: 'GET',
            },
          ];
          await doPut('/batch', batch);
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);
        });
        it('batch request - parallel with error', async () => {
          const keypA = uuid.v4();
          const pA = generateRandomPerson(keypA, communityDendermonde, 'Oona', 'Hazelhof');
          await doPut(`/persons/${keypA}`, pA);

          const keypB = uuid.v4();
          const pB = generateRandomPerson(keypB, communityDendermonde, 'Rosemarijn', 'van der Boon');
          await doPut(`/persons/${keypB}`, pB);

          const keypC = uuid.v4();
          const pC = generateRandomPerson(keypC, communityDendermonde, 'Sonja', 'Lambert');
          await doPut(`/persons/${keypC}`, pC);

          const keypD = uuid.v4();
          const pD = generateRandomPerson(keypD, communityDendermonde, 'Elena', 'van der Hagen');
          await doPut(`/persons/${keypD}`, pD);

          const keypE = uuid.v4();
          const pE = generateRandomPerson(keypE, communityDendermonde, 'Stijn', 'Lindhout');
          await doPut(`/persons/${keypE}`, pE);
          await doDelete(`/persons/${keypE}`, {});

          dummyLoggerSpy.resetHistory();
          const keypN = uuid.v4();
          const pN = generateRandomPerson(keypN, communityDendermonde, 'Sara', 'Hermelink');
          const batch = [
            { // read single
              href: '/store/products/1edb2754-5684-1234-ae5b-ec33c903ee4d',
              verb: 'GET',
            },
            { // read list
              href: '/store/products',
              verb: 'GET',
            },
            { // create
              href: `/persons/${keypN}`,
              verb: 'PUT',
              body: pN,
            },
            { // reput same
              href: `/persons/${keypA}`,
              verb: 'PUT',
              body: pA,
            },
            { // update
              href: `/persons/${keypB}`,
              verb: 'PUT',
              body: {
                ...pB,
                firstname: 'Rozemarijn',
              }
            },
            { // patch
              href: `/persons/${keypC}`,
              verb: 'PATCH',
              body: [ { op: 'replace', path: '/streetnumber', value: '88' } ],
            },
            { // delete existing
              href: `/persons/${keypD}`,
              verb: 'DELETE',
            },
            { // delete already deleted
              href: `/persons/${keypE}`,
              verb: 'DELETE',
            },
            { // delete unexisting
              href: `/persons/${uuid.v4()}`,
              verb: 'DELETE',
            },
            { // custom -- onlyCustom
              href: '/onlyCustom',
              verb: 'GET',
            },
            { // custom -- normal
              href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple',
              verb: 'GET',
            },
            { // custom -- like
              href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike',
              verb: 'GET',
            },
            {
              href: '/persons/82565813-943e-4d1a-ac58-8b4cbc865bdb',
                // 'Steven Plas', community 'LETS Aalst-Oudenaarde' -> only persons from same community can be read
                //   ==> forbidden for Kevin from 'LETS Regio Zele'
              verb: 'GET',
            },
          ];
          await utils.testForStatusCode(
            () => doPut('/batch', batch),
            (error) => {
              console.log()
              assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);
            },
          );
        });
        it('batch request - sequential', async () => {
          dummyLoggerSpy.resetHistory();

          const keypA = uuid.v4();
          const pA = generateRandomPerson(keypA, communityDendermonde, 'Oona', 'Hazelhof');

          const batch = [
            [{ // read single
              href: '/store/products/1edb2754-5684-1234-ae5b-ec33c903ee4d',
              verb: 'GET',
            },
            { // read list
              href: '/store/products',
              verb: 'GET',
            }],
            [{ // create
              href: `/persons/${keypA}`,
              verb: 'PUT',
              body: pA,
            }],
            [{ // reput same
              href: `/persons/${keypA}`,
              verb: 'PUT',
              body: pA,
            }],
            [{ // update
              href: `/persons/${keypA}`,
              verb: 'PUT',
              body: {
                ...pA,
                firstname: 'Rozemarijn',
              }
            }],
            [{ // patch
              href: `/persons/${keypA}`,
              verb: 'PATCH',
              body: [ { op: 'replace', path: '/streetnumber', value: '88' } ],
            }],
            [{
              href: `/persons/${keypA}`,
              verb: 'DELETE',
            }],
            [{
              href: `/persons/${keypA}`,
              verb: 'DELETE',
            },
            { // delete unexisting
              href: `/persons/${uuid.v4()}`,
              verb: 'DELETE',
            }],
            [{ // custom -- onlyCustom
              href: '/onlyCustom',
              verb: 'GET',
            },
            { // custom -- normal
              href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple',
              verb: 'GET',
            },
            { // custom -- like
              href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike',
              verb: 'GET',
            },
            // { // with internal request
            //   href: '/communities/customroute_via_internal_interface',
            //   verb: 'GET',
            // }
            ],
          ];
          await doPut('/batch', batch);
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest * 8}`), true);
        });
        it('internal request', async () => {
          dummyLoggerSpy.resetHistory();
          const r = await doGet('/communities/customroute_via_internal_interface');
          // expect two cycles of beforePhase calls as they are logged in the toplevel sriRequest
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest * 2}`), true);
        });

        it('internal request in batch', async () => {
          dummyLoggerSpy.resetHistory();
          const batch = [
            [{
              href: '/communities/customroute_via_internal_interface',
              verb: 'GET',
            }],
          ];
          const r = await doPut('/batch', batch);
          // expect two cycles of beforePhase calls as they are logged in the toplevel sriRequest
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest * 2}`), true);
        });

      });
    });

    describe('Resource specific hooks', () => {
      describe('before and after hooks (CRUD)', async () => {
        const testKey = uuid.v4();
        it('read', async () => {
          // single
          await doGet('/bars/5de9c352-2534-11ed-84bc-9bce6d5e13f9');
          // list
          await doGet('/bars');
        });
        it('create', async () => {
          const body = {
            key: testKey,
            foo: 'create'
          }
          // create
          await doPut(`/bars/${testKey}`, body);
          // reput
          await doPut(`/bars/${testKey}`, body);
        });

        it('update & patch', async () => {
          const body = {
            key: testKey,
            foo: 'update'
          }
          // update
          await doPut(`/bars/${testKey}`, body);
          // patch
          const patch = [
            { op: 'replace', path: '/foo', value: 'patch' },
          ];
          await doPatch(`/bars/${testKey}`, patch);
        });

        it('delete', async () => {
          // delete existing
          await doDelete(`/bars/${testKey}`, {});
          // delete already deleted
          await doDelete(`/bars/${testKey}`, {});
          // delete existing
          await doDelete(`/bars/${uuid.v4()}`, {});
        });

        it('batch - sequential', async () => {
          const testKey2 = uuid.v4();
          const batch = [
            [{ // single
              href: '/bars/5de9c352-2534-11ed-84bc-9bce6d5e13f9',
              verb: 'GET',
            }],
            [{ // list
              href: '/bars',
              verb: 'GET',
            }],
            [{ // create
              href: `/bars/${testKey2}`,
              verb: 'PUT',
              body: {
                key: testKey2,
                foo: 'create'
              }
            }],
            [{ // reput
              href: `/bars/${testKey2}`,
              verb: 'PUT',
              body: {
                key: testKey2,
                foo: 'create'
              }
            }],
            [{ // update
              href: `/bars/${testKey2}`,
              verb: 'PUT',
              body: {
                key: testKey2,
                foo: 'update'
              }
            }],
            [{ // patch
              href: `/bars/${testKey2}`,
              verb: 'PATCH',
              body: [
                { op: 'replace', path: '/foo', value: 'patch' },
              ]
            }],
            [{ // delete existing
              href: `/bars/${testKey2}`,
              verb: 'DELETE',
            }],
            [{ // delete already deleted
              href: `/bars/${testKey2}`,
              verb: 'DELETE',
            }],
            [{ // delete non-existing
              href: `/bars/${uuid.v4()}`,
              verb: 'DELETE',
            }],
          ];
          await doPut('/batch', batch);
        });

        it('batch - parallel', async () => {
          const createTestBar = async (key) => {
            const body= {
              key,
              foo: 'create'
            }
            await doPut(`/bars/${key}`, body);
          }
          const testKeyP1 = uuid.v4(); // used for create in batch
          const testKeyP2 = uuid.v4();
          createTestBar(testKeyP2);
          const testKeyP3 = uuid.v4();
          createTestBar(testKeyP3);
          const testKeyP4 = uuid.v4();
          createTestBar(testKeyP4);
          const testKeyP5 = uuid.v4();
          createTestBar(testKeyP5);
          const testKeyP6 = uuid.v4();
          createTestBar(testKeyP6);
          await doDelete(`/bars/${testKeyP6}`, {});

          const batch = [
            { // single
              href: '/bars/5de9c352-2534-11ed-84bc-9bce6d5e13f9',
              verb: 'GET',
            },
            { // list
              href: '/bars',
              verb: 'GET',
            },
            { // create
              href: `/bars/${testKeyP1}`,
              verb: 'PUT',
              body: {
                key: testKeyP1,
                foo: 'create'
              }
            },
            { // reput
              href: `/bars/${testKeyP2}`,
              verb: 'PUT',
              body: {
                key: testKeyP2,
                foo: 'create'
              }
            },
            { // update
              href: `/bars/${testKeyP3}`,
              verb: 'PUT',
              body: {
                key: testKeyP3,
                foo: 'update'
              }
            },
            { // patch
              href: `/bars/${testKeyP4}`,
              verb: 'PATCH',
              body: [
                { op: 'replace', path: '/foo', value: 'patch' },
              ]
            },
            { // delete existing
              href: `/bars/${testKeyP5}`,
              verb: 'DELETE',
            },
            { // delete already deleted
              href: `/bars/${testKeyP6}`,
              verb: 'DELETE',
            },
            { // delete non-existing
              href: `/bars/${uuid.v4()}`,
              verb: 'DELETE',
            },
          ];
          await doPut('/batch', batch);
        });


        describe('via internal interface', async () => {
          it('non-batch', async () => {
            const testKey2 = uuid.v4();
            // single
            await doPost('/bars/proxy_internal_interface?method=GET&href=/bars/5de9c352-2534-11ed-84bc-9bce6d5e13f9', {});
            // list
            await doPost('/bars/proxy_internal_interface?method=GET&href=/bars', {});
            // create
            await doPost(`/bars/proxy_internal_interface?method=PUT&href=/bars/${testKey2}`, {
              key: testKey2,
              foo: 'create'
            });
            // reput
            await doPost(`/bars/proxy_internal_interface?method=PUT&href=/bars/${testKey2}`, {
              key: testKey2,
              foo: 'create'
            });
            // update
            await doPost(`/bars/proxy_internal_interface?method=PUT&href=/bars/${testKey2}`, {
              key: testKey2,
              foo: 'update'
            });
            // patch
            await doPost(`/bars/proxy_internal_interface?method=PATCH&href=/bars/${testKey2}`, [
              { op: 'replace', path: '/foo', value: 'patch' },
            ]);
            // delete existing
            await doPost(`/bars/proxy_internal_interface?method=DELETE&href=/bars/${testKey2}`, {});
            // delete already deleted
            await doPost(`/bars/proxy_internal_interface?method=DELETE&href=/bars/${testKey2}`, {});
            // delete delete non-existing
            await doPost(`/bars/proxy_internal_interface?method=DELETE&href=/bars/${uuid.v4()}`, {});

            // custom
            await doPost(`/bars/proxy_internal_interface?method=GET&href=/onlyCustom`, {});
          });

          it.skip('batch', async () => {
            // Currently batch does not seem to work in internal requests

            const testKey3 = uuid.v4();
            const batch = [
              [{ // single
                href: '/bars/5de9c352-2534-11ed-84bc-9bce6d5e13f9',
                verb: 'GET',
              }],
              [{ // list
                href: '/bars',
                verb: 'GET',
              }],
              [{ // create
                href: `/bars/${testKey3}`,
                verb: 'PUT',
                body: {
                  key: testKey3,
                  foo: 'create'
                }
              }],
              [{ // reput
                href: `/bars/${testKey3}`,
                verb: 'PUT',
                body: {
                  key: testKey3,
                  foo: 'create'
                }
              }],
              [{ // update
                href: `/bars/${testKey3}`,
                verb: 'PUT',
                body: {
                  key: testKey3,
                  foo: 'update'
                }
              }],
              [{ // patch
                href: `/bars/${testKey3}`,
                verb: 'PATCH',
                body: [
                  { op: 'replace', path: '/foo', value: 'patch' },
                ]
              }],
              [{ // delete existing
                href: `/bars/${testKey3}`,
                verb: 'DELETE',
              }],
              [{ // delete already deleted
                href: `/bars/${testKey3}`,
                verb: 'DELETE',
              }],
              [{ // delete non-existing
                href: `/bars/${uuid.v4()}`,
                verb: 'DELETE',
              }],
            ];
            await doPost(`/bars/proxy_internal_interface?method=PUT&href=/batch`, batch);
          });
        });
      });

      describe('beforeHandler (custom)', async () => {
        it('plain', async () => {
          await doGet(`/onlyCustom`);
        });

        it('batch', async () => {
          const batch = [
            {
              href: `/onlyCustom`,
              verb: 'GET',
            },
          ];
          await doPut('/batch', batch);
        });

        it('internal request', async () => {
          await doGet(`/bars/only_custom_via_internal_interface`);
        });
      });

      describe('beforeStreamHandler (custom streaming)', async () => {
        it('plain', async () => {
          await doGet(`/customStreaming/short`);
        });

        // streaming req not supported in batch or internal request -> no tests
      });

      describe('transformResponse', () => {
        it('plain', async () => {
          await doGet(`/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike`);
        });

        it('batch', async () => {
          const batch = [
            {
              href: `/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike`,
              verb: 'GET',
            },
          ];
          await doPut('/batch', batch);

          // internal request
          await doGet(`/bars/simple_like_via_internal_interface`);
        });
      });


      describe('afterRead methods', () => {
        describe('should be executed on regular resources', () => {
          it('should have a correct messagecount.', async () => {
            const response = await api.getRaw('/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849');
            if (!response.$$messagecount || response.$$messagecount < 5) {
              assert.fail('Should have at least 5 messages for community LETS Regio Dendermonde');
            }
          });
        });

        describe('should be executed on list resources', () => {
          it('should have a correct messagecount.', async () => {
            const response = await api.getRaw('/communities?hrefs=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849');
            debug('mocha', response);
            assert.equal(response.$$meta.count, 1);
            assert.equal(response.results[0].$$expanded.$$messagecount, 5);
          });
        });

        describe('should be executed on lists with many resources', () => {
          it('should have correct messagecounts on all items', async () => {
            const response = await api.getRaw('/communities?limit=4');
            debug('mocha', 'response body');
            debug('mocha', response);
            debug('mocha', response.results[2].$$expanded);
            debug('mocha', response.results[3].$$expanded);
            if (response.results[0].$$expanded.$$messagecount === null) {
              assert.fail('should have $$messagecount');
            }
            if (response.results[1].$$expanded.$$messagecount === null) {
              assert.fail('should have $$messagecount');
            }
            if (response.results[2].$$expanded.$$messagecount === null) {
              assert.fail('should have $$messagecount');
            }
            if (response.results[3].$$expanded.$$messagecount === null) {
              assert.fail('should have $$messagecount');
            }
          });
        });

        describe('Should be able to modify response headers', () => {
          it('should have a test header when reading a specific resource', async () => {
            await utils.testForStatusCode(
              () => api.getRaw('/alldatatypes/3d3e6b7a-67e3-11e8-9298-e7ebb66610b3'),
              (error) => {
                assert.equal(error.getResponseHeader('test'), 'TestHeader');
              },
            );
          });
        });

      });
    });

  });
};