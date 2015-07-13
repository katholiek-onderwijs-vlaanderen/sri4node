var roa = require('../../sri4node.js');
var $m = roa.mapUtils;

exports = module.exports = {
  type: '/jsonb',
  'public': true, // eslint-disable-line
  map: {
    key: {},
    details: {
      onread: $m.parse,
      onupdate: $m.stringify,
      oninsert: $m.stringify
    }
  }
};
