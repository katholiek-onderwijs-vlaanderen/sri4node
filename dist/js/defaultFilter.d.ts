/// <reference types="node" />
import { IDatabase, ITask } from "pg-promise";
import { TInformationSchema, TPreparedSql, TResourceDefinitionInternal } from "./typeDefinitions";
/**
 * The default filter gets multiple arguments in order to analyze
 * how the user wants the result filtered.
 * The second argument is the SQL query 'so far', that will be modified (!)
 * to reflect whatever this filter wants to add to the query.
 *
 * REMARKS !!!
 * The fact that this object can be modified has been abused before to add joins etc
 * by doing string replaces.
 * This feels entirely wrong. Instead, this function should return an object containing
 * * whetever needs to be added to the where clause + the necessary parameters
 * * any joins that need to be done in order to make the where clause work
 * * any CTEs that need to be added to the query
 * * ... (adding fields to the select clause maybe?)
 * And the calling function should be responsible for using that information
 * in order to modify the query it has so far, instead of putting that responsibility here.
 *
 *
 * @param valueEnc: the search param value (after the = sign)
 * @param query: the sqlQuery object that gets modified by this function (mostly adding 'AND ...' to the where clause)!!!
 * @param parameter: the search param name (before the = sign)
 * @param mapping: the matching record from the resources array that describes for the matched path what the resources at this address will look like
 */
declare function defaultFilter(valueEnc: string, query: TPreparedSql, parameter: string, _tx: ITask<unknown> | IDatabase<unknown>, _doCount: boolean, mapping: TResourceDefinitionInternal, _urlParameters: URLSearchParams, informationSchema: TInformationSchema): void;
export { defaultFilter };
