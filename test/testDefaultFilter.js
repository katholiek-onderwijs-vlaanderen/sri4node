// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Generic Filters', function () {

    describe('Exact match', function () {

      describe('String fields', function () {

        it('should find resources with an exact match', function () {
          return doGet(base + '/alldatatypes?text=Value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should find resources with an exact match with spaces', function () {
          return doGet(base + '/alldatatypes?text=A%20value%20with%20spaces').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources with a case insensitive match', function () {
          return doGet(base + '/alldatatypes?text=value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should not find resources with a value that does not match', function () {
          return doGet(base + '/alldatatypes?text=not-present').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources with a case sensitive match', function () {
          return doGet(base + '/alldatatypes?textCaseSensitive=Value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should not find resources with a case sensitive match', function () {
          return doGet(base + '/alldatatypes?textCaseSensitive=value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?textNot=value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources with a not match and case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveNot=Value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

      });

      describe('Numeric fields', function () {

        it('should find resources with an exact match', function () {
          return doGet(base + '/alldatatypes?number=1611').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 1611);
          });
        });

        it('should not find resources with a value that does not match', function () {
          return doGet(base + '/alldatatypes?number=314').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?numberNot=1611').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

      });

      describe('Timestamp fields', function () {

        it('should find resources with an exact match', function () {
          return doGet(base + '/alldatatypes?publication=2015-01-01T00:00:00%2B02:00').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-01-01T00:00:00+02:00').getTime());
          });
        });

        it('should not find resources with a value that does not match', function () {
          return doGet(base + '/alldatatypes?publication=2015-01-01T00:00:00-03:00').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?publicationNot=2015-01-01T00:00:00%2B02:00').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-03-04T22:00:00-03:00').getTime());
          });
        });

      });

      describe('Array fields', function () {

        it('should find strings with an exact match', function () {
          return doGet(base + '/alldatatypes?texts=Standard,interface,ROA').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 7);
          });
        });

        it('should not find strings with a partial match', function () {
          return doGet(base + '/alldatatypes?texts=Standard,interface').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find strings with a not match', function () {
          return doGet(base + '/alldatatypes?textsNot=Standard,interface,ROA').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 8);
          });
        });

        it('should not find strings with a value that does not match', function () {
          return doGet(base + '/alldatatypes?texts=another,thing').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find numbers with an exact match', function () {
          return doGet(base + '/alldatatypes?numbers=8,13,5,3').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 9);
          });
        });

        it('should not find numbers with a partial match', function () {
          return doGet(base + '/alldatatypes?numbers=3,5,8').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find numbers with a not match', function () {
          return doGet(base + '/alldatatypes?numbersNot=8,13,5,3').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 10);
          });
        });

        it('should find timestamps with an exact match', function () {
          var q = '/alldatatypes?publications=2015-01-01T00:00:00%2B02:00';
          q += ',2015-07-01T00:00:00%2B02:00,2015-04-01T00:00:00%2B02:00';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 11);
          });
        });

        it('should not find timestamps with a partial match', function () {
          return doGet(base + '/alldatatypes?publications=2015-01-01T00:00:00%2B02:00').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find timestamps with a not match', function () {
          var q = '/alldatatypes?publicationsNot=2015-01-01T00:00:00%2B02:00';
          q += ',2015-07-01T00:00:00%2B02:00,2015-04-01T00:00:00%2B02:00';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 12);
          });
        });

      });
    });

    describe('Greater match', function () {
      describe('String fields', function () {
        it('should find resources that are greater', function () {
          return doGet(base + '/alldatatypes?textGreater=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should not find resources that are equal', function () {
          return doGet(base + '/alldatatypes?textGreater=Value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveGreater=Test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should not find resources case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveGreater=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?textNotGreater=Test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveNotGreater=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
            assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
          });
        });

      });

      describe('Numeric fields', function () {
        it('should find resources that are greater', function () {
          return doGet(base + '/alldatatypes?numberGreater=1000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 1611);
          });
        });

        it('should not find resources that are equal', function () {
          return doGet(base + '/alldatatypes?numberGreater=1611').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?numberNotGreater=1000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

      });

      describe('Timestamp fields', function () {
        it('should find resources that are greater', function () {
          return doGet(base + '/alldatatypes?publicationGreater=2015-02-01T00:00:00%2B02:00').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-03-04T22:00:00-03:00').getTime());
          });
        });

        it('should not find resources that are equal', function () {
          return doGet(base + '/alldatatypes?publicationGreater=2015-03-04T22:00:00-03:00').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources that are greater', function () {
          var q = '/alldatatypes?publicationNotGreater=2015-02-01T00:00:00%2B02:00';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-01-01T00:00:00+02:00').getTime());
          });
        });

      });
    });

    describe('GreaterOrEqual (alias After) match', function () {
      describe('String fields', function () {
        it('should find resources that are greater', function () {
          return doGet(base + '/alldatatypes?textGreaterOrEqual=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should find resources that are equal', function () {
          return doGet(base + '/alldatatypes?textGreaterOrEqual=Value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should find resources that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?textAfter=Test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should find resources case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveGreaterOrEqual=Value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should not find resources case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveGreaterOrEqual=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?textNotGreaterOrEqual=value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
            assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveNotGreaterOrEqual=value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
            assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
          });
        });

      });

      describe('Numeric fields', function () {
        it('should find resources that are greater', function () {
          return doGet(base + '/alldatatypes?numberGreaterOrEqual=1000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 1611);
          });
        });

        it('should find resources that are equal', function () {
          return doGet(base + '/alldatatypes?numberGreaterOrEqual=1611').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 1611);
          });
        });

        it('should find resources that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?numberAfter=1200').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 1611);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?numberNotGreaterOrEqual=1000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

      });

      describe('Timestamp fields', function () {
        it('should find resources that are greater', function () {
          return doGet(base + '/alldatatypes?publicationGreaterOrEqual=2015-02-01T00:00:00%2B02:00')
            .then(function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-03-04T22:00:00-03:00').getTime());
            });
        });

        it('should find resources that are equal', function () {
          return doGet(base + '/alldatatypes?publicationGreaterOrEqual=2015-03-04T22:00:00-03:00')
            .then(function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-03-04T22:00:00-03:00').getTime());
            });
        });

        it('should find resources that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?publicationAfter=2015-02-01T00:00:00%2B02:00')
            .then(function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-03-04T22:00:00-03:00').getTime());
            });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?publicationNotGreaterOrEqual=2015-02-01T00:00:00%2B02:00')
            .then(function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-01-01T00:00:00+02:00').getTime());
            });
        });

      });
    });

    describe('Less match', function () {
      describe('String fields', function () {
        it('should find resources that are lower', function () {
          return doGet(base + '/alldatatypes?textLess=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should not find resources that are equal', function () {
          return doGet(base + '/alldatatypes?textLess=A%20value%20with%20spaces').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveLess=Test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should not find resources case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveLess=1').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?textNotLess=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should find resources with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveNotLess=Yes').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

      });

      describe('Numeric fields', function () {
        it('should find resources that are lower', function () {
          return doGet(base + '/alldatatypes?numberLess=1000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

        it('should not find resources that are equal', function () {
          return doGet(base + '/alldatatypes?numberLess=11').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?numberNotLess=1000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 1611);
          });
        });

      });

      describe('Timestamp fields', function () {
        it('should find resources that are lower', function () {
          return doGet(base + '/alldatatypes?publicationLess=2015-03-04T22:00:00-03:00').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-01-01T00:00:00+02:00').getTime());
          });
        });

        it('should not find resources that are equal', function () {
          return doGet(base + '/alldatatypes?publicationLess=2015-01-01T00:00:00%2B02:00').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?publicationNotLess=2015-03-04T22:00:00-03:00').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });
      });
    });

    describe('LessOrEqual (alias Before) match', function () {
      describe('String fields', function () {
        it('should find resources that are lower', function () {
          return doGet(base + '/alldatatypes?textLessOrEqual=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should not find resources that are equal', function () {
          return doGet(base + '/alldatatypes?textLessOrEqual=A%20value%20with%20spaces').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?textBefore=candidate').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveLessOrEqual=Test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should not find resources case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveLessOrEqual=1').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?textNotLessOrEqual=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should find resources with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveNotLessOrEqual=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

      });

      describe('Numeric fields', function () {
        it('should find resources that are lower', function () {
          return doGet(base + '/alldatatypes?numberLessOrEqual=1000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

        it('should find resources that are equal', function () {
          return doGet(base + '/alldatatypes?numberLessOrEqual=11').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

        it('should find resources that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?numberBefore=30').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?numberNotLessOrEqual=1000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 1611);
          });
        });

      });

      describe('Timestamp fields', function () {
        it('should find resources that are lower', function () {
          return doGet(base + '/alldatatypes?publicationLessOrEqual=2015-02-01T00:00:00-02:00').then(
            function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-01-01T00:00:00+02:00').getTime());
            });
        });

        it('should find resources that are equal', function () {
          return doGet(base + '/alldatatypes?publicationLessOrEqual=2015-01-01T00:00:00%2B02:00').then(
            function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-01-01T00:00:00+02:00').getTime());
            });
        });

        it('should find resources that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?publicationBefore=2015-02-01T00:00:00-02:00').then(
            function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-01-01T00:00:00+02:00').getTime());
            });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?publicationNotLessOrEqual=2015-02-01T00:00:00-02:00').then(
            function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-03-04T22:00:00-03:00').getTime());
            });
        });
      });
    });
  });

  describe('In match', function () {

    describe('String fields', function () {

      it('should find one resource among options that do not exist', function () {
        return doGet(base + '/alldatatypes?textIn=value,another,thing').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });
      });

      it('should find all the resources that match', function () {
        return doGet(base + '/alldatatypes?textIn=test,Value,A%20value%20with%20spaces').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });
      });

      it('should not find resources with a value that does not match', function () {
        return doGet(base + '/alldatatypes?textIn=not-present,nothing,no').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

      it('should find all the resources case sensitive', function () {
        var q = '/alldatatypes?textCaseSensitiveIn=test,Value,A%20value%20with%20spaces';
        return doGet(base + q).then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });
      });

      it('should not find all the resources case sensitive', function () {
        var q = '/alldatatypes?textCaseSensitiveIn=test,value,a%20value%20with%20spaces';
        return doGet(base + q).then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

      it('should find all the resources with a not match', function () {
        var q = '/alldatatypes?textNotIn=test,a%20value%20with%20spaces';
        return doGet(base + q).then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });
      });

      it('should find all the resources with a not match case sensitive', function () {
        var q = '/alldatatypes?textCaseSensitiveNotIn=test,value';
        return doGet(base + q).then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });
      });

    });

    describe('Numeric fields', function () {

      it('should find one resource among options that do not exist', function () {
        return doGet(base + '/alldatatypes?numberIn=1611,413,45').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.number, 1611);
        });
      });

      it('should find all the resources that match', function () {
        return doGet(base + '/alldatatypes?numberIn=0,1611,34,11').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.number, 1611);
          assert.equal(response.body.results[1].$$expanded.number, 11);
        });
      });

      it('should not find resources with a value that does not match', function () {
        return doGet(base + '/alldatatypes?numberIn=1511,413,45').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

      it('should find all the resources with a not match', function () {
        return doGet(base + '/alldatatypes?numberNotIn=1611,413,45').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.number, 11);
        });
      });

    });

    describe('Timestamp fields', function () {

      it('should find one resource among options that do not exist', function () {
        return doGet(base + '/alldatatypes?publicationIn=2015-01-01T00:00:00%2B02:00,2014-01-01T00:00:00%2B02:00')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-01-01T00:00:00+02:00').getTime());
          });
      });

      it('should find all the resources that match', function () {
        var q = '/alldatatypes?publicationIn=2015-01-01T00:00:00-03:00,2015-01-01T00:00:00%2B02:00,';
        q += '2015-03-04T22:00:00-03:00';
        return doGet(base + q)
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-01-01T00:00:00+02:00').getTime());
            assert.equal(new Date(response.body.results[1].$$expanded.publication).getTime(),
              new Date('2015-03-04T22:00:00-03:00').getTime());
          });
      });

      it('should not find resources with a value that does not match', function () {
        return doGet(base + '/alldatatypes?publicationIn=2015-01-21T00:00:00%2B02:00,2014-01-01T00:00:00%2B02:00')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
      });

      it('should find all the resources with a not match', function () {
        var q = '/alldatatypes?publicationNotIn=2015-01-01T00:00:00%2B02:00';
        return doGet(base + q)
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-03-04T22:00:00-03:00').getTime());
          });
      });

    });

  });

  describe('RegEx match', function () {

    describe('String fields', function () {

      it('should find resources with a regex', function () {
        return doGet(base + '/alldatatypes?textRegEx=%5E(.*)%5Bv%7CV%5Dalue(.*)%24').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });
      });

      it('should find only one resource with a regex', function () {
        return doGet(base + '/alldatatypes?textRegEx=%5E(.%20)%5Bv%7CV%5Dalue(.*)%24').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
        });
      });

      it('should not find resources with a regex', function () {
        return doGet(base + '/alldatatypes?textRegEx=%5E%5B0-9%5D*%24').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

      it('should find resources with a regex case sensitive', function () {
        var q = '/alldatatypes?textCaseSensitiveRegEx=%5E(.*)Value(.*)%24';
        return doGet(base + q).then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });
      });

      it('should not find resources with a regex case sensitive', function () {
        var q = '/alldatatypes?textCaseSensitiveRegEx=%5E(.*)VALUE(.*)%24';
        return doGet(base + q).then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

      it('should find resources with a regex with a not match', function () {
        var q = '/alldatatypes?textNotRegEx=%5E(.*)value(.*)%24';
        return doGet(base + q).then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

      it('should find resources with a regex with a not match case sensitive', function () {
        var q = '/alldatatypes?textCaseSensitiveNotRegEx=%5E(.*)VALUE(.*)%24';
        return doGet(base + q).then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });
      });
    });
  });

  describe('Contains match', function () {

    describe('String fields', function () {

      it('should find resources that contain a substring', function () {
        return doGet(base + '/alldatatypes?textContains=lu').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });
      });

      it('should find resources that start with a substring', function () {
        return doGet(base + '/alldatatypes?textContains=va').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });
      });

      it('should find resources that end with a substring', function () {
        return doGet(base + '/alldatatypes?textContains=Aces').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
        });
      });

      it('should not find resources that do not contain a substring', function () {
        return doGet(base + '/alldatatypes?textContains=mor').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

      it('should find resources that contain a substring case sensitive', function () {
        return doGet(base + '/alldatatypes?textCaseSensitiveContains=lu').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });
      });

      it('should not find resources that contain a substring case sensitive', function () {
        return doGet(base + '/alldatatypes?textCaseSensitiveContains=LU').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

      it('should find resources that contain a substring with a not match', function () {
        return doGet(base + '/alldatatypes?textNotContains=LU').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

      it('should find resources that contain a substring with a not match case sensitive', function () {
        return doGet(base + '/alldatatypes?textCaseSensitiveNotContains=LU').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });
      });

    });

    describe('Timestamp fields', function () {
      // TBD
    });

    describe('Array fields', function () {

      it('should find strings', function () {
        return doGet(base + '/alldatatypes?textsContains=Standard,interface').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 7);
        });
      });

      it('should not find strings', function () {
        return doGet(base + '/alldatatypes?textsContains=Standard,definition').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

      it('should find strings with a not match', function () {
        return doGet(base + '/alldatatypes?textsNotContains=Standard,interface').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 8);
        });
      });

      it('should find numbers', function () {
        return doGet(base + '/alldatatypes?numbersContains=5,3').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.id, 9);
          assert.equal(response.body.results[1].$$expanded.id, 10);
        });
      });

      it('should not find numbers', function () {
        return doGet(base + '/alldatatypes?numbersContains=12').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

      it('should find numbers with a not match', function () {
        return doGet(base + '/alldatatypes?numbersNotContains=5,3').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

      it('should find timestamps', function () {
        var q = '/alldatatypes?publicationsContains=2015-04-01T00:00:00%2B02:00';
        q += ',2015-01-01T00:00:00%2B02:00';
        return doGet(base + q).then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 11);
        });
      });

      it('should not find timestamps', function () {
        return doGet(base + '/alldatatypes?publicationsContains=2012-01-01T00:00:00%2B02:00').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

      it('should find timestamps with a not match', function () {
        var q = '/alldatatypes?publicationsNotContains=2015-04-01T00:00:00%2B02:00';
        q += ',2015-01-01T00:00:00%2B02:00';
        return doGet(base + q).then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 12);
        });
      });

    });

  });
};
