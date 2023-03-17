module.exports = function (sri4node) {
  const $s = sri4node.schemaUtils;

  return {
    type: '/invalidconfig1',
    metaType: 'SRI4NODE_INVALID_CONFIG1',
    table: 'foos',
    public: false, // eslint-disable-line
    map: {
      key: {},
      bAr: {},
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'Foo',
      type: 'object',
      properties: {
        key: $s.guid('Identifier.'),
        bAr: $s.numeric('Just a number.'),
      },
      required: ['key', 'bar']
    },
  };
};