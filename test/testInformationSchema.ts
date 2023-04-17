import assert from 'assert';
import { IDatabase } from 'pg-promise';
import { debug } from '../js/common';
import { informationSchema } from '../js/informationSchema';

import * as context from './context';

module.exports = function (_db: IDatabase<unknown>) {
  describe('Information Schema', () => {
    // eslint-disable-next-line prefer-arrow-callback
    it('should correctly show text columns', async function () {
      const configuration = context.getConfiguration();
      const db = null as unknown as IDatabase<unknown>; 
      // Db is not needed in the call informationSchema
      // as the informationSchema will already have its
      // data cached after startup of test sri4node server.
      const is = await informationSchema(db, configuration);
      const { type } = is['/communities'].zipcode;
      debug('mocha', `type : ${type}`);
      assert.equal(type, 'text');
    });
  });
};
