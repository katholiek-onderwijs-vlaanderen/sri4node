import assert from "assert";
import fs from "fs";
import { Client } from "undici";

const client = new Client(`http://localhost:4000`);

describe("Sri4node testing", function () {
  "use strict";
  this.timeout(0);

  it("batch with lot of items (chunked) - not allowed by security", async function () {
    const batch = fs.readFileSync(
      "test_performance/curl-delete-customcur-outOfMemory_chunked.json",
    );
    const startTime = Date.now();
    const { trailers, body } = await client.request({
      path: "/llinkid/customcurriculum/customcurricula/batch_streaming?dryRun=true",
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=utf-8",
        "Request-Server-Timing": true,
      },
      body: batch,
    });

    const bufArr = [];
    for await (const data of body) {
      bufArr.push(data);
    }
    const duration = Date.now() - startTime;
    let json = JSON.parse(Buffer.concat(bufArr));

    const accServerTiming = trailers["server-timing"]
      .split(",")
      .reduce((acc, st) => acc + parseInt(st.split(";dur=")[1]), 0);

    // fetch heapMax
    const { body: body2 } = await client.request({ path: "/heap_max", method: "GET" });
    const bufArr2 = [];
    for await (const data of body2) {
      bufArr2.push(data);
    }
    const heapMax = JSON.parse(Buffer.concat(bufArr2))["maxHeapUsage"]; //.maxHeapUsage;

    console.log(trailers["server-timing"]);
    // some asserts
    assert.strictEqual(json.status, 302);
    assert.strictEqual(duration < 2000, true, `duration too long: ${duration}`);
    assert.strictEqual(heapMax < 80, true, `max heap (${heapMax}) usage above 80MB`);
    assert.strictEqual(
      (100 * accServerTiming) / duration > 85,
      true,
      `server-timing coverage not enough: ${(100 * accServerTiming) / duration} (${accServerTiming} / ${duration})`,
    );
  });
});
