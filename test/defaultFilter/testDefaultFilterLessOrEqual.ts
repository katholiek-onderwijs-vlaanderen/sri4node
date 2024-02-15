// Utility methods for calling the SRI interface
import { assert } from "chai";
import { THttpClient } from "../httpClient";

module.exports = function (httpClient: THttpClient) {
  describe("Generic Filters", () => {
    describe("LessOrEqual (alias Before) match", () => {
      describe("String fields", () => {
        // text
        it("should find resources of type text that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textLessOrEqual=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 3);
          assert.equal(response.body.results[0].$$expanded.text, "A value with spaces");
        });

        it("should not find resources of type text that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textLessOrEqual=A%20value%20with%20spaces",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, "A value with spaces");
        });

        it("should find resources of type text that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textBefore=candidate",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, "A value with spaces");
        });

        it("should find resources of type text case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textCaseSensitiveLessOrEqual=Test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, "A value with spaces");
        });

        it("should not find resources of type text case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textCaseSensitiveLessOrEqual=1",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type text with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textNotLessOrEqual=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, "Value");
        });

        it("should find resources of type text with a not match case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textCaseSensitiveNotLessOrEqual=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        // varchar
        it("should find resources of type varchar that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharLessOrEqual=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "not a text varchar");
        });

        it("should find resources of type varchar that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharLessOrEqual=not%20a%20text%20varchar",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "not a text varchar");
        });

        it("should find resources of type varchar that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharBefore=var",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "not a text varchar");
        });

        it("should find resources of type varchar case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharCaseSensitiveLessOrEqual=xyz",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "varchar");
        });

        it("should not find resources of type varchar case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharCaseSensitiveLessOrEqual=char",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type varchar with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharNotLessOrEqual=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "varchar");
        });

        it("should find resources of type varchar with a not match case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharCaseSensitiveNotLessOrEqual=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "varchar");
        });

        // char
        it("should find resources of type char that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharLessOrEqual=milk",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), "char");
        });

        it("should find resources of type char that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharLessOrEqual=char",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), "char");
        });

        it("should find resources of type char that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharBefore=link",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), "char");
        });

        it("should find resources of type char case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharCaseSensitiveLessOrEqual=not",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), "char");
        });

        it("should not find resources of type char case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharCaseSensitiveLessOrEqual=boolean",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type char with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharNotLessOrEqual=link",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), "not a text char");
        });

        it("should find resources of type char with a not match case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharCaseSensitiveNotLessOrEqual=abc",
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
            path: "/alldatatypes?numberLessOrEqual=16",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.number, 11);
        });

        it("should find resources of type numeric that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberLessOrEqual=11",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.number, 11);
        });

        it("should find resources of type numeric that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberBefore=15",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.number, 11);
        });

        it("should find resources of type numeric with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberNotLessOrEqual=11",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.number, 16.11);
        });

        // integer
        it("should find resources of type integer that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberintLessOrEqual=2000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 1358);
        });

        it("should find resources of type integer that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberintLessOrEqual=1358",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 1358);
        });

        it("should find resources of type integer that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberintBefore=1500",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 1358);
        });

        it("should find resources of type integer with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberintNotLessOrEqual=1500",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 2456);
        });

        // bigint
        it("should find resources of type bigint that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigintLessOrEqual=1000000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
        });

        it("should find resources of type bigint that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigintLessOrEqual=314159",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
        });

        it("should find resources of type bigint that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigintBefore=900000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
        });

        it("should find resources of type bigint with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigintNotLessOrEqual=314160",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
        });

        // smallint
        it("should find resources of type smallint that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallintLessOrEqual=0",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
        });

        it("should find resources of type smallint that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallintLessOrEqual=-4159",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
        });

        it("should find resources of type smallint that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallintBefore=30",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
        });

        it("should find resources of type smallint with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallintNotLessOrEqual=-100",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
        });

        // decimal
        it("should find resources of type decimal that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdecimalLessOrEqual=10",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
        });

        it("should find resources of type decimal that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdecimalLessOrEqual=-3424.234",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
        });

        it("should find resources of type decimal that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdecimalBefore=100",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
        });

        it("should find resources of type decimal with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdecimalNotLessOrEqual=45",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
        });

        // real
        it("should find resources of type real that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberrealLessOrEqual=10000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
        });

        it("should find resources of type real that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberrealLessOrEqual=1200",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
        });

        it("should find resources of type real that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberrealBefore=1800",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
        });

        it("should find resources of type real with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberrealNotLessOrEqual=1400",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
        });

        // double precision
        it("should find resources of type double precision that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdoubleprecisionLessOrEqual=-12",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        it("should find resources of type double precision that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdoubleprecisionLessOrEqual=-12.121212",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        it("should find resources of type double precision that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdoubleprecisionBefore=0",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        it("should find resources of type double precision with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdoubleprecisionNotLessOrEqual=0",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        // smallserial
        it("should find resources of type smallserial that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallserialLessOrEqual=300",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
        });

        it("should find resources of type smallserial that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallserialLessOrEqual=121",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
        });

        it("should find resources of type smallserial that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallserialBefore=200",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
        });

        it("should find resources of type smallserial with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallserialNotLessOrEqual=200",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 368);
        });

        // serial
        it("should find resources of type serial that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberserialLessOrEqual=3000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberserial, 1);
        });

        it("should find resources of type serial that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberserialLessOrEqual=1210",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberserial, 1);
        });

        it("should find resources of type serial that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberserialBefore=3000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberserial, 1);
        });

        it("should find resources of type serial with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberserialNotLessOrEqual=1000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.numberserial, 1210);
        });

        // bigserial
        it("should find resources of type bigserial that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigserialLessOrEqual=30000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
        });

        it("should find resources of type bigserial that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigserialLessOrEqual=12100",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
        });

        it("should find resources of type bigserial that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigserialBefore=30000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
        });

        it("should find resources of type bigserial with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigserialNotLessOrEqual=10000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 12100);
        });
      });

      describe("Timestamp fields", () => {
        it("should find resources that are lower", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?publicationLessOrEqual=2015-02-01T00:00:00-02:00",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(
            new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date("2015-01-01T00:00:00+02:00").getTime(),
          );
        });

        it("should find resources that are equal", async () => {
          const q = "/alldatatypes?publicationLessOrEqual=2015-01-01T00:00:00%2B02:00";
          const response = await httpClient.get({ path: q, auth: "kevin" });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(
            new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date("2015-01-01T00:00:00+02:00").getTime(),
          );
        });

        it("should find resources that are lower with operator Before (alias)", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?publicationBefore=2015-02-01T00:00:00-02:00",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(
            new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date("2015-01-01T00:00:00+02:00").getTime(),
          );
        });

        it("should find resources with a not match", async () => {
          const q = "/alldatatypes?publicationNotLessOrEqual=2015-02-01T00:00:00-02:00";
          const response = await httpClient.get({ path: q, auth: "kevin" });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          response.body.results = response.body.results.filter(
            (e) => e.$$expanded.publication !== null,
          ); // remove NULL results (= undefined in the future)
          assert.equal(response.body.results.length, 1);
          assert.equal(
            new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date("2015-03-04T22:00:00-03:00").getTime(),
          );
        });
      });
    });
  });
};
