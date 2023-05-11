// Utility methods for calling the SRI interface
import assert from 'assert';
import * as uuid from 'uuid';
import sinon from 'sinon';
import sleep from 'await-sleep';
import fs from 'fs';

import { debug } from '../js/common';
import { THttpClient } from './httpClient';

const FormData = require('form-data');

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



module.exports = function (httpClient: THttpClient, dummyLogger) {

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
          await httpClient.get({ path: '/store/products/1edb2754-5684-1234-ae5b-ec33c903ee4d', auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);


          // read list
          dummyLoggerSpy.resetHistory();
          await httpClient.get({ path: '/store/products', auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // create
          dummyLoggerSpy.resetHistory();
          const keyp1 = uuid.v4();
          const p1 = generateRandomPerson(keyp1, communityDendermonde, 'Sara', 'Hermelink');
          await httpClient.put({ path: `/persons/${keyp1}`, body: p1, auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // put whithout changes
          dummyLoggerSpy.resetHistory();
          await httpClient.put({ path: `/persons/${keyp1}`, body: p1, auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // update
          dummyLoggerSpy.resetHistory();
          const p1update = {
            ...p1,
            firstname: 'Sarah',
          }
          await httpClient.put({ path: `/persons/${keyp1}`, body: p1update, auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // patch
          dummyLoggerSpy.resetHistory();
          const patch = [
            { op: 'replace', path: '/streetnumber', value: '25' },
          ];
          await httpClient.patch({ path: `/persons/${keyp1}`, body: patch, auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // delete existing
          dummyLoggerSpy.resetHistory();
          await httpClient.delete({ path: `/persons/${keyp1}`, auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);
          // delete already deleted
          dummyLoggerSpy.resetHistory();
          await httpClient.delete({ path: `/persons/${keyp1}`, auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);
          // delete  unexisting
          dummyLoggerSpy.resetHistory();
          await httpClient.delete({ path: `/persons/${uuid.v4()}`, auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);


          // custom -- onlyCustom
          dummyLoggerSpy.resetHistory();
          await httpClient.get({ path: '/onlyCustom', auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // custom -- normal
          dummyLoggerSpy.resetHistory();
          await httpClient.get({ path: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple', auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // custom -- like
          dummyLoggerSpy.resetHistory();
          await httpClient.get({ path: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike', auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);


          // For the streaming cases below it is not expect that beforePhase is called more then once as streaming request cannot be
          // part of a batch and so do not need to be phaseSynced.
          // But we do expect the afterRequest being called after closing the stream.

          // custom -- streaming handler JSON
          dummyLoggerSpy.resetHistory();
          const responseGet1 = await httpClient.get({ path: `/persons/downStreamJSON`, auth: 'kevin' });
          assert.equal(responseGet1.status, 200);
          // as we are in streaming mode, the after handler still run after closing the stream -> just wait a moment for it to complete
          await sleep(200);
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: 1`), true);

          // custom -- streaming handler binary
          dummyLoggerSpy.resetHistory();
          const responseGet2 = await httpClient.get({ path: `/persons/downStreamBinary`, auth: 'kevin' });
          assert.equal(responseGet2.status, 200);
          // as we are in streaming mode, the after handler still run after closing the stream -> just wait a moment for it to complete
          await sleep(200);
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: 1`), true);

          // custom -- streaming file upload (multipart form)
          dummyLoggerSpy.resetHistory();
          const formData = new FormData();
          formData.append('image', fs.createReadStream('test/files/test.jpg'));
          formData.append('pdf', fs.createReadStream('test/files/test.pdf'));
          const responsePost = await httpClient.post({ 
            path: `/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a/upStream`,
            headers: formData.getHeaders(),
            body: formData,
            auth: 'kevin',
          });
          assert.equal(responsePost.status, 200);
          // as we are in streaming mode, the after handler still run after closing the stream -> just wait a moment for it to complete
          await sleep(200);
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: 1`), true);


          // isPartOf
          dummyLoggerSpy.resetHistory();
          await httpClient.post({ path: '/countries/isPartOf', body: {
            a: { href: '/countries?nameRegEx=^be.*$' },
            b: { hrefs: ['/countries'] },
          }, auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);

          // request with internal request
          dummyLoggerSpy.resetHistory();
          await httpClient.get({ path: '/communities/customroute_via_internal_interface', auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest * 2}`), true);
        });
        it('batch request - parallel', async () => {
          const keypA = uuid.v4();
          const pA = generateRandomPerson(keypA, communityDendermonde, 'Oona', 'Hazelhof');
          await httpClient.put({ path: `/persons/${keypA}`, body: pA, auth: 'kevin' });

          const keypB = uuid.v4();
          const pB = generateRandomPerson(keypB, communityDendermonde, 'Rosemarijn', 'van der Boon');
          await httpClient.put({ path: `/persons/${keypB}`, body: pB, auth: 'kevin' });

          const keypC = uuid.v4();
          const pC = generateRandomPerson(keypC, communityDendermonde, 'Sonja', 'Lambert');
          await httpClient.put({ path: `/persons/${keypC}`, body: pC, auth: 'kevin' });

          const keypD = uuid.v4();
          const pD = generateRandomPerson(keypD, communityDendermonde, 'Elena', 'van der Hagen');
          await httpClient.put({ path: `/persons/${keypD}`, body: pD, auth: 'kevin' });

          const keypE = uuid.v4();
          const pE = generateRandomPerson(keypE, communityDendermonde, 'Stijn', 'Lindhout');
          await httpClient.put({ path: `/persons/${keypE}`, body: pE, auth: 'kevin' });
          await httpClient.delete({ path: `/persons/${keypE}`, auth: 'kevin' });

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
          await httpClient.put({ path: '/batch', body: batch, auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);
        });
        it('batch request - parallel with error', async () => {
          const keypA = uuid.v4();
          const pA = generateRandomPerson(keypA, communityDendermonde, 'Oona', 'Hazelhof');
          await httpClient.put({ path: `/persons/${keypA}`, body: pA, auth: 'kevin' });

          const keypB = uuid.v4();
          const pB = generateRandomPerson(keypB, communityDendermonde, 'Rosemarijn', 'van der Boon');
          await httpClient.put({ path: `/persons/${keypB}`, body: pB, auth: 'kevin' });

          const keypC = uuid.v4();
          const pC = generateRandomPerson(keypC, communityDendermonde, 'Sonja', 'Lambert');
          await httpClient.put({ path: `/persons/${keypC}`, body: pC, auth: 'kevin' });

          const keypD = uuid.v4();
          const pD = generateRandomPerson(keypD, communityDendermonde, 'Elena', 'van der Hagen');
          await httpClient.put({ path: `/persons/${keypD}`, body: pD, auth: 'kevin' });

          const keypE = uuid.v4();
          const pE = generateRandomPerson(keypE, communityDendermonde, 'Stijn', 'Lindhout');
          await httpClient.put({ path: `/persons/${keypE}`, body: pE, auth: 'kevin' });
          await httpClient.delete({ path: `/persons/${keypE}`, auth: 'kevin' });

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
          const response = await httpClient.put({ path: '/batch', body: batch, auth: 'kevin' });
          assert.equal(response.status, 403);
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest}`), true);
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
          await httpClient.put({ path: '/batch', body: batch, auth: 'kevin' });
          assert.equal(dummyLoggerSpy.calledWith(`final beforePhaseCntr: ${nrPhasesInRequest * 8}`), true);
        });
        it('internal request', async () => {
          dummyLoggerSpy.resetHistory();
          await httpClient.get({ path: '/communities/customroute_via_internal_interface', auth: 'kevin' });
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
          await httpClient.put({ path: '/batch', body: batch, auth: 'kevin' });
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
          await httpClient.get({ path: '/bars/5de9c352-2534-11ed-84bc-9bce6d5e13f9', auth: 'kevin' });
          // list
          await httpClient.get({ path: '/bars', auth: 'kevin' });
        });
        it('create', async () => {
          const body = {
            key: testKey,
            foo: 'create'
          }
          // create
          await httpClient.put({ path: `/bars/${testKey}`, body, auth: 'kevin' });
          // reput
          await httpClient.put({ path: `/bars/${testKey}`, body, auth: 'kevin' });
        });

        it('update & patch', async () => {
          const body = {
            key: testKey,
            foo: 'update'
          }
          // update
          await httpClient.put({ path: `/bars/${testKey}`, body, auth: 'kevin' });
          // patch
          const patch = [
            { op: 'replace', path: '/foo', value: 'patch' },
          ];
          await httpClient.patch({ path: `/bars/${testKey}`, body: patch, auth: 'kevin' });
        });

        it('delete', async () => {
          // delete existing
          await httpClient.delete({ path: `/bars/${testKey}`, auth: 'kevin' });
          // delete already deleted
          await httpClient.delete({ path: `/bars/${testKey}`, auth: 'kevin' });
          // delete existing
          await httpClient.delete({ path: `/bars/${uuid.v4()}`, auth: 'kevin' });
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
          await httpClient.put({ path: '/batch', body: batch, auth: 'kevin' });
        });

        it('batch - parallel', async () => {
          const createTestBar = async (key) => {
            const body= {
              key,
              foo: 'create'
            }
            await httpClient.put({ path: `/bars/${key}`, body, auth: 'kevin' });
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
          await httpClient.delete({ path: `/bars/${testKeyP6}`, auth: 'kevin' });

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
          await httpClient.put({ path: '/batch', body: batch, auth: 'kevin' });
        });


        describe('via internal interface', async () => {
          it('non-batch', async () => {
            const testKey2 = uuid.v4();
            // single
            await httpClient.post({ path: '/bars/proxy_internal_interface?method=GET&href=/bars/5de9c352-2534-11ed-84bc-9bce6d5e13f9', auth: 'kevin' });
            // list
            await httpClient.post({ path: '/bars/proxy_internal_interface?method=GET&href=/bars', auth: 'kevin' });
            // create
            await httpClient.post({ path: `/bars/proxy_internal_interface?method=PUT&href=/bars/${testKey2}`, body: {
              key: testKey2,
              foo: 'create'
            }, auth: 'kevin' });
            // reput
            await httpClient.post({ path: `/bars/proxy_internal_interface?method=PUT&href=/bars/${testKey2}`, body: {
              key: testKey2,
              foo: 'create'
            }, auth: 'kevin' });
            // update
            await httpClient.post({ path: `/bars/proxy_internal_interface?method=PUT&href=/bars/${testKey2}`, body: {
              key: testKey2,
              foo: 'update'
            }, auth: 'kevin' });
            // patch
            await httpClient.post({ path: `/bars/proxy_internal_interface?method=PATCH&href=/bars/${testKey2}`, body: [
              { op: 'replace', path: '/foo', value: 'patch' },
            ], auth: 'kevin' });
            // delete existing
            await httpClient.post({ path: `/bars/proxy_internal_interface?method=DELETE&href=/bars/${testKey2}`, auth: 'kevin' });
            // delete already deleted
            await httpClient.post({ path: `/bars/proxy_internal_interface?method=DELETE&href=/bars/${testKey2}`, auth: 'kevin' });
            // delete delete non-existing
            await httpClient.post({ path: `/bars/proxy_internal_interface?method=DELETE&href=/bars/${uuid.v4()}`, auth: 'kevin' });

            // custom
            await httpClient.post({ path: `/bars/proxy_internal_interface?method=GET&href=/onlyCustom`, auth: 'kevin' });
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
            await httpClient.post({ path: `/bars/proxy_internal_interface?method=PUT&href=/batch`, body: batch, auth: 'kevin' });
          });
        });
      });

      describe('beforeHandler (custom)', async () => {
        it('plain', async () => {
          await httpClient.get({ path: `/onlyCustom`, auth: 'kevin' });
        });

        it('batch', async () => {
          const batch = [
            {
              href: `/onlyCustom`,
              verb: 'GET',
            },
          ];
          await httpClient.put({ path: '/batch', body: batch, auth: 'kevin' });
        });

        it('internal request', async () => {
          await httpClient.get({ path: `/bars/only_custom_via_internal_interface`, auth: 'kevin' });
        });
      });

      describe('beforeStreamHandler (custom streaming)', async () => {
        it('plain', async () => {
          await httpClient.get({ path: `/customStreaming/short`, auth: 'kevin' });
        });

        // streaming req not supported in batch or internal request -> no tests
      });

      describe('transformResponse', () => {
        it('plain', async () => {
          await httpClient.get({ path: `/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike`, auth: 'kevin' });
        });

        it('batch', async () => {
          const batch = [
            {
              href: `/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike`,
              verb: 'GET',
            },
          ];
          await httpClient.put({ path: '/batch', body: batch, auth: 'kevin' });

          // internal request
          await httpClient.get({ path: `/bars/simple_like_via_internal_interface`, auth: 'kevin' });
        });
      });


      describe('afterRead methods', () => {
        describe('should be executed on regular resources', () => {
          it('should have a correct messagecount.', async () => {
            const response = await httpClient.get({ path: '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849', auth: 'kevin' });
            if (!response.body.$$messagecount || response.body.$$messagecount < 5) {
              assert.fail('Should have at least 5 messages for community LETS Regio Dendermonde');
            }
          });
        });

        describe('should be executed on list resources', () => {
          it('should have a correct messagecount.', async () => {
            const response = await httpClient.get({ path: '/communities?hrefs=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849', auth: 'kevin' });
            debug('mocha', response.body);
            assert.equal(response.body.$$meta.count, 1);
            assert.equal(response.body.results[0].$$expanded.$$messagecount, 5);
          });
        });

        describe('should be executed on lists with many resources', () => {
          it('should have correct messagecounts on all items', async () => {
            const response = await httpClient.get({ path: '/communities?limit=4', auth: 'kevin' });
            debug('mocha', 'response body');
            debug('mocha', response.body);
            debug('mocha', response.body.results[2].$$expanded);
            debug('mocha', response.body.results[3].$$expanded);
            if (response.body.results[0].$$expanded.$$messagecount === null) {
              assert.fail('should have $$messagecount');
            }
            if (response.body.results[1].$$expanded.$$messagecount === null) {
              assert.fail('should have $$messagecount');
            }
            if (response.body.results[2].$$expanded.$$messagecount === null) {
              assert.fail('should have $$messagecount');
            }
            if (response.body.results[3].$$expanded.$$messagecount === null) {
              assert.fail('should have $$messagecount');
            }
          });
        });

        describe('Should be able to modify response headers', () => {
          it('should have a test header when reading a specific resource', async () => {
            const response = await httpClient.get({ path: '/alldatatypes/3d3e6b7a-67e3-11e8-9298-e7ebb66610b3', auth: 'kevin' });
            assert.equal(response.status, 400);
            assert.equal(response.headers['test'], 'TestHeader');
          });
        });

      });
    });

  });
};