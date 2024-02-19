import assert from "assert";
import { stdout } from "test-console";
import { THttpClient } from "./httpClient";

const setLogLvl = async (httpClient: THttpClient, logdebug) => {
  const response = await httpClient.post({ path: "/setlogdebug", body: logdebug });
  assert.equal(response.status, 200);
};

module.exports = function (httpClient: THttpClient) {
  describe("Logging", () => {
    after(async () => {
      await setLogLvl(httpClient, false);
    });

    it("single get - no logging", async () => {
      await setLogLvl(httpClient, false);
      const inspect = stdout.inspect();

      const response = await httpClient.get({ path: "/cities/38002" });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;
      assert.ok(logLines.length === 0);
    });

    it("single get - default logging", async () => {
      await setLogLvl(httpClient, true); // old value true is converted to channels ['general', 'trace', 'requests'] for backwards compability
      const inspect = stdout.inspect();

      const response = await httpClient.get({ path: "/cities/38002" });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));
      const logLinesServerTiming = logLines.filter((l) => l.includes("[server-timing]"));

      assert.ok(logLinesTrace.length > 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length === 0);
      assert.ok(logLinesServerTiming.length === 1);
    });

    it('single get - logging "all"', async () => {
      await setLogLvl(httpClient, { channels: "all" });
      const inspect = stdout.inspect();

      const response = await httpClient.get({ path: "/cities/38002" });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));

      assert.ok(logLinesTrace.length > 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length > 0);
    });

    it("single get - logging one specific channel", async () => {
      await setLogLvl(httpClient, { channels: ["db"] });
      const inspect = stdout.inspect();

      const response = await httpClient.get({ path: "/cities/38002" });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length > 0);
    });

    it("single get - invalid logconfig ", async () => {
      await setLogLvl(httpClient, { foo: ["bar"] });
      const inspect = stdout.inspect();

      const response = await httpClient.get({ path: "/cities/38002" });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length === 0);
    });

    it("single get - logging for specific status (200), status match", async () => {
      await setLogLvl(httpClient, { channels: ["db"], statuses: [200] });
      const inspect = stdout.inspect();

      const response = await httpClient.get({ path: "/cities/38002" });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length > 0);
    });

    it("single get - logging for specific status (302), no status match", async () => {
      await setLogLvl(httpClient, { channels: ["db"], statuses: [302] });
      const inspect = stdout.inspect();

      const response = await httpClient.get({ path: "/cities/38002" });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length === 0);
    });

    it("single get - logging for specific status (401), status match", async () => {
      await setLogLvl(httpClient, { channels: ["db", "requests"], statuses: [401] });

      const inspect = stdout.inspect();

      const response = await httpClient.get({
        path: "/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/",
      });
      assert.equal(response.status, 401);
      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length > 0);
    });

    it("list get", async () => {
      await setLogLvl(httpClient, { channels: ["db", "requests"] });
      const inspect = stdout.inspect();

      const response = await httpClient.get({ path: "/cities" });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length > 0);
    });

    it("list get - logging for specific status (401), status match", async () => {
      await setLogLvl(httpClient, { channels: ["db", "requests"], statuses: [401] });
      const inspect = stdout.inspect();

      const response = await httpClient.get({ path: "/persons" });
      assert.equal(response.status, 401);
      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length > 0);
    });

    it("list get - logging for specific status (401), no status match", async () => {
      await setLogLvl(httpClient, { channels: ["db", "requests"], statuses: [401] });
      const inspect = stdout.inspect();

      const response = await httpClient.get({ path: "/cities" });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length === 0);
    });

    it("batch", async () => {
      await setLogLvl(httpClient, { channels: ["db", "requests", "batch"] });
      const inspect = stdout.inspect();

      const batch = [
        {
          href: "/cities/38002",
          verb: "GET",
        },
      ];
      const response = await httpClient.put({ path: "/batch", body: batch });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));
      const logLinesBatch = logLines.filter((l) => l.includes("[batch]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length > 0);
      assert.ok(logLinesBatch.length > 0);
    });

    it("batch - logging for specific status (401), status match", async () => {
      await setLogLvl(httpClient, { channels: ["db", "requests", "batch"], statuses: [401] });
      const inspect = stdout.inspect();

      const batch = [
        {
          href: "/cities/38002",
          verb: "GET",
        },
        {
          href: "/persons/de32ce31-af0c-4620-988e-1d0de282ee9d",
          verb: "GET",
        },
      ];
      const response = await httpClient.put({ path: "/batch", body: batch });
      assert.equal(response.status, 401);

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));
      const logLinesBatch = logLines.filter((l) => l.includes("[batch]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length > 0);
      assert.ok(logLinesBatch.length > 0);
    });

    it("batch - logging for specific status (401), no status match", async () => {
      await setLogLvl(httpClient, { channels: ["db", "requests", "batch"], statuses: [401] });
      const inspect = stdout.inspect();

      const batch = [
        {
          href: "/cities/38002",
          verb: "GET",
        },
      ];
      const response = await httpClient.put({ path: "/batch", body: batch });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));
      const logLinesBatch = logLines.filter((l) => l.includes("[batch]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length === 0);
      assert.ok(logLinesBatch.length === 0);
    });

    it("batch - streaming", async () => {
      await setLogLvl(httpClient, { channels: ["db", "requests", "batch"] });
      const inspect = stdout.inspect();

      const batch = [
        {
          href: "/cities/38002",
          verb: "GET",
        },
        {
          href: "/persons/de32ce31-af0c-4620-988e-1d0de282ee9d",
          verb: "GET",
        },
      ];
      const response = await httpClient.put({ path: "/batch_streaming", body: batch });
      assert.equal(response.body.status, 401); // response.status is always 200 in streaming mode -> look at response.body.status

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));
      const logLinesBatch = logLines.filter((l) => l.includes("[batch]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length > 0);
      assert.ok(logLinesBatch.length > 0);
    });

    it("batch - streaming - logging for specific status (401), status match", async () => {
      await setLogLvl(httpClient, { channels: ["db", "requests", "batch"], statuses: [401] });
      const inspect = stdout.inspect();

      const batch = [
        {
          href: "/cities/38002",
          verb: "GET",
        },
        {
          href: "/persons/de32ce31-af0c-4620-988e-1d0de282ee9d",
          verb: "GET",
        },
      ];
      const response = await httpClient.put({ path: "/batch", body: batch });
      assert.equal(response.status, 401);

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));
      const logLinesBatch = logLines.filter((l) => l.includes("[batch]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length > 0);
      assert.ok(logLinesBatch.length > 0);
    });

    it("batch - streaming - logging for specific status (401), no status match", async () => {
      await setLogLvl(httpClient, { channels: ["db", "requests", "batch"], statuses: [401] });
      const inspect = stdout.inspect();

      const batch = [
        {
          href: "/cities/38002",
          verb: "GET",
        },
      ];
      const response = await httpClient.put({ path: "/batch_streaming", body: batch });
      assert.equal(response.body.status, 200); // response.status is always 200 in streaming mode -> look at response.body.status

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes("[trace]"));
      const logLinesRequests = logLines.filter((l) => l.includes("[requests]"));
      const logLinesDb = logLines.filter((l) => l.includes("[db]"));
      const logLinesBatch = logLines.filter((l) => l.includes("[batch]"));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length === 0);
      assert.ok(logLinesBatch.length === 0);
    });

    it("single get - server-timing logging", async () => {
      await setLogLvl(httpClient, { channels: ["server-timing"] });
      const inspect = stdout.inspect();

      const response = await httpClient.get({ path: "/cities/38002" });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;
      const logLinesServerTiming = logLines.filter((l) => l.includes("[server-timing]"));
      assert.ok(logLinesServerTiming.length === 1);
    });

    it("list get - server-timing logging", async () => {
      await setLogLvl(httpClient, { channels: ["server-timing"] });
      const inspect = stdout.inspect();

      const response = await httpClient.get({ path: "/cities" });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;
      const logLinesServerTiming = logLines.filter((l) => l.includes("[server-timing]"));
      assert.ok(logLinesServerTiming.length === 1);
    });

    it("batch - server-timing logging", async () => {
      await setLogLvl(httpClient, { channels: ["server-timing"] });
      const inspect = stdout.inspect();

      const batch = [
        {
          href: "/cities/38002",
          verb: "GET",
        },
      ];
      const response = await httpClient.put({ path: "/batch", body: batch });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;
      const logLinesServerTiming = logLines.filter((l) => l.includes("[server-timing]"));
      assert.ok(logLinesServerTiming.length === 1);
    });

    it("batch streaming - server-timing logging", async () => {
      await setLogLvl(httpClient, { channels: ["server-timing"] });
      const inspect = stdout.inspect();

      const batch = [
        {
          href: "/cities/38002",
          verb: "GET",
        },
      ];
      const response = await httpClient.put({ path: "/batch_streaming", body: batch });
      assert.equal(response.body.status, 200); // response.status is always 200 in streaming mode -> look at response.body.status

      inspect.restore();
      const logLines = inspect.output;
      const logLinesServerTiming = logLines.filter((l) => l.includes("[server-timing]"));
      assert.ok(logLinesServerTiming.length === 1);
    });

    it("single get - all -> server-timing logging", async () => {
      await setLogLvl(httpClient, { channels: "all" });
      const inspect = stdout.inspect();

      const response = await httpClient.get({ path: "/cities/38002" });
      assert.equal(response.status, 200);

      inspect.restore();
      const logLines = inspect.output;
      const logLinesServerTiming = logLines.filter((l) => l.includes("[server-timing]"));
      assert.ok(logLinesServerTiming.length === 1);
    });
  });
};
