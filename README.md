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
            // A function to determine the security function.
            identity : function(username, database) {
                var query = $u.prepareSQL("me");
                query.sql('select * from persons where email = ').param(username);
                return $u.executeSQL(database, query).then(function (result) {
                    var row = result.rows[0];
                    var output = {};
                    output.$$meta = {};
                    output.$$meta.permalink = '/persons/' + row.guid;
                    output.firstname = row.firstname;
                    output.lastname = row.lastname;
                    output.email = row.email;
                    return output;
                });
            },
            resources : [
                {
                    // Base url, maps 1:1 with a table in postgres 
                    // Same name, except the '/' is removed
                    type: "/contents",
                    // Is this resource public ? 
                    // Can it be read / updated / inserted publicly ?
                    public: false,
                    // Multiple function that check access control 
                    // They receive a database object and
                    // the security context of the current user.
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
                            authors: $s.string(1,256,"Comma-separated list of authors."),
                            themes: $s.string(1,256,"Comma-separated list of themes."),
                            html: $s.string(1,2048,"HTML content of the article.")
                        },
                        required: ["authors","themes","html"]
                    },
                    // Functions that validate the incoming resource
                    // when a PUT operation is executed.
                    validate: [
                        validateAuthorVersusThemes
                    ],
                    // Supported URL parameters are configured
                    // this allows filtering on the list resource.
                    query: {
                        authors: contains('authors'),
                        themes: contains('themes'),
                        html: contains('html')
                    },
                    // All columns in the table that appear in the
                    // resource should be declared.
                    // Optionally mapping functions can be given.
                    map: {
                        authors: {},
                        themes: {},
                        html: {},
                        // Reference to another resource of type */persons*.
                        // (mapping of 'persons' is not shown in this example)
                        person: {references : '/persons'}
                    },
                    // After update, insert or delete
                    // you can perform extra actions.
                    afterupdate: [],
                    afterinsert: [],
                    afterdelete: [ cleanupFunction ]
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
* updating/creating regular resources. (PUT)
* deleting regular resources. (DELETE)
* reading *list* resources (queries) (GET)

In essence we map 1 *regular* resource to a database row. 
A *list* resource corresponds to a query on a database table.
List resource support *expansion*, to allow you to include the corresponding regular resource in the same request.

When reading a *regular* resource a database row is transformed into an SRI resource by doing things :

1. Check if you have permission by executing all registered *secure* functions in the configuration.
2. Retrieve the row and convert all columns into a JSON key-value pair (key maps directly to the database column name). 
All standard JSON datatypes are converted automatically to JSON. 
Values can be transformed by one of the *onread* function (if configured). 
By default references to other resources (GUIDs in the database) are expanded to form a relative URL.
3. Add a $$meta section to the response document.

When creating or updating a *regular* resource, a database row is updated/inserted by doing this :

1. Check if you have permission by executing all registered *secure* functions.
If any of these functions rejects it's promise, the client will receive 401 Forbidden.
2. Perform schema validation on the incoming resource.
If the schema is violated, the clinet will receive a 409 Conflict.
3. Execute *validate* functions. 
If any of of the *validate* functions rejects it's promise, the client receives a 409 Conflict.
4. Convert the JSON document into a simple key-value object. 
Keys map 1:1 with database columns. 
All incoming values are passed through the *onwrite*/*oninsert* function for conversion (if configured). 
By default references to other resources (relative links in the JSON document) are reduced to foreign keys values (GUIDs) in the database.
5. insert or update the database row.
6. Execute *afterupdate* or *afterinsert* functions.

When deleting a regular resource :

1. Check if you have permission by executing all registered functions in the mapping (*secure*).
2. Delete the row from the database.
3. Execute *afterdelete* functions.

When reading a list resource :

1. Check if you have read permission by executing all registered functions in the mapping (*secure*).
2. Generate a COUNT statement and execute all registered 'query' functions to annotate the WHERE clause of the query.
3. Execute a SELECT statement and execute all registered 'query' functions to annotate the WHERE clause of the query.
4. Retrieve the results, and expand if necessary (i.e. generate a JSON document for the result row - and add it as $$expanded). See the [SRI specification][sri-specs] for more details.
5. Build a list resource with a $$meta section + a results section, and return it to the user.

## Function Definitions

Below is a description of the different types of functions that you can use in the configuration of sri4node.
It describes the inputs of the different functions.
All but one of these function must return a [Q promises][kriskowal-q] (The *query* functions have no return value).
Some of the function are called with a database context, allowing you to execute SQL inside your function.
Such a database object can be used together with sri4node.utils.prepareSQL() and sri4node.utils.executeSQL.
Transaction demarcation is handled by sri4node.

### onread / oninsert / onupdate

JSON properties are mapped 1:1 to columns in the postgres table.
Every property can also register 3 possible functions:
- *onupdate* is executed before UPDATE on the table
- *oninsert* is executed before INSERT into the table
- *onread* is executed after SELECT from the table

All 3 functions receive 2 parameters :
- the key they were registered on.
- the javascript element being PUT / or the results of the query just read for GET operations.

All functions are executed in order of listing in the *map* section of the configuration. 
All are allowed to manipulate the element, before it is inserted/updated in the table. 
For GET the *onread* method can manipulate the outgoing JSON object.
No return value is expected, the functions manipulate the element in-place.

### secure

A *secure* function receive 4 parameters :
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
- the value of the request parameter (string)
- An **sql object** for adding SQL to the WHERE clause. This object has these methods :
 - *sql()* : A method for appending sql.
 - *param()* : A method for appending a parameter to the text sql.
 - *array()* : A method for appending an array of parameters to the sql. (comma-separated)

All the methods on the sql object can be chained. It forms a simple fluent interface.
All the supplied functions extend the SQL statement with an 'AND' clause.
This type of function has no return value.

### afterupdate / afterinsert

Hooks for post-processing can be registered to perform desired things, like clear a cache,
do further processing, update other tables, etc.. 
These post-processing functions receive 2 arguments:

- *db* is a database object, allowing you to execute extra SQL statements.
- *element* is the that was just updated / created. 

In case the returned promise is rejected, all executed SQL (including the INSERT/UPDATE of the resource) is be rolled back.

### afterdelete

Hook for post-processing when a record is deleted.
The function receives these argument : 

- *db* is a database object, allowing you to execute extra SQL statements.
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
    prepareSQL          : Used for executing SQL in after* function. Call with the 'db' object you received.
    executeSQL          : Used for executing SQL in after* function. Call with the 'db' object you received.
    
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
    string(min, max, description)
    numeric(description)
    email(description)
    url(description)
    zipcode(description)
    phone(description)
    timestamp(description)
    boolean(description)

# Contributions

Contributions are welcome. Contact me on dimitry_dhondt@yahoo.com.

# License

The software is licensed under [LGPL license](https://www.gnu.org/licenses/lgpl.html). 

# TO DO

Development will focus on :
- Adding support for generic server-side expansion.
- Adding support for an HTTP cache for reading, avoiding database hits for read operations.
- Adding support for including a join in the query for list resources.
- Creating a new project that make using SRI interfaces from AngularJS easy.
- Creating a new project with AngularJS directives that supports creating Bootstap forms easily, by interpreting a JSON schema. SRI interfaces expose a JSON for all resources.
- Creating a new Node.js project for consuming SRI interfaces. It could include caching strategies, etc.. Perhaps to be combined with the AngularJS service.

[express-request]: http://expressjs.com/4x/api.html#req
[express-response]: http://expressjs.com/4x/api.html#res
[kriskowal-q]: https://github.com/kriskowal/q
[sri-errors]: https://docs.google.com/document/d/1KY-VV_AUJXxkMYrMwVFmyN4yIqil4zx4sKeV_RJFRnU/edit#heading=h.ry6n9c1t7hl0
[sri-specs]: https://docs.google.com/document/d/1KY-VV_AUJXxkMYrMwVFmyN4yIqil4zx4sKeV_RJFRnU/pub