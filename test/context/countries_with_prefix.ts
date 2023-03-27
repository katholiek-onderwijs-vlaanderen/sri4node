import { TResourceDefinition } from "../../sri4node";

module.exports = function (sri4node) {
  const $s = sri4node.schemaUtils;

  const r : TResourceDefinition = {
    type: '/prefix/countries2',
    metaType: 'SRI4NODE_PREFIX_COUNTRIES',
    map: {
      key: {},
      name: {},
      position: {},
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'Countries with their country code. (only official codes are included) </br><small>Last update: 19/11/2015</small>',
      properties: {
        key: $s.string('Official country code'),
        name: $s.string('Name of the country.'),
        position: {
          type: 'object',
          description: 'Coordinates of the country.',
          properties: {
            latitude: {
              type: 'number',
              pattern: /^(-?\d+(\.\d+)?)$/.source,
            },
            longitude: {
              type: 'number',
              pattern: /^(-?\d+(\.\d+)?)$/.source,
            },
          },
        },
      },
      required: ['key', 'name'],
    },
  };
  return r;
};
