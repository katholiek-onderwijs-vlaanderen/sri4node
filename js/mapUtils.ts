/*
External utility functions for mapping from/to the postgres database.
Use in the 'map' section of yout sri4node configuration
*/

export = module.exports = {
  removeifnull: function (key, e) {
    'use strict';
    if (e[key] == null) {
      delete e[key];
    }
  },

  remove: function (key, e) {
    'use strict';
    delete e[key];
  },

  now: function (key, e) {
    'use strict';
    e[key] = new Date().toISOString();
  },

  value: function (value) {
    'use strict';
    return function (key, e) {
      e[key] = value;
    };
  },

  parse: function (key, e) {
    'use strict';
    e[key] = JSON.parse(e[key]);
  },

  stringify: function (key, e) {
    'use strict';
    e[key] = JSON.stringify(e[key]);
  },

  base64enc: function (key, e) {
    'use strict';
    if (e[key] !== null) {
      e[key] = e[key].toString('base64');
    }
  }

};
