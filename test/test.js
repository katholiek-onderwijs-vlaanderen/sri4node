"use strict";

// External includes
var express = require('express');
var bodyParser = require('body-parser');
var Q = require('q');
var pg = require('pg');
var needle = require('needle');

// Local includes
var roa = require("../sri4node.js");
var $u = roa.utils;
var $m = roa.mapUtils;
var $s = roa.schemaUtils;

var app = express();
app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.json());

var cl = function (x) {
    console.log(x);
};

// node-postgres defaults to 10 clients in the pool, but heroku.com allows 20.
pg.defaults.poolSize = 20;

// createInClause("communities", "community");
// createInClause("persons", "person");
// createInClause("communities", "approved");
var filterReferencedType = function (resourcetype, columnname) {
    return function (value, query) {
        var permalinks, guids, i;
        
        var syntax = function () {
            cl("ignoring parameter [' + resourcetype + '] - syntax error. [" + value + "]");
        };

        if (value) {
            permalinks = value.split(",");
            guids = [];
            for (i = 0; i < permalinks.length; i++) {
                if(permalinks[i].indexOf("/" + resourcetype + "/") === 0) {
                    var guid = permalinks[i].substr(resourcetype.length + 2);
                    if(guid.length == 36) {
                        guids.push(guid);
                    } else {
                        syntax();
                        return;
                    }
                } else {
                    syntax();
                    return;
                }
            }
            if(guid.length == 36) {
                query.sql(' and ' + columnname + ' in (').array(guids).sql(') ');
            } else {
                syntax();
                return;
            }
        }
    }
};

var messagesPostedSince = function(value, select) {
    select.sql(' and posted > ').param(value);
};


var validateCommunities = function(req, resp, elasBackend) {
};

var clearPasswordCache = function (db, element) {
    var deferred = Q.defer();
    $u.clearPasswordCache();
    deferred.resolve();
    return deferred.promise;
};

var restrictReadPersons = function(req, me) {
    console.log("restrictReadPersons");
    var deferred = Q.defer();

    //deferred.reject({ error: "message" });
    deferred.resolve();

    return deferred.promise;
};

// Need to pass in express.js and node-postgress as dependencies.
roa.configure(app,pg,
    {
        // For debugging SQL can be logged.
        logsql : false,
        defaultdatabaseurl : "postgres://sri4node:sri4node@localhost:5432/postgres",
        resources : [
            {
                // Base url, maps 1:1 with a table in postgres (same name, except the '/' is removed)
                type: "/persons",
                // Is this resource public ? (I.e.: Can it be read / updated / inserted publicly ?
                public: false,
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
                    firstname: {},
                    lastname: {},
                    street: {},
                    streetnumber: {},
                    streetbus: { onread: $m.removeifnull },
                    zipcode: {},
                    city: {},
                    phone: { onread: $m.removeifnull },
                    email: { onread: $m.removeifnull },
                    balance: {
                        oninsert: $m.value(0),
                        onupdate: $m.remove
                    },
                    mail4elas: {},
                    community: {references: '/communities'}
                },
                // Whenever a request is received, all the functions registered here
                // are executed with these parameters :
                //   req  : express.js request object.
                //   me   : The security context as returned on GET /me
                //
                // The function must return a Q promise.
                //
                // The reject object is an array of ROA error messages, as defined in the spec.
                // If any of those promises is rejected, the request handling is terminated, and
                // a combination of all error messages (if more than one of the security functions
                // rejects it's promise) is sent to the client.
                secure : [
                    // TODO : Add security.

                    // People can only update their own accounts.

                    // Admins can update all accounts in their community/ies.

                    // Superadmins van update all accounts in all communities.

                    // People can only read /persons in their own community, and
                    // in communities that have given an /interletsapproval to the
                    // community of the current user.
                    restrictReadPersons
                ],
                // When a PUT operation is executed there are 2 phases of validate.
                // Validation phase 1 is schema validation.
                schemaUtils: {
                    $schema: "http://json-schema.org/schema#",
                    title: "An object representing a person taking part in the LETS system.",
                    type: "object",
                    properties : {
                        firstname: $s.string(1,128,"First name of the person."),
                        lastname: $s.string(1,128,"Last name of the person."),
                        street: $s.string(1,256,"Streetname of the address of residence."),
                        streetnumber: $s.string(1,16,"Street number of the address of residence."),
                        streetbus: $s.string(1,16,"Postal box of the address of residence."),
                        zipcode: $s.zipcode("4 digit postal code of the city for the address of residence."),
                        city: $s.string(1,64,"City for the address of residence."),
                        phone: $s.phone("The telephone number for this person. Can be a fixed or mobile phone number."),
                        email: $s.email("The email address the person can be reached on. It should be unique to this person. The email should not be shared with others."),
                        mail4elas: {
                            type: "string",
                            description: "Describes if, and how often this person wants messages to be emailed.",
                            enum: ["never","daily","weekly","instant"]
                        }
                    },
                    // balance should not be validated. It can never be PUT ! If PUT, it is ignored. See above.
                    required: ["firstname","lastname","street","streetnumber","zipcode","city", "mail4elas"]
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
                    communities: filterReferencedType('communities','community')
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
                afterupdate: [
                    clearPasswordCache
                ],
                afterinsert: [],
                afterdelete: [
                    clearPasswordCache
                ]
            },
            {
                type: "/messages",
                public: false,
                map: {
                    person: {references: '/persons'},
                    posted: {
//                        oninsert: $m.now,
                        onupdate: $m.now
                    },
                    type: {},
                    title: {},
                    description: { onread: $m.removeifnull },
                    amount: { onread: $m.removeifnull },
                    unit: { onread: $m.removeifnull },
                    community: {references: "/communities"}
                },
                secure: [
                    // TODO : Add security.
                    // People should only be allowed to update their own messages.
                    // People should only be allowed to create messages in the communities they have access to.
                    // People should only be allowed to delete their own messages.
                    // Admins should be allowed to update all message in their community/ies.
                    // Admins should be allowed to delete all message in their community/ies.
                    // Superadmins should be allowed to create in any community, update and delete all messages in all communities.
                ],
                schemaUtils: {
                    $schema: "http://json-schema.org/schema#",
                    title: "A messages posted to the LETS members.",
                    type: "object",
                    properties : {
                        person: $s.permalink("/persons","A permalink to the person that placed the message."),
                        type: {
                            type: "string",
                            description: "Is this message offering something, or is it requesting something ?",
                            enum: ["offer","request"]
                        },
                        title: $s.string(1,256,"A short summary of the message. A plain text string."),
                        description: $s.string(0,1024,"A more elaborate description. An HTML string."),
                        amount: $s.numeric("Amount suggested by the author."),
                        unit: $s.string(0,32,"Unit in which amount was suggested by the author."),
                        community: $s.permalink("/communities","In what community was the message placed ? The permalink to the community.")
                    },
                    required: ["person","type","title","community"]
                },
                query: {
                    communities: filterReferencedType("communities","community"),
                    postedSince: messagesPostedSince, // For compatability, to be removed.
                    modifiedsince: messagesPostedSince
                }
            },
            {
                type: "/communities",
                public: true, // remove authorisation check.
                map: {
                    name: {},
                    street: {},
                    streetnumber: {},
                    streetbus: { onread: $m.removeifnull },
                    zipcode: {},
                    city: {},
                    // Only allow create/update to set adminpassword, never show on output.
                    adminpassword: { onread: $m.remove },
                    phone: { onread: $m.removeifnull },
                    email: {},
                    facebook: { onread: $m.removeifnull },
                    website: { onread: $m.removeifnull },
                    currencyname: {}
                },
                secure: [
                    // TODO : Add security.
                    // People should only be allowed to register new communities, with a unique name.
                    // Admins should be allowed to update their community/ies.
                    // Superadmins should be allowed to create, delete and update all communities
                ],
                schemaUtils: {
                    $schema: "http://json-schema.org/schema#",
                    title: "A local group in the LETS system.",
                    type: "object",
                    properties: {
                        name: $s.string(1,256,"Name of this group. Normally named 'LETS [locale]'."),
                        street: $s.string(1,256,"Street of the organisational seat address."),
                        streetnumber: $s.string(1,16,"Street number of the organisational seat address."),
                        streetbus: $s.string(1,16,"Postal box of the organisational seat address."),
                        zipcode: $s.zipcode("4 digit postal code of the city for the organisational seat address."),
                        city: $s.string(1,64,"City for the organisational seat address."),
                        phone: $s.phone("Contact phone number for the group."),
                        email: $s.email("Contact email for the group."),
                        adminpassword: $s.string(5,64,"Administrative password for the group."),
                        website: $s.url("Website URL for the group."),
                        facebook: $s.url("URL to the facebook page of the group."),
                        currencyname: $s.string(1,32,"Name of the local currency for the group.")
                    },
                    required: ["name", "street", "streetnumber", "zipcode", "city", "phone", "email", "adminpassword", "currencyname"]
                },
                validate: [ validateCommunities ]
            },
            {
                type: "/transactions",
                public: false,
                map: {
                    transactiontimestamp: {
//                        oninsert: $m.now,
                        onupdate: $m.now
                    },
                    fromperson: {references: '/persons'},
                    toperson: {references: '/persons'},
                    description: {},
                    amount: {}
                },
                secure: [
                    // TODO : Add security.
                    // People should be allowed to create transactions for their community.
                    // Admins should be allowed to create transactions for their community/ies.
                    // Superadmins should be allowed to create transaction in any community.
                ],
                schemaUtils: {
                    $schema: "http://json-schema.org/schema#",
                    title: "A single transaction between 2 people.",
                    type: "object",
                    properties: {
                        transactiontimestamp: $s.timestamp("Date and time when the transaction was recorded."),
                        fromperson: $s.permalink("/persons","A permalink to the person that sent currency."),
                        toperson: $s.permalink("/persons","A permalink to the person that received currency."),
                        description: $s.string(1,256,"A description, entered by the person sending, of the transaction."),
                        amount: $s.numeric("The amount of currency sent. This unit is expressed as 20 units/hour, irrelevant of the group's currency settings.")
                    },
                    required: ["fromperson","toperson","description","amount"]
                },
                afterinsert : [
                    function(db, element) {
                        var amount = element.amount;
                        var fromguid = element.fromperson;
                        var toguid = element.toperson;

                        var updatefrom = $u.prepareSQL();
                        updatefrom.sql('update persons set balance = (balance - ').param(amount).sql(') where guid = ').param(fromguid);
                        return $u.executeSQL(db,updatefrom).then(function() {
                            var updateto = $u.prepareSQL();
                            updateto.sql('update persons set balance = (balance + ').param(amount).sql(') where guid = ').param(toguid);
                            return $u.executeSQL(db,updateto);
                        });
                    }
                ],
                // TODO : Check if updates are blocked.
                afterupdate : [
                    function(db, element) {
                        var deferred = Q.defer();
                        deferred.reject("Updates on transactions are not allowed.");
                        return deferred.promise;
                    }
                ]
            },
            {
                type: "/interletsapprovals",
                public: false,
                map: {
                    community: {references: '/communities'},
                    approved: {references: '/communities'}
                },
                secure: [
                    // TODO : Add security.
                    // Only admins should be allowed to create / approve a new interlets approval.
                ],
                schemaUtils: {
                    $schema: "http://json-schema.org/schema#",
                    title: "An approval from one group to share it's messages with another group.",
                    type: "object",
                    properties : {
                        community: $s.permalink("/communities","A permalink to the community that approved access to it's information."),
                        approved: $s.permalink("/communities","A permalink to the community that was granted access.")
                    },
                    required: ["community","approved"]
                },
                query : {
                    approved: filterReferencedType("communities","approved")
                },
                beforeinsert : [],
                beforeupdate : [],
                beforedelete : [],
                afterinsert : [],
                afterupdate : [],
                afterdelete : []
            },
            {
                type: "/interletssettings",
                public: false,
                map: {
                    person: {references: '/persons'},
                    interletsapproval: {references: '/interletsapprovals'},
                    active: {}
                },
                secure: [
                    // TODO : Add security.
                    // Only admins should be allowed to create / approve a new interlets approval.
                ],
                schemaUtils: {
                    $schema: "http://json-schema.org/schema#",
                    title: "Activation of an interletsapproval for a specific user.",
                    type: "object",
                    properties: {
                        person: $s.permalink("/persons","A permalink to the person who configured this interlets setting."),
                        interletsapproval: $s.permalink("/interletsapprovals","A permalink to the approval between two groups."),
                        active: $s.boolean("True if the user wants to include the interlets information from the approved group. False if the user does not want to see the other group's information.")
                    },
                    required: ["person","interletsapproval","active"]
                },
                validate: [],
                query : {
                    person : filterReferencedType("persons","person"),
                    persons : filterReferencedType("persons","person")
                },
                beforeinsert : [],
                beforeupdate : [],
                beforedelete : [],
                afterinsert : [],
                afterupdate : [],
                afterdelete: []
            }
        ]
    });

var server = app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});

/* Configuration of sri4node is done */
/* Now let's test it... */

var base = "http://localhost:" + app.get('port');
cl("Test 1: Retrieve /communities ...");
needle.get(base + "/communities", function(error, response) {
    if(response.body.$$meta.count != 4) throw new Error("Failed");
    server.close();
    process.exit(0);
});

