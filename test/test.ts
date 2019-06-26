import { expect, tap } from '@pushrocks/tapbundle';
import * as csvSpendesk from '../ts/index';

tap.test('first test', async () => {
  console.log(csvSpendesk.standardExport);
})

tap.start();
