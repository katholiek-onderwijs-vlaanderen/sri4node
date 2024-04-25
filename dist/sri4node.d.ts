import { Application } from "express";
import { error, debugAnyChannelAllowed } from "./js/common";
import { TSriConfig, TSriServerInstance, TSriInternalConfig } from "./js/typeDefinitions";
import * as queryUtils from "./js/queryUtils";
import * as schemaUtils from "./js/schemaUtils";
import * as mapUtils from "./js/mapUtils";
/**
 * Exposes a bunch of utility functions.
 */
declare const utils: TSriInternalConfig["utils"];
/**
 * The main function that configures an sri4node api on top of an existing express app,
 * and based on an sriConfig object
 * @param app express application
 * @param sriInternalConfig the config object
 */
declare function configure(app: Application, sriConfig: TSriConfig): Promise<TSriServerInstance>;
export { configure, 
/**
 * @deprecated
 * This function depends on the configuration object, which is not available before
 * configure() has been called. Hence it should be removed here, and put in the
 * sri4nodeServerInstance object that is returned by configure() or passed
 * as part of every sriRequest, so it can be called whenever needed.
 */
debugAnyChannelAllowed as debug, 
/** @deprecated
 * Similar to debug, this function should be removed from here and put in the
 * sri4nodeServerInstance object that is returned by configure() or passed
 * as part of every sriRequest, so it can be called whenever needed.
 * It uses express-http-context in order to get the request id, which also feels like
 * magic that should be avoided.
 */
error, queryUtils, mapUtils, schemaUtils, utils, };
export * from "./js/typeDefinitions";
