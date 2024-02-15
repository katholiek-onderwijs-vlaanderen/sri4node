import assert from "assert";
import { THttpClient } from "./httpClient";

module.exports = function (httpClient: THttpClient) {
  const requestServerTimingHdr = {
    "Request-Server-Timing": "true",
  };

  describe("ServerTiming", () => {
    it("single get", async () => {
      const response = await httpClient.get({
        path: "/cities/38002",
        headers: requestServerTimingHdr,
      });
      assert.strictEqual(
        response.headers["server-timing"] !== undefined,
        true,
        "Server-Timing header is missing in headers.",
      );
    });

    it("list get", async () => {
      const response = await httpClient.get({ path: "/cities", headers: requestServerTimingHdr });
      assert.strictEqual(
        response.headers["server-timing"] !== undefined,
        true,
        "Server-Timing header is missing in headers.",
      );
    });

    it("batch", async () => {
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
        body: batch,
        headers: requestServerTimingHdr,
      });
      assert.strictEqual(
        response.headers["server-timing"] !== undefined,
        true,
        "Server-Timing header is missing in headers.",
      );
    });

    it("batch - streaming", async () => {
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
        body: batch,
        headers: requestServerTimingHdr,
        streaming: true,
      });

      assert.strictEqual(
        response.trailers["server-timing"],
        undefined,
        "Server-Timing header is set before stream is received ?!.",
      );
      for await (const _data of response.body) {
        // just throw away data
      }
      // now, after the stream is consumed, the http trailers should be set
      assert.strictEqual(
        response.trailers["server-timing"] !== undefined,
        true,
        "Server-Timing header is missing in trailers.",
      );
    });
  });
};
