import assert from "assert";
import * as sri4node from "../sri4node";
import pgPromise from "pg-promise";
import sinon from "sinon";

const makeBasicAuthHeader = (user: string, pw: string): string =>
  `Basic ${Buffer.from(`${user}:${pw}`).toString("base64")}`;

async function lookForBasicAuthUser(
  req,
  sriRequest: sri4node.TSriRequest,
  db: pgPromise.IDatabase<unknown> | pgPromise.ITask<unknown>,
) {
  // just a very basic query to test if we can speak with the database
  const result = await db.query("SELECT 1 AS foo;");
  if (result[0].foo !== 1) {
    throw new sriRequest.SriError({
      status: 500,
      errors: [{ code: "unexpected.query.result.in.before.handler" }],
    });
  }

  if (req.headers.authorization) {
    const basic = req.headers.authorization;
    const encoded = basic.substr(6);
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const firstColonIndex = decoded.indexOf(":");

    if (firstColonIndex !== -1) {
      const username = decoded.substring(0, firstColonIndex);
      const password = decoded.substring(firstColonIndex + 1);

      const query = sri4node.utils.prepareSQL("me");
      query
        .sql("select * from persons where email = ")
        .param(username)
        .sql(" and password = ")
        .param(password);
      // WEIRD: sri4node.utils.executeSQL and a bunch of other functions are undefined ???
      // const [row] = await sri4node.utils.executeSQL(db, query);
      const { sql, values } = query.toParameterizedSql();

      const row = await db.oneOrNone(sql, values);

      if (row) {
        sriRequest.userObject = {
          $$meta: { permalink: `/persons/${row.key}` },
          firstname: row.firstname,
          lastname: row.lastname,
          email: row.email,
          community: { href: `/communities/${row.community}` },
        };
      }
    }
  }
}

const copyUserInfo = async (dbT, sriRequest, parentSriRequest) => {
  // just a very basic query to test if we can speak with the database
  const result = await dbT.query("SELECT 1 AS foo;");
  if (result[0].foo !== 1) {
    throw new sriRequest.SriError({
      status: 500,
      errors: [{ code: "unexpected.query.result.in.copy.user.info" }],
    });
  }

  sriRequest.userObject = parentSriRequest.userObject;
  sriRequest.authException = parentSriRequest.authException;
};

/**
 *
 * @param func
 * @param assertFunc
 */
const testForStatusCode = async (func: () => unknown, assertFunc: (unknown) => unknown) => {
  try {
    await func();
    throw "Func() execution did not raise any error, but an error was expected.";
  } catch (error) {
    if (error.status && error.body && error.headers) {
      // error instanceof SriClientError) {
      await assertFunc(error);
    } else {
      assert.fail(`ERROR: ${error.toString()}`);
    }
  }
};

/**
 * Use this function to add a spy if none is present yet, and if one is present, to reset.
 * Useful method to add in a before() block to make sure that the spy is always reset.
 *
 * @param obj
 * @param method
 * @returns
 */
function addOrResetSpy(obj: any, method: string): sinon.SinonSpy {
  if (obj[method].callCount) {
    (obj[method] as sinon.SinonSpy).resetHistory();
    return obj[method] as sinon.SinonSpy;
  }
  return sinon.spy(obj, method);
}

/**
 * This thing will creazte a javascript Proxy object where each method has been replaced
 * by a SinonSpy.
 * This can be useful if you either want to simply spy on all the methods of an object,
 * or if the object's methods are set to configurable: false.
 * cfr: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty#configurable
 *
 * @param obj
 * @returns
 */
function createSinonProxy<T extends object>(obj: T): T {
  /// DOES NOT WORK if a property is set to configurable: false, because the proxy should
  /// return the original property in this case
  ///
  // return new Proxy(obj, {
  //   get(target, prop, receiver) {
  //     const original = Reflect.get(target, prop, receiver);
  //     if (typeof original === 'function') {
  //       // Create a new function that calls the original function
  //       const wrapper = function(...args: any[]) {
  //         return original.apply(this, args);
  //       };
  //       // Replace the wrapper function with a Sinon spy
  //       return sinon.spy(wrapper);
  //     }
  //     return original;
  //   },
  // }) as unknown as T;

  // DOES NOT WORK, because it only spies on enumerable properties
  // return {
  //   ...obj,
  //   ...Object.entries(obj).map(([_key, value]) => {
  //     if (typeof value === 'function') {
  //       return sinon.spy(value);
  //     }
  //     return value;
  //   }),
  //  } as unknown as T;

  // Create a new object that inherits from the prototype of the original object
  const proxyObject = Object.create(Object.getPrototypeOf(obj));

  // Get all own and inherited property names
  let proto = obj;
  while (proto) {
    console.log(`======== proto = ${typeof proto} ========`);
    Object.getOwnPropertyNames(proto).forEach((prop) => {
      const value = proto[prop];
      const newPropValue =
        typeof value === "function"
          ? sinon.spy(function (...args: any[]) {
              return value.apply(this, args);
            })
          : value;
      console.log(`Adding property ${prop} to the proxyObject with value`, newPropValue);
      const pDesc = Object.getOwnPropertyDescriptor(proto, prop);
      if (!pDesc) {
        throw new Error(`Could not get property descriptor for ${prop}`);
      }
      // update the pDesc to maker sure the new property value is being used
      if (pDesc.get) {
        pDesc.get = () => newPropValue;
      }
      if (pDesc.value) {
        pDesc.value = newPropValue;
      }
      Object.defineProperty(proxyObject, prop, pDesc);
    });
    proto = Object.getPrototypeOf(proto);
  }
  return proxyObject;
}

/**
 * Create promise that resolves when the given method has been called (and that replaces the
 * original mathod on the object again with its as soon as it has been called!).
 *
 * Sometimes in a test you need to wait until another method is called.
 *
 * ```javascript
 * const resolveTaskStarted = createMethodCalledPromise(context.pgpStats.task, "push");
 * // now do something that will call context.pgpStats.task.push()
 * await resolveTaskStarted;
 * ```
 *
 */
function createMethodCalledPromise(obj: any, method: string): Promise<void> {
  return new Promise((resolve, _reject) => {
    const origMethod = obj[method];
    obj[method] = function (...args: any[]) {
      const retVal = origMethod.apply(obj, args);
      obj[method] = origMethod;
      resolve();
      return retVal;
    };
  });
}

// const origPush = context.pgpStats.task.push;
// let resolveTaskStarted;
// const taskStartedPromise = new Promise((resolve, _reject) => {
//   resolveTaskStarted = resolve;
// });
// context.pgpStats.task.push = (x) => {
//   const retVal = origPush.apply(context.pgpStats.task, [x]);
//   resolveTaskStarted(x);
//   return retVal;
// };

export {
  makeBasicAuthHeader,
  lookForBasicAuthUser,
  copyUserInfo,
  testForStatusCode,
  addOrResetSpy,
  createSinonProxy,
  createMethodCalledPromise,
};
