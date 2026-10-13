import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const tests=readdirSync('tests').filter(f=>f.endsWith('.test.mjs')&&f!=='http.test.mjs').map(f=>'tests/'+f);
const result=spawnSync(process.execPath,['--experimental-strip-types','--test',...tests,'tests/domain.test.ts'],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
