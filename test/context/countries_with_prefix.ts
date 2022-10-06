import * as common from '../../js/common';

module.exports = function (sri4node, extra) {
  const $s = sri4node.schemaUtils;
  const $m = sri4node.mapUtils;

  const ret = {
    type: '/prefix/countries2',
    metaType: 'SRI4NODE_PREFIX_COUNTRIES',
    'public': false, // eslint-disable-line
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
              pattern: '^(\-?\d+(\.\d+)?)$',
            },
            longitude: {
              type: 'number',
              pattern: '^(\-?\d+(\.\d+)?)$',
            },
          },
        },
      },
      required: ['key', 'name'],
    },
  };

  common.mergeObject(extra, ret);
  return ret;
};
