"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.overloadProtectionFactory = void 0;
const common = __importStar(require("./common"));
function overloadProtectionFactory(config) {
    let usedPipelines = 0;
    let extraDrop = 0;
    return {
        canAccept: () => {
            if (config !== undefined) {
                common.debug("overloadProtection", `overloadProtection - canAccept ${extraDrop} - ${usedPipelines} - ${config.maxPipelines}`);
                if (extraDrop === 0) {
                    return usedPipelines < config.maxPipelines;
                }
                extraDrop -= 1;
                return false;
            }
            return true;
        },
        startPipeline: (nr = 1) => {
            if (config !== undefined) {
                const remainingCap = Math.max(config.maxPipelines - usedPipelines, 1);
                const nrServed = Math.min(nr, remainingCap);
                usedPipelines += nrServed;
                common.debug("overloadProtection", `overloadProtection - startPipeline(${nr}) => ${usedPipelines}/${config.maxPipelines}`);
                return nrServed;
            }
            return null;
        },
        endPipeline: (nr = 1) => {
            if (config !== undefined) {
                usedPipelines -= nr;
                common.debug("overloadProtection", `overloadProtection - endPipeline(${nr}) => ${usedPipelines}/${config.maxPipelines}`);
            }
        },
        addExtraDrops: (nr = 1) => {
            if (config !== undefined) {
                extraDrop += nr;
            }
        },
    };
}
exports.overloadProtectionFactory = overloadProtectionFactory;
//# sourceMappingURL=overloadProtection.js.map