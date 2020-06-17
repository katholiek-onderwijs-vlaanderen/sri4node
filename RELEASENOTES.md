# Release Notes

## sprint-223-4 (17-06-2020)
* fixed streaming issue (streamed JSON reply was not closed correctly), made it work for node 8 and node 12
* added singleresource regex for resources with string key in isPartOf query (needed for samenscholing)
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
