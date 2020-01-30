# About

An implementation of SRI (Standard ROA Interface).
SRI is a set of standards to make RESTful interfaces.
It specifies how resources are accesses, queried, updated, deleted.
The specification can [be found here][sri-specs].

The implementation supports storage on a postgres database.

# Installing

Installation is simple using npm :

    $ cd [your_project]
    $ npm install --save sri4node

You will also want to install Express.js :

    $ npm install --save express

Express.js is *technically* not a dependency (as in npm dependencies) of sri4node. But you need to pass it in when configuring. This allows you to keep full control over the order of registering express middleware.

# Changes in sri4node 2.0

In the latest version, we decided to rewrite a few things in order to be able to fix long-known problems (including the fact that GETs inside BATCH operations was not properly supported).

So if your new to sri4node, it's best to jump to [Usage](#usage) for the general principles first and then come back to read about the changes in the latest version!

## 'request' parameter

In order to fix the BATCH problem, we had to replace the express request object by our own version (which is *very* similar). At any point in the chain, you can add properties to this object that you might need later on, like the current user or something else.

The 'sriRequest' object will have the following properties (but the developer can of course add its own extra properties like user or something else to this object)

 * path: path of the request 
 * originalUrl: full url of the request 
 * query: parameters passed via the query string of the url, as object like express `{ key: value, key2: value2 }` 
 * params: parameters matched in the request route like UUID in /person/:UUID => /persons/cf2dccb2-c77c-4402-e044-d4856467bfb8, as object like express `{ key: value, key2: value2 }`
 * httpMethod: http method of the request (POST GET PUT DELETE (PATCH))
 * headers: headers of the original request (same for all requests in batch) 
 * protocol: protocol of original request (same for all requests in batch) 
 * body: body of the request 
 * sriType: type of the matching entry in the sri4node resources config
 * isBatchPart: boolean indicating whether the request being executed is part of a batch
 * db: the global sri4node pg-promise database object. **WARNING:* When using this db object directly to do database operations, each operation requests its own database connection from connection pool. When handling several http requests in parralel, each trying to get extra database connections, this can cause dead-locks! Normally the provided database task/transaction object should be used!
 * context: an object which can be used for storing information shared between requests of the same batch (by default an empty object)
 * SriError: constructor to create an error object to throw in a handler in case of error \
 `new SriError( { status, errors = [], headers = {} } )`

## 'me'

We also removed the [me](###identify) concept, allowing the implementer to add stuff to the sriRequest object as it sees fit. If that info is 'the current user', so be it, you can just as well build an API that doesn't need an identity to work.

## 'validate'

The possibility of appending '/validate' to a PUT request to see wether it would succeed is replaced by a more general 'dry run' mode. This mode is activated by adding `?dryRun=true` to the request parameters. This means that the request is executed and responsed as normal, but in the end the database transaction corresponding to the request is rolled back. 

## PATCH support

A valid patch is in [RFC6902 format][https://tools.ietf.org/html/rfc6902].

## Plugins

You have one array of plugins, that will be smart enough to add themselves to the express app.

This means that you don't need to set hooks to functions from plugins anymore (no more `onread: myplugin.onread` etc.), but that a plugin will add the proper hooks itself.

```javascript
sri4node.configure( app,
    {
            // add some sri4node plugins
            plugins : [ require( 'my-plugin' )( ... ) ],
    ...
```

On top of that: if a plugin needs another plugin to work, it should be smart enough to automatically add that other plugin also to the list of plugins, so no more 'plugin A doesn't work because it needs plugin B' (cfr. AccessControl needing OAuth, including AccessControl should suffice).

The plugins work plug and play (an 'install' function is called by sri4node during initialization with sriConfig object and the plugin will manipulate it to insert its hooks).

## Throwing errors (the http response code)

Whenever an uncaught exception happens, sri4node should be smart enough to send a 500 Internal Server Error, but when something else goes wrong, the implementer probably wants to be able to set the http response code himself (and expect the running transaction to be rolled back).

```javascript
throw new sriRequest.SriError( { status = 500, errors = [], headers = {} } )
```

When you throw an SriError somewhere in your hook code, the current request handling is terminated (of course the db transaction is also cancelled) and the request is answered according to the SriError object. So statuscode and headers of the response are set according to the values of the fields in the SirError object and the body of the response will be a JSON object contain the status (status code) and errors (errors provided in the SirError object, with 'type' field of each error set to 'ERROR' if not specified). All parameters of the SriError constructor have default values, so each parameter can be omitted.

If your code ever needs to catch SriError object (for example to do some logging), you should rethrow the original SriError at the end of the catch. At some places in sri4node the type of the error object is checked and treated different in case the type is SriError. So in case something else is throw or returned at the end of a catch, sri4node might behave unexpected. 

An example of the usage of setting extra http headers is setting the Location headers in case of redirect when not logged.

## Hooks

At the same time we took this opportunity to rename, add and remove a few 'hooks' (functions like onread, on...).

As a general principle for renaming those functions, we think that sri4node should make less assumptions about *what* these hooks are meant for, but make it clear to the implementer *when* the hook will be called.

For example: 'validate' will be replaced by 'beforeinsert/beforeupdate' to make it clear when the operation happens, but the function name doesn't suggest anymore what you should do at that time. Of course you could do some validation of the input before an insert, but you might as well dance the lambada if you wish. Sri4node shouldn't have an opinion about that.

All hooks are 'await'ed for (and the result is ignored). This makes that a hook can be a plain synchronous function or an asynchronous function. You could return a promise but this will not have any added value.


### transformRequest


```javascript
transformRequest(expressRequest, sriRequest, tx)
```

This function is called at the very start of each http request (i.e. for batch only once). Based on the expressRequest (maybe some headers?) you could make changes to the sriRequest object (like maybe add the user's identity if it can be deducted from the headers).

### beforeupdate, beforeinsert, beforedelete

These functions replace [validate](###validate) and [secure](###secure). They are called before any changes to a record on the database are performed. Since you get both the incoming version of the resource and the one currently stored in the DB here, you could do some validation here (for example if a certain property can not be altered once the resource has been created).

 * `beforeRead( tx, sriRequest )` 
 * `beforeUpdate( tx, sriRequest, [ { permalink: …, incoming: { … }, stored: { … } } ] ) )` 
 * `beforeInsert( tx, sriRequest, [ { permalink: …, incoming: { … }, stored: null } ] ) )`
 * `beforeDelete( tx, sriRequest, [ { permalink: …, incoming: null, stored: { … } } ] ) )`


The tx is a task or transaction object (a task in case of read-only context [GET], a transaction in case of possible write context [PUT,POST,DELETE]) from the pg-promise library, so you can do DB queries (*a validation check that can only be done by querying other resources too*) or updates (*maybe some logging*) here if needed. `tx.query(...)`

The last parameter will always be an array (but it will most of the time only contain one element, but in the case of lists it could have many element). This makes it easy to implement this function once with an `array.forEach( x => ... )` and allows you to make optimizations (if possible) for list queries.

Below is a code example showing how validation can be done with one beforeInsert/beforeUpdate hook. For validation, it of course makes sense to provide an error message with all validation errors. Therefore one hook function is needed, evaluating all validation function and throwing an SriError in case one or more validation functions has failed:

```javascript
const validateNoDuplicateEmailsForSamePerson = async (tx, incomingObj) => {
    const res = await readDuplicateEmailsFromDatabase(incomingObj.email)
    if (res.length > 0) {
        throw {code: duplicate.email.address, error: ... }
    }
}

const validateNationalIdentityNumber = (tx, incomingObj) => {
    ...
    if (controlNumber != calculatedControlNumber) {
        throw {code: invalid.national.identity.number, error: ... }
    }
}

const validationHook = (tx, sriRequest, elements) => {  // can be used for beforeInsert and beforeUpdate:
    pMap(elements, ({incoming}) => {
        const validationFuns = [ validateNoDuplicateEmailsForSamePerson, validateNationalIdentityNumber ]
        const validationResults = await pSettle(validationFuns.map( f => f((tx, incoming) ))
        const validationErrors = validationResults.filter(r => r.isRejected).map(r => r.reason)
        if (validationResults.length > 0) {
            throw new sriRequest.SriError({status: 409, errors: [{code: 'validation.errors', msg: 'Validation error(s)', validationErrors }]})
        }
    }
}
```


### afterread, afterupdate, afterinsert, afterdelete

The existing [afterread](#afterread), [afterupdate/afterinsert](###afterupdate/afterinsert) and [afterdelete](#afterdelete) functions will get a new signature, more in line with all the other functions (same parameters).

`stored` should still be the one *before* the operation was executed.

 * `afterRead( tx, sriRequest, [ { permalink: …, incoming: null, stored: { … } } ] ) )`
 * `afterUpdate( tx, sriRequest, [ { permalink: …, incoming: { … }, stored: { … } } ] ) )`
 * `afterInsert( tx, sriRequest, [ { permalink: …, incoming: { … }, stored: null } ] ) )`
 * `afterDelete( tx, sriRequest, [ { permalink: …, incoming: null, stored: { … } } ] ) )`

### fieldToColumn and columnToField(popertyName, value) 

Individual properties can be transformed when going to or coming from the database.

For example: an sri array of references could be stored as an array of permalinks on the DB, but should be transformed to `[ { href: "..." }, { href: "..." }, ... ]` in the API. These functions could do that mapping from API-to-DB and back. Also when storing dates as dates, but outputting them as strings in the API, this would be the place to do the transformation.

These hooks replace the now obsolete [onread](###onread)/[oninsert/onupdate](###oninsert/onupdate)... and should be configured as part of the 'mapping' component in your sri config object.
 
 * `fieldToColumn(propertyName, value)`
 * `columnToField(propertyName, value)`

### transformResponse

This replaces handlelistqueryresult(rows).

This will be called just before sending out the response to the client, and it allows you to transform any response (not only list results) at will.

This can be used if you want to generate custom output that is not necessarily sri-compliant on some route. It should not be necessary for a normal sri-compliant API (but you never know).

```javascript
transformResponse( tx, sriRequest, sriResult )
```

The sriResult object has at least following properties:
 * status
 * body
And optionally:
 * headers

### Performance enhancements

A count query is a heavy query in Postgres in case of a huge table. Therefore the count in the list result is made optional. By adding `listResultDefaultIncludeCount: false` to the configuration of a resource the count will be omitted by default. This setting can be overriden in a linst query by appending `?$$includeCount=[boolean]` to the query parameters.

Other performance enhancement is to use key offsets for the next links instead of count offsets (prev links are skipped due to not being usefull in a scenario with key offsets). Count offset is becoming more and more time consuming when the count increases (as postgres needs to construct all the results before the requested set to get the starting point) while for key offset an index can be used to determine the starting point. 

## Batch execution order

In a batch all operations in an inner list are executed in 'parallel' (in practice with a concurrency limit) but are 'phaseSynced' at three points:
- at the start of 'before' hooks
- at the start of database operations
- at the start of 'after' hooks

With 'phaseSynced' is meant that **all** operations need to be at the sync point before the operations continue (again in 'parallel'), so you can be sure that at the moment a validation rule in an after hook is evaluated all database operations of the inner batch list have been executed.
 
If a batch contains multiple lists, these lists are handled **in order** list by list (with the inner lists executed in 'phaseSynced parallel' as described above).
 
So how you construct your batch determines which operations go 'phaseSynced' parallel and which go in order.
 
A batch like the one below will be able to retrieve a newly created resource:
```
[
	[ {
	    "href": "/organisationalunits/e4f09527-a973-4510-a67c-783d388f7265",
	    "verb": "PUT",
	    "body": {
	      "key": "e4f09527-a973-4510-a67c-783d388f7265",
	      "type": "SCHOOLENTITY",
	      "names": [
		{
		  "type": "OFFICIAL",
		  "value": "Official 1",
		  "startDate": "2017-01-01"
		},
		{
		  "type": "SHORT",
		  "value": "Short 1",
		  "startDate": "2017-01-01"
		}
	      ],
	      "description": "Some description...",
	      "startDate": "2017-01-01"
	    }
	  } ],
	[ {
	    "href": "/organisationalunits/e4f09527-a973-4510-a67c-783d388f7265",
	    "verb": "GET"
	  } ]
]
```

## Deferred constraints

At the beginning of all transactions in sri4node the database constraints in Postgres are set DEFERRED. At the end of the the transaction before comitting the constraints are set back to IMMEDIATE (which result in evaluation at that moment). This is necessary to be able to multiple operations in batch and only check the constraints at the end of all operations. For example to create in a batch multiple resoures which are linked at with foreign keys at database level (example a batch creation of a person together with a contactdetail  for that person).

**But** this will only work for certain types constraints and only if they are defined DEFERRABLE. From the postgress documentation (https://www.postgresql.org/docs/9.2/sql-set-constraints.html):
> Currently, only UNIQUE, PRIMARY KEY, REFERENCES (foreign key), and EXCLUDE constraints are affected by this setting. NOT NULL and CHECK constraints are always checked immediately when a row is inserted or modified (not at the end of the statement). Uniqueness and exclusion constraints that have not been declared DEFERRABLE are also checked immediately.
 
An example from samenscholing where foreign keys are defined DEFERRABLE:

```
CREATE TABLE organisationalunits_relations (
    key UUID,
    type text NOT NULL,
    "from" UUID NOT NULL references organisationalunits DEFERRABLE INITIALLY IMMEDIATE,
    "to" UUID NOT NULL references organisationalunits DEFERRABLE INITIALLY IMMEDIATE,
    "startDate" date NOT NULL,
    "endDate" date,
    "$$meta.created" timestamp with time zone DEFAULT now() NOT NULL,
    "$$meta.modified" timestamp with time zone DEFAULT now() NOT NULL,
    "$$meta.deleted" boolean DEFAULT false NOT NULL,
    PRIMARY KEY (key)
 );
```

## Request Tracking

To be able to keep track of requests in the server logging and at the client, sri4node generates a short id for each request (reqId - not guaranteed to be uniq). This ID is used in all the sri4node logging (and also in the logging of sri4node application when they use `debug` and `error` from sri4node `common`), sri4node error responses and is passed to the client in the `vsko-req-id` header.


## Internal requests

Sometimes one wants to do sri4node operations on its own API, but within the state of the current transaction. Internal requests can be used for this purpose. You provide similar input as a http request in a javascript object with the the database transaction to execute it on. The internal calls follow the same code path as http requests (inclusive plugins like for example security checks or version tracking). global.sri4node_internal_interface has following fields:
* href: mandatory field
* verb: mandatory field
* dbT: mandatory field - database transaction of the current request
* parentSriRequest: mandatory field - the sriRequest of the current request
* headers: optional field 
* body: optional field
in case streaming following fields are also required:
* inStream: stream to read from 
* outStream: stream to write to 
* setHeader: function called to set headers before streaming
* setStatus: function called to set the status before streaming
* streamStarted: function which should return true in case streaming is started

The result will be either an object with fields status and body or an error (most likely an SriError).

Remark: sri4node  task/transaction !  so if you 

An example: 
```
    const internalReq = {
        href: '/deploys/f5b002fc-9622-4a16-8021-b71189966e48',
        verb: 'GET',
        dbT: tx,
        parentSriRequest: sriRequest,
    }

    const resp = await global.sri4node_internal_interface(internalReq);
```

### transformInternalRequest

An extra hook is defined to be able to copy data set by transformRequest (like use data) from the original (parent) request to the new internal request.

```javascript
transformInternalRequest(tx, sriRequest, parentSriRequest)
```

This function is called at creation of each sriRequest created via the 'internal' interface.


## Overload protection

Sri4node contains a protection mechanism for in case of overload. Instead of trying to handle all requests in case of overload and ending with requests receiving a response only after several seconds (or worest case even timing out), some requests are refused with an HTTP 503 (with optional a 'Retry-After' header).

To enable this mechanism, an `overloadProtection` object needs to be configured in the sri4node configuration with following fields:

* concurrency: mandatory field - the maximum number of requests being processed at the same time (after reaching this treshold, requests are being queued)
* maxQTime: mandatory field - the maximum number of millisecods requests are allowed to be in the queue (in a lot of cases it makes no sense to keep requests queued for long time); requests being timed out in the queue will get a 503 response
* maxQLen: mandatory field - the maximum number of request allowed in the queue (after reaching this treshold, requests will get a 503 response)
* retryAfter: optional field - if present, a 'Retry-After' header is sent whith the 503 responses

For example: 
```
    overloadProtection: {
        concurrency: 7,
        maxQTime: 100,
        maxQLen: 8,
        retryAfter: 1000
    },
```


## Other changes and bug fixes

 * [Deleted resource could not be retrieved as regalar resource with '$$meta.deleted=true'](https://github.com/katholiek-onderwijs-vlaanderen/sri4node/issues/128)
 * [expand is not working sometimes bug](https://github.com/katholiek-onderwijs-vlaanderen/sri4node/issues/125)
 * [Expand is expanding deleted resources.](https://github.com/katholiek-onderwijs-vlaanderen/sri4node/issues/123)
 * [If a property is missing, it is not set to null enhancement](https://github.com/katholiek-onderwijs-vlaanderen/sri4node/issues/118)
 * [Schema validation is not working bug](https://github.com/katholiek-onderwijs-vlaanderen/sri4node/issues/114)
 * [expanded addReferencingResources ignores afterRead of referencing resource enhancement](https://github.com/katholiek-onderwijs-vlaanderen/sri4node/issues/108)


# Usage

Start by requiring the module in your code.
Then we'll create some convenient aliasses for the utility functions bundled with sri4node as well.

    var express = require('express');
    var app = express();
    var sri4node = require('sri4node');
    var $u = sri4node.utils;
    var $m = sri4node.mapUtils;
    var $s = sri4node.schemaUtils;
    var $q = sri4node.queryUtils;

Finally we configure handlers for 1 example resource.
This example shows a resource for storing content as `html` with meta-data like `authors`, `themes` and `editor`.
The declaration of the editor is a reference to a second resource (/person), which itself is not shown here.

    const sriConfig = {
            // Log and time HTTP requests ?
            logrequests : true,
            // Log SQL ?
            logsql: false,
            // Log debugging information ?
            logdebug: false,
            // Log middleware timing ?
            logmiddleware: true,
            // The URL of the postgres database
            defaultdatabaseurl : "postgres://user:pwd@localhost:5432/postgres",
            forceSecureSockets: true,
            description: 'A description about the collection of resources',
            resources : [
                {
                    // Base url, maps 1:1 with a table in postgres
                    // Can be defined as /x or /x/y/..
                    // Table name will be the last part of the path
                    type: '/content',
                    // Is this resource public ?
                    // Can it be read / updated / inserted publicly ?
                    public: false,
                    // Multiple function that check access control
                    // They receive a database object and the security context
                    // as determined by the 'identify' function above.

                    // Standard JSON Schema definition.
                    // It uses utility functions, for compactness.
                    schema: {
                        $schema: "http://json-schema.org/schema#",
                        title: "An article on the websites/mailinglists.",
                        type: "object",
                        properties : {
                            authors: $s.string("Comma-separated list of authors."),
                            themes: $s.string("Comma-separated list of themes."),
                            html: $s.string("HTML content of the article.")
                        },
                        required: ["authors","themes","html"]
                    },

                    // Supported URL parameters are configured
                    // for list resources. $q is an alias for
                    // sri4node.queryUtils.
                    // This is a collection of predefined functions.
                    // You can build your own (see below).
                    // These functions can execute an arbitrary set
                    // of preparatory queries on the database,
                    // You can execute stored procedures and create
                    // temporary tables to allow you to add things like :
                    // ' AND key IN (SELECT key FROM mytemptable) '
                    // to the query being executed.
                    // Allowig any kind of filtering on
                    // the resulting list resource.
                    query: {
                        editor: $q.filterReferencedType('/persons','editor'),
                        defaultFilter: $q.defaultFilter
                    },
                    // The limit for queries. If not provided a default will be used
                    defaultlimit: 5,
                    // The maximum allowed limit for queries. If not provided a default will be used
                    maxlimit: 50,
                    // All columns in the table that appear in the
                    // resource should be declared in the 'map' object.
                    // Optionally mapping functions can be given.
                    // Mapping functions can be registered
                    // for onread, onwrite and onupdate.
                    //
                    // For GET operations the key in the 'map' object
                    // is the name of the key as it will appear in the JSON output.
                    //
                    // For PUT operations it is the key that appears
                    // on the input resource. The end result after mapping
                    // is created / updated in the database table.
                    map: {
                        authors: {},
                        themes: {},
                        html: {},
                        // Reference to another resource of type /persons.
                        // (mapping of 'persons' is not shown in this example)
                        // Can also be referenced as /x/y/.. if another resources is defined like this
                        editor: {references : '/persons'}
                    },

                    // After read, update, insert or delete
                    // you can perform extra actions.
                    beforeInsert: [ validateAuthorVersusThemes ]
                    beforeUpdate: [ validateAuthorVersusThemes ]

                    afterRead: [ checkAccessOnResource, checkSomeMoreRules, addAdditionalInfoToOutputJSON ],
                    afterUpdate: [ checkAccessOnResource, checkSomeMoreRules ],
                    afterInsert: [ checkAccessOnResource, checkSomeMoreRules ],
                    afterDelete: [ checkAccessOnResource, checkSomeMoreRules, cleanupFunction ]

                    // custom routes can be defined. See #custom-routes
                    customroutes: [
                      { routePostfix: '/:key/:attachment'
                      , httpMethods: ['GET']
                      , handler:  getAttachment
                      },
                    ],
                }
            ]
        });

Many properties of the sri4node config object have defaults and can be omitted. 
Next step is to pass the sri4node config object to the async sri4node configure function:

    await sri4node.configure(app, sriConfig);

Now we can start Express.js to start serving up our SRI REST interface :

    app.set('port', (process.env.PORT || 5000));
    app.listen(app.get('port'), function() {
        console.log('Node app is running at localhost:'' + app.get('port'))
    });


## Reserved and required fields (mandatory)

There are 4 columns that every resource table must have (it's mandatory).

Those are:

* "$$meta.deleted" boolean not null default false,
* "$$meta.modified" timestamp with time zone not null default current_timestamp,
* "$$meta.created" timestamp with time zone not null default current_timestamp,
* "$$meta.version" number which is increased on each change of the resource

The application will fail to register a resource that lacks these fields (and show a message to the user)

For performance reasons it's highly suggested that an index is created for each column:

* CREATE INDEX table_created ON *table* ("$$meta.created");
* CREATE INDEX table_modified ON *table* ("$$meta.modified");
* CREATE INDEX table_deleted ON *table* ("$$meta.deleted");
* CREATE INDEX table_verion ON *table* ("$$meta.version");

The following index is for the default order by:

* CREATE INDEX table_created_key ON *table* ("$$meta.created", "key");

It is also highly suggested to have indices on fields which can be used to filter the resources in a list resource request. Both a plain index as a LOWER() index are required as the default equality check is a case insensitive check.


## Processing Pipeline

sri4node has a very simple processing pipeline for mapping SRI resources onto a database.
We explain the possible HTTP operations below :
* reading regular resources (GET)
* updating/creating regular resources (PUT/PATCH)
* deleting regular resources (DELETE)
* reading *list* resources (queries) (GET)

In essence we map 1 *regular* resource to a database row.
A *list* resource corresponds to a query on a database table.

Expansion on list resource can be specified as `expand=results`, this will include all *regular* resources in your *list* resource.
A shorthand version of this is `expand=full`.
Expansion on list resource can also be specified as `expand=results.x.y,results.u.v.w`, where `x.y` and `u.v.w` can be any path in the expanded *regular* resource.
This will include related *regular* resources.

Expansion on *regular* resource can be specified as `expand=u.v,x.y.z`, where `u.v` and `x.y.z` can be any reference to related *regular* resources.
This will include related *regular* resources.

When reading a *regular* resource a database row is transformed into an SRI resource by doing this :

1. Execute `transformRequest` functions.
2. Execute `beforeRead` functions.
3. Retrieve the row and convert all columns into a JSON key-value pair (keys map directly to the database column name).
All standard postgreSQL datatypes are converted automatically to JSON.
Values can be transformed by an `columnToField` function (if configured).
By default references to other resources (GUIDs in the database) are expanded to form a relative URL.
As they are mapped with `{ references: '/type' }`.
4. Add a `$$meta` section to the response document.
5. Execute `afterread` functions to allow you to manipulate the result JSON.
6. Execute `transformResponse` functions to allow you to manipulate the request result.

When creating or updating a *regular* resource, a database row is updated/inserted by doing this :

1. Execute `transformRequest` functions.
2. Perform schema validation on the incoming resource.
If the schema is violated, the client will receive a 409 Conflict.
3. Execute `beforeInsert` or `beforeUpdate` functions.
4. Convert the JSON document into a simple key-value object.
Keys map 1:1 with database columns.
All incoming values are passed through the `fieldToColumn` function for conversion (if configured).
By default references to other resources (relative links in the JSON document) are reduced to foreign keys values (GUIDs) in the database.
5. insert or update the database row.
6. Execute `afterUpdate` or `afterInsert` functions.
7. Execute `transformResponse` functions to allow you to manipulate the request result.

When deleting a *regular* resource :

1. Execute `transformRequest` functions.
2. Execute `beforeDelete` functions.
3. Delete the row from the database.
4. Execute `afterDelete` functions.
5. Execute `transformResponse` functions to allow you to manipulate the request result.


When reading a *list* resource :

1. Execute `transformRequest` functions.
2. Execute `beforeRead` functions.
3. If count is requested: Generate a `SELECT COUNT` statement and execute all registered `query` functions to annotate the `WHERE` clause of the query.
4. Execute a `SELECT` statement and execute all registered `query` functions to annotate the `WHERE` clause of the query.
The `query` functions are executed if they appear in the request URL as parameters. The `query` section can also define a `defaultFilter` function. It is this default function that will be called if no other query function was registered.
5. Retrieve the results, and expand if necessary (i.e. generate a JSON document for the result row - and add it as `$$expanded`).
See the [SRI specification][sri-specs-list-resources] for more details.
6. Build a list resource with a `$$meta` section + a `results` section.
7. Execute `afterRead` functions to allow you to manipulate the result JSON.
8. Execute `transformResponse` functions to allow you to manipulate the request result.


That's it ! :-).

### Timing

If `logmiddleware` is true in the configuration the application will display a log of the timing of each
middleware.

## Function Definitions

Below is a description of the different types of functions that you can use in the configuration of sri4node.
It describes the inputs and outputs of the different functions.
These functions are assumed to be asynchronuous are will be 'awaited'.
Some of the function are called with a database transaction context, allowing you to execute SQL inside your function within the current transaction.
Such a database object can be used together with `sri4node.utils.prepareSQL()` and `sri4node.utils.executeSQL()`.
Transaction demarcation is handled by sri4node, on a per-request-basis.
That implies that `/batch` operations are all handled in a single transaction.
For more details on batch operations see the [SRI specification][sri-specs-batch].

### columnToField

Database columns are mapped 1:1 to keys in the output JSON object.
The `columnToField` function receives these arguments :

- `key` is the key the function was registered on.
- `element` is the the result of the query that was executed.

Functions are executed in order of listing in the `map` section of the configuration.
No return value is expected, this function manipulates the element in-place.
These functions allow you to do al sorts of things,
like remove the key if it is `NULL` in the database,
always remove a certain key, rename a key, etc..
A selection of predefined functions is available in `sri4node.mapUtils` (usually assigned to `$m`).
See below for details.

### fieldToColumn

JSON properties are mapped 1:1 to columns in the postgres table.
The `onupdate` and `oninsert` functions recieves these parameters :

- `key` is the key they were registered on.
- `element` is the JSON object being PUT.
- `isNewResource` is a boolean indicating wether a resource is created or updated.

All functions are executed in order of listing in the `map` section of the configuration.
All are allowed to manipulate the element, before it is inserted/updated in the table.
No return value is expected, the functions manipulate the element in-place.
A selection of predefined functions is available in `sri4node.mapUtils` (usually assign to `$m`).
See below for details.

### query 

All queries are URLs.
Any allowed URL parameter is interpreted by these functions.
The functions can annotate the `WHERE` clause of the query executed.
The functions receive these parameters :

- `value` is the value of the request parameter (string).
- `select` is a query object (as returned by `sri4node.prepareSQL()`) for adding SQL to the `WHERE` clause. See [below](#preparesql) for more details.
- `parameter` is the name of the URL parameter.
- `tx` is a database task object that you can use to execute extra SQL statements.
- `count` is a boolean telling you if you are currently decorating the `SELECT COUNT` query, or the final `SELECT` query. Useful for making sure some statements are not executed twice (when using the database object)
- `mapping` is the mapping in the configuration of sri4node.

All the configured `query` functions should extend the SQL statement with an `AND` clause.

The functions are assumed to be asynchronuous and are 'awaited'.
When the URL parameter was applied to the query object, then the promise should `resolve()`.
If one query function rejects its promise, the client received 404 Not Found and all error objects by all rejecting `query` functions in the body.
It should reject with one or an array of error objects that correspond to the [SRI definition][sri-errors].
Mind you that *path* does not makes sense for errors on URL parameters, so it is ommited.

If a query parameter is supplied that is not supported, the client also receives a 404 Not Found and a listing of supported query parameters.

### afterRead

Hook for post-processing a GET operation (both regular and list resources).
It applies to both regular resources, and list resources (with at least `expand=results`).
The function receives these parameters :

- `tx` is a database task object, allowing you to execute extra SQL statements.
- `sriRequest` is an object containing information about the request.
- `elements` is an array of one or more objects: 
    - `permalink` is the permalink of the resource
    - `incoming` is the received version of the resoured (null in case of afterRead)
    - `stored` is the stored version of the resource

The functions are assumed to be asynchronuous and are 'awaited'.
If one of the `afterread` methods rejects its promise, all error objects are returned to the client, who receives a 500 Internal Error response by default. It should `reject()` with an object that correspond to the SRI definition of an [error][sri-errors].

### afterUpdate / afterInsert

Hooks for post-processing a PUT operation can be registered to perform desired things,
like clear a cache, do further processing, update other tables, etc..
The function receives these parameters :

- `tx` is a database transaction object, allowing you to execute extra SQL statements.
- `sriRequest` is an object containing information about the request.
- `elements` is an array of one or more objects: 
    - `permalink` is the permalink of the resource
    - `incoming` is the received version of the resoured 
    - `stored` is the stored version of the resource (null in case of afterInsert)

The functions are assumed to be asynchronuous and are 'awaited'.
In case an error is thrown, all executed SQL (including the INSERT/UPDATE of the resource) is rolled back.


### afterDelete

Hook for post-processing when a record is deleted.
The function receives these parameters :

- `tx` is a database transaction object, allowing you to execute extra SQL statements.
- `sriRequest` is an object containing information about the request.
- `elements` is an array of one or more objects: 
    - `permalink` is the permalink of the resource
    - `incoming` is the received version of the resoured (null in case of afterDelete)
    - `stored` is the stored version of the resource

The functions are assumed to be asynchronuous and are 'awaited'.


## resource specific configuration variables

### metaType

Each resource needs to have a meta type specified. This meta type will be set in the meta section of each returned resource as `$$meta.type`. For example, a resource like '/sam/persons' can have a metaType like 'PERSON'.

### methods

Can be used to restrict the methods which are allowed on a resource. If not specified the default is [ 'GET','PUT','PATCH','POST','DELETE' ]

### table

Can be used to override the tablename in case it does not match the resource name.


### Custom Routes

There are three different custom scenario's possible. Two parameters are needed in all scenario's:

 - `routePostfix`: is appended to the route of the resource where the custom route is defined, example '/:key/simple'
 - `httpMethods`: array with http verbs the custom route matches

Optionally `alterMapping` can be used to create an altered mapping version for the custom route based on the normal resource mapping. For example, in the custom mapping transformResponse can be defined to alter the response specificly for the custom route.
 - `alterMapping`: function (mapping) => {}

Optionally `readOnly` can be set to `true` to get a task pg-promise object instead of a transaction object in the custom route handler.

The possbile scenario's:
  - A 'like' scenario: this scenario acts similar as an existing resource, only with a different custom mapping created with an `alterMapping` function. Parameters:
    - `like`: defines the path of regular resource to used example: "/:key". 
 - Plain custom handler: a handler generates all the custom output. Parameters:
    - `handler`: function dealing with the request: (tx, sriRequest, customMapping) => {}. Expected return is an object containing status, body and optionally headers.
    Optionally a before- and afterHandler can be defined:
    - `beforeHandler` (tx, sriRequest, customMapping) => {}
    - `afterHandler` (tx, sriRequest, customMapping, result) => {}
 - Streaming scenario. The output stream can be JSON or binary stream
    - `streamingHandler` (tx, sriRequest, stream) => {}.  The streamingHandler should only return after streaming is done.
    Optionally a beforeStreamingHandler can be defined to set status and headers (as they cannot be changed anymore once streaming is started):
    - `beforeStreamingHandler` (tx, sriRequest, customMapping) => { }. Returns an object containing `status` and `headers`. Headers is a list of [ headerName, headerValue ] lists. 
    
    To enable binary streaming:
    - `binaryStream: true`
    When doing binary streaming it makes sense to use the beforeStreamingHandler to set some 'Content-*' headers specifying the type of content.

    In the streaming scenario it is also possible to (streamingly) read multipart form data with busBoy: 
    - `busBoy`: true
    The busBoy event handlers can be set in the beforeStreamingHandler or the streamingHandler. 
    - `busBoyConfig`: optional config object to be passed to busBoy (headers will be set by sri4node).

Streaming custom requests cannot be used in batch, the others can be used in batch.

For examples of all the custom scenarios, see the code in the sri4node tests: 
 - https://github.com/katholiek-onderwijs-vlaanderen/sri4node/blob/master/test/testCustomRoutes.js
 - https://github.com/katholiek-onderwijs-vlaanderen/sri4node/blob/master/test/context/persons.js

## Limiting results

The following attributes dictate how the lists are paginated:

- `defaultlimit`: the number of resources per page. If empty, a default of 30 is used.
- `maxlimit`: The maximum limit allowed. If empty, a default of 500 is used.

The limit query parameter can be used to specify the amount of retrieved results.
A special case is allowed where the limit value is '\*' and the expand parameter is 'NONE', this means unlimited results.

## Bundled Utility Functions

These utilities live independently of the basic processing described above.
In other words, they provide no magic for the developer.
They are provided for convenience.
If you understand the above processing pipeline,
reading the source for one of these functions should contain no surprises.

### General Utilities
The utilities are found in `sri4node.utils`.


#### prepareSQL()
Used for preparing SQL. Supply a `name` to keep the query in the database as a prepared statement.
It returns a query object with these functions :

- `sql()` is a method for appending sql.
- `param(value)` is a method for appending a parameter to the SQL statement.
- `array(value)` is a method for appending an array of parameters to the SQL statement (comma-separated). Useful for generating things like `IN` clauses.
- `keys(value)` adds all keys in an object comma-separated to the SQL statement.
- `values(value)` is a method for appending all values of an object as parameters to the SQL statement. `keys` and `values` have the same iteration order.
- `with(query, virtualtablename)` is a method for adding a different query object as `WITH` statement to this query.
Allows you to use postgres Common Table Expressions (CTE) in your request parameters.
You can refer in the query to the virtual table you named with `virtualtablename`.
Use `$u.prepareSQL()` to build the SQL statement for your CTE.

All the methods on the query object can be chained. It forms a simple fluent interface.

Example of using a common table expression :

    var query = $u.prepareSQL();
    query.sql('SELECT * FROM xyz WHERE c1 IN (SELECT * FROM virtualtable)');
    var cte = $u.prepareSQL();
    cte.sql(...);
    query.with(cte,'virtualtable');

#### executeSQL(database, query)
Used for executing SQL.
Call with the a `database` object you received, and a `query` object (as returned by `prepareSQL()`, or as received for `query` functions).
The function returns a [Q promise][kriskowal-q].
**It's not a responsible of this function to close the connection on error since it's an argument, hence the caller must properly
make sure that the connection is disposed regardless of the result.**

#### addReferencingResources(type, foreignkey, targetkey)
Afterread utility function. Adds, for convenience, an array of referencing resource to the currently retrieved resource(s).
It will add an array of references to resource of `type` to the currently retrieved resource.
Specify the foreign key column (in the table of those referencing resource) via `foreignkey`.
Specify the desired key (should be `$$somekey`, as it is not actually a part of the resource, but provided for convenience) to add to the currently retrieved resource(s) via `targetkey`.

#### convertListResourceURLToSQL(req, mapping, count, database, query)
Receives a query object and constructs the SQL for a list query.

Arguments:

- `req` is the request object.
- `mapping` is the mapping in the configuration of sri4node.
- `count` a boolean to indicate if the query wanted is a count query or not.
- `database` a database obejct, allowing you to perform queries.
- `query` a query obtain via `prepareSQL`

This returns a promise that it's fulfilled when the `query` object contains the constructed SQL.

### Mapping Utilities
Provides various utilities for mapping between postgres and JSON.
These functions can be found in `sri4node.mapUtils`.

#### removeifnull
Remove key from object if value was null/undefined.

    sri4node = require('sri4node');
    $m = sri4node.mapUtils;
    ...
    {
        type: '/content',
        ...
        map: {
            ...
            title: { onread: $m.removeifnull }
            ...
        },
        ...
    }

#### remove
Always remove this key.

    sri4node = require('sri4node');
    $m = sri4node.mapUtils;
    ...
    {
        type: '/content',
        ...
        map: {
            ...
            title: { onread: $m.remove }
            ...
        },
        ...
    }

#### now
Override with current server timestamp.

    sri4node = require('sri4node');
    $m = sri4node.mapUtils;
    ...
    {
        type: '/content',
        ...
        map: {
            ...
            publicationdate: { onupdate: $m.now, oninsert: $m.now }
            ...
        },
        ...
    }

#### value()
Override with a fixed value.

    sri4node = require('sri4node');
    $m = sri4node.mapUtils;
    ...
    {
        type: '/content',
        ...
        map: {
            ...
            status: { oninsert: $m.value('active') }
            ...
        },
        ...
    }


#### parse
Convert string into JSON.

    sri4node = require('sri4node');
    $m = sri4node.mapUtils;
    ...
    {
        type: '/content',
        ...
        map: {
            ...
            details: {
                onread: $m.parse,
                oninsert: $m.stringify,
                onupdate: $m.stringify
            }
            ...
        },
        ...
    }

#### stringify
Convert JSON into string.

    sri4node = require('sri4node');
    $m = sri4node.mapUtils;
    ...
    {
        type: '/content',
        ...
        map: {
            ...
            details: {
                onread: $m.parse,
                oninsert: $m.stringify,
                onupdate: $m.stringify
            }
            ...
        },
        ...
    }

### JSON Schema Utilities
These functions are found in `sri4node.schemaUtils`.
Provides various utilities for keeping your JSON schema definition compact and readable.
`description` is always used to document your resources.
General usage:

    sri4node = require('sri4node');
    $s = sri4node.schemaUtils;
    ...
    {
        type: '/content',
        ...
        schema: {
            $schema: "http://json-schema.org/schema#",
            title: "An article on the websites/mailinglists.",
            type: "object",
            properties : {
                title: $s.string('Title of the article.',1);
            },
            ...
        },
        ...
    }

We describe the generated JSON schema fragment below.
You can use these functions, but when they are insufficient you can insert any valid JSON schema manually in the `schema` property of a resource configuration.
They are only provided for convenience.

#### permalink(type, description)
Used for declaring permalinks.
Example : `$s.permalink('/persons','The creator of the article.')`.
Generated schema fragment :

    {
        type: "object",
        properties: {
            href: {
                type: "string",
                pattern: "^\/" + name + "\/[-0-9a-f].*$",
                minLength: name.length + 38,
                maxLength: name.length + 38,
                description: description
            }
        },
        required: ["href"]
    }

#### string(description, min, max)
As you should define your postgres columns as type `text` setting minimum and maximum length is usually omitted.
Example: `$s.string('Title of the article.',5)`.
Generated schema fragment :

    {
        type: "string",
        description: description,
        minLength: min, // if supplied.
        maxLength: max, // if supplied.
    }

#### numeric(description)
Defines a property as numeric.
Example: `$s.numeric('The amount of ...')`.
Generated schema fragment :

    {
        type: "numeric",
        multipleOf: "1.0",
        description: description
    }

#### email(description)
Defines an email.
Example: `$s.email('Personal email of the customer.')`.
Generated schema fragment :

    {
        type: "string",
        format: "email",
        minLength: 1,
        maxLength: 254,
        description: description
    }

#### url(description)
Defines a URL.
Example: `$s.url('The homepage of the organisational unit.')`.
Generated schema fragment :

    {
        type: "string",
        minLength: 1,
        maxLength: 2000,
        format: "uri",
        description: description
    }


#### belgianzipcode(description)
Defines a *Belgian* zipcode.
Example: `$s.zipcode('The zipcode of the address')`.
Generated schema fragment :

    {
        type: "string",
        pattern: "^[0-9][0-9][0-9][0-9]$",
        description: description
    }

#### phone(description)
Defines a telephone number.
Example: `$s.phone('The telephone of the customer')`.
Generated schema fragment :

    {
        type: "string",
        pattern: "^[0-9]*$",
        minLength: 9,
        maxLength: 10,
        description: description
    }

#### timestamp(description)
Defines a JSON timestamp.
Example: `$s.timestamp('The creation date/time of this resource')`.
Generated schema fragment :

    {
        type: "string",
        format: "date-time",
        description: description
    }

#### boolean(description)
Defines a JSON boolean.
Example: `$s.boolean('Does she love me or does she not ?')`
Generated schema fragment :

    {
        type: "boolean",
        description: description
    }

#### guid(description)
Defines a column as GUID.
Example: `$s.guid('API-key for a plugin')`
Generated schema fragment :

    {
      type: 'string',
      description: description,
      pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
    }

### Query functions
The functions are found in `sri4node.queryUtils`.
Provides pre-packaged filters for use as `query` function in a resource configuration.
The example assume you have stored `sri4node.queryUtils` in $q as a shortcut.

    var sri4node = require('sri4node');
    ...
    var $q = sri4node.queryUtils;

#### filterReferencedType(type, columnname)
Can be used to filter on referenced resources.
Example: /content resources have a key `creator` that references /persons.
A list resource `/content?creator=/persons/{guid}` can be created by adding this query function :

    {
        type: '/content',
        map: {
            ...
            creator: { references: '/persons' },
            ...
        },
        ...
        query: [
            creator: $q.filterReferencedType('/persons','creator')
        ],
        ...
    }

Do a query to retrieve all content, created by person X :

    GET /content?creator=/persons/{guid-X}

The value being passed in as a URL parameter can be a single href, or a comma-separated list of hrefs. The filter will match on any of the given permalinks.

#### defaultFilter

An implementation of [sri-query][sri-query]. SRI-query defines default, basic filtering on list resources. The function is a default, shared implementation of that.

    {
        type: '/schools',
        map: {
            ...
        },
        ...
        query: [
            ...
            defaultFilter: $q.defaultFilter
        ]
    }

Read the specification for details. Example queries are :

    GET /schools?institutionNumberGreater=100000
    GET /schools?nameContains=vbs
    GET /schools?nameCaseInsensitive=Minnestraal
    GET /schools?seatAddresses.key=a39c809e-a3a4-11e3-ace8-005056872b95
    
### Relations query filters

When a resource is detected as a relation (has from and to properties) some query filters are added for the list resources. 

    {
        type: '/relations',
        map: {
            from: {references: '/messages'},
            to: {references: '/messages'}
        },
        ...
        query: {
            ...
        }
    }
    
#### fromTypes
Can be used to filter those relations where the 'from' resource is some of the given types.

#### toTypes
Can be used to filter those relations where the 'to' resource is some of the given types.

#### froms
Filter those relations where the 'from' resources is one of the given ones. 

#### tos
Filter those relations where the 'to' resources is one of the given ones. 


Example queries are :

    GET /relations?fromTypes=request,offer
    GET /relations?toTypes=response
    GET /relations?froms=/messages/{guid}
    GET /relations?tos=/messages/{guid}

# Generated API Documentation

Documentation will be generated based on the configuration.
On the `/docs` endpoint you can access general documentation about all the resources that are available.
When you want more information about a resource you can access `/resource/docs`

## validateDocs

To document validate functions you need to add *validateDocs* to the resource configuration.
*validateDocs* has to include a description and possible error codes of the validate function.

	validate: [
			validateAuthorVersusThemes
	],
	validateDocs: {
			validateAuthorVersusThemes: {
					description: "Validate if author or theme exists",
					errors: [{
							code: 'not.a.desert',
							description: 'This is not a desert.'
					}]
			}
	}

## queryDocs

To document a custom query function you need to add *queryDocs* to the resource configuration.
*queryDocs* has to include the description of the query function.

	query: {
			editor: $q.filterReferencedType('/persons','editor'),
			defaultFilter: $q.defaultFilter
	},
	queryDocs: {
			editor: 'Allow to filer on an editor.'
	}

##Description

####Interface
You can describe your sri interface by using the *description* variable in the root for your configuration

	description: 'A description about the collection of resources'

####Resource 	
You can describe a resource by using the to use *schema* > *title*

	title: 'An article on the websites/mailinglists'

####Property
If you want to describe a property of a resource you need to use *schema* > *properties* > *property* > *description* :

	properties : {
			authors: {
					type: 'string'
					description: 'Comma-separated list of authors.'
			}
	}

Or use the schemaUtils function:

	properties : {
			authors: $s.string('Comma-separated list of authors.')
	}


# Contributions

Contributions are welcome. Contact me on dimitry-underscore-dhondt-at-yahoo-dot-com.

# License

The software is licensed under [LGPL license](https://www.gnu.org/licenses/lgpl.html).

[express-request]: http://expressjs.com/4x/api.html#req
[express-response]: http://expressjs.com/4x/api.html#res
[kriskowal-q]: https://github.com/kriskowal/q

[sri-specs]: https://github.com/dimitrydhondt/sri
[sri-specs-list-resources]: https://github.com/dimitrydhondt/sri#list-resources
[sri-specs-batch]: https://github.com/dimitrydhondt/sri#batch-operations
[sri-errors]: https://github.com/dimitrydhondt/sri#errors
[sri-query]: https://github.com/dimitrydhondt/sri-query
