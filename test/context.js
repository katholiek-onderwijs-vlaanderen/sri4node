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

var $u,$m,$s,$q;

exports = module.exports = {
    serve: function(roa, port, logsql, logrequests, logdebug) {
        $u = roa.utils;
        $m = roa.mapUtils;
        $s = roa.schemaUtils;
        $q = roa.queryUtils;

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

        var invalidQueryParameter = function(value, select, param, database) {
            var deferred = Q.defer();
            deferred.reject({ code: "invalid.query.parameter" });
            return deferred.promise;
        };
        
        // Don't really need the extra parameters when using CTE.
        var cteOneGuid = function(value, select, param) {
            var deferred = Q.defer();
            
            var cte = $u.prepareSQL();
            cte.sql("SELECT guid FROM messages where title = ").param("Rabarberchutney");
            select.with(cte, "cte");
            select.sql(" AND guid IN (SELECT guid FROM cte)");
            deferred.resolve();
            
            return deferred.promise;
        }

        var cteOneGuid2 = function(value, select, param) {
            var deferred = Q.defer();
            
            var cte = $u.prepareSQL();
            cte.sql("SELECT guid FROM messages where title = ").param("Rabarberchutney");
            select.with(cte, "cte2");
            select.sql(" AND guid IN (SELECT guid FROM cte2)");
            deferred.resolve();
            
            return deferred.promise;
        }


        var parameterWithExtraQuery = function(value, select, param, database, count) {
            var deferred = Q.defer();
            
            if(count) {
                var q = $u.prepareSQL("create-allcommunityguids");
                q.sql('CREATE TEMPORARY TABLE allcommunityguids ON COMMIT DROP AS SELECT guid FROM communities');
                $u.executeSQL(database, q).then(function(results) {
                    select.sql(' AND "guid" NOT IN (SELECT "guid" FROM "allcommunityguids") ');
                    deferred.resolve();
                }).catch(function(error) {
                    debug("Catch creating temp table");
                    debug(error);
                    deferred.reject(error);
                }).fail(function(error) {
                    debug("Fail creating temp table");
                    debug(error);
                    deferred.reject(error);
                });
            } else {
                select.sql(' AND "guid" NOT IN (SELECT "guid" FROM "allcommunityguids") ');
                deferred.resolve();
            }
            
            return deferred.promise;
        };

        var parameterWithExtraQuery2 = function(value, select, param, database, count) {
            var deferred = Q.defer();
            
            if(count) {
                var q = $u.prepareSQL("create-allcommunityguids2");
                q.sql('CREATE TEMPORARY TABLE allcommunityguids2 ON COMMIT DROP AS SELECT guid FROM communities');
                $u.executeSQL(database, q).then(function(results) {
                    select.sql(' AND "guid" NOT IN (SELECT "guid" FROM "allcommunityguids2") ');
                    deferred.resolve();
                }).catch(function(error) {
                    debug("Catch creating temp table");
                    debug(error);
                    deferred.reject(error);
                }).fail(function(error) {
                    debug("Fail creating temp table");
                    debug(error);
                    deferred.reject(error);
                });
            } else {
                select.sql(' AND "guid" NOT IN (SELECT "guid" FROM "allcommunityguids2") ');
                deferred.resolve();
            }
            
            return deferred.promise;
        };
        
        
        var messagesPostedSince = function(value, select) {
            var deferred = Q.defer();
            select.sql(' and posted > ').param(value);
            deferred.resolve();
            return deferred.promise;
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
            // A secure function must take into account that a GET operation
            // can be either a GET for a regular resource, or a GET for a
            // list resource.
            debug('** restrictReadPersons ');
            var deferred = Q.defer();
            if(req.method === 'GET') {
                debug('** req.path = ' + req.   path);
                var url = req.path;
                if(url == '/persons') {
                    // Should allways restrict to /me community.
                    debug('** req.query :');
                    debug(req.query);
                    if(req.query.communities) {
                        debug('** me :');
                        debug(me);
                        if(req.query.communities == me.community.href) {
                            debug('** restrictReadPersons resolves.');
                            deferred.resolve();
                        } else {
                            debug('** restrictReadPersons rejecting - can only request persons from your own community.');
                            deferred.reject();
                        }
                    } else {
                        cl('** restrictReadPersons rejecting - must specify ?communities=... for GET on list resources');
                        deferred.reject();
                    }
                } else {                    
                    var type = '/' + url.split("/")[1];
                    var guid = url.split("/")[2];
                    var myCommunityGuid = me.community.href.split("/")[2];

                    var query = $u.prepareSQL("check-person-is-in-my-community");
                    query.sql("select count(*) from persons where guid = ").param(guid).sql(" and community = ").param(myCommunityGuid);
                    $u.executeSQL(db, query).then(function(result) {
                        if(result.rows[0].count == 1) {
                            debug('** restrictReadPersons resolves.');
                            deferred.resolve();
                        } else {
                            cl('** security method restrictedReadPersons denies access.');
                            deferred.reject();
                        }
                    });
                } /* end handling regular resource request */
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
        
        function addMessageCountToCommunities(database, elements) {
            debug("addMessageCountToCommunities");
            debug(elements);
            var deferred = Q.defer();
            
            // Lets do this efficiently. Remember that we receive an array of elements. 
            // We query the message counts in a single select.
            // e.g. select community,count(*) from messages group by community having community in ('8bf649b4-c50a-4ee9-9b02-877aa0a71849','57561082-1506-41e8-a57e-98fee9289e0c');
            if(elements && elements.length > 0) {
                var query = $u.prepareSQL();
                var guidToElement = {};
                var guids = [];
                for(var i=0; i<elements.length; i++) {
                    var element = elements[i];
                    var guid = element.$$meta.permalink.split('/')[2];
                    guids.push(guid);
                    guidToElement[guid] = element;
                    // Default to 0, The query will not return a row for those.
                    element.$$messagecount = 0;
                }
                query.sql("SELECT community, count(*) as messagecount FROM messages GROUP BY community HAVING community in (");
                query.array(guids);
                query.sql(")");
                
                $u.executeSQL(database,query).then(function(result) {
                    debug(result);
                    var rows = result.rows;
                    for(var i=0; i<rows.length; i++) {
                        var row = rows[i];
                        guidToElement[row.community].$$messagecount = parseInt(row.messagecount);
                    }
                    deferred.resolve();
                }).fail(function(error) {
                    debug(error);
                    deferred.reject(error);
                });
            } else {
                // No elements in array, resolve promise.
                deferred.resolve();
            }
            
            return deferred.promise;
        }
        
        var addExtraKeysAfterRead = function(database, elements) {
            var deferred = Q.defer();
            
            for(var i=0; i<elements.length; i++) {
                elements[i].$$afterread = 'added by afterread method';
            }
            deferred.resolve();
            
            return deferred.promise;
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
                            firstname: $s.string("First name of the person."),
                            lastname: $s.string("Last name of the person."),
                            street: $s.string("Streetname of the address of residence."),
                            streetnumber: $s.string("Street number of the address of residence."),
                            streetbus: $s.string("Postal box of the address of residence."),
                            zipcode: $s.belgianzipcode("4 digit postal code of the city for the address of residence."),
                            city: $s.string("City for the address of residence."),
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
                        communities: $q.filterReferencedType('communities','community')
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
                            title: $s.string("A short summary of the message. A plain text string."),
                            description: $s.string("A more elaborate description. An HTML string."),
                            amount: $s.numeric("Amount suggested by the author."),
                            unit: $s.string("Unit in which amount was suggested by the author."),
                            community: $s.permalink("/communities","In what community was the message placed ? The permalink to the community.")
                        },
                        required: ["person","type","title","community"]
                    },
                    validate: [
                        validateMoreThan('amount', 10),
                        validateMoreThan('amount', 20)
                    ],
                    query: {
                        communities: $q.filterReferencedType("communities","community"),
                        postedSince: messagesPostedSince, // For compatability, to be removed.
                        modifiedsince: messagesPostedSince,
                        cteOneGuid: cteOneGuid,
                        cteOneGuid2: cteOneGuid2
                    },
                    afterread: [
                        addExtraKeysAfterRead
                    ]
                },
                {
                    type: "/communities",
                    public: true, // remove authorisation check.
                    secure: [],
                    schema: {
                        $schema: "http://json-schema.org/schema#",
                        title: "A local group in the LETS system.",
                        type: "object",
                        properties: {
                            name: $s.string("Name of this group. Normally named 'LETS [locale]'."),
                            street: $s.string("Street of the organisational seat address."),
                            streetnumber: $s.string("Street number of the organisational seat address."),
                            streetbus: $s.string("Postal box of the organisational seat address."),
                            zipcode: $s.belgianzipcode("4 digit postal code of the city for the organisational seat address."),
                            city: $s.string("City for the organisational seat address."),
                            phone: $s.phone("Contact phone number for the group."),
                            email: $s.email("Contact email for the group."),
                            adminpassword: $s.string("Administrative password for the group."),
                            website: $s.url("Website URL for the group."),
                            facebook: $s.url("URL to the facebook page of the group."),
                            currencyname: $s.string("Name of the local currency for the group.")
                        },
                        required: ["name", "street", "streetnumber", "zipcode", "city", "phone", "email", "adminpassword", "currencyname"]
                    },
                    validate: [ ],
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
                    query: {
                        invalidQueryParameter: invalidQueryParameter,
                        parameterWithExtraQuery: parameterWithExtraQuery,
                        parameterWithExtraQuery2: parameterWithExtraQuery2,
                        hrefs: $q.filterHrefs
                    },
                    afterread: [
                        // Add the result of a select query to the outgoing resource
                        // SELECT count(*) FROM messages where community = [this community]
                        // For example : 
                        // $$messagecount: 17
                        addMessageCountToCommunities
                    ]
                },
                {
                    type: "/transactions",
                    public: false,
                    map: {
                        transactiontimestamp: {
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
                            description: $s.string("A description, entered by the person sending, of the transaction."),
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
                },
                {
                    type: "/table",
                    public: true,
                    map: {
                        "select": {},
                        "from": {}
                    },
                    secure: [],
                    schema: {
                        $schema: "http://json-schema.org/schema#",
                        title: "A table with protected keywords, to check escaping of sri4node",
                        type: "object",
                        properties: {
                            "select": $s.string(""),
                            "from": $s.string("")
                        },
                        required: ["select","from"]
                    },
                    afterinsert : [],
                    afterupdate : []
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