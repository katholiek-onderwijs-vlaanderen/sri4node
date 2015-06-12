"use strict";

// External includes
var Q = require('q');
var assert = require('assert');
var uuid = require('node-uuid');

// Local includes
var roa = require("../sri4node.js");
// Reference API, used in the test suite.
var context = require("./context.js");
// Utility methods for calling the SRI interface
var sriclient = require("sri4node-client");
var doGet = sriclient.get;
var doPut = sriclient.put;
var doDelete = sriclient.delete;

var port = 5000;
var logsql, logrequests, logdebug;
logsql = logrequests = logdebug = true;
context.serve(roa, port, logsql, logrequests, logdebug);

/* Configuration of sri4node is done */
/* Now let's test it... */
var base = "http://localhost:" + port;

function cl(x) {
    console.log(x);
}

function debug(x) {
    if(logdebug) cl(x);
}
/*
describe('GET public list resource', function(){
    describe('without authentication', function(){
        it('should return a list of 4 communities', function(){
            return doGet(base + "/communities").then(function(response) {
                assert.equal(response.statusCode, 200);
                if(!response.body.$$meta.count) assert.fail();
            });
        });
    });

    describe('with authentication', function() {
        it('should return a list of 4 communities', function() {
            return doGet(base + '/communities', 'sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                if(!response.body.$$meta.count) assert.fail();
            });
        });
    });

    describe('with single value ?hrefs=...', function() {
        it('should work', function() {
            return doGet(base + '/communities?hrefs=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d', 'sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.$$meta.count, 1);
                assert.equal(response.body.results[0].href, '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d');
            });
        });
    });
    
    describe('with two values ?hrefs=...', function() {
        it('should work', function() {
            return doGet(base + '/communities?hrefs=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d,/communities/6531e471-7514-43cc-9a19-a72cf6d27f4c', 'sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.$$meta.count, 2);
                var hrefs = [response.body.results[0].href,response.body.results[1].href];
                if(hrefs.indexOf('/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d') == -1) assert.fail();
                if(hrefs.indexOf('/communities/6531e471-7514-43cc-9a19-a72cf6d27f4c') == -1) assert.fail();
            });
        });
    });

});

describe('GET public regular resource', function() {
    describe('without authentication', function() {
        it('should return LETS Regio Dendermonde', function() {
            return doGet(base + "/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849").then(function(response) {
                assert.equal(response.body.name,'LETS Regio Dendermonde');
            });
        });
    });
    
    describe('with authentication', function() {
        it('should return LETS Regio Dendermonde', function() {
            return doGet(base + "/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d",'sabine@email.be','pwd').then(function(response) {
                assert.equal(response.body.name,'LETS Hamme');
            });
        });
    });
    
    describe('with invalid authentication - non-existing user', function() {
        it('should return LETS Regio Dendermonde', function() {
            return doGet(base + "/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d",'unknown@email.be','pwd').then(function(response) {
                assert.equal(response.body.name,'LETS Hamme');
            });
        });
    });
    
    describe('with invalid authentication - existing user, wrong password', function() {
        it('should return LETS Regio Dendermonde', function() {
            return doGet(base + "/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d",'sabine@email.be','INVALID').then(function(response) {
                assert.equal(response.body.name,'LETS Hamme');
            });
        });
    });
});

describe('GET private list resource', function() {
    describe('/persons without authentication', function() {
        it('should be 401 Unauthorized', function() {
            return doGet(base + '/persons').then(function(response) {
                assert.equal(response.statusCode,401);
            });
        });
    });
    
    describe('/persons with authentication', function() {
        it('should be 200 Ok', function() {
            // Must restrict to the community of the user logged in (restictReadPersons enforces this)
            return doGet(base + '/persons?communities=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849', 'sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                if(!response.body.$$meta.count) assert.fail();
            });
        });
    });
});

describe('GET private regular resource', function() {
    describe('/persons/{guid} from my community', function() {
        it('should return Kevin Boon', function() {
            return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d','kevin@email.be','pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.firstname, "Kevin");
                assert.equal(response.body.lastname,"Boon");
            });
        });
    });
    
    describe('/persons/{guid} from different community', function() {
        it('should be 403 Forbidden', function() {
            return doGet(base + '/persons/82565813-943e-4d1a-ac58-8b4cbc865bdb','kevin@email.be','pwd').then(function(response) {
                assert.equal(response.statusCode, 403);
            });
        });
    });
    
    describe('two secure functions', function() {
        it('should disallow read on Ingrid Ohno', function() {
            return doGet(base + '/persons/da6dcc12-c46f-4626-a965-1a00536131b2','sabine@email.be','pwd').then(function(response) {
                assert.equal(response.statusCode, 403);
            });
        });
    });

    describe('with invalid authentication - non-existing user', function() {
        it('should disallow read', function() {
            return doGet(base + "/persons/de32ce31-af0c-4620-988e-1d0de282ee9d",'unknown@email.be','pwd').then(function(response) {
                assert.equal(response.statusCode, 401);
            });
        });
    });

    describe('with invalid authentication - existing user, wrong password', function() {
        it('should disallow read', function() {
            return doGet(base + "/persons/de32ce31-af0c-4620-988e-1d0de282ee9d",'sabine@email.be','INVALID').then(function(response) {
                assert.equal(response.statusCode, 401);
            });
        });
    });
    
    describe('without authentication', function() {
        it('should disallow read', function() {
            return doGet(base + "/persons/de32ce31-af0c-4620-988e-1d0de282ee9d").then(function(response) {
                assert.equal(response.statusCode, 401);
            });
        });
    });

});

describe("GET user security context /me", function() {
    describe("with authentication", function() {
        it('should return *me*', function() {
            return doGet(base + '/me','steven@email.be','pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.firstname, "Steven");
                assert.equal(response.body.lastname,"Plas");
            });
        });
    });
    
    describe("without authentication", function() {
        it('should disallow access', function() {
            return doGet(base + '/me').then(function(response) {
                assert.equal(response.statusCode, 401);
            });
        });
    });

    describe("with invalid authentication - non-existing user", function() {
        it('should disallow access', function() {
            return doGet(base + '/me','invalid@email.be','pwd').then(function(response) {
                assert.equal(response.statusCode, 401);
            });
        });
    });

    describe("with invalid authentication - wrong password", function() {
        it('should disallow access', function() {
            return doGet(base + '/me','steven@email.be','INVALID').then(function(response) {
                assert.equal(response.statusCode, 401);
            });
        });
    });
});

var communityDendermonde = "/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849";
var personSabine = "/persons/9abe4102-6a29-4978-991e-2a30655030e6";
function generateRandomPerson(guid, communityPermalink) {
    return {
        firstname: "Sabine",
        lastname: "Eeckhout",
        street: "Stationstraat",
        streetnumber: "17",
        zipcode: "9280",
        city: "Lebbeke",
        phone: "0492882277",
        email: guid + "@email.com",
        balance: 0,
        mail4elas: "weekly",
        community: { href: communityPermalink }
    };
}

function generateRandomCommunity(guid) {
    return {
        name: "LETS " + guid,
        street: "Leuvensesteenweg",
        streetnumber: "34",
        zipcode: "1040",
        city: "Brussel",
        phone: "0492882277",
        email: guid + "@email.com",
        adminpassword: "secret",
        currencyname: "pluimen"
    };
}

function generateRandomMessage(guid, person, community) {
    return {
        person: { href: person },
        type: "offer",
        title: "new message",
        description : "description for " + guid,
        amount : 1,
        unit : "stuk",
        community : { href: community }
    };
}

function generateTransaction(guid, permalinkFrom, permalinkTo, amount) {
    return {
        fromperson: { href : permalinkFrom },
        toperson: { href: permalinkTo },
        amount: amount,
        description: 'description for transaction ' + guid
    };
}

describe("PUT regular resource", function() {
    var guid = uuid.v4();
    describe("create regular resource",function() {
        it('should create a new person', function() {
            var body = generateRandomPerson(guid, communityDendermonde);
            return doPut(base + "/persons/" + guid, body, 'sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
            });
        });
        
        it('should be possible to read the newly created person', function() {
            return doGet(base + "/persons/" + guid, 'sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.email, guid + '@email.com');
            });
        });
        
        it('should be possible to update the newly created person', function() {
            return doGet(base + "/persons/" + guid, 'sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.firstname, "Sabine");
                var body = response.body;
                body.firstname = 'Modified';
                return doPut(base + "/persons/" + guid, body, 'sabine@email.be', 'pwd');
            }).then(function(response) {
                assert.equal(response.statusCode, 200);
                return doGet(base + "/persons/" + guid, 'sabine@email.be', 'pwd');
            }).then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.email, guid + '@email.com');
                assert.equal(response.body.firstname, "Modified");
            });
        });
    });
});

describe('DELETE regular resource', function() {
    var guid = uuid.v4();
    describe('remove newly created resource', function() {
        it('should be possible to delete a newly created resource', function() {
            var body = generateRandomCommunity(guid);
            return doPut(base + "/communities/" + guid, body, 'sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                return doGet(base + "/communities/" + guid, 'sabine@email.be', 'pwd');
            }).then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.email, guid + '@email.com');
                return doDelete(base + "/communities/" + guid, 'sabine@email.be', 'pwd');
            }).then(function(response) {
                assert.equal(response.statusCode, 200);
                return doGet(base + "/communities/" + guid, 'sabine@email.be', 'pwd');
            }).then(function(response) {
                // After delete the response should be 404.
                assert.equal(response.statusCode, 404);
            });
        });
    });
});

describe('PUT', function() {
    describe('schema validation', function() {
        it('should detect if a field is too long', function() {
            var guid = uuid.v4();
            var body = generateRandomCommunity(guid);
            body.email = body.email + body.email + body.email;
            return doPut(base + '/communities/' + guid, body, 'sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 409);
            });
        });
    });
    
    describe('with rejecting custom validation function', function() {
        it('should return a 409 Conflict', function() {
            var guid = uuid.v4();
            var body = generateRandomMessage(guid, personSabine, communityDendermonde);
            return doPut(base + '/messages/' + guid, body, 'sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 409);
                assert.equal(response.body.errors[0].code, 'not.enough');
            });
        });
    });
});

describe('afterupdate', function() {
    describe('should support', function() {
        it('multiple functions', function() {
            var guidp1 = uuid.v4();
            var p1 = generateRandomPerson(guidp1, communityDendermonde);
            return doPut(base + '/persons/' + guidp1, p1, 'sabine@email.be', 'pwd').then(function(response) {
                debug(response);
                assert.equal(response.statusCode, 200);
                debug('p1 created');
                var guidp2 = uuid.v4();
                var p2 = generateRandomPerson(guidp2, communityDendermonde);
                return doPut(base + '/persons/' + guidp2, p2, 'sabine@email.be', 'pwd').then(function(response) {
                    assert.equal(response.statusCode, 200);
                    debug('p2 created');
                    var guidt = uuid.v4();
                    var t = generateTransaction(guidt, '/persons/' + guidp1, '/persons/' + guidp2, 20);
                    return doPut(base + '/transactions/' + guidt, t, 'sabine@email.be', 'pwd');
                }).then(function(response) {
                    debug(response.body);
                    assert.equal(response.statusCode, 200);
                    debug('t created');
                    return doGet(base + '/persons/' + guidp1, 'sabine@email.be', 'pwd');
                }).then(function(response) {
                    assert.equal(response.statusCode, 200);
                    assert.equal(response.body.balance, -20);
                    return doGet(base + '/persons/' + guidp2, 'sabine@email.be', 'pwd');
                }).then(function(response) {
                    assert.equal(response.statusCode, 200);
                    assert.equal(response.body.balance, 20);                    
                });
            });
        });
    });
});

describe("escaping", function() {
    describe("should do proper escaping", function() {
        it("on table 'table' and column 'from'", function() {
            return doGet(base + '/table').then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.results[0].$$expanded.from, "from-value");
                assert.equal(response.body.results[0].$$expanded.select, "select-value");
            });
        });
    });
});

describe("URL parameters", function() {
    describe("that reject their promise", function() {
        it("should return 404 and the error message.", function() {
            return doGet(base + '/communities?invalidQueryParameter=true').then(function(response) {
                assert.equal(response.statusCode, 404);
                debug(response.body);
                assert.equal(response.body.errors[0].code, "invalid.query.parameter");
            });
        });
    });
    
    describe("that were not configured", function() {
        it("should return 404 with code [invalid.query.parameter]", function() {
            return doGet(base + '/communities?nonexistingparameter=x').then(function(response) {
                assert.equal(response.statusCode, 404);
                assert.equal(response.body.errors[0].code, "invalid.query.parameter");
                assert.equal(response.body.errors[0].parameter, "nonexistingparameter");
            });
        });
    });
    
    describe("that use the database object", function() {
        it("should return correct results (no side-effects)", function() {
            return doGet(base + '/communities?parameterWithExtraQuery=true&parameterWithExtraQuery2=true').then(function(response) {
                assert.equal(response.statusCode, 200);
                // It should return none, we added NOT IN SELECT guid FROM temptable
                // Where temptable was first filled to select all guids
                assert.equal(response.body.$$meta.count, 0);
                // And do it again to check that it works more than once.
                return doGet(base + '/communities?parameterWithExtraQuery=true&parameterWithExtraQuery2=true');
            }).then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.$$meta.count, 0);
            });
        });
    });
});

describe("Afterread methods", function() {
    describe("should be executed on regular resources", function() {
        it('should have a correct messagecount.', function() {
            return doGet(base + '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849').then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.$$messagecount, 5);
            });
        });
    });

    describe("should be executed on list resources", function() {
        it('should have a correct messagecount.', function() {
            return doGet(base + '/communities?hrefs=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849').then(function(response) {
                debug(response.body);
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.$$meta.count, 1);
                assert.equal(response.body.results[0].$$expanded.$$messagecount, 5);
            });
        });
    });
    
    describe("should be executed on lists with many resources", function() {
        it("should have correct messagecounts on all items", function() {
            return doGet(base + '/communities?limit=4').then(function(response) {
                debug("response body");
                debug(response.body);
                debug(response.body.results[2].$$expanded);
                debug(response.body.results[3].$$expanded);
                assert.equal(response.statusCode, 200);
                if(response.body.results[0].$$expanded.$$messagecount == undefined) assert.fail('should have $$messagecount');
                if(response.body.results[1].$$expanded.$$messagecount == undefined) assert.fail('should have $$messagecount');
                if(response.body.results[2].$$expanded.$$messagecount == undefined) assert.fail('should have $$messagecount');
                if(response.body.results[3].$$expanded.$$messagecount == undefined) assert.fail('should have $$messagecount');
            });
        });
    });
});

describe("Expansion", function() {
    // Test expand=none
    describe(' with results.href on list resources', function() {
        it("should succeed with $$expanded in results array.", function() {
            return doGet(base + '/messages?expand=none','sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                if(response.body.results[0].$$expanded != undefined) assert.fail('Expansion was performed !');
                if(response.body.results[1].$$expanded != undefined) assert.fail('Expansion was performed !');
                if(response.body.results[2].$$expanded != undefined) assert.fail('Expansion was performed !');
            });
        });
    });
    
    // Test expand=full on list resources (all elements href expanded)
    describe(' with results.href on list resources', function() {
        it("should succeed with $$expanded in results array.", function() {
            return doGet(base + '/messages?expand=full','sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                if(response.body.results[0].$$expanded == undefined) assert.fail('Expansion was not performed !');
                if(response.body.results[1].$$expanded == undefined) assert.fail('Expansion was not performed !');
                if(response.body.results[2].$$expanded == undefined) assert.fail('Expansion was not performed !');
            });
        });
    });
    
    // Test expand=href on list resources
    describe(' with results.href on list resources', function() {
        it("should succeed with $$expanded in results array.", function() {
            return doGet(base + '/messages?expand=results.href','sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                if(response.body.results[0].$$expanded == undefined) assert.fail('Expansion was not performed !');
                if(response.body.results[1].$$expanded == undefined) assert.fail('Expansion was not performed !');
                if(response.body.results[2].$$expanded == undefined) assert.fail('Expansion was not performed !');
            });
        });
    });

    // Test expand=community on regular message resource
    describe("on regular resources", function() {
        it("should succeed with $$expanded as result.", function() {
            return doGet(base + '/messages/ad9ff799-7727-4193-a34a-09f3819c3479?expand=community','sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.$$meta.permalink, '/messages/ad9ff799-7727-4193-a34a-09f3819c3479');
                if(response.body.community.$$expanded == undefined) assert.fail('Expansion was not performed !');
            });
        });
    });
    
    // Test expand=results.href,results.href.community on lists of messages
    describe('on list resources', function() {
        it("should succeed with $$expanded as result.", function() {
            return doGet(base + '/messages?expand=results.href,results.href.community','sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                debug(response.body.results[0].$$expanded);
                if(response.body.results[0].$$expanded.community.$$expanded == undefined) assert.fail('Expansion was not performed !');
                if(response.body.results[1].$$expanded.community.$$expanded == undefined) assert.fail('Expansion was not performed !');
                if(response.body.results[2].$$expanded.community.$$expanded == undefined) assert.fail('Expansion was not performed !');
            });
        });
    });

    // Test expand=invalid send 404 Not Found.
    describe("with invalid", function() {
        it("should say 'not found'.", function() {
            return doGet(base + '/messages/ad9ff799-7727-4193-a34a-09f3819c3479?expand=invalid','sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 404);
            });
        });
    });
    
    // Test expand=results.href.community,results.href.person
    describe('on list resources', function() {
        it("should allow expanding multiple keys.", function() {
            return doGet(base + '/messages?expand=results.href.person,results.href.community','sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                debug(response.body.results[0].$$expanded);
                if(response.body.results[0].$$expanded.community.$$expanded == undefined) assert.fail('Expansion was not performed !');
                if(response.body.results[1].$$expanded.community.$$expanded == undefined) assert.fail('Expansion was not performed !');
                if(response.body.results[2].$$expanded.community.$$expanded == undefined) assert.fail('Expansion was not performed !');
                if(response.body.results[0].$$expanded.person.$$expanded == undefined) assert.fail('Expansion was not performed !');
                if(response.body.results[1].$$expanded.person.$$expanded == undefined) assert.fail('Expansion was not performed !');
                if(response.body.results[2].$$expanded.person.$$expanded == undefined) assert.fail('Expansion was not performed !');
            });
        });
    });
});
*/

describe("query parameters", function() {
    /*
    describe("that use a CTE", function() {
        it("to limit to a single guid, should only return 1 row.", function() {
            return doGet(base + '/messages?cteOneGuid=true','sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.$$meta.count, 1);
            });
        });
    });
    */
    
    // Test re-ordering of query parameters.
    describe("that use a CTE and other parameter", function() {
        it("to limit to a single guid + another parameter, should handle re-sequencing of parameters well", function() {
            return doGet(base + '/messages?hrefs=/messages/d70c98ca-9559-47db-ade6-e5da590b2435&cteOneGuid=true','sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.$$meta.count, 1);
            });
        });
    });
    
    // Test applying 2 CTEs
    describe("that use a TWO CTEs", function() {
        it("to limit to a single guid, should handle both CTEs well", function() {
            return doGet(base + '/messages?cteOneGuid=true&cteOneGuid2=true','sabine@email.be', 'pwd').then(function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.$$meta.count, 1);
            });
        });
    });
    
});
