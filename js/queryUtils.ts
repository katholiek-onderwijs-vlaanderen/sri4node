/* External query utilities. use in the 'query' section of your sri4node configuration */
import { tableFromMapping } from "./common";
import { SriError, TPreparedSql, TResourceDefinition } from "./typeDefinitions";
import { defaultFilter } from "./defaultFilter";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { ParsedUrlQuery } from "querystring";

/**
 *
 * @param href
 * @param query
 * @param parameter
 * @param mapping
 */
function filterHrefs(
  href: string,
  query: TPreparedSql,
  _parameter: string,
  _tx: IDatabase<unknown, IClient>,
  _doCount: boolean,
  mapping: TResourceDefinition,
  _urlParameters: ParsedUrlQuery,
) {
  const table = tableFromMapping(mapping);

  if (href) {
    const permalinks = href.split(",");
    const keys: string[] = [];
    permalinks.forEach((permalink) => {
      const key = permalink.split("/")[permalink.split("/").length - 1];
      keys.push(key);
      // use the schema to check on the format of the key because there can be resources that do not have a uuid as primarey key. Checking on length is weak anyway, do regex check on uuid, which you can get from the schema if you want to do it right.
      /* if (key.length === 36) {
          keys.push(key);
        } else {
          throw new SriError({status: 400, errors: [{ code: 'parameter.hrefs.invalid.key.length',
                                     msg: `Parameter 'href' has invalid key length for key [${key}].`,
                                     parameter: "href",
                                     value: key
                                   }]})
        } */
    });

    query.sql(` and ${table}.key in (`).array(keys).sql(") ");
  }
}

function filterReferencedType(resourcetype: string, columnname: string) {
  return function (value, query) {
    if (value) {
      const permalinks = value.split(",");
      const keys = permalinks.map((permalink) => {
        if (permalink.indexOf(`${resourcetype}/`) !== 0) {
          throw new SriError({
            status: 400,
            errors: [
              {
                code: "parameter.referenced.type.invalid.value",
                msg: `Parameter '${columnname}' should start with '${`${resourcetype}/`}'.`,
                parameter: columnname,
                value: permalink,
              },
            ],
          });
        }
        const key = permalink.split("/")[permalink.split("/").length - 1];
        // use the schema to check on the format of the key because there can be resources that do not have a uuid as primarey key. Checking on length is weak anyway, do regex check on uuid, which you can get from the schema if you want to do it right.
        /* if (key.length !== 36) {
          throw new SriError({status: 400, errors: [{ code: 'parameter.referenced.type.invalid.key.length',
                                     msg: `Parameter '${columnname}' contains key with invalid length for key [${key}].`,
                                     parameter: columnname,
                                     value: permalink
                                   }]})
        } */
        return key;
      });

      query.sql(` and "${columnname}" in (`).array(keys).sql(") ");
    }
  };
}

function modifiedSince(
  value: string,
  query: TPreparedSql,
  _parameter: string,
  _tx: IDatabase<unknown, IClient>,
  _doCount: boolean,
  mapping: TResourceDefinition,
  _urlParameters: ParsedUrlQuery,
) {
  const table = tableFromMapping(mapping);

  query.sql(` AND ${table}."$$meta.modified" >= `).param(value);

  return query;
}

export { filterHrefs, filterReferencedType, modifiedSince, defaultFilter };
