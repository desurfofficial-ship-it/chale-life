/**
 * Test entry — imports every rules test suite, runs them all and throws
 * on any failure (non-zero exit for shell runners without process access).
 *
 * Local execution (nothing here is imported by the app build):
 *   rolldown src/rules/__tests__/run.ts --format esm --file dist-tests/run.mjs
 *   node dist-tests/run.mjs
 */

import './needs.test';
import './economy.test';
import './jobs.test';
import './housing.test';
import './firstLoop.test';
import { runAll } from './testKit';

const results = runAll();
const failed = results.filter((r) => !r.ok);

for (const r of results) {
  const mark = r.ok ? 'PASS' : 'FAIL';
  const line = `  ${mark}  ${r.suite} › ${r.name}`;
  if (r.ok) {
    console.log(line);
  } else {
    console.error(`${line}\n       ↳ ${r.error ?? 'unknown error'}`);
  }
}

console.log('');
console.log(`RULES TEST SUMMARY: ${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  throw new Error(`${failed.length} rule test(s) failed`);
}
