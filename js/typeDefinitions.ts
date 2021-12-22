// This file should contain the shared type definitions.
// For example everything that is a part of the sriConfig object should
// have  a type definition, so it'll be easier to use for developers.
// Also internally sri4node would benfit from more strict types for the shared data structures.

import { BusboyConfig } from "busboy";
import { JSONSchema4 } from "json-schema";
import { IDatabase } from "pg-promise";

export type PluginConfig = {}

// for example /llinkid/activityplanning, so should only start with a slash and maybe only lowercase etc???
export type UriPath = string

export type DebugLevel = 'general' | 'something else';

export type ResourceMetaType = Uppercase<string>;

export type HttpMethod = 'GET' | 'PUT' | 'DELETE' | 'PATCH'  | 'POST';

export type ResourceDefinition = {
  type: UriPath,
  metaType: ResourceMetaType,

  // these next lines are put onto the same object afterwards, not by the user
  singleResourceRegex?: RegExp,
  listResourceRegex?: RegExp,
  validateKey?: (string) => boolean,

  listResultDefaultIncludeCount?: boolean,
  maxlimit?: number,
  defaultlimit?: number,
  defaultexpansion?: boolean,
  // THIS SHOULD BE A JSON SCHEMA SO MAYBE https://github.com/json-schema-tools/meta-schema
  // WILL HELP TO CORRECTLY TYPE JSON SCHEMA'S INISDE OUT CODE
  schema: JSONSchema4,
  // {
  //   $schema: "http://json-schema.org/schema#",
  //   title: "activities on a plan",
  //   "type": "object",
  //   "properties": {
  //     "key": {
  //       "type": "string",
  //       "description": "unique key",
  //       "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
  //     },
  //     "parent": {
  //       "type": "object",
  //       "description": "a permalink to the parent. either another activity or the plan",
  //       "properties": {
  //         "href": {
  //           "type": "string",
  //           "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
  //         }
  //       },
  //       "required": [
  //         "href"
  //       ]
  //     },
  //     "title": {
  //       "type": "string",
  //       "description": "name of the activity"
  //     },
  //     "description": {
  //       "type": "string",
  //       "description": "short description of the entire activity (over all weeks/the entire period of the activity)."
  //     },
  //     "period": {
  //       "type": "object",
  //       "description": "the time-range that the activities is spanning.",
  //       "properties": {
  //         "startDate": {
  //           "type": "string",
  //           "format": "date-time",
  //           "description": "Date on which this item must be published."
  //         },
  //         "endDate": {
  //           "type": "string",
  //           "format": "date-time",
  //           "description": "Date on which this item must be unpublished."
  //         }
  //       },
  //       "required": [
  //         "startDate",
  //         "endDate"
  //       ]
  //     },
  //     "goals": {
  //       "type": "array",
  //       "description": "An array of permalinks to goals (either in the base curriculum, or one of the custom curricula).",
  //       "items": {
  //         "type": "object",
  //         "description": "a permalink to the goal",
  //         "properties": {
  //           "href": {
  //             "type": "string",
  //             "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
  //           }
  //         },
  //         "required": [
  //           "href"
  //         ]
  //       }
  //     }
  //   },
  //   "required": [
  //     "key",
  //     "parent",
  //     "period"
  //   ]
  // },
  beforeUpdate?: ((any) => any)[],
  beforeInsert?: ((any) => any)[],
  afterRead?: ((any) => any)[],
  // current query
  query?: {
    defaultFilter: (arg0: any) => void
  },
  // "POSSIBLE_FUTURE_QUERY": {
  //   // THIS SHOULD ALWAYS WORK defaultFilter,
  //   _rootWithContextContains: {
  //     name: '_rootWithContextContains',
  //     // propertyName: undefined or property if this filter filters on a specific property
  //     // operatorName: '_INCLUDED_IN_ROOT'
  //     'aliases': [ 'rootWithConextContains' ],
  //     default: '*',
  //     expectedValueType: 'string[]',
  //     // option 1: the handlet to produce the SQL is per custom filter
  //     handler: function(normalizedName, value) return { where: ..., joins: ..., cte: ... }
  //     // whatn to do with customFilters that produce other query when multiple filters are combined
  //   },
  //   // option 1: the handlet to produce the SQL gets all the custom filters as input
  //   handler: function(customFilters) {} //function([ { normalizedName, value }, ... ]) return { where: ..., joins: ..., cte: ... }
  // },
  map?: { [k:string]: any },
  onlyCustom?: boolean,
  customRoutes?: Array<
    {
      routePostfix: UriPath,
      httpMethods: HttpMethod[],
      readOnly?: boolean,
      busBoy?: boolean,
      busBoyConfig?: BusboyConfig,
      binaryStream?: boolean,
      alterMapping?: (any) => any,
      transformRequest: ((any) => any)[],
      transformResponse: ((any) => any)[],
      like?: string,
      query?: string,
      beforeHandler?: (tx:IDatabase<any>, sriRequest:SriRequest, customMapping:any) => any,
      handler?: (tx:IDatabase<any>, sriRequest:SriRequest, customMapping:any) => any,
      afterHandler?: (tx:IDatabase<any>, sriRequest:SriRequest, customMapping:any, result:any) => any,

      beforeStreamingHandler?: (tx:IDatabase<any>, sriRequest:SriRequest, customMapping:any) => any,
      streamingHandler?: (tx:IDatabase<any>, sriRequest:SriRequest, stream:any) => any,
    }
  >
};

export type SriConfig = {
  // these next lines are put onto the same object afterwards, not by the user
  utils?: any,
  db?: IDatabase<any>,
  dbR?: IDatabase<any>,
  dbW?: IDatabase<any>,
  informationSchema?: any,
  id?: any,

  // the real properties !!!
  plugins?: PluginConfig[]
  enableGlobalBatch?: boolean,
  globalBatchRoutePrefix?: UriPath,
  logrequests?: boolean,
  logsql?: boolean,
  logdebug?: DebugLevel,
  description?: string,
  bodyParserLimit?: string, // example 50mb
  batchConcurrency?: number,
  overloadProtection?: {
    retryAfter?: number,
  },
  dbConnectionInitSql?: string, // example "set random_page_cost = 1.1;",

  defaultlimit?: boolean,
  trackHeapMax?: boolean,
  batchHandlerMap?: any,
  resources: ResourceDefinition[],
  beforePhase?: ((any) => any)[],

};


// TODO make more strict
export type SriRequest = any;

export type ParseTreeType = 'string' | 'number' | 'integer' | 'boolean';

export type ParseTreeProperty = { name: string, type: ParseTreeType, multiValued: boolean };

export type ParseTreeOperator = { name: string, type: ParseTreeType, multiValued: boolean };

export type ParseTreeFilter = {
  property?: ParseTreeProperty,
  operator: ParseTreeOperator,
  invertOperator: boolean,
  caseInsensitive: boolean,
  value: any,
}

export type ParseTree = {
  normalizedUrl: {
    rowFilters: ParseTreeFilter[],
    columnFilters: ParseTreeFilter[],
    listControlFilters: ParseTreeFilter[],
  }
}

// can be improved and made a lot more strict (cfr. @types/json-schema), but for now...
export type FlattenedJsonSchema = { [path: string]: { [jsonSchemaProperty: string]: any } }

// const sriConfig = {
//   "plugins": [
//     {
//       "uuid": "7569812c-a992-11ea-841b-1f780ac2b6cc"
//     },
//     {}
//   ],
//   "enableGlobalBatch": true,
//   "globalBatchRoutePrefix": "/llinkid/activityplanning",
//   "logrequests": true,
//   "logsql": true,
//   "logdebug": "general",
//   "description": "This API is to provide custom curricula",
//   "bodyParserLimit": "50mb",
//   "dbConnectionInitSql": "set random_page_cost = 1.1;",
//   "resources": [
//     {
//       "type": "/llinkid/activityplanning/activityplans/activities",
//       "metaType": "ACTIVITY",
//       "listResultDefaultIncludeCount": false,
//       "schema": {
//         "$schema": "http://json-schema.org/schema#",
//         "title": "activities on a plan",
//         "type": "object",
//         "properties": {
//           "key": {
//             "type": "string",
//             "description": "unique key",
//             "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
//           },
//           "parent": {
//             "type": "object",
//             "description": "a permalink to the parent. either another activity or the plan",
//             "properties": {
//               "href": {
//                 "type": "string",
//                 "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
//               }
//             },
//             "required": [
//               "href"
//             ]
//           },
//           "title": {
//             "type": "string",
//             "description": "name of the activity"
//           },
//           "description": {
//             "type": "string",
//             "description": "short description of the entire activity (over all weeks/the entire period of the activity)."
//           },
//           "period": {
//             "type": "object",
//             "description": "the time-range that the activities is spanning.",
//             "properties": {
//               "startDate": {
//                 "type": "string",
//                 "format": "date-time",
//                 "description": "Date on which this item must be published."
//               },
//               "endDate": {
//                 "type": "string",
//                 "format": "date-time",
//                 "description": "Date on which this item must be unpublished."
//               }
//             },
//             "required": [
//               "startDate",
//               "endDate"
//             ]
//           },
//           "goals": {
//             "type": "array",
//             "description": "An array of permalinks to goals (either in the base curriculum, or one of the custom curricula).",
//             "items": {
//               "type": "object",
//               "description": "a permalink to the goal",
//               "properties": {
//                 "href": {
//                   "type": "string",
//                   "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
//                 }
//               },
//               "required": [
//                 "href"
//               ]
//             }
//           }
//         },
//         "required": [
//           "key",
//           "parent",
//           "period"
//         ]
//       },
//       "beforeUpdate": [
//         null,
//         null
//       ],
//       "beforeInsert": [
//         null,
//         null
//       ],
//       "afterRead": [
//         null,
//         null
//       ],
//       "query": {
//         defaultFilter: function(x,y,z) {}
//       },
//       // POSSIBLE_FUTURE_QUERY
//       "customQueryParams": {
//         // THIS SHOULD ALWAYS WORK defaultFilter,
//         _rootWithContextContains: {
//           name: '_rootWithContextContains', // necessary if the key already contains that name, or do we make customQueryParams an array of object?
//           // propertyName: undefined or property if this filter filters on a specific property
//           // operatorName: '_INCLUDED_IN_ROOT'
//           'aliases': [ 'rootWithConextContains' ],
//           default: '*', // the filter value that is equivalent to not specifying the filter, if applicable
//           expectedValueType: 'string[]', // kind of 'borrowed' from typescript
//           // option 1: the handler to produce the SQL is per custom filter
//           handler: function(normalizedName, value) return { where: ..., joins: ..., cte: ... }
//           // BUT what to do with customFilters that produce other query when multiple filters are combined
//         },
//         // option 2: the handlet to produce the SQL gets all the custom filters as input
//         // (which allows for optimizing combinations of fillters, and also allows implementing a default for a custom filter)
//         handler: function(customFilters) {} //function([ { normalizedName, value }, ... ]) return { where: ..., joins: ..., cte: ... }
//       },
//       "maxlimit": 5000,
//       "map": {
//         "key": {},
//         "parentPlan": {},
//         "parentActivity": {},
//         "title": {},
//         "description": {},
//         "period": {},
//         "goals": {}
//       },
//       "customRoutes": [
//         {
//           "routePostfix": "/attachments",
//           "httpMethods": [
//             "POST"
//           ],
//           "readOnly": false,
//           "busBoy": true
//         },
//         {
//           "routePostfix": "/:key/attachments/:filename([^/]*.[A-Za-z0-9]{1,})",
//           "httpMethods": [
//             "GET"
//           ],
//           "readOnly": true,
//           "binaryStream": true
//         },
//         {
//           "routePostfix": "/:key/attachments/:attachmentKey",
//           "readOnly": false,
//           "httpMethods": [
//             "DELETE"
//           ]
//         },
//         {
//           "routePostfix": "/:key/attachments/:attachmentKey",
//           "httpMethods": [
//             "GET"
//           ],
//           "readOnly": true
//         }
//       ]
//     },
//     {
//       "type": "/llinkid/activityplanning/activityplans",
//       "metaType": "ACTIVITY_PLAN",
//       "listResultDefaultIncludeCount": false,
//       "schema": {
//         "$schema": "http://json-schema.org/schema#",
//         "title": "List of activity plans",
//         "type": "object",
//         "properties": {
//           "key": {
//             "type": "string",
//             "description": "unique key",
//             "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
//           },
//           "title": {
//             "type": "string",
//             "description": "The additional name of this curriculum"
//           },
//           "creators": {
//             "type": "array",
//             "description": "List of creators for this activityplan",
//             "minItems": 1,
//             "items": {
//               "type": "object",
//               "description": "A permalink to the authoring [organisational unit | responsibility] of this plan",
//               "properties": {
//                 "href": {
//                   "type": "string",
//                   "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
//                 }
//               },
//               "required": [
//                 "href"
//               ]
//             }
//           },
//           "context": {
//             "type": "object",
//             "description": "mandatory reference to the schoolentity that this activityplan is valid for",
//             "properties": {
//               "href": {
//                 "type": "string",
//                 "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
//               }
//             },
//             "required": [
//               "href"
//             ]
//           },
//           "issued": {
//             "type": "object",
//             "description": "the time-range that the activityplan is valid.",
//             "properties": {
//               "startDate": {
//                 "type": "string",
//                 "format": "date-time",
//                 "description": "Date on which this item must be published."
//               },
//               "endDate": {
//                 "type": "string",
//                 "format": "date-time",
//                 "description": "Date on which this item must be unpublished."
//               }
//             },
//             "required": [
//               "startDate",
//               "endDate"
//             ]
//           },
//           "curricula": {
//             "type": "array",
//             "description": "List of curricula for this activityplan",
//             "minItems": 1,
//             "items": {
//               "type": "object",
//               "description": "permalink to customcurricula or customcurriculagroup",
//               "properties": {
//                 "href": {
//                   "type": "string",
//                   "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
//                 }
//               },
//               "required": [
//                 "href"
//               ]
//             }
//           },
//           "activityplangroup": {
//             "type": "object",
//             "properties": {
//               "href": {
//                 "type": "string",
//                 "pattern": "^/llinkid/activityplanning/activityplangroups/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$",
//                 "description": "permalink to the activityplan group"
//               }
//             },
//             "required": [
//               "href"
//             ]
//           },
//           "class": {
//             "type": "object",
//             "properties": {
//               "href": {
//                 "type": "string",
//                 "pattern": "^/sam/organisationalunits/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$",
//                 "description": "permalink to a class (OU in samenscholing of type CLASS)"
//               }
//             },
//             "required": [
//               "href"
//             ]
//           },
//           "observers": {
//             "type": "array",
//             "description": "List of people/OUs who can view this activityplan",
//             "items": {
//               "type": "object",
//               "description": "A permalink to the authoring [organisational unit | responsibility] of this plan",
//               "properties": {
//                 "href": {
//                   "type": "string",
//                   "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
//                 }
//               },
//               "required": [
//                 "href"
//               ]
//             }
//           },
//           "softDeleted": {
//             "type": "string",
//             "format": "date-time",
//             "description": "a timestamp defining if/when the plan is soft-deleted"
//           }
//         },
//         "required": [
//           "key",
//           "curricula",
//           "creators",
//           "issued",
//           "class",
//           "activityplangroup"
//         ]
//       },
//       "query": {},
//       "maxlimit": 5000,
//       "map": {
//         "key": {},
//         "title": {},
//         "context": {},
//         "creators": {},
//         "issued": {},
//         "curricula": {},
//         "activityplangroup": {
//           "references": "/llinkid/activityplanning/activityplangroups"
//         },
//         "class": {},
//         "observers": {},
//         "softDeleted": {}
//       }
//     },
//     {
//       "type": "/llinkid/activityplanning/activityplangroups",
//       "metaType": "ACTIVITY_PLAN_GROUP",
//       "listResultDefaultIncludeCount": false,
//       "schema": {
//         "$schema": "http://json-schema.org/schema#",
//         "title": "List of activity plan groups",
//         "type": "object",
//         "properties": {
//           "key": {
//             "type": "string",
//             "description": "unique key of this activityplangroup",
//             "pattern": "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
//           }
//         },
//         "required": [
//           "key"
//         ]
//       },
//       "query": {},
//       "maxlimit": 5000,
//       "map": {
//         "key": {}
//       }
//     }
//   ]
// };