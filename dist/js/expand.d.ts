import { TResourceDefinitionInternal, TSriInternalUtils, TSriRequestExternal } from "./typeDefinitions";
import { IDatabase } from "pg-promise";
/**
 Execute expansion on an array of elements.
 Takes into account a comma-separated list of property paths.
 Currently only one level of items on the elements can be expanded.

 So for list resources :
 - results.href.person is OK
 - results.href.community is OK
 - results.href.person,results.href.community is OK. (2 expansions - but both 1 level)
 - results.href.person.address is NOT OK - it has 1 expansion of 2 levels. This is not supported.

 For regular resources :
 - person is OK
 - community is OK
 - person,community is OK
 - person.address,community is NOT OK - it has 1 expansion of 2 levels. This is not supported.
 */
declare function executeExpansion(db: IDatabase<unknown>, sriRequest: TSriRequestExternal, elements: any, mapping: TResourceDefinitionInternal, resources: Array<TResourceDefinitionInternal>, sriInternalUtils: TSriInternalUtils): Promise<void>;
export { executeExpansion };
