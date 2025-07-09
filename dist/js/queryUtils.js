"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultFilter = exports.modifiedSince = exports.filterReferencedType = exports.filterHrefs = void 0;
/* External query utilities. use in the 'query' section of your sri4node configuration */
const common_1 = require("./common");
const typeDefinitions_1 = require("./typeDefinitions");
const defaultFilter_1 = require("./defaultFilter");
Object.defineProperty(exports, "defaultFilter", { enumerable: true, get: function () { return defaultFilter_1.defaultFilter; } });
/**
 *
 * @param href
 * @param query
 * @param parameter
 * @param mapping
 */
function filterHrefs(href, query, _parameter, _tx, _doCount, mapping, _urlParameters) {
    const table = (0, common_1.tableFromMapping)(mapping);
    if (href) {
        const permalinks = href.split(",");
        const keys = [];
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
exports.filterHrefs = filterHrefs;
function filterReferencedType(resourcetype, columnname) {
    return function (value, query) {
        if (value) {
            const permalinks = value.split(",");
            const keys = permalinks.map((permalink) => {
                if (permalink.indexOf(`${resourcetype}/`) !== 0) {
                    throw new typeDefinitions_1.SriError({
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
exports.filterReferencedType = filterReferencedType;
function modifiedSince(value, query, _parameter, _tx, _doCount, mapping, _urlParameters) {
    const table = (0, common_1.tableFromMapping)(mapping);
    query.sql(` AND ${table}."$$meta.modified" >= `).param(value);
    return query;
}
exports.modifiedSince = modifiedSince;
//# sourceMappingURL=queryUtils.js.map