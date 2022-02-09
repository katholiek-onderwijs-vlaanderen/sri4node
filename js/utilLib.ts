import * as pMap from 'p-map';
import { typeToConfig, pgExec, transformRowToObject } from './common';
import { TSriRequest } from './typeDefinitions';
import { prepareSQL } from './queryObject';

const expand = require('./expand');

export = module.exports = {

  /*
   Add references from a different resource to this resource.
   * type : the resource type that has a reference to the retrieved elements.
   * column : the database column that contains the foreign key.
   * key : the name of the key to add to the retrieved elements.
   */
  // TODO: refactor in v2.1 together with the whole expand story
  addReferencingResources(type: string, column: any, targetkey: string | number, excludeOnExpand: string | string[]) {
    return async function (tx: any, sriRequest:TSriRequest, elements: { stored: any; }[]) {
      const { resources } = global.sri4node_configuration;
      const typeToMapping = typeToConfig(resources);
      const mapping = typeToMapping[type];
      const expand = sriRequest.query.expand ? sriRequest.query.expand.toLowerCase() : 'full';

      if (elements && elements.length && elements.length > 0 && expand !== 'none'
          && (
            (Array.isArray(excludeOnExpand) && !excludeOnExpand.includes(expand))
            || !Array.isArray(excludeOnExpand)
          )
      ) {
        const tablename = type.split('/')[type.split('/').length - 1];
        const query = prepareSQL();
        const elementKeys:string[] = [];
        const elementKeysToElement = {};
        elements.forEach(({ stored: element }) => {
          const { permalink } = element.$$meta;
          const elementKey = permalink.split('/')[2];
          elementKeys.push(elementKey);
          elementKeysToElement[elementKey] = element;
          element[targetkey] = [];
        });

        query.sql(`select *, \"${column}\" as fkey from ${
          tablename} where \"${column}\" in (`).array(elementKeys)
          .sql(') and \"$$meta.deleted\" = false');
        const rows = await pgExec(tx, query);
        await pMap(rows, async (row:Record<string,any>) => {
          const element = elementKeysToElement[row.fkey];
          const target:any = { href: `${type}/${row.key}` };

          target.$$expanded = await transformRowToObject(row, mapping);
          element[targetkey].push(target);
        });
      }
    };
  },
}
