module.exports = function (sri4node) {
  const $s = sri4node.schemaUtils;

  return {
    type: '/invalidconfig2',
    metaType: 'SRI4NODE_INVALID_CONFIG2',
    table: 'foos',
    public: false, // eslint-disable-line
    map: {
      key: {},
      bar: {},
      foo: {}
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'Foo',
      type: 'object',
      properties: {
        key: $s.guid('Identifier.'),
        bar: $s.numeric('Just a number.'),
        foo: $s.string('Just a string'),
      },
      required: ['key', 'bar', 'foo']
    },
  };
};
