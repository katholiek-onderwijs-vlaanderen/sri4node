# Release Notes

## sprint-234-0 (14-01-2021)
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
