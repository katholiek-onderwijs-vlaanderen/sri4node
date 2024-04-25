/* Handles the ?expand parameter */
import _ from "lodash";
import pMap from "p-map";
// import pMap from 'p-map'; // This module is declared with 'export =', and can only be used with a default import when using the 'esModuleInterop' flag.
import {
  debug,
  typeToConfig,
  sqlColumnNames,
  transformRowToObject,
  tableFromMapping,
  pgExec,
} from "./common";
import {
  SriError,
  TAfterReadHook,
  TInformationSchema,
  TPgColumns,
  TResourceDefinitionInternal,
  TSriInternalUtils,
  TSriRequestExternal,
} from "./typeDefinitions";
import { prepareSQL } from "./queryObject";
import { applyHooks } from "./hooks";
import { IDatabase } from "pg-promise";

const checkRecurse = (expandpath: string) => {
  const parts: Array<string> = expandpath.split(".");
  if (parts.length > 1) {
    return { expand: parts[0], recurse: true, recursepath: _.tail(parts).join(".") };
  }
  return { expand: expandpath, recurse: false, recursepath: undefined };
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
async function executeSingleExpansion(
  db,
  sriRequest: TSriRequestExternal,
  elements: Array<Record<string, any>>,
  mapping: TResourceDefinitionInternal,
  resources: Array<TResourceDefinitionInternal>,
  expandpath: string,
  sriInternalUtils: TSriInternalUtils,
) {
  // console.log(expandpath)
  if (elements && elements.length > 0) {
    const { expand, recurse, recursepath } = checkRecurse(expandpath);
    if (!mapping.map?.[expand]) {
      debug("trace", `expand - rejecting expand value [${expand}]`);
      throw new SriError({
        status: 404,
        errors: [
          { code: "expansion.failed", msg: `Cannot expand [${expand}] because it is not mapped.` },
        ],
      });
    } else {
      const keysToExpand: string[] = elements.reduce<string[]>((acc, element) => {
        if (element[expand]) {
          // ignore if undefined or null
          const targetlink = element[expand].href as string;
          const targetkey = _.last(targetlink.split("/")) as string;
          // Don't add already included and items that are already expanded.
          if (!acc.includes(targetkey) && !element[expand].$$expanded) {
            acc.push(targetkey);
          }
        }
        return acc;
      }, [] as string[]);

      if (keysToExpand.length > 0) {
        const targetType: any = mapping.map[expand].references;
        const typeToMapping = typeToConfig(resources);
        const targetMapping = typeToMapping[targetType];
        if (targetMapping === undefined) {
          throw new SriError({
            status: 400,
            errors: [
              {
                code: "expand.across.boundary",
                msg: "Only references to resources defined in the same sri4node configuration as the referer can be expanded.",
              },
            ],
          });
        }
        const table = tableFromMapping(targetMapping);
        const columns = sqlColumnNames(targetMapping);

        const query = prepareSQL();
        query.sql(`select ${columns} from "${table}" where key in (`).array(keysToExpand).sql(")");
        const rows = await pgExec(db, query);
        debug("trace", "expand - expansion query done");

        const expandedElements = rows.map((row) => {
          const element = transformRowToObject(row, targetMapping);
          element.$$meta.type = mapping.metaType;
          return element;
        });
        const expandedElementsDict = _.fromPairs(
          expandedElements.map((obj) => [obj.$$meta.permalink, obj]),
        );

        debug("trace", "expand - executing afterRead functions on expanded resources");
        await applyHooks<TAfterReadHook>("after read", targetMapping.afterRead, (f) =>
          f(
            db,
            sriRequest,
            expandedElements.map((e) => ({
              permalink: e.$$meta.permalink,
              incoming: null,
              stored: e,
            })),
            sriInternalUtils,
            resources,
          ),
        );

        // put expanded elements in place
        elements.forEach((elem) => {
          if (elem[expand] !== undefined && elem[expand] !== null) {
            const permalinkToExpand = elem[expand].href;
            elem[expand].$$expanded = expandedElementsDict[permalinkToExpand];
          }
        });

        if (recurse && recursepath) {
          debug("trace", `expand - recursing to next level of expansion : ${recursepath}`);
          await executeSingleExpansion(
            db,
            sriRequest,
            expandedElements,
            targetMapping,
            resources,
            recursepath,
            sriInternalUtils,
          );
        } else {
          debug("trace", "expand - executeSingleExpansion resolving");
        }
      }
    }
  }
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
  } else {
    ret = paths
      .filter((p) => !["full", "summary", "results"].includes(p.toLowerCase())) // 'full', 'results' are already handled
      .map((p) => p.replace(/^results\./, ""));
  }

  debug("trace", `expand - parseExpand() results in : ${ret}`);

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
async function executeExpansion(
  db: IDatabase<unknown>,
  sriRequest: TSriRequestExternal,
  elements,
  mapping: TResourceDefinitionInternal,
  resources: Array<TResourceDefinitionInternal>,
  sriInternalUtils: TSriInternalUtils,
) {
  const expand = sriRequest.query.get("expand");

  debug("trace", "expand - executeExpansion()");
  if (expand) {
    const paths = parseExpand(expand);
    if (paths && paths.length > 0) {
      const expandedElements = elements.map((element) => element.$$expanded || element);
      await pMap(paths, (path: string) =>
        executeSingleExpansion(
          db,
          sriRequest,
          expandedElements,
          mapping,
          resources,
          path,
          sriInternalUtils,
        ),
      );
      debug("trace", "expand - expansion done");
    }
  }
}

export { executeExpansion };
