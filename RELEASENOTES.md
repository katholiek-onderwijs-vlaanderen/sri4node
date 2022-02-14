# Release Notes

## version 2.3 (02-2021)

* rewritten in typescript, so a lot of type checking has been added, and a few bugs were fixed as a result of that
* a huge amount of code cleanup has been performed as a result of adding a .eslintrc
* configuration now solely happens through the config object, so nothing is assumed to be in an environment variable anymore (mainly the database connection details)
  * there used to be a way to call dbInit yourself, but right now this is removed in favour of using databaseLibraryInitOptions
* a few extra utils has been exposed on the sri4node object under the utils property
  (mainly because we found out some of them were being used by plugins by requiring commons.js directly, which does not work anymore due to the switch to typescript)
  * typeToMapping,
  * tableFromMapping,
  * urlToTypeAndKey,
  * parseResource


## sprint-248-1 (01-09-2021)

* several bugfixes/improvements:
  * fix on batch error broadcasting (unneeded 202 SriErrors where expontential with batch size generated)
  * abort server side processing of requests at phase() in case requests are aborted by the client
  * cancel rest of batch (generate 202's) after an error
  * better handling of bigints
  * set sri4node default pg idleTimeoutMillis to 4 hours instead of only 1 second
  * added option to exclude referencing resources for specified expansion types
* performance improvements:
  * replace schemavalidation lib with ajv (much faster)
  * much faster batch routing
  * combine read object requests (at start of regular resources operations) of a batch into one query
  * combine insert/update/delete of parallel batch items into one sql operation
  * do transformRequest once at start of the request instead of for each batch element
* improved tracing possibilities:
  * added Server-Timing header
  * changed debug logging, now different log 'channels' can be enabled according to which logging one wants to see
  * added possiblity to get only logging for requests returning a specific status code(s)


## sprint-239-0 (18-03-2021)
* bugfix: fix reported status of batches were an SriError was thrown in a beforePhaseHook (in the JSON output the error status was shown at a random element of the batch instead of the element causing the error).
* bugifx: replace jiff with fast-json-patch to deal better with error case like an object as input instead of array
* bugfix: adapted pg-promise initialisation to recent (breaking) pg-promise and have dbConnectionInitSql working again
* bugfix: fix in isEqualSriObject (now compare is done with correct properties)
* bugfix: for custom streaming routes, send 200 success at the end
* added 'In' for arrays explicitly to defaultFilter as alias for 'Contains' (before recent sql injection fix it was implicitly like this)
* added appendQueryObject to queryObject to be able to concat two queryObjects 

## sprint-235-3 (27-01-2021)
* use different compare sql for ordering list resources (huge performance difference for database with a lot of records)
* fix on /batch_streaming to rollback database transaction in case of failure
* make sriRequest.containsDeleted functional for both list and regular resources
## sprint-235-1 (14-01-2021)
* fixed SQL injection possibilities and added 'Overlaps' filter testcases
## sprint-235-0 (14-01-2021)
* npm audit fix
* added LICENSE file
## sprint-234-0 (06-01-2021)

* treat PUT on logically deleted resource as CREATE (https://github.com/katholiek-onderwijs-vlaanderen/sri4node/issues/197)
* added new global hooks:
    * beforePhaseHook: executed at the start of each 'phase' (synchronization points for batch requests running in parallel)
      the beforePhaseHook can be used to collect data from different requests in a batch and use all collected data together in one operation (e.g. the sri4node security plugin uses this mechanism to do more efficient handling of security and the security server uses this mechanism to update configuration with all batch changes at once)
    * afterRequest: called after request is handled (db transaction is already committed or rolled back)
* modified pgInit and pgConnect to be able to optionally provide extra pgp initialization options and to be able to use pgConnect also with just a database url instead of an sri4node configuration object
* added pgResult function besides pgExec to sri4node common (in case you need more query information then just the fetched rows)
* added the option to configure an sql string to be executed at the initialization of each new db connection (dbConnectionInitSql)
* added duration time logging for all sri4node hooks
* added parentSriRequest to batch sriRequest for reference during batch operations
* bugfixes for queries with multiple recursive CTE's
* bugfixes for some internal issues (race condition, crash instead of error 500 in certain case)

## sprint-227-0 (09-09-2020)
* added a streaming variant of batch to be able to deal with huge batches without Heroku closing the connection after 30 seconds of idle time (/batch_streaming)
* bugfix on how timestamps with timezone are treated: postgress stores them with microseconds precision. sri4node used to round these timestamps to milliseconds precision which in some cases caused issues. Now the full timestamp is used for keyOffset and in the JSON output.
* removed obsolete deps and updated remaining deps

## sprint-223-4 (17-06-2020)
* fixed streaming issue (streamed JSON reply was not closed correctly), made it work for node 8 and node 12
* isPartOf query
    * added singleresource regex for resources with string key (needed for samenscholing)
    * added testcases for isPartOf query
    * added documentation for isPartOf query

## sprint-223-3 (10-06-2020)
* Node 12 compatible (with and upgrade of libraries and backward compatible with node 8)
* 'Internal' requests: to make it possible to do sri4node operations on your own API within the state of the current transaction. (see https://github.com/katholiek-onderwijs-vlaanderen/sri4node#internal-requests for more info)
* possibility to specify different pg-promise database objects for read-only database work (dbR) and other database work (dbW), this opens the possiblity to use different follower databases for read-only operations on different application instances.
* overload Protection (see https://github.com/katholiek-onderwijs-vlaanderen/sri4node#overload-protection for more info)
* all requests are marked with a boolean 'readOnly': read only requests receive a database task (read-only) while other requests receive a database transaction (for CRUD this happens automatically, for custom routes readOnly is parameter to specify).
* Added CORS handling in a seperate sri4node plugin (@kathondvla/sri4node-cors-handling-middleware-vsko) instead of in the valve. This functinality is not at all related to the valve, and by separating this functionality in a seperate plugin it becomes possible to test scenario's requiring CORS while the security plugin is disabled. To use new cors plugin, do something like this in the sri4node configuration:

        let plugins = [
          require('@kathondvla/sri4node-cors-handling-middleware-vsko')(app),
          securityPlugin,
          auditPlugin
        ];
    CORS handling in de valve is deprecated from now on. It will continue working the old way at the moment, but it is the intention that all applications add the CORS handling plugin to their sri4node configuration.
