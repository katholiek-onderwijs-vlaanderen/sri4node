const pMap = require('p-map');

const { typeToConfig, pgExec, transformRowToObject, debug } = require('./common.js');
var queryobject = require('./queryObject.js');
const prepare = queryobject.prepareSQL; 
const expand = require('./expand.js');

exports = module.exports = {

  /*
   Add references from a different resource to this resource.
   * type : the resource type that has a reference to the retrieved elements.
   * column : the database column that contains the foreign key.
   * key : the name of the key to add to the retrieved elements.
   */  
   //TODO: refactor in v2.1 together with the whole expand story
  addReferencingResources: function (type, column, targetkey, excludeOnExpand) {
    'use strict';


    return async function (tx, sriRequest, elements) {
      const resources = global.sri4node_configuration.resources
      const typeToMapping = typeToConfig(resources);
      const mapping = typeToMapping[type];
      const expand = sriRequest.query.expand ? sriRequest.query.expand.toLowerCase() : 'full';

      if (elements && elements.length && elements.length > 0 && expand != 'none' 
                && ( ( Array.isArray(excludeOnExpand) && !excludeOnExpand.includes(expand) ) || !Array.isArray(excludeOnExpand) )
                ) {
        const tablename = type.split('/')[type.split('/').length - 1];
        const query = prepare();
        const elementKeys = [];
        const elementKeysToElement = {};
        elements.forEach(function ( {stored: element} ) {
          const permalink = element.$$meta.permalink;
          const elementKey = permalink.split('/')[2];
          elementKeys.push(elementKey);
          elementKeysToElement[elementKey] = element;
          element[targetkey] = [];
        });

        query.sql('select *, \"' + column + '\" as fkey from ' +
          tablename + ' where \"' + column + '\" in (').array(elementKeys)
          .sql(') and \"$$meta.deleted\" = false');
        const start = new Date();
        const rows = await pgExec(tx, query)
        debug('pgExec select ... OK, addreferencingstime='+(new Date() - start)+' ms.');
        await pMap(rows, async (row) => {
          const element = elementKeysToElement[row.fkey];
          const target = {href: type + '/' + row.key};

          target.$$expanded = await transformRowToObject(row, mapping)
          element[targetkey].push(target);
        });
      }  
    };
  }
}