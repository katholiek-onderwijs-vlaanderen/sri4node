/*
Reference SRI interface used in the test suite for sri4node.
You can require it, and start serving the reference API :

var context = require('./context.js');
context.serve();
*/
"use strict";

// External includes
var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');
var Q = require('q');

var $u,$m,$s;

exports = module.exports = {
    serve: function(roa, port, logsql, logrequests, logdebug) {
        $u = roa.utils;
        $m = roa.mapUtils;
        $s = roa.schemaUtils;

        var app = express();
        app.set('port', port);
        app.use(bodyParser.json());

        function cl(x) {
            console.log(x);
        }
        
        function debug(x) {
            if(logdebug) cl(x);
        }

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

        var restrictReadPersons = function(req, resp, db, me) {
            var deferred = Q.defer();
            if(req.method === 'GET') {
                var url = req.path;
                var type = '/' + url.split("/")[1];
                var guid = url.split("/")[2];
                var myCommunityGuid = me.community.href.split("/")[2];

                var query = $u.prepareSQL("check-person-is-in-my-community");
                query.sql("select count(*) from persons where guid = ").param(guid).sql(" and community = ").param(myCommunityGuid);
                $u.executeSQL(db, query).then(function(result) {
                    if(result.rows[0].count == 1) {
                        deferred.resolve();
                    } else {
                        cl('security method restrictedReadPersons denies access');
                        deferred.reject();
                    }
                });

            } else {
                deferred.resolve();
            }

            return deferred.promise;
        };

        function disallowOnePerson(permalink) {
            return function(req, resp, db, me) {
                var deferred = Q.defer();

                if(req.method === 'GET') {
                    var url = req.path;
                    if(url == permalink) {
                        cl('security method disallowedOnePerson for ' + permalink + ' denies access');
                        deferred.reject();
                    } else {
                        deferred.resolve();
                    }
                } else {
                    deferred.resolve();
                }   

                return deferred.promise;
            };
        };
        
        function validateMoreThan(field, max) {
            return function(body, db) {
                var deferred = Q.defer();
                if(body.amount <= max) {
                    debug("Should be more, or equal to " + max);
                    deferred.reject({ path: field, code: "not.enough"});
                } else {
                    deferred.resolve();
                }
                
                return deferred.promise;
            };
        }

        var config = {
            // For debugging SQL can be logged.
            logsql : logsql,
            logrequests : logrequests,
            logdebug : logdebug,
            defaultdatabaseurl : "postgres://sri4node:sri4node@localhost:5432/postgres",
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
                    output.community = { href: '/communities/' + row.community };
                    return output;
                });
            },
            resources : [
                {
                    type: "/persons",
                    public: false,
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
                    secure : [
                        restrictReadPersons,
                        // Ingrid Ohno
                        disallowOnePerson('/persons/da6dcc12-c46f-4626-a965-1a00536131b2')
                    ],
                    schema: {
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
                        required: ["firstname","lastname","street","streetnumber","zipcode","city", "mail4elas"]
                    },
                    validate: [
                    ],
                    query: {
                        communities: filterReferencedType('communities','community')
                    },
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
                    ],
                    schema: {
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
                    validate: [
                        validateMoreThan('amount', 10),
                        validateMoreThan('amount', 20)
                    ],
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
                    schema: {
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
                    validate: [ ]
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
                    ],
                    schema: {
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
                            var toguid = element.toperson.href;
                            toguid = toguid.split("/")[2];

                            var updateto = $u.prepareSQL();
                            updateto.sql('update persons set balance = (balance + ').param(amount).sql(') where guid = ').param(toguid);
                            return $u.executeSQL(db,updateto);
                        },
                        function(db, element) {
                            var amount = element.amount;
                            var fromguid = element.fromperson.href;
                            fromguid = fromguid.split("/")[2];

                            var updatefrom = $u.prepareSQL();
                            updatefrom.sql('update persons set balance = (balance - ').param(amount).sql(') where guid = ').param(fromguid);
                            return $u.executeSQL(db,updatefrom);
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
                }
            ]
        }

        // Need to pass in express.js and node-postgress as dependencies.
        roa.configure(app,pg,config);
        
        var port = app.get('port');

        var server = app.listen(port, function() {
            debug("Node app is running at localhost:" + app.get('port'))
        });
    }
}