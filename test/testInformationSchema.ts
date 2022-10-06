import * as assert from 'assert';
import { debug, pgConnect } from '../js/common';
import { informationSchema } from '../js/informationSchema';

import * as context from './context';

module.exports = function () {
  describe('Information Schema', () => {
    // eslint-disable-next-line prefer-arrow-callback
    it('should correctly show text columns', async function () {
      const configuration = context.getConfiguration();
      const db = await pgConnect(configuration);
      const is = await informationSchema(db, configuration);
      const { type } = is['/communities'].zipcode;
      debug('mocha', `type : ${type}`);
      assert.equal(type, 'text');
    });
  });
};
