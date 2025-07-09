"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyHooks = void 0;
const p_map_1 = __importDefault(require("p-map"));
const common_1 = require("./common");
const typeDefinitions_1 = require("./typeDefinitions");
function applyHooks(type, functions, 
// Array<(expressRequest:Request, sriReq:TSriRequest, dbT:unknown) => void>
// | (sriRequest:TSriRequest) => void,
// applyFun: (fun:(dbT:any, sriReq:TSriRequest, result:any) => any) => any,
applyFun, sriRequest) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        if (functions && functions.length > 0) {
            try {
                (0, common_1.debug)("hooks", `applyHooks-${type}: going to apply ${functions.length} functions`);
                yield (0, p_map_1.default)(functions, (fun) => __awaiter(this, void 0, void 0, function* () {
                    const hrstart = process.hrtime();
                    const funName = fun.name !== ""
                        ? fun.name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
                        : "anonymous-fun";
                    const stHookName = `${type.replace(/ - /g, "-").replace(/ /g, "-")}-${funName}`;
                    try {
                        yield applyFun(fun);
                        const hrend = process.hrtime(hrstart);
                        const duration = hrend[0] * 1000 + hrend[1] / 1000000;
                        (0, common_1.debug)("hooks", `applyHooks-${type}: all functions resolved (took ${duration}ms).`);
                        if (sriRequest) {
                            (0, common_1.setServerTimingHdr)(sriRequest, stHookName, duration);
                        }
                    }
                    catch (err) {
                        const hrend = process.hrtime(hrstart);
                        const duration = hrend[0] * 1000 + hrend[1] / 1000000;
                        (0, common_1.debug)("hooks", `applyHooks-${type}: function ${fun.name} failed (took ${duration}ms).`);
                        if (sriRequest) {
                            (0, common_1.setServerTimingHdr)(sriRequest, stHookName, duration);
                        }
                        throw err;
                    }
                }), { concurrency: 1 });
            }
            catch (err) {
                if (err instanceof typeDefinitions_1.SriError || ((_b = (_a = err === null || err === void 0 ? void 0 : err.__proto__) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name) === "SriError") {
                    throw err;
                }
                else {
                    console.log("_______________________ H O O K S - E R R O R _____________________________________________");
                    console.log(err);
                    console.log(err.stack);
                    console.log(Object.prototype.toString.call(err));
                    console.log("___________________________________________________________________________________________");
                    throw new typeDefinitions_1.SriError({
                        status: 500,
                        errors: [{ code: (0, common_1.errorAsCode)(`${type} failed`), msg: (0, common_1.stringifyError)(err) }],
                    });
                }
            }
        }
        else {
            (0, common_1.debug)("hooks", `applyHooks-${type}: no ${type} functions registered.`);
        }
    });
}
exports.applyHooks = applyHooks;
//# sourceMappingURL=hooks.js.map