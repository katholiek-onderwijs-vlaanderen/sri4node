var common = require('../../js/common.js');
var roa = require('../../sri4node.js');
var $m = roa.mapUtils;

exports = module.exports = function (extra) {
  'use strict';
  var ret = {
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

  common.mergeObject(extra, ret);
  return ret;
};
