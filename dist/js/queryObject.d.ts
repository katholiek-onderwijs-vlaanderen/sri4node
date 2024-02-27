import { TPreparedSql } from "./typeDefinitions";
/**
 * A factory that returns a TPreparedSql object with the given name,
 * which can be used to construct sql queries in a dot-chaining manner.
 *
 * @param name
 * @returns a TPreparedSql object with the given name
 */
declare function prepareSQL(name?: string): TPreparedSql;
export { prepareSQL };
