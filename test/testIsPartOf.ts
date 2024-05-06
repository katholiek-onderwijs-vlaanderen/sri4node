// Utility methods for calling the SRI interface
import { assert } from "chai";
import { THttpClient } from "./httpClient";

module.exports = function (httpClient: THttpClient) {
  describe("isPartOf", () => {
    it("should fail on missing resource A", async () => {
      const response = await httpClient.post({
        path: "/countries/isPartOf",
        body: {},
        auth: "kevin",
      });
      assert.equal(response.status, 400);
      assert.equal(response.body.errors[0].code, "a.href.and.b.hrefs.needs.to.specified");
    });

    it("should fail on missing resource B", async () => {
      const response = await httpClient.post({
        path: "/countries/isPartOf",
        body: { a: { href: "/countries?unexistingPara=5" } },
        auth: "kevin",
      });
      assert.equal(response.status, 400);
      assert.equal(response.body.errors[0].code, "a.href.and.b.hrefs.needs.to.specified");
    });

    it("should fail on invalid resource A", async () => {
      const response = await httpClient.post({
        path: "/countries/isPartOf",
        body: {
          a: { href: "/countries?unexistingPara=5" },
          b: { hrefs: ["/countries"] },
        },
        auth: "kevin",
      });
      console.log("R:");
      console.log(response);
      assert.equal(response.status, 400);
      assert.equal(response.body.errors[0].code, "resource.a.raised.error");
    });

    it("should fail on invalid resource in B list", async () => {
      const response = await httpClient.post({
        path: "/countries/isPartOf",
        body: {
          a: { href: "/countries" },
          b: { hrefs: ["/countries?unexistingPara=5"] },
        },
        auth: "kevin",
      });
      assert.equal(response.status, 400);
      assert.equal(response.body.errors[0].code, "resource.b.raised.error");
    });

    it("should fail on not matching resource in B list", async () => {
      const response = await httpClient.post({
        path: "/countries/isPartOf",
        body: {
          a: { href: "/countries" },
          b: { hrefs: ["/unexisting_resource"] },
        },
        auth: "kevin",
      });
      assert.equal(response.status, 400);
      assert.equal(response.body.errors[0].code, "unknown.resource.type");
    });

    it("should fail if A is an array", async () => {
      const response = await httpClient.post({
        path: "/countries/isPartOf",
        body: {
          a: { href: ["/countries?unexistingPara=5"] },
          b: { hrefs: ["/countries"] },
        },
        auth: "kevin",
      });
      assert.equal(response.status, 400);
      assert.equal(response.body.errors[0].code, "a.href.must.be.single.value");
    });

    it("should fail if hrefs of B is not an array", async () => {
      const response = await httpClient.post({
        path: "/countries/isPartOf",
        body: {
          a: { href: "/countries?unexistingPara=5" },
          b: { hrefs: "/countries" },
        },
        auth: "kevin",
      });
      assert.equal(response.status, 400);
      assert.equal(response.body.errors[0].code, "b.hrefs.must.be.array");
    });

    it("lists - match", async () => {
      const response = await httpClient.post({
        path: "/countries/isPartOf",
        body: {
          a: { href: "/countries?nameRegEx=^be.*$" },
          b: { hrefs: ["/countries"] },
        },
        auth: "kevin",
      });

      assert.equal(response.body.length, 1);
      assert.equal(response.body[0], "/countries");
    });

    it("lists - no match", async () => {
      const response = await httpClient.post({
        path: "/countries/isPartOf",
        body: {
          a: { href: "/countries" },
          b: { hrefs: ["/countries?nameRegEx=^be.*$"] },
        },
        auth: "kevin",
      });

      assert.equal(response.body.length, 0);
    });

    it("string key - single resource - match", async () => {
      const response = await httpClient.post({
        path: "/countries/isPartOf",
        body: {
          a: { href: "/countries/be" },
          b: { hrefs: ["/countries?nameRegEx=^be.*$"] },
        },
        auth: "kevin",
      });

      assert.equal(response.body.length, 1);
    });

    it("uuid key - single resource - match", async () => {
      const response = await httpClient.post({
        path: "/messages/isPartOf",
        body: {
          a: { href: "/messages/ad9ff799-7727-4193-a34a-09f3819c3479" },
          b: { hrefs: ["/messages"] },
        },
        auth: "kevin",
      });

      assert.equal(response.body.length, 1);
    });

    it("numeric key - single resource - match", async () => {
      const response = await httpClient.post({
        path: "/cities/isPartOf",
        body: {
          a: { href: "/cities/38002" },
          b: { hrefs: ["/cities"] },
        },
        auth: "kevin",
      });

      assert.equal(response.body.length, 1);
    });

    it("uuid key - single resource - multiple matches from list", async () => {
      const response = await httpClient.post({
        path: "/messages/isPartOf",
        body: {
          a: { href: "/messages/ad9ff799-7727-4193-a34a-09f3819c3479" },
          b: {
            hrefs: [
              "/messages?descriptionRegEx=^NOMATCH.*$",
              "/messages",
              "/messages?type=request",
              "/messages?titleRegEx=^Wie.*$",
            ],
          },
        },
        auth: "kevin",
      });

      assert.equal(response.body.length, 2);
    });

    it("list resource - multiple matches from list", async () => {
      const response = await httpClient.post({
        path: "/messages/isPartOf",
        body: {
          a: { href: "/messages?descriptionRegEx=^Ik.*$" },
          b: {
            hrefs: [
              "/messages?descriptionRegEx=^NOMATCH.*$",
              "/messages",
              "/messages?type=request",
              "/messages?titleRegEx=^Wie.*$",
            ],
          },
        },
        auth: "kevin",
      });

      assert.equal(response.body.length, 2);
    });

    it("list resource - exact match", async () => {
      const response = await httpClient.post({
        path: "/messages/isPartOf",
        body: {
          a: { href: "/messages?descriptionRegEx=^Ik.*$" },
          b: { hrefs: ["/messages?descriptionRegEx=^Ik.*$"] },
        },
        auth: "kevin",
      });

      assert.equal(response.body.length, 1);
    });

    it("single resource - exact match", async () => {
      const response = await httpClient.post({
        path: "/messages/isPartOf",
        body: {
          a: { href: "/messages/ad9ff799-7727-4193-a34a-09f3819c3479" },
          b: { hrefs: ["/messages/ad9ff799-7727-4193-a34a-09f3819c3479"] },
        },
        auth: "kevin",
      });

      assert.equal(response.body.length, 1);
    });
  });
};
