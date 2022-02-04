/* External query utilities. use in the 'query' section of your sri4node configuration */
import { tableFromMapping } from './common';
import { SriError } from './typeDefinitions';

export = module.exports = {
  filterHrefs: function (value, query, key, database, count, mapping) {
    'use strict';
    var permalinks, keys, i, key, reject;
    const table = tableFromMapping(mapping)

    if (value) {
      const permalinks = value.split(',');
      const keys:string[] = [];
      permalinks.forEach( (permalink) => {
          const key = permalink.split('/')[permalink.split('/').length - 1];
          keys.push(key);
          // use the schema to check on the format of the key because there can be resources that do not have a uuid as primarey key. Checking on length is weak anyway, do regex check on uuid, which you can get from the schema if you want to do it right.
          /*if (key.length === 36) {
            keys.push(key);
          } else {
            throw new SriError({status: 400, errors: [{ code: 'parameter.hrefs.invalid.key.length',
                                       msg: `Parameter 'href' has invalid key length for key [${key}].`,
                                       parameter: "href",
                                       value: key
                                     }]})
          }*/
      })

      query.sql(' and ' + table + '.key in (').array(keys).sql(') ');
    }
  },


  filterReferencedType: function (resourcetype, columnname) {
    'use strict';
    return function (value, query) {
      if (value) {
        const permalinks = value.split(',');
        const keys = permalinks.map( permalink => {
          if (permalink.indexOf(resourcetype + '/') !== 0) {
            throw new SriError({status: 400, errors: [{ code: 'parameter.referenced.type.invalid.value',
                                       msg: `Parameter '${columnname}' should start with '${resourcetype + '/'}'.`,
                                       parameter: columnname,
                                       value: permalink
                                     }]})
          }
          const key = permalink.split('/')[permalink.split('/').length - 1];
          // use the schema to check on the format of the key because there can be resources that do not have a uuid as primarey key. Checking on length is weak anyway, do regex check on uuid, which you can get from the schema if you want to do it right.
          /*if (key.length !== 36) {
            throw new SriError({status: 400, errors: [{ code: 'parameter.referenced.type.invalid.key.length',
                                       msg: `Parameter '${columnname}' contains key with invalid length for key [${key}].`,
                                       parameter: columnname,
                                       value: permalink
                                     }]})
          }*/
          return key
        })

        query.sql(' and "' + columnname + '" in (').array(keys).sql(') ');
      }
    };
  },

  modifiedSince: function (value, query, key, database, count, mapping) {
    'use strict';
    const table = tableFromMapping(mapping)

    query.sql(' AND ' + table + '."$$meta.modified" >= ').param(value);

    return query
  },

  defaultFilter: require('./defaultFilter')
};
