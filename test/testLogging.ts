const assert = require('assert');
const { Client } = require('undici');
const stdout = require('test-console').stdout;


const setLogLvl = async (client, logdebug) => {
    const {
        statusCode,
        body
      } = await client.request({ path: '/setlogdebug'
                        , method: 'POST'
                        , headers: {
                              'Content-type': 'application/json; charset=utf-8',
                          }
                        , body: JSON.stringify(logdebug) });

      const bufArr:any[] = []
      for await (const data of body) {
          bufArr.push(data);
      }
      assert.strictEqual(statusCode, 200);
}


export = module.exports = function (base) {
  'use strict';

  const client = new Client(`http://localhost:5000`);

  describe('Logging', function () {

    it('single get - no logging', async function () {
        await setLogLvl(client, false);
        const inspect = stdout.inspect();

        const {
          headers,
          body
        } = await client.request({ path: '/cities/38002'
                          , method: 'GET'
                          , headers: {
                                'Request-Server-Timing': true,
                            } });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }

        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output
        assert.ok(logLines.length === 0);
    });


    it('single get - default logging', async function () {
        await setLogLvl(client, true); // old value true is converted to channels ['general', 'trace', 'requests'] for backwards compability
        const inspect = stdout.inspect();

        const {
          headers,
          body
        } = await client.request({ path: '/cities/38002'
                          , method: 'GET'
                          , headers: {
                                'Request-Server-Timing': true,
                            } });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }

        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output

        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));

        assert.ok(logLinesTrace.length > 0);
        assert.ok(logLinesRequests.length === 2);
        assert.ok(logLinesDb.length === 0);

    });


    it('single get - logging "all"', async function () {
        await setLogLvl(client, { channels: 'all' }); 
        const inspect = stdout.inspect();

        const {
          headers,
          body
        } = await client.request({ path: '/cities/38002'
                          , method: 'GET'
                          , headers: {
                                'Request-Server-Timing': true,
                            } });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }

        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output

        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));

        assert.ok(logLinesTrace.length > 0);
        assert.ok(logLinesRequests.length === 2);
        assert.ok(logLinesDb.length > 0);
    });

    it('single get - logging one specific channel', async function () {
        await setLogLvl(client, { channels: ['db'] }); 
        const inspect = stdout.inspect();

        const {
          headers,
          body
        } = await client.request({ path: '/cities/38002'
                          , method: 'GET'
                          , headers: {
                                'Request-Server-Timing': true,
                            } });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }

        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output

        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));

        assert.ok(logLinesTrace.length === 0);
        assert.ok(logLinesRequests.length === 0);
        assert.ok(logLinesDb.length > 0);
    });

    it('single get - invalid logconfig ', async function () {
        await setLogLvl(client, { foo: ['bar'] }); 
        const inspect = stdout.inspect();

        const {
          headers,
          body
        } = await client.request({ path: '/cities/38002'
                          , method: 'GET'
                          , headers: {
                                'Request-Server-Timing': true,
                            } });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }

        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output

        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));

        assert.ok(logLinesTrace.length === 0);
        assert.ok(logLinesRequests.length === 0);
        assert.ok(logLinesDb.length === 0);
    });

    it('single get - logging for specific status (200), status match', async function () {
        await setLogLvl(client, { channels: ['db'], statuses: [ 200 ] });
        const inspect = stdout.inspect();

        const {
          headers,
          body
        } = await client.request({ path: '/cities/38002'
                          , method: 'GET'
                          , headers: {
                                'Request-Server-Timing': true,
                            } });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }

        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output

        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));

        assert.ok(logLinesTrace.length === 0);
        assert.ok(logLinesRequests.length === 0);
        assert.ok(logLinesDb.length > 0);
    });

    it('single get - logging for specific status (200), no status match', async function () {
        await setLogLvl(client, { channels: ['db'], statuses: [ 302 ] });
        const inspect = stdout.inspect();

        const {
          headers,
          body
        } = await client.request({ path: '/cities/38002'
                          , method: 'GET'
                          , headers: {
                                'Request-Server-Timing': true,
                            } });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }

        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output

        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));

        assert.ok(logLinesTrace.length === 0);
        assert.ok(logLinesRequests.length === 0);
        assert.ok(logLinesDb.length === 0);
    });

    it('single get - logging for specific status (401), status match', async function () {
        await setLogLvl(client, { channels: ['db', 'requests'], statuses: [ 401 ] });
        const inspect = stdout.inspect();

        const {
          headers,
          body
        } = await client.request({ path: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/'
                          , method: 'GET'
                          , headers: {
                                'Request-Server-Timing': true,
                            } });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }

        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output

        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));

        assert.ok(logLinesTrace.length === 0);
        assert.ok(logLinesRequests.length === 2);
        assert.ok(logLinesDb.length > 0);
    });

    it('list get', async function () {
        await setLogLvl(client, { channels: ['db', 'requests'] });
        const inspect = stdout.inspect();

        const {
          headers,
          body
        } = await client.request({ path: '/cities'
                          , method: 'GET'
                          , headers: {
                                'Request-Server-Timing': true,
                            } });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }

        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output

        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));

        assert.ok(logLinesTrace.length === 0);
        assert.ok(logLinesRequests.length === 2);
        assert.ok(logLinesDb.length > 0);

    });

    it('list get - logging for specific status (401), status match', async function () {
        await setLogLvl(client, { channels: ['db', 'requests'], statuses: [ 401 ] });
        const inspect = stdout.inspect();

        const {
          headers,
          body
        } = await client.request({ path: '/persons'
                          , method: 'GET'
                          , headers: {
                                'Request-Server-Timing': true,
                            } });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }

        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output

        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));

        assert.ok(logLinesTrace.length === 0);
        assert.ok(logLinesRequests.length === 2);
        assert.ok(logLinesDb.length > 0);
    });

    it('list get - logging for specific status (401), no status match', async function () {
        await setLogLvl(client, { channels: ['db', 'requests'], statuses: [ 401 ] });
        const inspect = stdout.inspect();

        const {
          headers,
          body
        } = await client.request({ path: '/cities'
                          , method: 'GET'
                          , headers: {
                                'Request-Server-Timing': true,
                            } });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }

        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output

        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));

        assert.ok(logLinesTrace.length === 0);
        assert.ok(logLinesRequests.length === 0);
        assert.ok(logLinesDb.length === 0);
    });

    it('batch', async function () {
      await setLogLvl(client, { channels: ['db', 'requests', 'batch'] });
      const inspect = stdout.inspect();

      const batch = [
        [{ "href": '/cities/38002'
        , "verb": "GET"
        }]
      ]

      const {
        headers,
        body
      } = await client.request({ path: '/batch'
                        , method: 'PUT'
                        , headers: {
                              'Content-type': 'application/json; charset=utf-8',
                              'Request-Server-Timing': true,
                            //   'authorization': makeBasicAuthHeader('sabine@email.be', 'pwd')
                          }
                        , body: JSON.stringify(batch) });

      const bufArr:any[] = []
      for await (const data of body) {
          bufArr.push(data);
      }

      const reqID = headers['vsko-req-id'];

      inspect.restore();
      const logLines = inspect.output

      const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
      const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
      const logLinesDb = logLines.filter(l => l.includes('[db]'));
      const logLinesBatch = logLines.filter(l => l.includes('[batch]'));

      assert.ok(logLinesTrace.length === 0);
      assert.ok(logLinesRequests.length === 2);
      assert.ok(logLinesDb.length > 0);
      assert.ok(logLinesBatch.length > 0);
    });

    it('batch - logging for specific status (401), status match', async function () {
        await setLogLvl(client, { channels: ['db', 'requests', 'batch'], statuses: [ 401 ] });
        const inspect = stdout.inspect();
  
        const batch = [
            [{
                "href": '/cities/38002',
                "verb": "GET"
            },
            {
                "href": '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d',
                "verb": "GET"
            }
            ]
        ]

        const {
          headers,
          body
        } = await client.request({ path: '/batch'
                          , method: 'PUT'
                          , headers: {
                                'Content-type': 'application/json; charset=utf-8',
                                'Request-Server-Timing': true,
                            }
                          , body: JSON.stringify(batch) });
  
        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }
  
        const reqID = headers['vsko-req-id'];
  
        inspect.restore();
        const logLines = inspect.output
  
        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));
        const logLinesBatch = logLines.filter(l => l.includes('[batch]'));
  
        assert.ok(logLinesTrace.length === 0);
        assert.ok(logLinesRequests.length === 2);
        assert.ok(logLinesDb.length > 0);
        assert.ok(logLinesBatch.length > 0);
      });

      it('batch - logging for specific status (401), no status match', async function () {
        await setLogLvl(client, { channels: ['db', 'requests', 'batch'], statuses: [ 401 ]  });
        const inspect = stdout.inspect();
  
        const batch = [
          [{ "href": '/cities/38002'
          , "verb": "GET"
          }]
        ]
  
        const {
          headers,
          body
        } = await client.request({ path: '/batch'
                          , method: 'PUT'
                          , headers: {
                                'Content-type': 'application/json; charset=utf-8',
                                'Request-Server-Timing': true,
                            }
                          , body: JSON.stringify(batch) });
  
        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }
  
        const reqID = headers['vsko-req-id'];
  
        inspect.restore();
        const logLines = inspect.output
  
        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));
        const logLinesBatch = logLines.filter(l => l.includes('[batch]'));
  
        assert.ok(logLinesTrace.length === 0);
        assert.ok(logLinesRequests.length === 0);
        assert.ok(logLinesDb.length === 0);
        assert.ok(logLinesBatch.length === 0);
      });

    it('batch - streaming', async function () {
        await setLogLvl(client, { channels: ['db', 'requests', 'batch'] });
        const inspect = stdout.inspect();

        const batch = [
          [{ "href": '/cities/38002'
          , "verb": "GET"
          }]
        ]

        const {
          headers,
          trailers,
          body
        } = await client.request({ path: '/batch_streaming'
                          , method: 'PUT'
                          , headers: {
                                'Content-type': 'application/json; charset=utf-8',
                                'Request-Server-Timing': true,
                            }
                          , body: JSON.stringify(batch) });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }
        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output
  
        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));
        const logLinesBatch = logLines.filter(l => l.includes('[batch]'));
  
        assert.ok(logLinesTrace.length === 0);
        assert.ok(logLinesRequests.length === 2);
        assert.ok(logLinesDb.length > 0);
        assert.ok(logLinesBatch.length > 0);
      });


    it('batch - streaming - logging for specific status (401), status match', async function () {
        await setLogLvl(client, { channels: ['db', 'requests', 'batch'], statuses: [ 401 ]  });
        const inspect = stdout.inspect();

        const batch = [
            [{
                "href": '/cities/38002',
                "verb": "GET"
            },
            {
                "href": '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d',
                "verb": "GET"
            }
            ]
        ]

        const {
          headers,
          trailers,
          body
        } = await client.request({ path: '/batch_streaming'
                          , method: 'PUT'
                          , headers: {
                                'Content-type': 'application/json; charset=utf-8',
                                'Request-Server-Timing': true,
                            }
                          , body: JSON.stringify(batch) });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }
        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output
  
        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));
        const logLinesBatch = logLines.filter(l => l.includes('[batch]'));
  
        assert.ok(logLinesTrace.length === 0);
        assert.ok(logLinesRequests.length === 2);
        assert.ok(logLinesDb.length > 0);
        assert.ok(logLinesBatch.length > 0);
      });

      it('batch - streaming - logging for specific status (401), no status match', async function () {
        await setLogLvl(client, { channels: ['db', 'requests', 'batch'], statuses: [ 401 ]  });
        const inspect = stdout.inspect();

        const batch = [
            [{
                "href": '/cities/38002',
                "verb": "GET"
            }
            ]
        ]

        const {
          headers,
          trailers,
          body
        } = await client.request({ path: '/batch_streaming'
                          , method: 'PUT'
                          , headers: {
                                'Content-type': 'application/json; charset=utf-8',
                                'Request-Server-Timing': true,
                            }
                          , body: JSON.stringify(batch) });

        const bufArr:any[] = []
        for await (const data of body) {
            bufArr.push(data);
        }
        const reqID = headers['vsko-req-id'];

        inspect.restore();
        const logLines = inspect.output
  
        const logLinesTrace = logLines.filter(l => l.includes('[trace]'));
        const logLinesRequests = logLines.filter(l => l.includes('[requests]'));
        const logLinesDb = logLines.filter(l => l.includes('[db]'));
        const logLinesBatch = logLines.filter(l => l.includes('[batch]'));

        assert.ok(logLinesTrace.length === 0);
        assert.ok(logLinesRequests.length === 0);
        assert.ok(logLinesDb.length === 0);
        assert.ok(logLinesBatch.length === 0);
      });

  });
};