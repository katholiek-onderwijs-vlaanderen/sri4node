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
exports.executeExpansion = void 0;
/* Handles the ?expand parameter */
const lodash_1 = __importDefault(require("lodash"));
const p_map_1 = __importDefault(require("p-map"));
// import pMap from 'p-map'; // This module is declared with 'export =', and can only be used with a default import when using the 'esModuleInterop' flag.
const common_1 = require("./common");
const typeDefinitions_1 = require("./typeDefinitions");
const queryObject_1 = require("./queryObject");
const hooks_1 = require("./hooks");
const checkRecurse = (expandpath) => {
    const parts = expandpath.split(".");
    if (parts.length > 1) {
        return { expand: lodash_1.default.first(parts), recurse: true, recursepath: lodash_1.default.tail(parts).join(".") };
    }
    return { expand: expandpath, recurse: false };
};
/**
 * Expands a single path on an array of elements.
 * Potential improvement : when the expansion would load obejcts that are already
 * in the cluster currently loaded, re-use the loaded element, rather that querying it again.
 * async function executeSingleExpansion(db, elements, mapping, resources, expandpath, me, reqUrl) {
 * @param db
 * @param sriRequest
 * @param elements
 * @param mapping
 * @param resources
 * @param expandpath
 */
function executeSingleExpansion(db, sriRequest, elements, mapping, resources, expandpath) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        // console.log(expandpath)
        if (elements && elements.length > 0) {
            const { expand, recurse, recursepath } = checkRecurse(expandpath);
            if (!((_a = mapping.map) === null || _a === void 0 ? void 0 : _a[expand])) {
                (0, common_1.debug)("trace", `expand - rejecting expand value [${expand}]`);
                throw new typeDefinitions_1.SriError({
                    status: 404,
                    errors: [
                        { code: "expansion.failed", msg: `Cannot expand [${expand}] because it is not mapped.` },
                    ],
                });
            }
            else {
                const keysToExpand = elements.reduce((acc, element) => {
                    if (element[expand]) {
                        // ignore if undefined or null
                        const targetlink = element[expand].href;
                        const targetkey = lodash_1.default.last(targetlink.split("/"));
                        // Don't add already included and items that are already expanded.
                        if (!acc.includes(targetkey) && !element[expand].$$expanded) {
                            acc.push(targetkey);
                        }
                    }
                    return acc;
                }, []);
                if (keysToExpand.length > 0) {
                    const targetType = mapping.map[expand].references;
                    const typeToMapping = (0, common_1.typeToConfig)(resources);
                    const targetMapping = typeToMapping[targetType];
                    if (targetMapping === undefined) {
                        throw new typeDefinitions_1.SriError({
                            status: 400,
                            errors: [
                                {
                                    code: "expand.across.boundary",
                                    msg: "Only references to resources defined in the same sri4node configuration as the referer can be expanded.",
                                },
                            ],
                        });
                    }
                    const table = (0, common_1.tableFromMapping)(targetMapping);
                    const columns = (0, common_1.sqlColumnNames)(targetMapping);
                    const query = (0, queryObject_1.prepareSQL)();
                    query.sql(`select ${columns} from "${table}" where key in (`).array(keysToExpand).sql(")");
                    const rows = yield (0, common_1.pgExec)(db, query);
                    (0, common_1.debug)("trace", "expand - expansion query done");
                    const expandedElements = rows.map((row) => {
                        const element = (0, common_1.transformRowToObject)(row, targetMapping);
                        element.$$meta.type = mapping.metaType;
                        return element;
                    });
                    const expandedElementsDict = lodash_1.default.fromPairs(expandedElements.map((obj) => [obj.$$meta.permalink, obj]));
                    (0, common_1.debug)("trace", "expand - executing afterRead functions on expanded resources");
                    yield (0, hooks_1.applyHooks)("after read", targetMapping.afterRead, (f) => f(db, sriRequest, expandedElements.map((e) => ({
                        permalink: e.$$meta.permalink,
                        incoming: null,
                        stored: e,
                    }))));
                    // put expanded elements in place
                    elements.forEach((elem) => {
                        if (elem[expand] !== undefined && elem[expand] !== null) {
                            const permalinkToExpand = elem[expand].href;
                            elem[expand].$$expanded = expandedElementsDict[permalinkToExpand];
                        }
                    });
                    if (recurse) {
                        (0, common_1.debug)("trace", `expand - recursing to next level of expansion : ${recursepath}`);
                        yield executeSingleExpansion(db, sriRequest, expandedElements, targetMapping, resources, recursepath);
                    }
                    else {
                        (0, common_1.debug)("trace", "expand - executeSingleExpansion resolving");
                    }
                }
            }
        }
    });
}
/**
 * Reduce comma-separated expand parameter to array, in lower case, and remove 'results.href'
 * as prefix.
 * The rest of the processing of expansion does not make a distinction between list resources
 * and regular resources. Also rewrites 'none' and 'full' to the same format.
 * If none appears anywhere in the list, an empty array is returned.
 */
function parseExpand(expand) {
    const paths = expand.split(",");
    let ret;
    if (paths.map((p) => p.toLowerCase()).includes("none")) {
        ret = [];
    }
    else {
        ret = paths
            .filter((p) => !["full", "summary", "results"].includes(p.toLowerCase())) // 'full', 'results' are already handled
            .map((p) => p.replace(/^results\./, ""));
    }
    (0, common_1.debug)("trace", `expand - parseExpand() results in : ${ret}`);
    return ret;
}
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
function executeExpansion(db, sriRequest, elements, mapping) {
    return __awaiter(this, void 0, void 0, function* () {
        const { expand } = sriRequest.query;
        const { resources } = global.sri4node_configuration;
        (0, common_1.debug)("trace", "expand - executeExpansion()");
        if (expand) {
            const paths = parseExpand(expand);
            if (paths && paths.length > 0) {
                const expandedElements = elements.map((element) => element.$$expanded || element);
                yield (0, p_map_1.default)(paths, (path) => executeSingleExpansion(db, sriRequest, expandedElements, mapping, resources, path));
                (0, common_1.debug)("trace", "expand - expansion done");
            }
        }
    });
}
exports.executeExpansion = executeExpansion;
//# sourceMappingURL=expand.js.map