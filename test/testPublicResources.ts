// Utility methods for calling the SRI interface
import * as assert from 'assert';
import { THttpClient } from './httpClient';

module.exports = function (httpClient: THttpClient) {

  describe('GET public resource', function () {

    describe('List', function () {

      describe('without authentication', function () {
        it('should return resource', async function () {
          const response = await httpClient.get({ path: '/alldatatypes?textIn=value' });
          assert.equal(response.status, 200);
        });
      });

      describe('with authentication', function () {
        it('should return resource', async function () {
          const response = await httpClient.get({ path: '/alldatatypes?textIn=value', auth: 'kevin' });
          assert.equal(response.status, 200);
        });
      });

    });

    describe('Regular resource', function () {
      describe('without authentication', function () {
        it('should return resource', async function () {
          const response = await httpClient.get({ path: '/alldatatypes/fd7e38e1-26c3-425e-9443-8a80722dfb16' });
          assert.equal(response.status, 200);
        });
      });

      describe('with authentication', function () {
        it('should return resource', async function () {
          const response = await httpClient.get({ path: '/alldatatypes/fd7e38e1-26c3-425e-9443-8a80722dfb16', auth: 'nicole' });
          assert.equal(response.status, 200);
        });
      });

    });


  });

  describe('GET private resource', function () {
    describe('List', function () {

      describe('without authentication', function () {
        it('should return 401', async function () {
          const response = await httpClient.get({ path: '/alldatatypes' })
          assert.equal(response.status, 401);
        });
      });

      describe('with authentication', function () {
        it('should return resource', async function () {
          const response = await httpClient.get({ path: '/alldatatypes', auth: 'kevin' });
          assert.equal(response.status, 200);
        });
      });

    });

    describe('Regular resource', function () {
      describe('without authentication', function () {
        it('should return 401', async function () {
          const response = await httpClient.get({ path: '/alldatatypes/de3d49e0-70df-4cf1-ad1e-6e8645049977' });
          assert.equal(response.status, 401);
        });
      });

      describe('with authentication', function () {
        it('should return resource', async function () {
          const response = await httpClient.get({ path: '/alldatatypes/de3d49e0-70df-4cf1-ad1e-6e8645049977', auth: 'nicole'});
          assert.equal(response.status, 200);
        });
      });

    });
  });

};
