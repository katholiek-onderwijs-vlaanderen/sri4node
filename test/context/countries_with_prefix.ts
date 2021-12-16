const common = require('../../js/common');

export = module.exports = function (roa, extra) {
  const $s = roa.schemaUtils;
  const $m = roa.mapUtils;

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
