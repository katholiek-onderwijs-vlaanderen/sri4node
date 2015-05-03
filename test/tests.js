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
var sriclient = require("./sriclient.js");
var doGet = sriclient.get;
var doPut = sriclient.put;
var doDelete = sriclient.delete;

var port = 5000;
var logsql, logrequests, debug;
logsql = logrequests = debug = true;
context.serve(roa, port, logsql, logrequests,debug);

/* Configuration of sri4node is done */
/* Now let's test it... */
var base = "http://localhost:" + port;

function cl(x) {
    console.log(x);
}

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
        it('should be 401 Forbidden', function() {
            return doGet(base + '/persons').then(function(response) {
                assert.equal(response.statusCode,401);
            });
        });
    });
    
    describe('/persons with authentication', function() {
        it('should be 200 Ok', function() {
            return doGet(base + '/persons', 'sabine@email.be', 'pwd').then(function(response) {
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
        it('should be 401 Forbidden', function() {
            return doGet(base + '/persons/82565813-943e-4d1a-ac58-8b4cbc865bdb','kevin@email.be','pwd').then(function(response) {
                assert.equal(response.statusCode, 401);
            });
        });
    });
    
    describe('two secure functions', function() {
        it('should disallow read on Ingrid Ohno', function() {
            return doGet(base + '/persons/da6dcc12-c46f-4626-a965-1a00536131b2','sabine@email.be','pwd').then(function(response) {
                assert.equal(response.statusCode, 401);
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
                assert.equal(response.statusCode, 403);
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
