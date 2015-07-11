// External includes
var assert = require('assert');
var uuid = require('node-uuid');

// Local includes
var roa = require('../sri4node.js');
var common = require('../js/common.js');
var cl = common.cl;
// Reference API, used in the test suite.
var context = require('./context.js');
// Utility methods for calling the SRI interface
var sriclient = require('sri4node-client');
var doGet = sriclient.get;
var doPut = sriclient.put;
var doDelete = sriclient.delete;

var port = 5000;
var logsql, logrequests, logdebug;
logsql = logrequests = logdebug = true;
context.serve(roa, port, logsql, logrequests, logdebug);

/* Configuration of sri4node is done */
/* Now let's test it... */
var base = 'http://localhost:' + port;

function debug(x) {
  'use strict';
  if (logdebug) {
    cl(x);
  }
}

var communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';
var personSabine = '/persons/9abe4102-6a29-4978-991e-2a30655030e6';

function generateRandomPerson(key, communityPermalink) {
  'use strict';
  return {
    firstname: 'Sabine',
    lastname: 'Eeckhout',
    street: 'Stationstraat',
    streetnumber: '17',
    zipcode: '9280',
    city: 'Lebbeke',
    phone: '0492882277',
    email: key + '@email.com',
    balance: 0,
    mail4elas: 'weekly',
    community: {
      href: communityPermalink
    }
  };
}

function generateRandomCommunity(key) {
  'use strict';
  return {
    name: 'LETS ' + key,
    street: 'Leuvensesteenweg',
    streetnumber: '34',
    zipcode: '1040',
    city: 'Brussel',
    phone: '0492882277',
    email: key + '@email.com',
    adminpassword: 'secret',
    currencyname: 'pluimen'
  };
}

function generateRandomMessage(key, person, community) {
  'use strict';
  return {
    person: {
      href: person
    },
    type: 'offer',
    title: 'new message',
    description: 'description for ' + key,
    amount: 1,
    unit: 'stuk',
    community: {
      href: community
    }
  };
}

function generateTransaction(key, permalinkFrom, permalinkTo, amount) {
  'use strict';
  return {
    fromperson: {
      href: permalinkFrom
    },
    toperson: {
      href: permalinkTo
    },
    amount: amount,
    description: 'description for transaction ' + key
  };
}

describe('GET public list resource', function () {
  'use strict';
  describe('without authentication', function () {
    it('should return a list of 4 communities', function () {
      return doGet(base + '/communities').then(function (response) {
        assert.equal(response.statusCode, 200);
        if (!response.body.$$meta.count) {
          assert.fail();
        }
      });
    });
  });

  describe('with authentication', function () {
    it('should return a list of 4 communities', function () {
      return doGet(base + '/communities', 'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        if (!response.body.$$meta.count) {
          assert.fail();
        }
      });
    });
  });

  describe('with single value ?hrefs=...', function () {
    it('should work', function () {
      return doGet(base + '/communities?hrefs=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d',
                   'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.$$meta.count, 1);
        assert.equal(response.body.results[0].href, '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d');
      });
    });
  });

  describe('with two values ?hrefs=...', function () {
    it('should work', function () {
      return doGet(base + '/communities?hrefs=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d' +
                   ',/communities/6531e471-7514-43cc-9a19-a72cf6d27f4c',
                   'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.$$meta.count, 2);
        var hrefs = [response.body.results[0].href, response.body.results[1].href];
        if (hrefs.indexOf('/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d') === -1) {
          assert.fail();
        }
        if (hrefs.indexOf('/communities/6531e471-7514-43cc-9a19-a72cf6d27f4c') === -1) {
          assert.fail();
        }
      });
    });
  });

});

describe('GET public regular resource', function () {
  'use strict';
  describe('without authentication', function () {
    it('should return LETS Regio Dendermonde', function () {
      return doGet(base + '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849').then(function (response) {
        assert.equal(response.body.name, 'LETS Regio Dendermonde');
      });
    });
  });

  describe('with authentication', function () {
    it('should return LETS Regio Dendermonde', function () {
      return doGet(base + '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d',
                   'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.body.name, 'LETS Hamme');
      });
    });
  });

  describe('with invalid authentication - non-existing user', function () {
    it('should return LETS Regio Dendermonde', function () {
      return doGet(base + '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d',
                   'unknown@email.be', 'pwd').then(function (response) {
        assert.equal(response.body.name, 'LETS Hamme');
      });
    });
  });

  describe('with invalid authentication - existing user, wrong password', function () {
    it('should return LETS Regio Dendermonde', function () {
      return doGet(base + '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d',
                   'sabine@email.be', 'INVALID').then(function (response) {
        assert.equal(response.body.name, 'LETS Hamme');
      });
    });
  });
});

describe('GET private list resource', function () {
  'use strict';
  describe('/persons without authentication', function () {
    it('should be 401 Unauthorized', function () {
      return doGet(base + '/persons').then(function (response) {
        assert.equal(response.statusCode, 401);
      });
    });
  });

  describe('/persons with authentication', function () {
    it('should be 200 Ok', function () {
      // Must restrict to the community of the user logged in (restictReadPersons enforces this)
      return doGet(base + '/persons?communities=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849',
                   'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        if (!response.body.$$meta.count) {
          assert.fail();
        }
      });
    });
  });
});

describe('GET private regular resource', function () {
  'use strict';
  describe('/persons/{key} from my community', function () {
    it('should return Kevin Boon', function () {
      return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d',
                   'kevin@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.firstname, 'Kevin');
        assert.equal(response.body.lastname, 'Boon');
      });
    });
  });

  describe('/persons/{key} from different community', function () {
    it('should be 403 Forbidden', function () {
      return doGet(base + '/persons/82565813-943e-4d1a-ac58-8b4cbc865bdb',
                   'kevin@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 403);
      });
    });
  });

  describe('two secure functions', function () {
    it('should disallow read on Ingrid Ohno', function () {
      return doGet(base + '/persons/da6dcc12-c46f-4626-a965-1a00536131b2',
                   'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 403);
      });
    });
  });

  describe('with invalid authentication - non-existing user', function () {
    it('should disallow read', function () {
      return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d',
                   'unknown@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 401);
      });
    });
  });

  describe('with invalid authentication - existing user, wrong password', function () {
    it('should disallow read', function () {
      return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d',
                   'sabine@email.be', 'INVALID').then(function (response) {
        assert.equal(response.statusCode, 401);
      });
    });
  });

  describe('without authentication', function () {
    it('should disallow read', function () {
      return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d').then(function (response) {
        assert.equal(response.statusCode, 401);
      });
    });
  });

});

describe('GET user security context /me', function () {
  'use strict';
  describe('with authentication', function () {
    it('should return *me*', function () {
      return doGet(base + '/me', 'steven@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.firstname, 'Steven');
        assert.equal(response.body.lastname, 'Plas');
      });
    });
  });

  describe('without authentication', function () {
    it('should disallow access', function () {
      return doGet(base + '/me').then(function (response) {
        assert.equal(response.statusCode, 401);
      });
    });
  });

  describe('with invalid authentication - non-existing user', function () {
    it('should disallow access', function () {
      return doGet(base + '/me', 'invalid@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 401);
      });
    });
  });

  describe('with invalid authentication - wrong password', function () {
    it('should disallow access', function () {
      return doGet(base + '/me', 'steven@email.be', 'INVALID').then(function (response) {
        assert.equal(response.statusCode, 401);
      });
    });
  });
});

describe('DELETE regular resource', function () {
  'use strict';
  var key = uuid.v4();
  describe('remove newly created resource', function () {
    it('should be possible to delete a newly created resource', function () {
      var body = generateRandomCommunity(key);
      return doPut(base + '/communities/' + key, body, 'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        return doGet(base + '/communities/' + key, 'sabine@email.be', 'pwd');
      }).then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.email, key + '@email.com');
        return doDelete(base + '/communities/' + key, 'sabine@email.be', 'pwd');
      }).then(function (response) {
        assert.equal(response.statusCode, 200);
        return doGet(base + '/communities/' + key, 'sabine@email.be', 'pwd');
      }).then(function (response) {
        // After delete the response should be 404.
        assert.equal(response.statusCode, 404);
      });
    });
  });
});

describe('PUT', function () {
  'use strict';
  describe('schema validation', function () {
    it('should detect if a field is too long', function () {
      var key = uuid.v4();
      var body = generateRandomCommunity(key);
      body.email = body.email + body.email + body.email;
      return doPut(base + '/communities/' + key, body, 'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 409);
      });
    });
  });

  describe('with rejecting custom validation function', function () {
    it('should return a 409 Conflict', function () {
      var key = uuid.v4();
      var body = generateRandomMessage(key, personSabine, communityDendermonde);
      return doPut(base + '/messages/' + key, body, 'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 409);
        assert.equal(response.body.errors[0].code, 'not.enough');
      });
    });
  });
});

describe('afterupdate', function () {
  'use strict';
  describe('should support', function () {
    it('multiple functions', function () {
      var keyp1 = uuid.v4();
      var keyp2, p2;
      var p1 = generateRandomPerson(keyp1, communityDendermonde);
      return doPut(base + '/persons/' + keyp1, p1, 'sabine@email.be', 'pwd').then(function (response) {
        debug(response);
        assert.equal(response.statusCode, 200);
        debug('p1 created');
        keyp2 = uuid.v4();
        p2 = generateRandomPerson(keyp2, communityDendermonde);
        return doPut(base + '/persons/' + keyp2, p2, 'sabine@email.be', 'pwd');
      }).then(function (response) {
        assert.equal(response.statusCode, 200);
        debug('p2 created');
        var keyt = uuid.v4();
        var t = generateTransaction(keyt, '/persons/' + keyp1, '/persons/' + keyp2, 20);
        return doPut(base + '/transactions/' + keyt, t, 'sabine@email.be', 'pwd');
      }).then(function (response) {
        debug(response.body);
        assert.equal(response.statusCode, 200);
        debug('t created');
        return doGet(base + '/persons/' + keyp1, 'sabine@email.be', 'pwd');
      }).then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.balance, -20);
        return doGet(base + '/persons/' + keyp2, 'sabine@email.be', 'pwd');
      }).then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.balance, 20);
      });
    });
  });
});

describe('escaping', function () {
  'use strict';
  describe('should do proper escaping', function () {
    it('on table \'table\' and column \'from\'', function () {
      return doGet(base + '/table').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.results[0].$$expanded.from, 'from-value');
        assert.equal(response.body.results[0].$$expanded.select, 'select-value');
      });
    });
  });
});

describe('URL parameters', function () {
  'use strict';
  describe('that reject their promise', function () {
    it('should return 404 and the error message.', function () {
      return doGet(base + '/communities?invalidQueryParameter=true').then(function (response) {
        assert.equal(response.statusCode, 404);
        debug(response.body);
        assert.equal(response.body.errors[0].code, 'invalid.query.parameter');
      });
    });
  });

  describe('that were not configured', function () {
    it('should return 404 with code [invalid.query.parameter]', function () {
      return doGet(base + '/communities?nonexistingparameter=x').then(function (response) {
        assert.equal(response.statusCode, 404);
        assert.equal(response.body.errors[0].code, 'invalid.query.parameter');
        assert.equal(response.body.errors[0].parameter, 'nonexistingparameter');
      });
    });
  });

  describe('that use the database object', function () {
    it('should return correct results (no side-effects)', function () {
      return doGet(base + '/communities?parameterWithExtraQuery=true&parameterWithExtraQuery2=true')
        .then(function (response) {
        assert.equal(response.statusCode, 200);
        // It should return none, we added NOT IN SELECT key FROM temptable
        // Where temptable was first filled to select all keys
        assert.equal(response.body.$$meta.count, 0);
        // And do it again to check that it works more than once.
        return doGet(base + '/communities?parameterWithExtraQuery=true&parameterWithExtraQuery2=true');
      }).then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.$$meta.count, 0);
      });
    });
  });
});

describe('Afterread methods', function () {
  'use strict';
  describe('should be executed on regular resources', function () {
    it('should have a correct messagecount.', function () {
      return doGet(base + '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.$$messagecount, 5);
      });
    });
  });

  describe('should be executed on list resources', function () {
    it('should have a correct messagecount.', function () {
      return doGet(base + '/communities?hrefs=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849')
        .then(function (response) {
        debug(response.body);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.$$meta.count, 1);
        assert.equal(response.body.results[0].$$expanded.$$messagecount, 5);
      });
    });
  });

  describe('should be executed on lists with many resources', function () {
    it('should have correct messagecounts on all items', function () {
      return doGet(base + '/communities?limit=4').then(function (response) {
        debug('response body');
        debug(response.body);
        debug(response.body.results[2].$$expanded);
        debug(response.body.results[3].$$expanded);
        assert.equal(response.statusCode, 200);
        if (response.body.results[0].$$expanded.$$messagecount === null) {
          assert.fail('should have $$messagecount');
        }
        if (response.body.results[1].$$expanded.$$messagecount === null) {
          assert.fail('should have $$messagecount');
        }
        if (response.body.results[2].$$expanded.$$messagecount === null) {
          assert.fail('should have $$messagecount');
        }
        if (response.body.results[3].$$expanded.$$messagecount === null) {
          assert.fail('should have $$messagecount');
        }
      });
    });
  });
});

describe('Expansion', function () {
  'use strict';
  // Test expand=none
  describe(' with "none" on list resources', function () {
    it('should succeed with $$expanded in results array.', function () {
      return doGet(base + '/messages?expand=none', 'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        if (response.body.results[0].$$expanded) {
          assert.fail('Expansion was performed !');
        }
        if (response.body.results[1].$$expanded) {
          assert.fail('Expansion was performed !');
        }
        if (response.body.results[2].$$expanded) {
          assert.fail('Expansion was performed !');
        }
      });
    });
  });

  // Test expand=full on list resources (all elements href expanded)
  describe(' with "full" on list resources', function () {
    it('should succeed with $$expanded in results array.', function () {
      return doGet(base + '/messages?expand=full', 'sabine@email.be', 'pwd')
        .then(function (response) {
        assert.equal(response.statusCode, 200);
        if (!response.body.results[0].$$expanded) {
          assert.fail('Expansion was not performed !');
        }
        if (!response.body.results[1].$$expanded) {
          assert.fail('Expansion was not performed !');
        }
        if (!response.body.results[2].$$expanded) {
          assert.fail('Expansion was not performed !');
        }
      });
    });
  });

  // Test expand=href on list resources
  describe(' with results on list resources', function () {
    it('should succeed with $$expanded in results array.', function () {
      return doGet(base + '/messages?expand=results', 'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        if (!response.body.results[0].$$expanded) {
          assert.fail('Expansion was not performed !');
        }
        if (!response.body.results[1].$$expanded) {
          assert.fail('Expansion was not performed !');
        }
        if (!response.body.results[2].$$expanded) {
          assert.fail('Expansion was not performed !');
        }
      });
    });
  });

  // Test expand=community on regular message resource
  describe('on regular resources', function () {
    it('should succeed with $$expanded as result.', function () {
      return doGet(base + '/messages/ad9ff799-7727-4193-a34a-09f3819c3479?expand=community',
                   'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.$$meta.permalink, '/messages/ad9ff799-7727-4193-a34a-09f3819c3479');
        if (!response.body.community.$$expanded) {
          assert.fail('Expansion was not performed !');
        }
      });
    });
  });

  // Test expand=results.href,results.href.community on lists of messages
  describe('on list resources', function () {
    it('should succeed with $$expanded as result.', function () {
      return doGet(base + '/messages?expand=results.community', 'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        debug(response.body.results[0].$$expanded);
        if (response.body.results[0].$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.body.results[1].$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.body.results[2].$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
      });
    });
  });

  // Test expand=invalid send 404 Not Found.
  describe('with invalid', function () {
    it('should say \'not found\'.', function () {
      return doGet(base + '/messages/ad9ff799-7727-4193-a34a-09f3819c3479?expand=invalid',
                   'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 404);
      });
    });
  });

  // Test expand=results.href.community,results.href.person
  describe('on list resources', function () {
    it('should allow expanding multiple keys.', function () {
      return doGet(base + '/messages?expand=results.person,results.community',
                   'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        debug(response.body.results[0].$$expanded);
        if (response.body.results[0].$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.body.results[1].$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.body.results[2].$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.body.results[0].$$expanded.person.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.body.results[1].$$expanded.person.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.body.results[2].$$expanded.person.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
      });
    });
  });

  describe('on list resource', function () {
    it('should have executed afterread on expanded resources.', function () {
      return doGet(base + '/messages?expand=results.person,results.community',
                   'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        if (response.body.results[0].$$expanded.community.$$expanded.$$messagecount == null) {
          assert.fail('afterread was not executed on expanded resource !');
        }
      });
    });
  });

  describe('with 2 level path (x.y)', function () {
    it('should expand recursively.', function () {
      return doGet(base + '/messages?expand=results.person.community,results.community',
                   'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        if (response.body.results[0].$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.body.results[0].$$expanded.person.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
        if (response.body.results[0].$$expanded.person.$$expanded.community.$$expanded === null) {
          assert.fail('Expansion was not performed !');
        }
      });
    });
  });

});

describe('query parameters', function () {
  'use strict';
  describe('that use a CTE', function () {
    it('to limit to a single key, should only return 1 row.', function () {
      return doGet(base + '/messages?cteOneGuid=true', 'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.$$meta.count, 1);
      });
    });
  });

  // Test re-ordering of query parameters.
  describe('that use a CTE and other parameter', function () {
    it('to limit to a single key + another parameter, should handle re-sequencing of parameters well', function () {
      return doGet(base + '/messages?hrefs=/messages/d70c98ca-9559-47db-ade6-e5da590b2435&cteOneGuid=true',
                   'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.$$meta.count, 1);
      });
    });
  });

  // Test applying 2 CTEs
  describe('that use a TWO CTEs', function () {
    it('to limit to a single key, should handle both CTEs well', function () {
      return doGet(base + '/messages?cteOneGuid=true&cteOneGuid2=true',
                   'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.$$meta.count, 1);
      });
    });
  });

  // Test recursive CTE
  describe('that require recursion', function () {
    it('should find parents', function () {
      return doGet(base + '/selfreferential?allParentsOf=/selfreferential/ab142ea6-7e79-4f93-82d3-8866b0c8d46b')
        .then(function (response) {
        debug(response.body);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.$$meta.count, 4);
      }).fail(function (e) {
        debug(e);
      });
    });
  });

  describe('that require recursion', function () {
    it('should find parents', function () {
      return doGet(base + '/selfreferential?allParentsOf=/selfreferential/b8c020bf-0505-407c-a8ad-88044d741712')
        .then(function (response) {
        debug(response.body);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.$$meta.count, 2);
      }).fail(function (e) {
        debug(e);
      });
    });
  });
});

describe('utils.addReferencingResources ', function () {
  'use strict';
  describe('on afterread /persons', function () {
    it('should include related transactions', function () {
      return doGet(base + '/persons/9abe4102-6a29-4978-991e-2a30655030e6',
                   'sabine@email.be', 'pwd').then(function (response) {
        debug(response.body);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.$$transactions.length, 1);
      });
    });
  });
});

describe('CORS', function () {
  'use strict';
  it('should mirror request origin', function () {
    return doGet(base + '/persons/9abe4102-6a29-4978-991e-2a30655030e6',
                 'sabine@email.be', 'pwd').then(function (response) {
      debug(response.headers);
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['access-control-allow-origin'], 'localhost:5000');
    });
  });
});

describe('JSONB support', function () {
  'use strict';
  it('should allow reading JSON column as objects', function () {
    return doGet(base + '/jsonb/10f00e9a-f953-488b-84fe-24b31ee9d504').then(function (response) {
      debug(response.body);
      assert.equal(response.statusCode, 200);
      assert.equal(response.body.details.productDeliveryOptions[0].product,
                   '/store/products/f02a30b0-0bd9-49a3-9a14-3b71130b187c');
    });
  });

  it('should support PUT with sub-objects', function () {
    var key = uuid.v4();
    var x = {
      key: key,
      details: {
        productDeliveryOptions: [
          {
            product: '/store/products/f02a30b0-0bd9-49a3-9a14-3b71130b187c',
            deliveryOption: '/store/deliveryoptions/362c4fd7-42e1-4668-8cfc-a479cc8e374a'
          }
        ]
      }
    };
    return doPut(base + '/jsonb/' + key, x, 'sabine@email.be', 'pwd').then(function (response) {
      assert.equal(response.statusCode, 200);
      return doGet(base + '/jsonb/' + key, 'sabine@email.be', 'pwd');
    }).then(function (response) {
      debug(response.statusCode);
      debug(typeof response.body.details);
      assert.equal(response.statusCode, 200);
      if (typeof response.body.details !== 'object') {
        assert.fail('should be object');
      }
    });
  });
});

require('./testQueryUtils.js')(base, logdebug);
require('./testInformationSchema.js')(logdebug);
