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
exports.addReferencingResources = void 0;
const p_map_1 = __importDefault(require("p-map"));
const common_1 = require("./common");
const typeDefinitions_1 = require("./typeDefinitions");
const queryObject_1 = require("./queryObject");
/*
  Add references from a different resource to this resource.
  * type : the resource type that has a reference to the retrieved elements.
  * column : the database column that contains the foreign key.
  * key : the name of the key to add to the retrieved elements.
  */
// TODO: refactor in v2.1 together with the whole expand story
function addReferencingResources(type, column, targetkey, excludeOnExpand) {
    return function (tx, sriRequest, elements) {
        return __awaiter(this, void 0, void 0, function* () {
            const { resources } = global.sri4node_configuration;
            const typeToMapping = (0, common_1.typeToConfig)(resources);
            const mapping = typeToMapping[type];
            if (Array.isArray(sriRequest.query.expand)) {
                throw new typeDefinitions_1.SriError({
                    status: 500,
                    errors: [
                        {
                            code: "multiple.expand.query.parameters.not.allowed",
                            msg: 'Only one "expand" query parameter value can be specified.',
                        },
                    ],
                });
            }
            const expand = sriRequest.query.expand ? sriRequest.query.expand.toLowerCase() : "full";
            if (elements &&
                elements.length &&
                elements.length > 0 &&
                expand !== "none" &&
                ((Array.isArray(excludeOnExpand) && !excludeOnExpand.includes(expand)) ||
                    !Array.isArray(excludeOnExpand))) {
                const tablename = type.split("/")[type.split("/").length - 1];
                const query = (0, queryObject_1.prepareSQL)();
                const elementKeys = [];
                const elementKeysToElement = {};
                elements.forEach(({ stored: element }) => {
                    const { permalink } = element.$$meta;
                    const elementKey = permalink.split("/")[2];
                    elementKeys.push(elementKey);
                    elementKeysToElement[elementKey] = element;
                    element[targetkey] = [];
                });
                query
                    .sql(`select *, "${column}" as fkey from ${tablename} where "${column}" in (`)
                    .array(elementKeys)
                    .sql(') and "$$meta.deleted" = false');
                const rows = yield (0, common_1.pgExec)(tx, query);
                yield (0, p_map_1.default)(rows, (row) => __awaiter(this, void 0, void 0, function* () {
                    const element = elementKeysToElement[row.fkey];
                    const target = { href: `${type}/${row.key}` };
                    target.$$expanded = yield (0, common_1.transformRowToObject)(row, mapping);
                    element[targetkey].push(target);
                }));
            }
        });
    };
}
exports.addReferencingResources = addReferencingResources;
//# sourceMappingURL=utilLib.js.map