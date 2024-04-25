import { THttpMethod, TBatchHandlerRecord, TSriRequestHandlerForBatch, TSriInternalConfig } from "./typeDefinitions";
declare function batchFactory(sriInternalConfig: TSriInternalConfig): {
    batchFactory: typeof batchFactory;
    matchHref: (href: string, verb: THttpMethod) => {
        path: string;
        routeParams: any;
        queryParams: any;
        handler: TBatchHandlerRecord;
    };
    matchBatch: (req: any) => void;
    batchOperation: TSriRequestHandlerForBatch;
    batchOperationStreaming: TSriRequestHandlerForBatch;
};
export { batchFactory };
