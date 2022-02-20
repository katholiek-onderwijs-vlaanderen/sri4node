/*
Run the reference API for the test suite stand alone.
Just here for convenience.
*/
import * as sri4node from '..';
import * as context from '../test/context';

const c9hostname = process.env.C9_HOSTNAME; // eslint-disable-line
const port = process.env.PORT || 5000; //eslint-disable-line

if (c9hostname) {
  console.log(`https://${c9hostname}`);
}

context.serve(sri4node, port, true);

export = module.exports = context.serve(sri4node, port, true);
