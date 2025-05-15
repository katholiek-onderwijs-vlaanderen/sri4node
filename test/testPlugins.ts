// Utility methods for calling the SRI interface
import assert from "assert";
import * as uuid from "uuid";
import { spy } from "sinon";
import * as sinon from "sinon";
import sleep from "await-sleep";
import fs from "fs";

import { debug } from "../js/common";
import { THttpClient } from "./httpClient";
import { TSriConfig } from "../sri4node";
import * as sri4nodeTS from "../index"; // index is needed, otherwise it will use what is indicated in package.json/main !!!
import express from "express";

import * as context from "./context";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";

/**
 * User this function to add a spy if none is present hyet, and if one is present, to reset
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
 * Test suite for the plugins part.
 * We'll check whether the plugins functions like install & close are called
 * with the correct parameters and at the right time.
 */
module.exports = function (
  httpClient: THttpClient,
  dummyLogger: Console,
  _testContext: { sriServerInstance: null | sri4nodeTS.TSriServerInstance },
) {
  /**
   * Used in tests below to extend
   */
  const sriBaseConfig: TSriConfig = {
    databaseConnectionParameters: context.config(sri4nodeTS, { channels: [] }, dummyLogger, [])
      .databaseConnectionParameters,
    resources: [],
    plugins: [
      {
        uuid: "plugin 1",
        install: (_sriConfig: TSriConfig, _db: IDatabase<unknown, IClient>) => {},
        close: () => {},
      },
      {
        // no uuid !
        install: (_sriConfig: TSriConfig, _db: IDatabase<unknown, IClient>) => {},
        close: () => {},
      },
    ],
  };

  describe("PLUGINS", () => {
    it("plugin uuid is optional", async () => {
      const sriConfig: TSriConfig = { ...sriBaseConfig };
      sriConfig.plugins?.forEach((plugin) => {
        addOrResetSpy(plugin, "install");
        addOrResetSpy(plugin, "close");
      });
      const app = express();
      const sriServerInstance = await sri4nodeTS.configure(app, sriConfig);
      sriConfig.plugins?.forEach((plugin) => {
        sinon.assert.calledOnce(plugin.install as sinon.SinonSpy);
        sinon.assert.notCalled(plugin.close as sinon.SinonSpy);
        sinon.assert.calledWith(plugin.install as sinon.SinonSpy, sriConfig, sriServerInstance.db);
      });

      // closing the server
      await sriServerInstance.close();

      sriConfig.plugins?.forEach((plugin) => {
        sinon.assert.calledOnce(plugin.install as sinon.SinonSpy);
        sinon.assert.calledOnce(plugin.close as sinon.SinonSpy);
      });
    });

    it.skip("sri4node applies the changes made by the plugins to the sriConfig object", async () => {
      // TODO: implement this test
    });

    describe("check if install(...) and close() get called when expected", () => {
      // things to check
      // - install gets called
      // - install gets called with the correct parameters
      // - install gets called before the server is started
      // - install gets called only once
      // - install gets called for each plugin
      // - install gets called in the correct order
      // - install gets called only once for 2 plugins with the same uuid
      // - sri4node applies the changes made by the plugins to the sriConfig object
      // - close gets called
      // - close gets called with the correct parameters
      // - close gets called before the server is stopped
      // - close gets called only once
      // - close gets called for each plugin
      // - close gets called in the correct order
      // - close gets called only once for 2 plugins with the same uuid
      // - close is optional
      // - if 1 'close()' call throws an exception, the other plugins will still be closed as well

      it("install & close get called in the right order with the correct parameters", async () => {
        const sriConfig: TSriConfig = { ...sriBaseConfig, startUp: [spy(() => {})] };
        sriConfig.plugins?.forEach((plugin) => {
          addOrResetSpy(plugin, "install");
          addOrResetSpy(plugin, "close");
        });
        const app = express();
        const sriServerInstance = await sri4nodeTS.configure(app, sriConfig);
        sriConfig.plugins?.forEach((plugin) => {
          sinon.assert.calledOnce(plugin.install as sinon.SinonSpy);
          sinon.assert.notCalled(plugin.close as sinon.SinonSpy);
          sinon.assert.calledWith(
            plugin.install as sinon.SinonSpy,
            sriConfig,
            sriServerInstance.db,
          );
          sinon.assert.callOrder(
            sriConfig.startUp?.[0] as sinon.SinonSpy,
            plugin.install as sinon.SinonSpy,
          );
        });
        sinon.assert.callOrder(
          ...(sriConfig.plugins?.map((plugin) => plugin.install as sinon.SinonSpy) ?? []),
        );
        // closing the server
        await sriServerInstance.close();

        sriConfig.plugins?.forEach((plugin) => {
          sinon.assert.calledOnce(plugin.install as sinon.SinonSpy);
          sinon.assert.calledOnce(plugin.close as sinon.SinonSpy);
        });
        sinon.assert.callOrder(
          ...(sriConfig.plugins?.map((plugin) => plugin.close as sinon.SinonSpy) ?? []),
        );
      });

      it("install & close do not get called if a plugin has the same uuid as another one", async () => {
        const sriConfig: TSriConfig = {
          ...sriBaseConfig,
          plugins: [
            ...(sriBaseConfig.plugins ?? []),
            {
              uuid: sriBaseConfig.plugins?.[0].uuid,
              install: (_sriConfig: TSriConfig, _db: IDatabase<unknown, IClient>) => {},
              close: () => {},
            },
          ],
          startUp: [spy(() => {})],
        };

        sriConfig.plugins?.forEach((plugin) => {
          addOrResetSpy(plugin, "install");
          addOrResetSpy(plugin, "close");
        });
        const app = express();
        const sriServerInstance = await sri4nodeTS.configure(app, sriConfig);

        sinon.assert.calledOnce(sriConfig.plugins?.[0].install as sinon.SinonSpy);
        sinon.assert.notCalled(sriConfig.plugins?.[0].close as sinon.SinonSpy);
        sinon.assert.calledOnce(sriConfig.plugins?.[1].install as sinon.SinonSpy);
        sinon.assert.notCalled(sriConfig.plugins?.[1].close as sinon.SinonSpy);

        // the second one with the same uuid should not be called
        sinon.assert.notCalled(sriConfig.plugins?.[2].install as sinon.SinonSpy);
        sinon.assert.notCalled(sriConfig.plugins?.[2].close as sinon.SinonSpy);

        // closing the server
        await sriServerInstance.close();

        sinon.assert.calledOnce(sriConfig.plugins?.[0].close as sinon.SinonSpy);
        sinon.assert.calledOnce(sriConfig.plugins?.[1].close as sinon.SinonSpy);
        // the second one with the same uuid should not be called
        sinon.assert.notCalled(sriConfig.plugins?.[2].close as sinon.SinonSpy);
      });

      it("close is optional", async () => {
        const sriConfig: TSriConfig = {
          ...sriBaseConfig,
          plugins: [
            ...(sriBaseConfig.plugins ?? []),
            {
              uuid: "plugin 3",
              install: (_sriConfig: TSriConfig, _db: IDatabase<unknown, IClient>) => {},
            },
          ],
          startUp: [spy(() => {})],
        };

        sriConfig.plugins?.forEach((plugin) => {
          addOrResetSpy(plugin, "install");
          if (plugin.close) {
            addOrResetSpy(plugin, "close");
          }
        });
        const app = express();
        const sriServerInstance = await sri4nodeTS.configure(app, sriConfig);

        sinon.assert.calledOnce(sriConfig.plugins?.[0].install as sinon.SinonSpy);
        sinon.assert.notCalled(sriConfig.plugins?.[0].close as sinon.SinonSpy);
        sinon.assert.calledOnce(sriConfig.plugins?.[1].install as sinon.SinonSpy);
        sinon.assert.notCalled(sriConfig.plugins?.[1].close as sinon.SinonSpy);
        sinon.assert.calledOnce(sriConfig.plugins?.[2].install as sinon.SinonSpy);

        // closing the server
        await sriServerInstance.close();

        sinon.assert.calledOnce(sriConfig.plugins?.[0].close as sinon.SinonSpy);
        sinon.assert.calledOnce(sriConfig.plugins?.[1].close as sinon.SinonSpy);
      });

      it("close can throw an error, and the other close functions should still be called", async () => {
        const sriConfig: TSriConfig = {
          ...sriBaseConfig,
          plugins: [
            ...(sriBaseConfig.plugins ?? []),
            {
              uuid: "plugin 3",
              install: (_sriConfig: TSriConfig, _db: IDatabase<unknown, IClient>) => {},
              close: () => {
                throw new Error("close failed");
              },
            },
            {
              uuid: "plugin 4",
              install: (_sriConfig: TSriConfig, _db: IDatabase<unknown, IClient>) => {},
              close: () => {},
            },
          ],
          startUp: [spy(() => {})],
        };

        sriConfig.plugins?.forEach((plugin) => {
          addOrResetSpy(plugin, "install");
          if (plugin.close) {
            addOrResetSpy(plugin, "close");
          }
        });
        const app = express();
        const sriServerInstance = await sri4nodeTS.configure(app, sriConfig);

        sinon.assert.calledOnce(sriConfig.plugins?.[0].install as sinon.SinonSpy);
        sinon.assert.notCalled(sriConfig.plugins?.[0].close as sinon.SinonSpy);
        sinon.assert.calledOnce(sriConfig.plugins?.[1].install as sinon.SinonSpy);
        sinon.assert.notCalled(sriConfig.plugins?.[1].close as sinon.SinonSpy);
        sinon.assert.calledOnce(sriConfig.plugins?.[2].install as sinon.SinonSpy);
        sinon.assert.notCalled(sriConfig.plugins?.[2].close as sinon.SinonSpy);
        sinon.assert.calledOnce(sriConfig.plugins?.[3].install as sinon.SinonSpy);
        sinon.assert.notCalled(sriConfig.plugins?.[3].close as sinon.SinonSpy);

        // closing the server
        await sriServerInstance.close();

        sinon.assert.calledOnce(sriConfig.plugins?.[0].close as sinon.SinonSpy);
        sinon.assert.calledOnce(sriConfig.plugins?.[1].close as sinon.SinonSpy);
        // this one fails, but should be called
        sinon.assert.calledOnce(sriConfig.plugins?.[2].close as sinon.SinonSpy);
        // this one should still be called, even though the previous one fails
        sinon.assert.calledOnce(sriConfig.plugins?.[1].close as sinon.SinonSpy);
      });
    });
  });
};
