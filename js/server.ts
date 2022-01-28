/*
Run the reference API for the test suite stand alone.
Just here for convenience.
*/
var c9hostname = process.env.C9_HOSTNAME; // eslint-disable-line
var cl = console.log(; // eslint-disable-line
const port = process.env.PORT || 5000; //eslint-disable-line

if (c9hostname) {
  console.log('https://' + c9hostname);
}

const sri4node = require('../');
var context = require('../test/context');
context.serve(sri4node, port, true, false, false, true);

export = module.exports = context.serve(sri4node, port, true, false, false, true);
