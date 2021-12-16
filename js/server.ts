/*
Run the reference API for the test suite stand alone.
Just here for convenience.
*/
var c9hostname = process.env.C9_HOSTNAME; // eslint-disable-line
var cl = console.log; // eslint-disable-line
const port = process.env.PORT || 5000; //eslint-disable-line

if (c9hostname) {
  cl('https://' + c9hostname);
}

var roa = require('../sri4node');
var context = require('../test/context');
context.serve(roa, port, true, false, false, true);
