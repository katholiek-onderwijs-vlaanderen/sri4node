import { Application } from "express";
import { error, pgConnect, pgExec, tableFromMapping, transformRowToObject, transformObjectToRow, typeToMapping, urlToTypeAndKey, parseResource, debugAnyChannelAllowed } from "./js/common";
import { prepareSQL } from "./js/queryObject";
import { TSriConfig, TSriServerInstance } from "./js/typeDefinitions";
import * as queryUtils from "./js/queryUtils";
import * as schemaUtils from "./js/schemaUtils";
import * as mapUtils from "./js/mapUtils";
import * as listResource from "./js/listResource";
import * as utilLib from "./js/utilLib";
/**
 * Exposes a bunch of utility functions.
 */
declare const utils: {
    executeSQL: typeof pgExec;
    prepareSQL: typeof prepareSQL;
    convertListResourceURLToSQL: typeof listResource.getSQLFromListResource;
    addReferencingResources: typeof utilLib.addReferencingResources;
    pgConnect: typeof pgConnect;
    transformRowToObject: typeof transformRowToObject;
    transformObjectToRow: typeof transformObjectToRow;
    typeToMapping: typeof typeToMapping;
    tableFromMapping: typeof tableFromMapping;
    urlToTypeAndKey: typeof urlToTypeAndKey;
    parseResource: typeof parseResource;
};
/**
 * The main function that configures an sri4node api on top of an existing express app,
 * and based on an sriConfig object
 * @param app express application
 * @param sriConfig the config object
 */
declare function configure(app: Application, sriConfig: TSriConfig): Promise<TSriServerInstance>;
export { configure, debugAnyChannelAllowed as debug, // debugAnyChannelAllowed(ch, msg) => debug(null, ch, msg)
error, queryUtils, mapUtils, schemaUtils, utils, };
export * from "./js/typeDefinitions";
