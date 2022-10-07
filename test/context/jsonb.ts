import * as common from '../../js/common';
const sri4node = require('../../');
const $m = sri4node.mapUtils;
const $s = sri4node.schemaUtils;

module.exports = function (extra) {

  var ret = {
    type: '/jsonb',
    metaType: 'SRI4NODE_JSONB',
    'public': true, // eslint-disable-line
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'jsonb test context.',
      type: 'object',
      properties: {
        key: $s.guid(''),
        details: { "type": "object" },
        foo: $s.permalink('/foo', 'json permalink test')
      },
      required: ['key', 'details', 'foo']
    },    
    map: {
      key: {},
      details: {},
      foo: {}
    }
  };

  common.mergeObject(extra, ret);
  return ret;
};
