import { pgExec } from '../js/common';
import { prepareSQL } from '../js//queryObject';

import * as assert from 'assert';
// import chalk from 'chalk';

const makeBasicAuthHeader = (user, pw) => `Basic ${Buffer.from(`${user}:${pw}`).toString('base64')}`;

const lookForBasicAuthUser = async (req, sriRequest, db) => {
  if (req.headers.authorization) {
    const basic = req.headers.authorization;
    const encoded = basic.substr(6);
    const decoded = new Buffer(encoded, 'base64').toString('utf-8');
    const firstColonIndex = decoded.indexOf(':');

    if (firstColonIndex !== -1) {
      const username = decoded.substr(0, firstColonIndex);
      const password = decoded.substr(firstColonIndex + 1);

      const query = prepareSQL('me');
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
};

const copyUserInfo = async (dbT, sriRequest, parentSriRequest) => {
  sriRequest.userObject = parentSriRequest.userObject;
  sriRequest.authException = parentSriRequest.authException;
};

const testForStatusCode = async (func:() => any, assertFunc:(any) => any) => {
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
};

/**
 * Will log to console, but blue to make this stand out from mocha's normal test result output
 * Can be used to put some logging about the test in between, and making it stand out
 * and easy to distinguish from mocha's stuff.
 * 
 * @param args 
 */
const debugLog = (...args) => {
  const chalkedArgs = args.map((a) => /* chalk.blue( */a/* ) */);
  console.log(...chalkedArgs);
}

export {
    makeBasicAuthHeader,
    lookForBasicAuthUser,
    copyUserInfo,
    testForStatusCode,
    debugLog,
};

export default function utilsFactory(api) {
  return {
    makeBasicAuthHeader,
    lookForBasicAuthUser,
    copyUserInfo,
    testForStatusCode,
  };
}
