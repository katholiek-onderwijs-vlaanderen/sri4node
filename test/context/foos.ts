import * as common from '../../src/common';

export = module.exports = function (sri4node, extra) {


  var $s = sri4node.schemaUtils;

  var ret = {
    type: '/foos',
    metaType: 'SRI4NODE_FOO',
    'public': false, // eslint-disable-line
    map: {
      key: {},
      bar: {},
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'Foo',
      type: 'object',
      properties: {
        key: $s.guid('Identifier.'),
        bar: $s.numeric('Just a number.'),
      },
      required: ['key', 'bar']
    },
  };

  common.mergeObject(extra, ret);
  return ret;
};
