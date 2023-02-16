import { assert } from 'chai';
import * as sri4node from '..';
import * as context from './context';
import * as informationSchema from '../js/informationSchema';
import sinon from 'ts-sinon';

const sinonSandbox = sinon.createSandbox();


module.exports = (port, logdebug, dummyLogger) => {
  describe('Sri4node SCHEMA VALIDATION', function () {
    this.timeout(0)
    let server: any = null
    let sri4nodeInstance: any = null

    after(async () => {
      sinonSandbox.restore()
      console.log(
        'Stopping express server (was not stopped as we stubbed process.exit !).'
      )
      server && (await server.close());
      sri4nodeInstance && (await sri4nodeInstance.close());
      // InformationSchema caches its configuration and next test will need other configuration -> clear cache
      informationSchema.clearCache();
      console.log('Done.')
    })

    it('sri4node should exit with an invalid schema', async function () {
      const consoleSpy = sinonSandbox.spy(console, 'error')
      const exitStub = sinonSandbox.stub(process, 'exit')
      ;({ server, sri4nodeInstance } = await context.serve(
        sri4node,
        port,
        logdebug,
        dummyLogger,
        ['./context/invalidSchema']
      ))
      assert.isTrue(exitStub.called, 'expected process.exit to be called')
      assert.isTrue(
        consoleSpy.calledWith(
          'Compiling JSON schema of /invalidschema failed:'
        ),
        'expected logging of schema compilation error'
      )
    })
  })

  describe('Sri4node CONFIG VALIDATION (1)', function () {
    this.timeout(0)
    let server: any = null
    let sri4nodeInstance: any = null

    after(async () => {
      sinonSandbox.restore()
      console.log(
        'Stopping express server (was not stopped as we stubbed process.exit !).'
      )
      server && (await server.close());
      sri4nodeInstance && (await sri4nodeInstance.close());
      // InformationSchema caches its configuration and next test will need other configuration -> clear cache
      informationSchema.clearCache();
      console.log('Done.')
    })

    it('sri4node should exit with invalid config (property case mismatch)', async function () {
      const consoleSpy = sinonSandbox.spy(console, 'error')
      const exitStub = sinonSandbox.stub(process, 'exit')
      ;({ server, sri4nodeInstance } = await context.serve(
        sri4node,
        port,
        logdebug,
        dummyLogger,
        ['./context/invalidConfig1']
      ))
      assert.isTrue(exitStub.called, 'expected process.exit to be called')
      assert.isTrue(
        consoleSpy.calledWith(
          `\n[CONFIGURATION PROBLEM] No database column found for property 'bAr' as specified in sriConfig of resource '/invalidconfig1'. It is probably a case mismatch because we did find a column named 'bar'instead.`
        ),
        'expected logging of mismatch between sri4node config and the database'
      )
    })
  })

  describe('Sri4node CONFIG VALIDATION (2)', function () {
    this.timeout(0)
    let server: any = null
    let sri4nodeInstance: any = null

    after(async () => {
      sinonSandbox.restore()
      console.log(
        'Stopping express server (was not stopped as we stubbed process.exit !).'
      )
      server && (await server.close());
      sri4nodeInstance && (await sri4nodeInstance.close());
      // InformationSchema caches its configuration and next test will need other configuration -> clear cache
      informationSchema.clearCache();
      console.log('Done.')
    })

    it('sri4node should exit with invalid config (missing property)', async function () {
      const consoleSpy = sinonSandbox.spy(console, 'error')
      const exitStub = sinonSandbox.stub(process, 'exit')
      ;({ server, sri4nodeInstance } = await context.serve(
        sri4node,
        port,
        logdebug,
        dummyLogger,
        ['./context/invalidConfig2']
      ))
      assert.isTrue(exitStub.called, 'expected process.exit to be called')
      assert.isTrue(
        consoleSpy.calledWith(
          `\n[CONFIGURATION PROBLEM] No database column found for property 'foo' as specified in sriConfig of resource '/invalidconfig2'. All available column names are $$meta.created, $$meta.deleted, $$meta.modified, $$meta.version, bar, key`
        ),
        'expected logging of mismatch between sri4node config and the database'
      )
    })
  })
}
