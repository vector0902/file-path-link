// Automated check for the File Path Linker regex (mirror of extension.js RE).
// Run: node tests/run-regex-test.js [path-to-test-file]
const fs = require('fs');

// MUST stay in sync with extension.js
const RE = /(?<![A-Za-z0-9_./:])((?:\/[\w.\-]+)+|\.{1,2}\/[\w.\-\/]+|[A-Za-z0-9_][\w.\-\/]*\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|java|rs|rb|c|cc|cpp|h|hpp|php|sh|bash|zsh|json|jsonc|md|markdown|yml|yaml|toml|txt|log|xml|html|htm|css|scss|less|sql|lua|pl|r|kt|swift|dart|gradle|vue|svelte|csv|ini|cfg|conf)|[A-Za-z]:\\[^\s:]+|\.\\[\w.\-\\]+)(?::(\d+))?(?::(\d+))?/g;

function shouldMatch(line) {
  if (/^[.\/]/.test(line)) return true; // absolute / ./ / ../
  // bare relative filename.ext preceded by whitespace (simulates the negative lookbehind)
  return /\s[A-Za-z0-9_][\w.\-\/]*\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|java|rs|rb|c|cc|cpp|h|hpp|php|sh|bash|zsh|json|jsonc|md|markdown|yml|yaml|toml|txt|log|xml|html|htm|css|scss|less|sql|lua|pl|r|kt|swift|dart|gradle|vue|svelte|csv|ini|cfg|conf)\b/.test(' ' + line);
}

const file = process.argv[2] || __dirname + '/test_links.txt';
const lines = fs.readFileSync(file, 'utf8').split('\n');

let pass = true;
lines.forEach((line, i) => {
  RE.lastIndex = 0;
  const m = RE.exec(line);
  const matched = m ? m[0] : null;
  const exp = shouldMatch(line);
  const ok = (matched !== null) === exp;
  if (!ok) pass = false;
  console.log(`L${String(i + 1).padStart(2)}: match=${matched ? JSON.stringify(matched) : 'null'} expect=${exp} -> ${ok ? 'OK' : 'FAIL'} | ${line.slice(0, 60)}`);
});
console.log(pass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
process.exit(pass ? 0 : 1);
