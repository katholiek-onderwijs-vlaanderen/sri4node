import { TResourceDefinition } from "../../sri4node";
import * as Sri4Node from '../../index';

module.exports = function (sri4node: typeof Sri4Node) {
  const $s = sri4node.schemaUtils;
  const r : TResourceDefinition = {
    type: '/foos',
    metaType: 'SRI4NODE_FOO',
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
  return r;
};
