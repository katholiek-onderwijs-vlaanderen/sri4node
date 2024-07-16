import { Application } from "express";
import { TSriConfig, TSriServerInstance, TSriInternalConfig } from "./js/typeDefinitions";
import * as queryUtils from "./js/queryUtils";
import * as schemaUtils from "./js/schemaUtils";
import * as mapUtils from "./js/mapUtils";
declare const exportedUtils: Omit<TSriInternalConfig["utils"], 'transformObjectToRow' | 'transformRowToObject'>;
/**
 * The main function that configures an sri4node api on top of an existing express app,
 * and based on an sriConfig object
 * @param app express application
 * @param sriInternalConfig the config object
 */
declare function configure(app: Application, sriConfig: TSriConfig): Promise<TSriServerInstance>;
export { configure, queryUtils, mapUtils, schemaUtils, exportedUtils as utils, };
export * from "./js/typeDefinitions";
