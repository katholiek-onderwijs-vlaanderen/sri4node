import * as common from '../../js/common';

export = module.exports = function (sri4node, extra) {


  var $s = sri4node.schemaUtils;
  var $m = sri4node.mapUtils;

  var ret = {
    type: '/store/products',
    metaType: 'SRI4NODE_STORE_PRODUCT',
    'public': false, // eslint-disable-line
    map: {
      key: {},
      name: {},
      category: {},
      package: {
        references: '/store/packages'
      },
      package2: {
        references: '/store/packages'
      },
      package3: {
        references: '/store/packages',
        columnToField: [ $m.removeifnull ]
      }      
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A product linked to a package.',
      type: 'object',
      properties: {
        key: $s.guid('Identifier.'),
        name: $s.string('Name of the package.'),
        category: $s.string('Name of the package.'),
        package: $s.permalink('/store/packages', 'Relation to package.'),
        package2: $s.permalink('/store/packages', 'Relation to package (non-mandatory).'),
        package3: $s.permalink('/store/packages', 'Relation to package (non-mandatory).')
      },
      required: ['key', 'name', 'category', 'package']
    },
  };

  common.mergeObject(extra, ret);
  return ret;
};
