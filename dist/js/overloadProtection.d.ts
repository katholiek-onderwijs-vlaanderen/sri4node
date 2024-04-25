import { TOverloadProtectionConfig } from "./typeDefinitions";
declare function overloadProtectionFactory(config: TOverloadProtectionConfig | undefined): {
    canAccept: () => boolean;
    startPipeline: (nr?: number) => number | null;
    endPipeline: (nr?: number) => void;
    addExtraDrops: (nr?: number) => void;
};
export { overloadProtectionFactory };
