import { pgExec } from '../js/common';

const assert = require('assert');

const queryobject = require('../js/queryObject');

const prepare = queryobject.prepareSQL;

export = module.exports = (api) => ({
  makeBasicAuthHeader: (user, pw) => `Basic ${Buffer.from(`${user}:${pw}`).toString('base64')}`,

  async lookForBasicAuthUser(req, sriRequest, db) {
    if (req.headers.authorization) {
      const basic = req.headers.authorization;
      const encoded = basic.substr(6);
      const decoded = new Buffer(encoded, 'base64').toString('utf-8');
      const firstColonIndex = decoded.indexOf(':');

      if (firstColonIndex !== -1) {
        const username = decoded.substr(0, firstColonIndex);
        const password = decoded.substr(firstColonIndex + 1);

        const query = prepare('me');
        query.sql('select * from persons where email = ').param(username).sql(' and password = ').param(password);
        const [row] = await pgExec(db, query);
        if (row !== undefined) {
          sriRequest.userObject = {
            $$meta: { permalink: `/persons/${row.key}` },
            firstname: row.firstname,
            lastname: row.lastname,
            email: row.email,
            community: { href: `/communities/${row.community}` },
          };
        }
      }
    }
  },

  copyUserInfo: async (dbT, sriRequest, parentSriRequest) => {
    sriRequest.userObject = parentSriRequest.userObject;
    sriRequest.authException = parentSriRequest.authException;
  },
  testForStatusCode: async (func:() => any, assertFunc:(any) => any) => {
    try {
      const resp = await func();
      throw 'Func() execution did not raise any error, but an error was expected.';
    } catch (error) {
      if (error.status && error.body && error.headers) { // error instanceof SriClientError) {
        await assertFunc(error);
      } else {
        assert.fail(`ERROR: ${error.toString()}`);
      }
    }
  },
})
