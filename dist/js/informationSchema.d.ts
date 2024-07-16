import { TInformationSchema, TSriConfig } from "./typeDefinitions";
import { IDatabase } from "pg-promise";
/**
 * Assumes that sriConfig.databaseConnectionParameters.schema is set to a single string !!!
 *
 */
declare function getInformationSchema(db: IDatabase<unknown>, sriConfig: TSriConfig): Promise<TInformationSchema>;
export { getInformationSchema };
