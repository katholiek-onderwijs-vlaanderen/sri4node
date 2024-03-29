import pMap from "p-map";
import { errorAsCode, debug, stringifyError, setServerTimingHdr } from "./common";
import { SriError, TSriRequest } from "./typeDefinitions";

async function applyHooks(
  type: string,
  functions: Array<(...any) => any> | undefined,
  // Array<(expressRequest:Request, sriReq:TSriRequest, dbT:unknown) => void>
  // | (sriRequest:TSriRequest) => void,
  // applyFun: (fun:(dbT:any, sriReq:TSriRequest, result:any) => any) => any,
  applyFun: (fun: (...any) => any) => any,
  sriRequest?: TSriRequest,
) {
  if (functions && functions.length > 0) {
    try {
      debug("hooks", `applyHooks-${type}: going to apply ${functions.length} functions`);
      await pMap(
        functions,
        async (fun: any) => {
          const hrstart = process.hrtime();
          const funName =
            fun.name !== ""
              ? fun.name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
              : "anonymous-fun";
          const stHookName = `${type.replace(/ - /g, "-").replace(/ /g, "-")}-${funName}`;
          try {
            await applyFun(fun);
            const hrend = process.hrtime(hrstart);
            const duration = hrend[0] * 1000 + hrend[1] / 1000000;
            debug("hooks", `applyHooks-${type}: all functions resolved (took ${duration}ms).`);
            if (sriRequest) {
              setServerTimingHdr(sriRequest, stHookName, duration);
            }
          } catch (err) {
            const hrend = process.hrtime(hrstart);
            const duration = hrend[0] * 1000 + hrend[1] / 1000000;
            debug("hooks", `applyHooks-${type}: function ${fun.name} failed (took ${duration}ms).`);
            if (sriRequest) {
              setServerTimingHdr(sriRequest, stHookName, duration);
            }
            throw err;
          }
        },
        { concurrency: 1 },
      );
    } catch (err) {
      if (err instanceof SriError || err?.__proto__?.constructor?.name === "SriError") {
        throw err;
      } else {
        console.log(
          "_______________________ H O O K S - E R R O R _____________________________________________",
        );
        console.log(err);
        console.log(err.stack);
        console.log(Object.prototype.toString.call(err));
        console.log(
          "___________________________________________________________________________________________",
        );
        throw new SriError({
          status: 500,
          errors: [{ code: errorAsCode(`${type} failed`), msg: stringifyError(err) }],
        });
      }
    }
  } else {
    debug("hooks", `applyHooks-${type}: no ${type} functions registered.`);
  }
}

export { applyHooks };
