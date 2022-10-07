import * as assert from 'assert';
import { stdout } from 'test-console';
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory from './utils';

const setLogLvl = async (doPost, logdebug) => {
  const response = doPost('/setlogdebug', logdebug);
};

module.exports = function (base) {
  const sriClientConfig = {
    baseUrl: base,
  };
  const api = sriClientFactory(sriClientConfig);

  const doGet = function (...args) { return api.getRaw(...args); };
  const doPost = function (...args) { return api.post(...args); };

  const utils = utilsFactory(api);
  const { makeBasicAuthHeader } = utils;

  const sriClientOptionsAuthSabine = {
    headers: { authorization: makeBasicAuthHeader('sabine@email.be', 'pwd') },
  };
  const sriClientOptionsAuthKevin = {
    headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') },
  };

  describe('Logging', () => {
    after(async () => {
      await setLogLvl(doPost, false);
    });

    it('single get - no logging', async () => {
      await setLogLvl(doPost, false);
      const inspect = stdout.inspect();

      await doGet('/cities/38002');

      inspect.restore();
      const logLines = inspect.output;
      assert.ok(logLines.length === 0);
    });

    it('single get - default logging', async () => {
      await setLogLvl(doPost, true); // old value true is converted to channels ['general', 'trace', 'requests'] for backwards compability
      const inspect = stdout.inspect();

      await doGet('/cities/38002');

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
      const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
      const logLinesDb = logLines.filter((l) => l.includes('[db]'));
      const logLinesServerTiming = logLines.filter((l) => l.includes('[server-timing]'));

      assert.ok(logLinesTrace.length > 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length === 0);
      assert.ok(logLinesServerTiming.length === 1);
    });

    it('single get - logging "all"', async () => {
      await setLogLvl(doPost, { channels: 'all' });
      const inspect = stdout.inspect();

      await doGet('/cities/38002');

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
      const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
      const logLinesDb = logLines.filter((l) => l.includes('[db]'));

      assert.ok(logLinesTrace.length > 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length > 0);
    });

    it('single get - logging one specific channel', async () => {
      await setLogLvl(doPost, { channels: ['db'] });
      const inspect = stdout.inspect();

      await doGet('/cities/38002');

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
      const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
      const logLinesDb = logLines.filter((l) => l.includes('[db]'));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length > 0);
    });

    it('single get - invalid logconfig ', async () => {
      await setLogLvl(doPost, { foo: ['bar'] });
      const inspect = stdout.inspect();

      await doGet('/cities/38002');

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
      const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
      const logLinesDb = logLines.filter((l) => l.includes('[db]'));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length === 0);
    });

    it('single get - logging for specific status (200), status match', async () => {
      await setLogLvl(doPost, { channels: ['db'], statuses: [200] });
      const inspect = stdout.inspect();

      await doGet('/cities/38002');

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
      const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
      const logLinesDb = logLines.filter((l) => l.includes('[db]'));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length > 0);
    });

    it('single get - logging for specific status (200), no status match', async () => {
      await setLogLvl(doPost, { channels: ['db'], statuses: [302] });
      const inspect = stdout.inspect();

      await doGet('/cities/38002');

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
      const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
      const logLinesDb = logLines.filter((l) => l.includes('[db]'));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length === 0);
    });

    it('single get - logging for specific status (401), status match', async () => {
      await setLogLvl(doPost, { channels: ['db', 'requests'], statuses: [401] });

      const inspect = stdout.inspect();

      await utils.testForStatusCode(
        async () => {
          await doGet('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/');
        },
        (error) => {
          inspect.restore();
          const logLines = inspect.output;

          const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
          const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
          const logLinesDb = logLines.filter((l) => l.includes('[db]'));

          assert.ok(logLinesTrace.length === 0);
          assert.ok(logLinesRequests.length === 2);
          assert.ok(logLinesDb.length > 0);
        },
      );
    });

    it('list get', async () => {
      await setLogLvl(doPost, { channels: ['db', 'requests'] });
      const inspect = stdout.inspect();

      await doGet('/cities');

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
      const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
      const logLinesDb = logLines.filter((l) => l.includes('[db]'));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length > 0);
    });

    it('list get - logging for specific status (401), status match', async () => {
      await setLogLvl(doPost, { channels: ['db', 'requests'], statuses: [401] });
      const inspect = stdout.inspect();

      await utils.testForStatusCode(
        async () => {
          await doGet('/persons');
        },
        (error) => {
          inspect.restore();
          const logLines = inspect.output;

          const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
          const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
          const logLinesDb = logLines.filter((l) => l.includes('[db]'));

          assert.ok(logLinesTrace.length === 0);
          assert.ok(logLinesRequests.length === 2);
          assert.ok(logLinesDb.length > 0);
        },
      );
    });

    it('list get - logging for specific status (401), no status match', async () => {
      await setLogLvl(doPost, { channels: ['db', 'requests'], statuses: [401] });
      const inspect = stdout.inspect();

      await doGet('/cities');

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
      const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
      const logLinesDb = logLines.filter((l) => l.includes('[db]'));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length === 0);
    });

    it('batch', async () => {
      await setLogLvl(doPost, { channels: ['db', 'requests', 'batch'] });
      const inspect = stdout.inspect();

      const batch = api.createBatch();
      batch.get('/cities/38002');
      await batch.send('/batch');

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
      const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
      const logLinesDb = logLines.filter((l) => l.includes('[db]'));
      const logLinesBatch = logLines.filter((l) => l.includes('[batch]'));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length > 0);
      assert.ok(logLinesBatch.length > 0);
    });

    it('batch - logging for specific status (401), status match', async () => {
      await setLogLvl(doPost, { channels: ['db', 'requests', 'batch'], statuses: [401] });
      const inspect = stdout.inspect();

      await utils.testForStatusCode(
        async () => {
          const batch = api.createBatch();
          batch.get('/cities/38002');
          batch.get('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d');
          await batch.send('/batch');
        },
        (error) => {
          inspect.restore();
          const logLines = inspect.output;

          const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
          const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
          const logLinesDb = logLines.filter((l) => l.includes('[db]'));
          const logLinesBatch = logLines.filter((l) => l.includes('[batch]'));

          assert.ok(logLinesTrace.length === 0);
          assert.ok(logLinesRequests.length === 2);
          assert.ok(logLinesDb.length > 0);
          assert.ok(logLinesBatch.length > 0);
        },
      );
    });

    it('batch - logging for specific status (401), no status match', async () => {
      await setLogLvl(doPost, { channels: ['db', 'requests', 'batch'], statuses: [401] });
      const inspect = stdout.inspect();

      const batch = api.createBatch();
      batch.get('/cities/38002');
      await batch.send('/batch');

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
      const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
      const logLinesDb = logLines.filter((l) => l.includes('[db]'));
      const logLinesBatch = logLines.filter((l) => l.includes('[batch]'));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length === 0);
      assert.ok(logLinesBatch.length === 0);
    });

    it('batch - streaming', async () => {
      await setLogLvl(doPost, { channels: ['db', 'requests', 'batch'] });
      const inspect = stdout.inspect();

      const batch = api.createBatch();
      batch.get('/cities/38002');
      batch.get('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d');
      await batch.send('/batch_streaming');

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
      const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
      const logLinesDb = logLines.filter((l) => l.includes('[db]'));
      const logLinesBatch = logLines.filter((l) => l.includes('[batch]'));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length > 0);
      assert.ok(logLinesBatch.length > 0);
    });

    it('batch - streaming - logging for specific status (401), status match', async () => {
      await setLogLvl(doPost, { channels: ['db', 'requests', 'batch'], statuses: [401] });
      const inspect = stdout.inspect();

      await utils.testForStatusCode(
        async () => {
          const batch = api.createBatch();
          batch.get('/cities/38002');
          batch.get('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d');
          await batch.send('/batch');
        },
        (error) => {
          inspect.restore();
          const logLines = inspect.output;

          const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
          const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
          const logLinesDb = logLines.filter((l) => l.includes('[db]'));
          const logLinesBatch = logLines.filter((l) => l.includes('[batch]'));

          assert.ok(logLinesTrace.length === 0);
          assert.ok(logLinesRequests.length === 2);
          assert.ok(logLinesDb.length > 0);
          assert.ok(logLinesBatch.length > 0);
        },
      );
    });

    it('batch - streaming - logging for specific status (401), no status match', async () => {
      await setLogLvl(doPost, { channels: ['db', 'requests', 'batch'], statuses: [401] });
      const inspect = stdout.inspect();

      const batch = api.createBatch();
      batch.get('/cities/38002');
      await batch.send('/batch_streaming');

      inspect.restore();
      const logLines = inspect.output;

      const logLinesTrace = logLines.filter((l) => l.includes('[trace]'));
      const logLinesRequests = logLines.filter((l) => l.includes('[requests]'));
      const logLinesDb = logLines.filter((l) => l.includes('[db]'));
      const logLinesBatch = logLines.filter((l) => l.includes('[batch]'));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 0);
      assert.ok(logLinesDb.length === 0);
      assert.ok(logLinesBatch.length === 0);
    });

    it('single get - server-timing logging', async () => {
      await setLogLvl(doPost, { channels: ['server-timing'] });
      const inspect = stdout.inspect();

      await doGet('/cities/38002');

      inspect.restore();
      const logLines = inspect.output;
      const logLinesServerTiming = logLines.filter((l) => l.includes('[server-timing]'));
      assert.ok(logLinesServerTiming.length === 1);
    });

    it('list get - server-timing logging', async () => {
      await setLogLvl(doPost, { channels: ['server-timing'] });
      const inspect = stdout.inspect();

      await doGet('/cities');

      inspect.restore();
      const logLines = inspect.output;
      const logLinesServerTiming = logLines.filter((l) => l.includes('[server-timing]'));
      assert.ok(logLinesServerTiming.length === 1);
    });

    it('batch - server-timing logging', async () => {
      await setLogLvl(doPost, { channels: ['server-timing'] });
      const inspect = stdout.inspect();

      const batch = api.createBatch();
      batch.get('/cities/38002');
      await batch.send('/batch');

      inspect.restore();
      const logLines = inspect.output;
      const logLinesServerTiming = logLines.filter((l) => l.includes('[server-timing]'));
      assert.ok(logLinesServerTiming.length === 1);
    });

    it('batch streaming - server-timing logging', async () => {
      await setLogLvl(doPost, { channels: ['server-timing'] });
      const inspect = stdout.inspect();

      const batch = api.createBatch();
      batch.get('/cities/38002');
      await batch.send('/batch_streaming');

      inspect.restore();
      const logLines = inspect.output;
      const logLinesServerTiming = logLines.filter((l) => l.includes('[server-timing]'));
      assert.ok(logLinesServerTiming.length === 1);
    });

    it('single get - all -> server-timing logging', async () => {
      await setLogLvl(doPost, { channels: 'all' });
      const inspect = stdout.inspect();

      await doGet('/cities/38002');

      inspect.restore();
      const logLines = inspect.output;
      const logLinesServerTiming = logLines.filter((l) => l.includes('[server-timing]'));
      assert.ok(logLinesServerTiming.length === 1);
    });
  });
};
