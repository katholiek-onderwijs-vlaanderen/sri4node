import sleep from "await-sleep";
import { TResourceDefinition } from "../../sri4node";

exports = module.exports = function (_sri4node) {
  const r: TResourceDefinition = {
    type: "/customStreaming",
    metaType: "SRI4NODE_CUSTOM_STREAMING",
    schema: {},
    customRoutes: [
      {
        routePostfix: "",
        httpMethods: ["GET"],
        streamingHandler: async (_tx, sriRequest, stream) => {
          if (sriRequest.query["slowstart"] !== undefined) {
            await sleep(5_000);
            stream.push("foo");
          } else if (sriRequest.query["superslowstart"] !== undefined) {
            await sleep(70_000);
            stream.push("foo");
          } else {
            await sleep(5_000);
            stream.push("f");
            await sleep(2_000);
            stream.push("o");
            await sleep(20_000);
            stream.push("o");
            await sleep(10_000);
            stream.push("b");
            await sleep(5_000);
            stream.push("a");
            await sleep(5_000);
            stream.push("r");
            await sleep(5_000);
            stream.push("!");
          }
        },
      },
      {
        routePostfix: "/short",
        httpMethods: ["GET"],
        beforeStreamingHandler: async (tx, sriRequest) => {
          // just a very basic query to test if we can speak with the database
          const result = await tx.query("SELECT 1 AS foo;");
          if (result[0].foo !== 1) {
            throw new sriRequest.SriError({
              status: 500,
              errors: [{ code: "unexpected.query.result.in.before.streaming.handler" }],
            });
          }
          return undefined;
        },
        streamingHandler: async (_tx, _sriRequest, stream) => {
          stream.push("done");
        },
      },
    ],
    onlyCustom: true,
  };
  return r;
};
