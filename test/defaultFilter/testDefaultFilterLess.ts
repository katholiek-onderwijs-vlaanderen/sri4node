// Utility methods for calling the SRI interface
import { assert } from "chai";
import { THttpClient } from "../httpClient";

module.exports = function (httpClient: THttpClient) {
  describe("Generic Filters", () => {
    describe("Less match", () => {
      describe("String fields", () => {
        // text
        it("should find resources of type text that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textLess=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 3);
          assert.equal(response.body.results[0].$$expanded.text, "A value with spaces");
        });

        it("should not find resources of type text that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textLess=A%20value%20with%20spaces",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type text case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textCaseSensitiveLess=Test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, "A value with spaces");
        });

        it("should not find resources of type text case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textCaseSensitiveLess=1",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type text with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textNotLess=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, "Value");
        });

        it("should find resources of type text with a not match case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textCaseSensitiveNotLess=yes",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        // varchar
        it("should find resources of type varchar that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharLess=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "not a text varchar");
        });

        it("should not find resources of type varchar that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharLess=not%20a%20text%20varchar",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type varchar case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharCaseSensitiveLess=xyz",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "varchar");
        });

        it("should not find resources of type varchar case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharCaseSensitiveLess=char",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type varchar with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharNotLess=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "varchar");
        });

        it("should find resources of type varchar with a not match case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharCaseSensitiveNotLess=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "varchar");
        });

        // char
        it("should find resources of type char that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharLess=milk",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), "char");
        });

        it("should not find resources of type char that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharLess=char",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type char case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharCaseSensitiveLess=not",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), "char");
        });

        it("should not find resources of type char case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharCaseSensitiveLess=char",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type char with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharNotLess=link",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), "not a text char");
        });

        it("should find resources of type char with a not match case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharCaseSensitiveNotLess=abc",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), "char");
        });
      });

      describe("Numeric fields", () => {
        // numeric
        it("should find resources of type numeric that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberLess=16",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.number, 11);
        });

        it("should not find resources of type numeric that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberLess=11",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type numeric with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberNotLess=11",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 4);
          assert.equal(response.body.results[0].$$expanded.number, 16.11);
        });

        // integer
        it("should find resources of type integer that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberintLess=2000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 1358);
        });

        it("should not find resources of type integer that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberintLess=1358",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type integer with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberintNotLess=1500",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 2456);
        });

        // bigint
        it("should find resources of type bigint that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigintLess=1000000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
        });

        it("should not find resources of type bigint that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigintLess=314159",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type bigint with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigintNotLess=314159",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
        });

        // smallint
        it("should find resources of type smallint that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallintLess=0",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
        });

        it("should not find resources of type smallint that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallintLess=-4159",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type smallint with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallintNotLess=-100",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
        });

        // decimal
        it("should find resources of type decimal that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdecimalLess=10",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
        });

        it("should not find resources of type decimal that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdecimalLess=-3424.234",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type decimal with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdecimalNotLess=45",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
        });

        // real
        it("should find resources of type real that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberrealLess=10000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
        });

        it("should not find resources of type real that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberrealLess=1200",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type real with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberrealNotLess=1200",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
        });

        // double precision
        it("should find resources of type double precision that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdoubleprecisionLess=-12",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        it("should not find resources of type double precision that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdoubleprecisionLess=-12.121212",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type double precision with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdoubleprecisionNotLess=-5",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        // smallserial
        it("should find resources of type smallserial that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallserialLess=300",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
        });

        it("should not find resources of type smallserial that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallserialLess=121",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
        });

        it("should find resources of type smallserial with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallserialNotLess=200",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 368);
        });

        // serial
        it("should find resources of type serial that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberserialLess=2000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberserial, 1);
        });

        it("should not find resources of type serial that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberserialLess=1210",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
        });

        it("should find resources of type serial with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberserialNotLess=2000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberserial, 3680);
        });

        // bigserial
        it("should find resources of type bigserial that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigserialLess=20000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
        });

        it("should not find resources of type bigserial that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigserialLess=12100",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
        });

        it("should find resources of type bigserial with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigserialNotLess=20000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 36800);
        });
      });

      describe("Timestamp fields", () => {
        it("should find resources that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?publicationLess=2015-03-04T22:00:00-03:00",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(
            new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date("2015-01-01T00:00:00+02:00").getTime(),
          );
        });

        it("should not find resources that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?publicationLess=2015-01-01T00:00:00%2B02:00",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?publicationNotLess=2015-03-04T22:00:00-03:00",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });
      });
    });
  });
};
