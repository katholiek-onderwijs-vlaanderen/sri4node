// Utility methods for calling the SRI interface
import { assert } from "chai";
import { THttpClient } from "../httpClient";

module.exports = function (httpClient: THttpClient) {
  describe("Generic Filters", () => {
    describe("Greater match", () => {
      describe("String fields", () => {
        // text
        it("should find resources of type text that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textGreater=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, "Value");
        });

        it("should not find resources of type text that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textGreater=X",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type text case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textCaseSensitiveGreater=Test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 4);
          assert.equal(response.body.results[0].$$expanded.text, "Value");
        });

        it("should not find resources of type text case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textCaseSensitiveGreater=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type text with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textNotGreater=Test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 3);
          assert.equal(response.body.results[0].$$expanded.text, "A value with spaces");
        });

        it("should find resources of type text with a not match case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textCaseSensitiveNotGreater=test",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.text, "Value");
          assert.equal(response.body.results[1].$$expanded.text, "A value with spaces");
        });

        // varchar
        it("should find resources of type varchar that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharGreater=Pool",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "varchar");
        });

        it("should not find resources of type varchar that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharGreater=varchar",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type varchar case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharCaseSensitiveGreater=pool",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "varchar");
        });

        it("should not find resources of type varchar case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharCaseSensitiveGreater=varchar",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type varchar with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharNotGreater=pool",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "not a text varchar");
        });

        it("should find resources of type varchar with a not match case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textvarcharCaseSensitiveNotGreater=pool",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, "not a text varchar");
        });

        // char
        it("should find resources of type char that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharGreater=link",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), "not a text char");
        });

        it("should not find resources of type char that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharGreater=not%20a%20text%20char",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type char case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharCaseSensitiveGreater=link",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), "not a text char");
        });

        it("should not find resources of type char case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharCaseSensitiveGreater=pool",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type char with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharNotGreater=link",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), "char");
        });

        it("should find resources of type char with a not match case sensitive", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?textcharCaseSensitiveNotGreater=link",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), "char");
        });
      });

      describe("Numeric fields", () => {
        // numeric
        it("should find resources of type numeric that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberGreater=15.4",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 4);
          assert.equal(response.body.results[0].$$expanded.number, 16.11);
        });

        it("should not find resources of type numeric that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberGreater=1000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type numeric with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberNotGreater=15.7",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.number, 11);
        });

        // integer
        it("should find resources of type integer that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberintGreater=1400",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 2456);
        });

        it("should not find resources of type integer that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberintGreater=2456",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type integer with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberintNotGreater=2000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 1358);
        });

        // bigint
        it("should find resources of type bigint that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigintGreater=1000000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
        });

        it("should not find resources of type bigint that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigintGreater=7500000000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type bigint with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigintNotGreater=750000000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
        });

        // smallint
        it("should find resources of type smallint that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallintGreater=-100",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
        });

        it("should not find resources of type smallint that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallintGreater=7560",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type smallint with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallintNotGreater=0",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
        });

        // decimal
        it("should find resources of type decimal that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdecimalGreater=-1200.5",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
        });

        it("should not find resources of type decimal that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdecimalGreater=456.222",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type decimal with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdecimalNotGreater=-1000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
        });

        // real
        it("should find resources of type real that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberrealGreater=1500",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
        });

        it("should not find resources of type real that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberrealGreater=12000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type real with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberrealNotGreater=10000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
        });

        // doubleprecision
        it("should find resources of type doubleprecision that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdoubleprecisionGreater=0",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        it("should not find resources of type doubleprecision that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdoubleprecisionGreater=100.4545454",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type doubleprecision with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberdoubleprecisionNotGreater=100",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        // smallserial
        it("should find resources of type smallserial that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallserialGreater=200",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 368);
        });

        it("should not find resources of type smallserial that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallserialGreater=368",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type smallserial with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numbersmallserialNotGreater=300",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
        });

        // bigserial
        it("should find resources of type bigserial that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigserialGreater=20000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 36800);
        });

        it("should not find resources of type bigserial that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigserialGreater=36800",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type bigserial with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberbigserialNotGreater=3000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
        });

        // serial
        it("should find resources of type serial that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberserialGreater=2000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberserial, 3680);
        });

        it("should not find resources of type serial that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberserialGreater=36800",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources of type serial with a not match", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?numberserialNotGreater=30000",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberserial, 1);
        });
      });

      describe("Timestamp fields", () => {
        it("should find resources that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?publicationGreater=2015-02-01T00:00:00%2B02:00",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(
            new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date("2015-03-04T22:00:00-03:00").getTime(),
          );
        });

        it("should not find resources that are equal", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?publicationGreater=2015-03-04T22:00:00-03:00",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it("should find resources that are greater", async () => {
          const response = await httpClient.get({
            path: "/alldatatypes?publicationNotGreater=2015-02-01T00:00:00%2B02:00",
            auth: "kevin",
          });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(
            new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date("2015-01-01T00:00:00+02:00").getTime(),
          );
        });
      });
    });
  });
};
