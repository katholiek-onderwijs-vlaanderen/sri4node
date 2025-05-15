/*
External utility functions for mapping from/to the postgres database.
Use in the 'map' section of yout sri4node configuration
*/

function removeifnull(key, e) {
  if (e[key] == null) {
    delete e[key];
  }
}

function remove(key, e) {
  delete e[key];
}

function now(key, e) {
  e[key] = new Date().toISOString();
}

function value(value) {
  return function (key, e) {
    e[key] = value;
  };
}

function parse(key, e) {
  e[key] = JSON.parse(e[key]);
}

function stringify(key, e) {
  e[key] = JSON.stringify(e[key]);
}

function base64enc(key, e) {
  if (e[key] !== null) {
    e[key] = e[key].toString("base64");
  }
}

export { removeifnull, remove, now, value, parse, stringify, base64enc };
