import { assert } from "chai";
import { THttpClient } from "./httpClient";

module.exports = (httpClient: THttpClient) => {
  describe("reqID", () => {
    it("single get - check for reqId presence", async () => {
      const response = await httpClient.get({ path: "/cities/38002" });
      assert.equal(response.status, 200);
      assert.notEqual(response.headers["vsko-req-id"], undefined);
    });

    it("list get - check for reqId presence", async () => {
      const response = await httpClient.get({ path: "/cities" });
      assert.equal(response.status, 200);
      assert.notEqual(response.headers["vsko-req-id"], undefined);
    });

    it("batch - check for reqId presence", async () => {
      try {
        const batch = [
          [
            {
              href: "/cities/38002",
              verb: "GET",
            },
          ],
        ];
        const response = await httpClient.put({ path: "/batch", body: batch });
        assert.equal(response.status, 200);
        assert.notEqual(response.headers["vsko-req-id"], undefined);
      } catch (e) {
        console.log(e, e.stack);
        throw e;
      }
    });

    it("streaming batch - check for reqId presence", async () => {
      const batch = [
        [
          {
            href: "/cities/38002",
            verb: "GET",
          },
        ],
      ];

      const response = await httpClient.put({ path: "/batch_streaming", body: batch });
      assert.equal(response.status, 200);
      assert.notEqual(response.headers["vsko-req-id"], undefined);
    });

    it("single get - x-request-id -> reqId ", async () => {
      const response = await httpClient.get({
        path: "/cities/38002",
        headers: {
          "x-request-id": "ABCDEFG",
        },
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers["vsko-req-id"], "ABCDEFG");
    });

    it("single get - x-request-id -> reqId case check", async () => {
      const response = await httpClient.get({
        path: "/cities/38002",
        headers: {
          "X-requesT-id": "ABCDEFG",
        },
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers["vsko-req-id"], "ABCDEFG");
    });

    it("list get --  x-request-id -> reqId ", async () => {
      const response = await httpClient.get({
        path: "/cities",
        headers: {
          "x-request-id": "ABCDEFG",
        },
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers["vsko-req-id"], "ABCDEFG");
    });

    it("batch --  x-request-id -> reqId ", async () => {
      const batch = [
        [
          {
            href: "/cities/38002",
            verb: "GET",
          },
        ],
      ];

      const response = await httpClient.put({
        path: "/batch",
        headers: {
          "x-request-id": "ABCDEFG",
        },
        body: JSON.stringify(batch),
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers["vsko-req-id"], "ABCDEFG");
    });

    it("streaming batch -  x-request-id -> reqId ", async () => {
      const batch = [
        [
          {
            href: "/cities/38002",
            verb: "GET",
          },
        ],
      ];

      const response = await httpClient.put({
        path: "/batch_streaming",
        headers: {
          "x-request-id": "ABCDEFG",
        },
        body: JSON.stringify(batch),
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers["vsko-req-id"], "ABCDEFG");
    });

    it("single get -x-amz-cf-id -> reqId ", async () => {
      const response = await httpClient.get({
        path: "/cities/38002",
        headers: {
          "x-amz-cf-id": "ABCDEFG",
        },
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers["vsko-req-id"], "ABCDEFG");
    });

    it("single get - x-amz-cf-id -> reqId case check", async () => {
      const response = await httpClient.get({
        path: "/cities/38002",
        headers: {
          "x-amZ-cF-id": "ABCDEFG",
        },
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers["vsko-req-id"], "ABCDEFG");
    });

    it("list get -- x-amz-cf-id -> reqId ", async () => {
      const response = await httpClient.get({
        path: "/cities",
        headers: {
          "x-amz-cf-id": "ABCDEFG",
        },
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers["vsko-req-id"], "ABCDEFG");
    });

    it("batch -- x-amz-cf-id -> reqId ", async () => {
      const batch = [
        [
          {
            href: "/cities/38002",
            verb: "GET",
          },
        ],
      ];

      const response = await httpClient.put({
        path: "/batch",
        headers: {
          "x-amz-cf-id": "ABCDEFG",
        },
        body: JSON.stringify(batch),
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers["vsko-req-id"], "ABCDEFG");
    });

    it("stearing batch - x-amz-cf-id -> reqId ", async () => {
      const batch = [
        [
          {
            href: "/cities/38002",
            verb: "GET",
          },
        ],
      ];

      const response = await httpClient.put({
        path: "/batch_streaming",
        headers: {
          "x-amz-cf-id": "ABCDEFG",
        },
        body: JSON.stringify(batch),
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers["vsko-req-id"], "ABCDEFG");
    });
  });
};
