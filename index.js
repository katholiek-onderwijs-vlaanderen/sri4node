/*
Run the reference API for the test suite stand alone.
*/

"use strict";

var roa = require("./sri4node");
var context = require("./test/context.js");
context.serve(roa, 5000, true, false, false);