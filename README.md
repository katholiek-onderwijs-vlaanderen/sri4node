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

You will also want to install Express.js and node-postgres :

    $ npm install --save express
    $ npm install --save pg

Express.js and node-postgress are *technically* not dependencies (as in npm dependencies) of sri4node.
But you need to pass them in when configuring.
This allows you to keep full control over the order of registering express middleware, and allows you to share and configure the node-postgres library.

# Usage

Start by requiring the module in your code.
Then we'll create some convenient aliasses for the utility functions bundled with sri4node as well.

    var express = require('express');
    var app = express();
    var pg = require('pg');
    var sri4node = require('sri4node');
    var $u = sri4node.utils;
    var $m = sri4node.mapUtils;
    var $s = sri4node.schemaUtils;
    var $q = sri4node.queryUtils;

Finally we configure handlers for 1 example resource.
This example shows a resource for storing content as `html` with meta-data like `authors`, `themes` and `editor`.
The declaration of the editor is a reference to a second resource (/person), which itself is not shown here.

    var promise = sri4node.configure(app,pg,
        {
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
            authenticate: $u.basicAuthentication(myAuthenticator),
            identify : functionToConstructSecurityContext,
            // All URLs force SSL and allow cross origin access.
            forceSecureSockets: true,
            description: 'A description about the collection of resources',
            resources : [
                {
                    // Base url, maps 1:1 with a table in postgres
                    // Same name, except the '/' is removed
                    type: '/content',
                    // Is this resource public ?
                    // Can it be read / updated / inserted publicly ?
                    public: false,
                    // Multiple function that check access control
                    // They receive a database object and the security context
                    // as determined by the 'identify' function above.
                    secure : [
                        checkAccessOnResource,
                        checkSomeMoreRules
                    ],
                    // Enable cache (default false)
                    cache: {
                      ttl: 60, // in seconds, the time the objects live (0 means forever)
                      type: 'local' // will store in an in-memory local cache
                    },
                    // custom routes can be defined. See #custom-routes
                    customroutes: [
                      {route: '/content/:key/:attachment', handler: getAttachment}
                    ],
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
                    // Functions that validate the incoming resource
                    // when a PUT operation is executed.
                    validate: [
                        validateAuthorVersusThemes
                    ],
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
                        editor: {references : '/persons'}
                    },
                    // After read, update, insert or delete
                    // you can perform extra actions.
                    afterread: [
                        addAdditionalInfoToOutputJSON
                    ],
                    afterupdate: [],
                    afterinsert: [],
                    afterdelete: [
                        cleanupFunction
                    ]
                }
            ]
        });

Configure returns a [Q promise][kriskowal-q].
Now we can start Express.js to start serving up our SRI REST interface :

    promise.then(function () {
      app.listen(5000, function() {
        console.log("Node app is running at localhost:" + app.get('port'))
      });
    });

## Reserved and required fields (mandatory)

There are 3 columns that every resource table must have (it's mandatory).

Those are:

* "$$meta.deleted" boolean not null default false,
* "$$meta.modified" timestamp with time zone not null default current_timestamp,
* "$$meta.created" timestamp with time zone not null default current_timestamp

For performance reasons it's highly suggested that an index is created for each column:

* CREATE INDEX table_created ON *table* ("$$meta.created");
* CREATE INDEX table_modified ON *table* ("$$meta.modified");
* CREATE INDEX table_deleted ON *table* ("$$meta.deleted");

The following index is for the default order by:

* CREATE INDEX table_created_key ON *table* ("$$meta.created", "key");

The application will fail to register a resource that lacks these fields (and show a message to the user)

## Processing Pipeline

sri4node has a very simple processing pipeline for mapping SRI resources onto a database.
We explain the possible HTTP operations below :
* reading regular resources (GET)
* updating/creating regular resources (PUT)
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

1. Check if you have permission by executing all registered `secure` functions in the configuration.
If any of these functions rejects its promise, the client will receive 403 Forbidden.
2. Retrieve the row and convert all columns into a JSON key-value pair (keys map directly to the database column name).
All standard postgreSQL datatypes are converted automatically to JSON.
Values can be transformed by an *onread* function (if configured).
By default references to other resources (GUIDs in the database) are expanded to form a relative URL.
As they are mapped with `{ references: '/type' }`.
3. Add a `$$meta` section to the response document.
4. Execute any `afterread` functions to allow you to manipulate the result JSON.

When creating or updating a *regular* resource, a database row is updated/inserted by doing this :

1. Check if you have permission by executing all registered `secure` functions.
If any of these functions rejects its promise, the client will receive 403 Forbidden.
2. Perform schema validation on the incoming resource.
If the schema is violated, the client will receive a 409 Conflict.
3. Execute `validate` functions.
If any of of the `validate` functions rejects its promise, the client receives a 409 Conflict.
4. Convert the JSON document into a simple key-value object.
Keys map 1:1 with database columns.
All incoming values are passed through the `onwrite`/`oninsert` function for conversion (if configured).
By default references to other resources (relative links in the JSON document) are reduced to foreign keys values (GUIDs) in the database.
5. insert or update the database row.
6. Execute `afterupdate` or `afterinsert` functions.

When deleting a *regular* resource :

1. Check if you have permission by executing all registered `secure` functions in the mapping.
If any of these functions rejects its promise, the client will receive 403 Forbidden.
2. Delete the row from the database.
3. Execute any `afterdelete` functions.

When reading a *list* resource :

1. Check if you have read permission by executing all registered `secure` functions in the mapping.
If any of these functions rejects its promise, the client will receive 403 Forbidden.
2. Generate a `SELECT COUNT` statement and execute all registered `query` functions to annotate the `WHERE` clause of the query.
3. Execute a `SELECT` statement and execute all registered `query` functions to annotate the `WHERE` clause of the query.
The `query` functions are executed if they appear in the request URL as parameters. The `query` section can also define a `defaultFilter` function. It is this default function that will be called if no other query function was registered.
4. Retrieve the results, and expand if necessary (i.e. generate a JSON document for the result row - and add it as `$$expanded`).
See the [SRI specification][sri-specs-list-resources] for more details.
5. Build a list resource with a `$$meta` section + a `results` section.
6. Execute any `afterread` functions to allow you to manipulate the result JSON.

That's it ! :-).

### Timing

If `logmiddleware` is true in the configuration the application will display a log of the timing of each
middleware.

## Function Definitions

Below is a description of the different types of functions that you can use in the configuration of sri4node.
It describes the inputs and outputs of the different functions.
Most of these function return a [Q promise][kriskowal-q].
Some of the function are called with a database context, allowing you to execute SQL inside your function.
Such a database object can be used together with `sri4node.utils.prepareSQL()` and `sri4node.utils.executeSQL()`.
Transaction demarcation is handled by sri4node, on a per-request-basis.
That implies that `/batch` operations are all handled in a single transaction.
For more details on batch operations see the [SRI specification][sri-specs-batch].

### onread

Database columns are mapped 1:1 to keys in the output JSON object.
The `onread` function receives these arguments :

- `key` is the key the function was registered on.
- `element` is the the result of the query that was executed.

Functions are executed in order of listing in the `map` section of the configuration.
No return value is expected, this function manipulates the element in-place.
These functions allow you to do al sorts of things,
like remove the key if it is `NULL` in the database,
always remove a certain key, rename a key, etc..
A selection of predefined functions is available in `sri4node.mapUtils` (usually assigned to `$m`).
See below for details.

### oninsert / onupdate

JSON properties are mapped 1:1 to columns in the postgres table.
The `onupdate` and `oninsert` functions recieves these parameters :

- `key` is the key they were registered on.
- `element` is the JSON object being PUT.

All functions are executed in order of listing in the `map` section of the configuration.
All are allowed to manipulate the element, before it is inserted/updated in the table.
No return value is expected, the functions manipulate the element in-place.
A selection of predefined functions is available in `sri4node.mapUtils` (usually assign to `$m`).
See below for details.

### secure

A `secure` function receives these parameters :

- `request` is the Express.js [request][express-request] object for this operation.
- `response` is the Express.js [response][express-response] object for this operation.
- `database` is a database object (see above) that you can use for querying the database.
- `me` is the security context of the user performing the current HTTP operation. This is the result of the `identify` function.
- `batch` an array of the operations requested. Each element has attributes `href` and `verb`.

The function must return a [Q promise][kriskowal-q].
It should `resolve()` the promise if the function allows the HTTP operation.
It should `reject()` the promise if the function disallows the HTTP operation.
In the later case the client will receive a 403 Forbidden as response to his operation.

### validate

Validation functions are executed before update/insert.
All validation functions are executed for every PUT operation.

A `validate` function receives these arguments :

- `body` is the full JSON document being PUT.
- `database` is a database object (see above) that you can use for querying the database.

The function must return a [Q promise][kriskowal-q].
It should `reject()` the returned promise if the validation fails, with one or more objects that correspond to the SRI definition of an [error][sri-errors].
The implementation can return an array, or a single object.
If any of the `validate` functions reject their promise, the client receives 409 Conflict.
In the response body the client will then find all responses generated by all rejecting `validate` functions combined.

### beforequery

Before query functions are exectued before query execution.

This function receives these parameters :

- `req` the express.js request object.
- `res` the express.js response object.
- `database` is a database object, allowing you to execute extra SQL statements.

The function must return a [Q promise][kriskowal-q].

Can be used for example for checking custom prerequisites or manipulating req.query.

### query

All queries are URLs.
Any allowed URL parameter is interpreted by these functions.
The functions can annotate the `WHERE` clause of the query executed.
The functions receive these parameters :

- `value` is the value of the request parameter (string).
- `select` is a query object (as returned by `sri4node.prepareSQL()`) for adding SQL to the `WHERE` clause. See [below](#preparesql) for more details.
- `parameter` is the name of the URL parameter.
- `database` is a database object that you can use to execute extra SQL statements.
- `count` is a boolean telling you if you are currently decorating the `SELECT COUNT` query, or the final `SELECT` query. Useful for making sure some statements are not executed twice (when using the database object)
- `mapping` is the mapping in the configuration of sri4node.

All the configured `query` functions should extend the SQL statement with an `AND` clause.

The function must return a [Q promise][kriskowal-q].
When the URL parameter was applied to the query object, then the promise should `resolve()`.
If one query function rejects its promise, the client received 404 Not Found and all error objects by all rejecting `query` functions in the body.
It should reject with one or an array of error objects that correspond to the [SRI definition][sri-errors].
Mind you that *path* does not makes sense for errors on URL parameters, so it is ommited.

If a query parameter is supplied that is not supported, the client also receives a 404 Not Found and a listing of supported query parameters.

### handlelistqueryresult

An optional function to override the default code for building the JSON result based on the database query result.

This function receives these parameters :

- `req` the express.js request object.
- `result` is an object containing the query result.

The function must return a [Q promise][kriskowal-q] JSON output object.

### afterread

Hook for post-processing a GET operation (both regular and list resources).
It applies to both regular resources, and list resources (with at least `expand=results`).
The function receives these parameters :

- `database` is a database object, allowing you to execute extra SQL statements.
- `elements` is an array of one or more resources that you can manipulate.
- `me` the return of the identify function
- `req` the express.js request object.

The function must return a [Q promise][kriskowal-q].
If one of the `afterread` methods rejects its promise, all error objects are returned to the client, who receives a 500 Internal Error response.
It should `reject()` with an object that correspond to the SRI definition of an [error][sri-errors].
Mind you that *path* does not makes sense for errors in afterread methods, so you should omit it.

### afterupdate / afterinsert

Hooks for post-processing a PUT operation can be registered to perform desired things,
like clear a cache, do further processing, update other tables, etc..
The function receives these parameters :

- `database` is a database object, allowing you to execute extra SQL statements.
- `element` is the JSON element (as it was PUT, so without mapping/processing) that was just updated / created.
- `me` the return of the identify function
- `req` the express.js request object.

The function must return a [Q promise][kriskowal-q].
In case the returned promise is rejected, all executed SQL (including the INSERT/UPDATE of the resource) is rolled back.
The function should `reject()` its promise with an object that correspond to the SRI definition of an [error][sri-errors].
If any of the functions rejects its promise the client receives 409 Conflict, an a combination of all error objects in the response body.

### afterdelete

Hook for post-processing when a record is deleted.
The function receives these parameters :

- `database` is a database object, allowing you to execute extra SQL statements.
- `permalink` is the permalink of the object that was deleted.
- `me` the return of the identify function
- `req` the express.js request object.

The function must return a [Q promise][kriskowal-q].
In case the returned promise is rejected, the database transaction (including the DELETE of the resource) is rolled back.
The function should `reject()` its promise with an object that correspond to the SRI definition of an [error][sri-errors].
If any of the functions rejects its promise the client receives 409 Conflict, an a combination of all error objects in the response body.

### authenticate

This function handles authentication of the current user.
This function receives these parameters :

- `req` the express.js request object.
- `res` the express.js response object.
- `next` a function that can be called to delegate response handling to the next handler in the chain.

### identify

This function determines the /me resource. The same information is also passed into `query` functions as an argument.
It receives these parameter :

- `req` the express.js request object, allowing you to analyze any headers on the request.
- `database` a database obejct, allowing you to perform queries.

The function must return a [Q promise][kriskowal-q], with the `me` object.
This will be returned in the body of a request to /me, and it will also be passed into your `secure` functions.

## resource specific configuration variables

### methods

Can be used to restrict the methods which are allowed on a resource. If not specified the default is [ 'GET','PUT','POST','DELETE' ]

### table

Can be used to override the tablename in case it does not match the resource name.

## Caching

By default resources are not cached. By defining a `cache` section we can store results in a cache not to hit the database.
The key of the cache is the requested url.

There are currently two supported types of caches: local and redis.

- `local` stores the output in a local in-memory cache.
- `redis` connects to a Redis store and stores objects there. This allows for horizontal scalability since multiple application
instances can share the cache.

### Examples

cache: {
  ttl: 0,
  type: 'local'
}

Will store objects in a local cache without an expiration time. The object will live in the cache until replaced by a new version

cache: {
  ttl: 60, // store objects for 60 seconds. After 60 seconds the objects are purged.
  type: 'redis',
  redis: 'redis://user@host.com:9000'
}

If type is redis the URL to a Redis server must be provided.

## Custom routes

Custom routes can be defined per resource. The attribute `customroutes` is an array where each object represents a specific route
with its handler.

Each entry has the attributes:

- `route`: the custom url (accepts placeholders for path params)
- `handler`: a function that receives these parameters:
  - `req`: the express.js request object.
  - `res`: the express.js response object.
  - `database`: a database obejct, allowing you to perform queries.
  - `me`: is the security context of the user performing the current HTTP operation. This is the result of the `identify` function.

## Limiting results

The following attributes dictate how the lists are paginated:

- `defaultlimit`: the number of resources per page. If empty, a default of 30 is used.
- `maxlimit`: The maximum limit allowed. If empty, a default of 500 is used.

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

#### basicAuthentication(authenticator)
Used for protecting a resource with BASIC authentication.
It accepts a single parameter, that is in turn a function that is responsible for checking username/password.
The function `authenticator`, receives these parameters :

- `database` is a database connection, that may be used to perform queries.
- `username` the username, that sent on the HTTP `Authentication` header.
- `password` the password, that was sent on the HTTP `Authentication` header.

The `authenticator` function should return a [Q promise][kriskowal-q] that is resolved with a boolean `true` or `false` to indicate that username and password match, or do not match.
It should reject the promise in any other case.

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

An implementation of [sri-query][sri-query]. SRI-query defines default, basic filternig on list resources. The function is a default, shared implementation of that.

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
