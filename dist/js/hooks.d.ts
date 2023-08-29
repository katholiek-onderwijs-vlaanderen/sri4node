import { TSriRequest } from './typeDefinitions';
declare function applyHooks(type: string, functions: Array<(...any: any[]) => any> | undefined, applyFun: (fun: (...any: any[]) => any) => any, sriRequest?: TSriRequest): Promise<void>;
export { applyHooks, };
