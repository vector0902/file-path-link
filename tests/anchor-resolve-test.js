// Unit test for findAnchorLine (pure function exported by extension.js).
// Run: node tests/anchor-resolve-test.js
const fs = require('fs');
const path = require('path');
const { findAnchorLine } = require('../extension.js');

const lines = fs.readFileSync(path.join(__dirname, 'sample-anchor.txt'), 'utf8').split('\n');

const cases = [
  ['heading token', 'sec-one', 4],
  ['heading token, upper case', 'SEC-ONE', 4],
  ['heading token, slug form', 'sec one', 4],
  ['second heading', 'sec-two', 7],
  ['item token beats prose mention', 'R-5', 8],
  ['item token, lower case', 'r-5', 8],
  ['second item token', 'R-8', 9],
  ['github-style L<n>', 'L3', 3],
  ['cjk heading token', '中文标题示例', 11],
  ['unknown token', 'nope', 0],
  ['empty token', '', 0],
];

let failed = 0;
for (const [name, token, want] of cases) {
  const got = findAnchorLine(lines, token);
  const ok = got === want;
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name} token=${JSON.stringify(token)} want=${want} got=${got}`);
}
console.log(failed ? `${failed} TEST(S) FAILED` : 'ALL ANCHOR TESTS PASSED');
process.exit(failed ? 1 : 0);
