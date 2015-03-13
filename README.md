## About

An implementtation of SRI (Standard ROA Interface). 
SRI is a set of standards to make RESTful interfaces.
It defines a number of concepts on accessing and querying resources.
More information can [be found here](https://docs.google.com/document/d/1KY-VV_AUJXxkMYrMwVFmyN4yIqil4zx4sKeV_RJFRnU/pub).

Currently the implementation supports storage on a postgres database.
Support for more databases/datastores may be added in the future.

## Installing

Installation is simple using npm :

    $ cd [your_project]
    $ npm install --save sri4node
    
You will also want to install Express.js :

    $ npm install --save express
    
Express.js is not actually a depedency of sri4node in the technical sense. 
But you need to pass it in when configuring. 
This allows you to keep full control over the order of registering express middleware.

## Usage

Start by requiring the module in you code (as well as Express.js).
Then we'll create some convenient aliasses for the utility functions bundles with sri4node as well.

    var express = require('express');
    var sri4node = require('sri4node');
    var $u = sri4node.utils;
    var $m = sri4node.mapUtils;
    var $s = sri4node.schemaUtils;

Finally we configure handlers for 1 example resource :

roa.configure(app,pg,
    {
        // For debugging SQL can be logged.
        logsql : false,
        // If no environments variable present, use this URL (for development)
        defaultdatabaseurl : "postgres://websitepoc:websitepoc@localhost:5432/postgres",
        resources : [
            {
                // Base url, maps 1:1 with a table in postgres (same name, except the '/' is removed)
                type: "/contents",
                // Is this resource public ? (I.e.: Can it be read / updated / inserted publicly ?
                public: true,
                /*
                 JSON properties are mapped 1:1 to columns in the postgres table.
                 Every property can also register 3 possible functions:

                 - onupdate : is executed before UPDATE on the table
                 - oninsert : is executed before INSERT into the table
                 - onread : is executed after SELECT from the table

                 All 3 receive 2 parameters :
                 - the key they were registered on.
                 - the javascript element being PUT.

                 All functions are executed in order of listing here.

                 All are allowed to manipulate the element, before it is inserted/updated in the table.
                 */
                map: {
                    authors: {},
                    themes: {},
                    html: {}
                },
                secure : [
                    // TODO : Add security. People can only update their own accounts.
                    // Admins can update all accounts in their community/ies.
                    // Superadmins van update all accounts in all communities.
                ],
                // When a PUT operation is executed there are 2 phases of validate.
                // Validation phase 1 is schema validation.
                schemaUtils: {
                    $schema: "http://json-schema.org/schema#",
                    title: "An article on the websites/mailinglists.",
                    type: "object",
                    properties : {
                        authors: $s.string(1,256,"Comma-separated list of authors (firstname - lastname)."),
                        themes: $s.string(1,256,"Comma-separated list of themes this article belongs to."),
                        html: $s.string(1,2048,"HTML content of the article. HTML tags are restricted, to allow external styling.")
                    },
                    // balance should not be validated. It can never be PUT ! If PUT, it is ignored. See above.
                    required: ["authors","themes","html"]
                },
                // Validation phase 2 : an array of functions with validation rules.
                // All functions are executed. If any of them return an error object the PUT operation returns 409.
                // The output is a combination of all error objects returned by the validation rules/
                validate: [
                ],
                // All queries are URLs. Any allowed URL parameter is configured here. A function can be registered.
                // This function receives 2 parameters :
                //  - the value of the request parameter (string)
                //  - An object for adding SQL to the WHERE clause. This object has 2 methods :
                //      * sql() : A method for appending sql.
                //      * param() : A method for appending a parameter to the text sql.
                //      * array() : A method for appending an array of parameters to the sql. (comma-separated)
                //  All these methods can be chained, as a simple fluent interface.
                //
                //  All the supplied functions MUST extend the SQL statement with an 'AND' clause.
                // (or not touch the statement, if they want to skip their processing).
                query: {
                    authors: contains('authors'),
                    themes: contains('themes'),
                    html: contains('html')
                },
                /*
                Hooks for post-processing can be registered to perform desired things, like clear a cache,
                do further processing, etc..

                 - afterupdate
                 - afterinsert
                 - afterdelete

                These post-processing functions receive 2 arguments:

                 - a 'db' object, that can be used to call roa4node.utils.executeSQL() and roa4node.utils.prepareSQL().
                   This object contains 2 things :
                    - client : a pg-connect client object
                    - done : a pg-connect done function

                 - the element that was just updated / created.

                 These functions must return a Q promise. When this promise resolves, all executed SQL will
                 be commited on the database. When this promise fails, all executed SQL (including the original insert
                 or update triggered by the API call) will be rolled back.
                */
                afterupdate: [],
                afterinsert: [],
                afterdelete: []
            }
        ]
    });

Now we can start Express.js serving up resources :

    app.listen(app.get('port'), function() {
        console.log("Node app is running at localhost:" + app.get('port'))
    });

## Configuration

Provide code examples and explanations of how to get the project.


## Contributors

Contributions are welcom. Contact me on dimitry_dhondt@yahoo.com.

## License

The software is licensed under [LGPL license](https://www.gnu.org/licenses/lgpl.html). 

## TO DO

Development will focus on :
- Adding support for generic server-side expansion.
- Adding support for an HTTP cache for reading, avoiding database hits for read operations.