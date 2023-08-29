import { TSriRequest } from './typeDefinitions';
declare function addReferencingResources(type: string, column: any, targetkey: string | number, excludeOnExpand: string | string[]): (tx: any, sriRequest: TSriRequest, elements: {
    stored: any;
}[]) => Promise<void>;
export { addReferencingResources, };
