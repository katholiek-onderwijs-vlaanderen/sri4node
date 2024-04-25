import assert from "assert";
import * as sri4node from "../sri4node";
import pgPromise from "pg-promise";

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

export { makeBasicAuthHeader, lookForBasicAuthUser, copyUserInfo, testForStatusCode };
