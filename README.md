# About

An implementation of SRI (Standard ROA Interface). 
SRI is a set of standards to make RESTful interfaces.
It specifies how resources are accesses, queried, updated, deleted.
The specification can [be found here][sri-specs].

Currently the implementation supports storage on a postgres database.
Support for more databases/datastores may be added in the future.

# Installing

Installation is simple using npm :

    $ cd [your_project]
    $ npm install --save sri4node
    
You will also want to install Express.js and node-postgres :

    $ npm install --save express
    $ npm install --save pg
    
Express.js and node-postgress are *technically* not depedencies of sri4node.
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

Finally we configure handlers for 1 example resource :

    sri4node.configure(app,pg,
        {
            // Log and time HTTP requests ?
            logrequests : true,
            // Log SQL ?
            logsql: false,
            // Log debugging information ?
            logdebug: false,
            // The URL of the postgres database
            defaultdatabaseurl : "postgres://user:pwd@localhost:5432/postgres",
            // A function to determine the security context.
            // The return value of this function
            // is passed into 'secure' functions (see below).
            // It is also returned as when "GET /me" is performed by clients.
            identity : function(username, database) {
                var deferred = Q.defer();
                
                var query = $u.prepareSQL("me");
                query.sql('select * from persons where login = ').param(username);
                $u.executeSQL(database, query).then(function (result) {
                    var row = result.rows[0];
                    var output = {};
                    output.$$meta = {};
                    output.$$meta.permalink = '/persons/' + row.guid;
                    output.firstname = row.firstname;
                    output.lastname = row.lastname;
                    output.email = row.email;
                    ...
                    promise.resolve(output);
                });
                
                return deferred.promise;
            },
            resources : [
                {
                    // Base url, maps 1:1 with a table in postgres 
                    // Same name, except the '/' is removed
                    type: "/content",
                    // Is this resource public ? 
                    // Can it be read / updated / inserted publicly ?
                    public: false,
                    // Multiple function that check access control 
                    // They receive a database object and the security context
                    // as determined by the 'identity' function above.
                    secure : [
                        checkAccessOnResource,
                        checkSomeMoreRules
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
                    // ' AND guid IN (SELECT guid FROM mytemptable) '
                    // to the query being executed.
                    // Allowig any kind of filtering on
                    // the resulting list resource.
                    query: {
                        authors: $q.filterContains('authors'),
                        themes: $q.filterContains('themes'),
                        html: $q.filterContains('html'),
                        editor: $q.filterReferencedType('/persons','editor')
                    },
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

Now we can start Express.js to start serving up our SRI REST interface :

    app.listen(5000, function() {
        console.log("Node app is running at localhost:" + app.get('port'))
    });

## Processing Pipeline

sri4node has a very simple processing pipeline for mapping SRI resources onto a database. 
We explain the possible HTTP operations below : 
* reading regular resources (GET)
* updating/creating regular resources (PUT)
* deleting regular resources (DELETE)
* reading *list* resources (queries) (GET)

In essence we map 1 *regular* resource to a database row. 
A *list* resource corresponds to a query on a database table.
List resource support *expansion*, to allow you to include the corresponding regular resource in the same request.

When reading a *regular* resource a database row is transformed into an SRI resource by doing this :

1. Check if you have permission by executing all registered `secure` functions in the configuration.
If any of these functions rejects it's promise, the client will receive 401 Forbidden.
2. Retrieve the row and convert all columns into a JSON key-value pair (keys map directly to the database column name). 
All standard postgreSQL datatypes are converted automatically to JSON. 
Values can be transformed by an *onread* function (if configured). 
By default references to other resources (GUIDs in the database) are expanded to form a relative URL.
As they are mapped with `{ references: '/type' }`.
3. Add a `$$meta` section to the response document.
4. Execute any `afterread` functions to allow you to manipulate the result JSON.

When creating or updating a *regular* resource, a database row is updated/inserted by doing this :

1. Check if you have permission by executing all registered `secure` functions.
If any of these functions rejects it's promise, the client will receive 401 Forbidden.
2. Perform schema validation on the incoming resource.
If the schema is violated, the client will receive a 409 Conflict.
3. Execute `validate` functions. 
If any of of the `validate` functions rejects it's promise, the client receives a 409 Conflict.
4. Convert the JSON document into a simple key-value object. 
Keys map 1:1 with database columns. 
All incoming values are passed through the `onwrite`/`oninsert` function for conversion (if configured). 
By default references to other resources (relative links in the JSON document) are reduced to foreign keys values (GUIDs) in the database.
5. insert or update the database row.
6. Execute `afterupdate` or `afterinsert` functions.

When deleting a *regular* resource :

1. Check if you have permission by executing all registered `secure` functions in the mapping.
If any of these functions rejects it's promise, the client will receive 401 Forbidden.
2. Delete the row from the database.
3. Execute any `afterdelete` functions.

When reading a *list* resource :

1. Check if you have read permission by executing all registered `secure` functions in the mapping.
If any of these functions rejects it's promise, the client will receive 401 Forbidden.
2. Generate a `SELECT COUNT` statement and execute all registered `query` functions to annotate the `WHERE` clause of the query.
3. Execute a `SELECT` statement and execute all registered `query` functions to annotate the `WHERE` clause of the query.
The `query` functions are executed if they appear in the request URL as parameters.
4. Retrieve the results, and expand if necessary (i.e. generate a JSON document for the result row - and add it as `$$expanded`). 
See the [SRI specification][sri-specs-list-resources] for more details.
5. Build a list resource with a `$$meta` section + a `results` section.
6. Execute any `afterread` functions to allow you to manipulate the result JSON.

That's it ! :-).

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
These functions allow you to do al sorts of things, like remove the key if it is `NULL` in the database,
allways remove the key, rename the key, etc..
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

- *request* is the Express.js [request][express-request] object for this operation.
- *response* is the Express.js [response][express-response] object for this operation.
- *database* is a database object (see above) that you can use for querying the database.
- *me* is the security context of the user performing the current HTTP operation.

It should reject returned the promise if the function disallows the HTTP operation. 
In the later case the client will receive a 401 Forbidden as response to his operation.

### validate

Validation functions are executed before update/insert. 
The output is a combination of all error objects returned by the validation functions. 
The error objects are defined in the SRI specification.
All validation functions are executed for every PUT operation.

A *validate* function receives 2 arguments :

- *body* is full JSON document being PUT. (As PUT by the client, without processing).
- *database* is a database object (see above) that you can use for querying the database.

It should reject the returned promise if the validation fails. 
It should reject with one or more objects that corresponds to the SRI definition of an [error][sri-error].
The implementation can return an array, or a single object.
In this case then client receives 409 Conflict. 
In the response body the client will find all responses generated by all rejecting *validate* functions.

### query

All queries are URLs. 
Any allowed URL parameter is interpreted by these functions. 
The functions can annotate the WHERE clause of the query executed. 
The functions receive 2 parameters :

- *value* is the value of the request parameter (string).
- *select* is a **sql object** for adding SQL to the WHERE clause. This object has these methods :
 - *sql()* : A method for appending sql.
 - *param(value)* : A method for appending a parameter to the text sql.
 - *array(value)* : A method for appending an array of parameters to the sql. (comma-separated)
- *parameter* is the name of the URL parameter.
- *database* A database object that you can use to execute extra SQL statements.
- *count* A boolean telling you if you are currently decorating the SELECT COUNT(*) query, or the final SELECT (...) query. Useful for making sure some statements are not executed twice (when using the *database* object)

All the methods on the sql object can be chained. It forms a simple fluent interface.
All the supplied functions extend the SQL statement with an 'AND' clause.

This type of function must return a promise. When the URL parameter was applied to the **sql object**, then the promise should be resolved.
If one query function rejects it's promise, the client will find all error objects by all rejecting *query* functions and receives 404 Not Found + all error messages in the body.
It should reject with one or more objects that correspond to the SRI definition of an [error][sri-error]. 
Mind you that *path* does not makes sense for errors on URL parameters, so it is ommited.
If a query parameter is supplied that is not supported, the client also receives a 404 and a listing of supported query parameters.

### afterread

Hook for post-processing a GET operation. 
It applies to both regular resources, and list resources (with at least expand=href).
Two arguments are received by your function :

- *database* is a database object, allowing you to execute extra SQL statements.
- *elements* an array of one or more resources that you can manipulate.

The function must retuen a Q promise, that is normally resolved.
If one of the afterread methods rejects it's promise all error objects are returned to the client, who receives a 500 Internal Error response.
It should reject with an object that correspond to the SRI definition of an [error][sri-error].
Mind you that *path* does not makes sense for errors in afterread methods, so you should ommit it.

### afterupdate / afterinsert

Hooks for post-processing can be registered to perform desired things, like clear a cache,
do further processing, update other tables, etc.. 
These post-processing functions receive 2 arguments:

- *database* is a database object, allowing you to execute extra SQL statements.
- *element* is the that was just updated / created. 

In case the returned promise is rejected, all executed SQL (including the INSERT/UPDATE of the resource) is rolled back.

### afterdelete

Hook for post-processing when a record is deleted.
The function receives these argument : 

- *database* is a database object, allowing you to execute extra SQL statements.
- *permalink* is the permalink of the object that was deleted.

In case the returned promise is rejected, the database transaction (including the DELETE of the resource) is rolled back.

## identity

A function to construct the /me resource (and the security context of *secure* functions) must be registered in your configuration :

    config.identity = function(username,database) {
        // Use the database connection and username.
        // return a promise that resolves to the desired JSON for /me (and the 'secure' functions)
    }

## Bundled Utility Functions

These utilities live independently of the basic processing described above. In other words, they provide no magic for the developer. They are provided for convenience. If you understand the above processing pipeline, reading the source for one of these functions should contain surprises.

### General Utilities

    clearPasswordCache  : Used for clearing the security cache. Call when updating security context of a user.
    prepareSQL          : Used for preparing SQL. Supply a name to keep the query in the database as a prepared statement.
    executeSQL          : Used for executing SQL. Call with the 'db' object you received, and a query object (returned by prepareSQL).
    
### Mapping Utilities

Provides various utilities for mapping between postgres and JSON :

    removeifnull    : Remove key from object if value was null/undefined
    remove          : Always remove this key
    now             : Override with current server timestamp
    value           : Override with a fixed value
    parse           : Convert string into JSON
    stringify       : Convert JSON into string

### JSON Schema Utilities

Provides various utilities for keeping your JSON schema definition compact and readable :

    permalink(type, description)
    string(description, min, max)
    numeric(description)
    email(description)
    url(description)
    zipcode(description)
    phone(description)
    timestamp(description)
    boolean(description)

### query functions

Provides pre-packaged filters for use as *query* function. 
The example assume you have stored sri4node.queryUtils in $q as a shortcut.

    var sri4node = require('sri4node');
    ...
    var $q = sri4node.queryUtils;

#### filterHrefs

Can be used to support filtering on one or more specific regular resources in a list by permalink.

Example : You have created a list of /persons.
You want to be able to retrieve 3 people in a single GET operation, you can achieve this by retrieving a list resource with exactly those 3 people.
The SRI specification states that all resources must support this on URL parameter *hrefs*.
This can be implemented with filterHrefs :

    {
        type: '/persons',
        map: {
            ...
        },
        ...
        query: [
            hrefs: filterHrefs,
            href: filterHrefs   // For convenience we also support href.
        ]
    }

Then do a query : `GET /persons?hrefs=/persons/{guid-1},/persons/{guid-2},/persons/{guid-3}

#### filterReferencedType(type, columnname)

Can be used to filter of referenced resources. 
Example: /content resources have a key 'creator' that references /persons.
A list resource /content?creator=/persons/{guid} can be created by adding this query function :

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

# Contributions

Contributions are welcome. Contact me on dimitry_dhondt@yahoo.com.

# License

The software is licensed under [LGPL license](https://www.gnu.org/licenses/lgpl.html). 

# TO DO

Development will focus on :
- Adding support for generic server-side expansion.
- Adding support for an HTTP cache for reading, avoiding database hits for read operations.
- Creating a new project that make using SRI interfaces from AngularJS easy.

[express-request]: http://expressjs.com/4x/api.html#req
[express-response]: http://expressjs.com/4x/api.html#res
[kriskowal-q]: https://github.com/kriskowal/q
[sri-errors]: https://docs.google.com/document/d/1KY-VV_AUJXxkMYrMwVFmyN4yIqil4zx4sKeV_RJFRnU/edit#heading=h.ry6n9c1t7hl0
[sri-specs]: https://docs.google.com/document/d/1KY-VV_AUJXxkMYrMwVFmyN4yIqil4zx4sKeV_RJFRnU/pub
[sri-specs-list-resources]: https://docs.google.com/document/d/1KY-VV_AUJXxkMYrMwVFmyN4yIqil4zx4sKeV_RJFRnU/pub#h.7fk12av55wjz
[sri-specs-batch]: https://docs.google.com/document/d/1KY-VV_AUJXxkMYrMwVFmyN4yIqil4zx4sKeV_RJFRnU/pub#h.9ottwr99upq6
