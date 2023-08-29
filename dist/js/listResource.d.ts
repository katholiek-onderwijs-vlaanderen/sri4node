import { TResourceDefinition, TSriRequest } from './typeDefinitions';
declare function getSQLFromListResource(mapping: any, parameters: any, count: any, tx: any, query: any): Promise<void>;
declare function getListResource(phaseSyncer: any, tx: any, sriRequest: TSriRequest, mapping: TResourceDefinition): Promise<{
    status: number;
    body: any;
}>;
declare function isPartOf(phaseSyncer: any, tx: any, sriRequest: any, mapping: any): Promise<{
    status: number;
    body: string[];
}>;
export { getListResource, getSQLFromListResource, isPartOf, };
