# Release Notes

cfr. [keepachangelog.com](https://keepachangelog.com/en/1.1.0/)

- `Added` for new features.
- `Changed` for changes in existing functionality.
- `Deprecated` for soon-to-be removed features.
- `Removed` for now removed features.
- `Fixed` for any bug fixes.
- `Security` in case of vulnerabilities.

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## version 2.3.34 (28-03-2024)

### Added

- close() method to the Plugin interface, which is called when close() is called on the sri4node server instance

### Changed

- RELEASENOTES.md tries to follow the format as defined in keepachangelog.com now
  (but if we change the format of the title, we'd probably have to fix the npm release script as well!)

### Fixed

- Startup would fail if 'resources' in the configuration was an empty array

## version 2.3.33 (26-03-2024)

- package.json fix exports['.'].import so that the ESM module can be imported correctly
  by using `import * as sri4node from 'sri4node';`
  (was pointing to ./dist/sri4node.esm.js instead of ./dist/sri4node.esm.mjs)

## version 2.3.32 (01-03-2024)

- Version compatible with postgres > 12
  A small change was needed to vsko_resource_version_inc_function() that gets created a startup if
  it does not exist yet. That means that existing api's will work on postgres 15, but if this
  trigger function would removed, the api would not be able to start with older sri4node versions.
- Work on testing: it is now easy to test against various combinations of nodejs and postgres.
  Also added a github workflow to matrix test multiple combinations on each commit.

  Example: `npm run test:on_docker -- [--continue] 16,11-alpine 16,12-alpine 18,12 20,15`

## version 2.3.31 (19-02-2024)

- Updated json-stream-stringify to 3.1.2 solving an issue where the stream would not be closed properly in some cases.

## version 2.3.30 (19-02-2024)

- All default filters use EXISTS instead of IN queries now. This is a performance improvement for large datasets.
- Fixed information_schema query at start-up (would always retunr true since v2.3.29).
- Updated dependencies, solving an issue with json-stream-stringify where the stream would not be closed properly in some cases.
- Added auto-formatting with prettier and lint-staged.

## version 2.3.29 (15-02-2024)

- Improved information_schema query at start-up (using EXISTS instead of IN).

## version 2.3.28 (13-11-2023)

- Bugfix: avoid sri4node crash in case of a database connection error during a db transaction.

## version 2.3.27 (13-10-2023)

- Improved support for more complex json-schema's (containing oneOff/anyOf/allOf at the root for example)
- It used to be that storing a string in a JSONB column would not work,
  but that does work now, so it's easier to not worry too much anymore about the datatype
  and use jsonb column for almost everything
- Internal improvements:
  - Improved 'npm run test' to only run a subset of all the tests. You can now run things like:
    npm run test ./testBatch.ts ./testPutAndPatch.ts
  - A few typing improvements.
  - Updated signature of 'query' handlers, so they always have the same signature
    (defaultFilter, queryUtils, relationsFilter + the user's own filters all have
    the same signature now)

## version 2.3.26 (09-10-2023)

- startUp hook changed: it gets db and pgp as paramters now instead of a 'half-baked' sriServerInstance
  and is called even earlier as a consequence.
  - Also added tests to check whether the startUp hook gets called, and whether we are able to do
    db changes here.
- Change to version update triggers: they don't containe the schema name anymore.
  - Changed the created trigger's name in order to only contain the table name
  - Improved the code that was checking whether that trigger already existed + added test cases.
  - Added some code to cleanup OLD version update triggers that contained the schema name.
    This could lead to (harmless because identical) double triggers when dumping an api's
    schema to another schema, which is confusing.
- Added sriRequest.outStream.write('') in streaming custom JSON routes to force sending the headers
  early even if nothing has been written to the stream yet.

## version 2.3.25 (02-10-2023)

Improvement on JSON Schema utils and validation: add possibility to provide array type to schemUtils.array + do full logging of schema and document object in case of validation errors + add link to schema in http validation error reply.

## version 2.3.24 (21-09-2023)

Bugfix: fix docs, which were broken because since the release of an ESM module version,
we could not use \_\_dirname anymore to find some .pug and .css files (and we incorrectly
used pwd instead).

## version 2.3.23 (11-09-2023)

Bugfix: fix (+ new testcase) on streaming_batch code where potentially very bad interaction between stream2.push(null) and stream2.destroy() occured when enough data had been written on the stream. If the stream got destroyed before all data could have been consumed the 'end' event was never emitted and the request kept hanging forever.

## version 2.3.22 (28-08-2023)

Bugfix for list resources: url-encode the keys of the next urls (+ test case).

## version 2.3.21 (16-05-2023)

We'll list all changes since version 2.3.20

Bugs fixed:

- ESM module should now also work correctly (tests are run against both bundles)
- Note: it will not work anymore on Node 12, please use > Node 16

Other improvements:

- cleanup a few old dependencies

## version 2.3.20 (11-05-2023)

We'll list all changes since version 2.3.

Bugs fixed:

- Pass error message when error occurs during streaming and destroy connection with testcases
- Broken sriConfig.databaseConnectionParameters.connectionInitSql (it was not being executed)
- A lot of typing fixes
- Fix on custom routes: transformRequest has been moved from resource mapping to general sri4node config (is a global hook now), so make no sense anymore on custom routes + test case for customroute with transformResponse
- Fix schemautils: pattern is only valid for strings
- Fix custom query parameter combined with from/to relation
- Fixed bug which caused a silent error (and hanging requests) in case logdebug was not defined
- Fixed bug where expand=none was producing invalid next links.
- Fixed a bug in phasesyncer (phaseSyncedSettle) in case of error
- Fixes to be able to enable pg-monitor on sri4node 2.3
- Fixed generating config object based on connectionString if it contains ssl=false
- Fixed a bug where generateSriRequest in case of a batch element would have an undefined dbT property
- Removed gc-stats does (not support node > 12)

Other improvements:

- Added esbuild in order to release both an ESM and a CJS version. sri4node-security-api plugin has been updated as well to 2.3.7 in order to work with this version.
- A lot of typing improvemnts (stricter typing)
- Tests have been improved
  - Added test cases for all hooks + some fixes
  - Tests are using a docker database now (by using kov-docker-utils to make it easy to setup such a test DB)
- Upgraded most dependencies to recent versions
- Removed obsolete dependencies
- Ajv: add debugline when starting to compile schema, redirect log/warn of ajv to sri4node node
- Improved schemaUtils:
  - added typing
  - added integer()
  - extra 'pattern' parameter
  - new enum function
- Removal of obsolete test server.js
- Added close function on sri4nodeInstance (and use it in tests)
- Added check at startup to check if sri4node resource configuration and database table have same properties
- Upgrade busboy with breaking changes
- Refactor tests: remove sri-client dep and use new internal wrapper httpClient
- Added schema validation at startup (and test case) + changed debug function typing to allow any channel when called from outside sri4node (in a plugin or an application using sri4node) while still resticting internal usage to the predefined channels (typo's avoided and vscode can do autocompletion)
- Cleanup some obsolete code
- changed pretest to do cleanup of db before testing
- README.md Updates
- Removed manipulation of cn in pgConnect function. As a result connectionStrings containing ssl=false are not supported anymore (use the ssl: false flag inside the connection object)
- Added sriServerInstance as return on configure(sri4nodeConfig), new hooks startUp and errorHandler and added userData object to sriRequest
- Removed double meta fields

Known issues:

- orderBy a field containing NULL values crashes the keyOffset

## version 2.3.5 (06-10-2022)

- added sriServerInstance as return on configure(sri4nodeConfig) containing pgp, db and app associated with the configured sri4node server instanc
- added new hooks startUp and errorHandler
- added userData object to sriRequest for storing data associated with requests by applications using sri4node

## version 2.3 (02-2021)

- rewritten in typescript, so a lot of type checking has been added, and a few bugs were fixed as a result of that
- a huge amount of code cleanup has been performed as a result of adding a .eslintrc
- configuration now solely happens through the config object, so nothing is assumed to be in an environment variable anymore (mainly the database connection details)
  - there used to be a way to call dbInit yourself, but right now this is removed in favour of using databaseLibraryInitOptions
- a few extra utils have been exposed on the sri4node object under the 'utils' property
  (mainly because we found out some of them were being used by plugins by requiring commons.js directly, which does not work anymore due to the switch to typescript)
  - typeToMapping,
  - tableFromMapping,
  - urlToTypeAndKey,
  - parseResource
- the functions pgInit, pgResult, pgConnect have been removed

## sprint-248-1 (01-09-2021)

- several bugfixes/improvements:
  - fix on batch error broadcasting (unneeded 202 SriErrors where expontential with batch size generated)
  - abort server side processing of requests at phase() in case requests are aborted by the client
  - cancel rest of batch (generate 202's) after an error
  - better handling of bigints
  - set sri4node default pg idleTimeoutMillis to 4 hours instead of only 1 second
  - added option to exclude referencing resources for specified expansion types
- performance improvements:
  - replace schemavalidation lib with ajv (much faster)
  - much faster batch routing
  - combine read object requests (at start of regular resources operations) of a batch into one query
  - combine insert/update/delete of parallel batch items into one sql operation
  - do transformRequest once at start of the request instead of for each batch element
- improved tracing possibilities:
  - added Server-Timing header
  - changed debug logging, now different log 'channels' can be enabled according to which logging one wants to see
  - added possiblity to get only logging for requests returning a specific status code(s)

## sprint-239-0 (18-03-2021)

- bugfix: fix reported status of batches were an SriError was thrown in a beforePhaseHook (in the JSON output the error status was shown at a random element of the batch instead of the element causing the error).
- bugifx: replace jiff with fast-json-patch to deal better with error case like an object as input instead of array
- bugfix: adapted pg-promise initialisation to recent (breaking) pg-promise and have dbConnectionInitSql working again
- bugfix: fix in isEqualSriObject (now compare is done with correct properties)
- bugfix: for custom streaming routes, send 200 success at the end
- added 'In' for arrays explicitly to defaultFilter as alias for 'Contains' (before recent sql injection fix it was implicitly like this)
- added appendQueryObject to queryObject to be able to concat two queryObjects

## sprint-235-3 (27-01-2021)

- use different compare sql for ordering list resources (huge performance difference for database with a lot of records)
- fix on /batch_streaming to rollback database transaction in case of failure
- make sriRequest.containsDeleted functional for both list and regular resources

## sprint-235-1 (14-01-2021)

- fixed SQL injection possibilities and added 'Overlaps' filter testcases

## sprint-235-0 (14-01-2021)

- npm audit fix
- added LICENSE file

## sprint-234-0 (06-01-2021)

- treat PUT on logically deleted resource as CREATE (https://github.com/katholiek-onderwijs-vlaanderen/sri4node/issues/197)
- added new global hooks:
  - beforePhaseHook: executed at the start of each 'phase' (synchronization points for batch requests running in parallel)
    the beforePhaseHook can be used to collect data from different requests in a batch and use all collected data together in one operation (e.g. the sri4node security plugin uses this mechanism to do more efficient handling of security and the security server uses this mechanism to update configuration with all batch changes at once)
  - afterRequest: called after request is handled (db transaction is already committed or rolled back)
- modified pgInit and pgConnect to be able to optionally provide extra pgp initialization options and to be able to use pgConnect also with just a database url instead of an sri4node configuration object
- added pgResult function besides pgExec to sri4node common (in case you need more query information then just the fetched rows)
- added the option to configure an sql string to be executed at the initialization of each new db connection (dbConnectionInitSql)
- added duration time logging for all sri4node hooks
- added parentSriRequest to batch sriRequest for reference during batch operations
- bugfixes for queries with multiple recursive CTE's
- bugfixes for some internal issues (race condition, crash instead of error 500 in certain case)

## sprint-227-0 (09-09-2020)

- added a streaming variant of batch to be able to deal with huge batches without Heroku closing the connection after 30 seconds of idle time (/batch_streaming)
- bugfix on how timestamps with timezone are treated: postgress stores them with microseconds precision. sri4node used to round these timestamps to milliseconds precision which in some cases caused issues. Now the full timestamp is used for keyOffset and in the JSON output.
- removed obsolete deps and updated remaining deps

## sprint-223-4 (17-06-2020)

- fixed streaming issue (streamed JSON reply was not closed correctly), made it work for node 8 and node 12
- isPartOf query
  - added singleresource regex for resources with string key (needed for samenscholing)
  - added testcases for isPartOf query
  - added documentation for isPartOf query

## sprint-223-3 (10-06-2020)

- Node 12 compatible (with and upgrade of libraries and backward compatible with node 8)
- 'Internal' requests: to make it possible to do sri4node operations on your own API within the state of the current transaction. (see https://github.com/katholiek-onderwijs-vlaanderen/sri4node#internal-requests for more info)
- possibility to specify different pg-promise database objects for read-only database work (dbR) and other database work (dbW), this opens the possiblity to use different follower databases for read-only operations on different application instances.
- overload Protection (see https://github.com/katholiek-onderwijs-vlaanderen/sri4node#overload-protection for more info)
- all requests are marked with a boolean 'readOnly': read only requests receive a database task (read-only) while other requests receive a database transaction (for CRUD this happens automatically, for custom routes readOnly is parameter to specify).
- Added CORS handling in a seperate sri4node plugin (@kathondvla/sri4node-cors-handling-middleware-vsko) instead of in the valve. This functinality is not at all related to the valve, and by separating this functionality in a seperate plugin it becomes possible to test scenario's requiring CORS while the security plugin is disabled. To use new cors plugin, do something like this in the sri4node configuration:

        let plugins = [
          require('@kathondvla/sri4node-cors-handling-middleware-vsko')(app),
          securityPlugin,
          auditPlugin
        ];

  CORS handling in de valve is deprecated from now on. It will continue working the old way at the moment, but it is the intention that all applications add the CORS handling plugin to their sri4node configuration.
