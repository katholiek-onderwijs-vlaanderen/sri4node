/*
Run the reference API for the test suite stand alone.
Just here for convenience.
*/
const devNull = require('dev-null');
const { Console } = require('console');

const dummyLogger = new Console({
  stdout: devNull(),
  stderr: devNull(),
  ignoreErrors: true,
  colorMode: false
});


import * as sri4node from '../';

const c9hostname = process.env.C9_HOSTNAME; // eslint-disable-line
const port = process.env.PORT || 5000; //eslint-disable-line

if (c9hostname) {
  console.log(`https://${c9hostname}`);
}



import * as context from '../test/context';

context.serve(sri4node, port, true, dummyLogger); // , false, false, true

export = module.exports = context.serve(sri4node, port, true, dummyLogger); // , false, false, true
