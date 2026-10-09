// Removes CSS rules whose selectors only target classes that no template, script or PHP file uses.
// Selector lists keep their used selectors. Handles @media and @supports blocks; leaves other at-rules alone.
// Usage: node tools/css-prune.mjs resources/css/main.css resources/css/theme.css   (then run prettier)
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = process.argv.slice(2);
const source = ['templates', 'resources/js', 'src']
  .flatMap((d) => execSync(`git ls-files ${d}`).toString().trim().split('\n'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');
const used = (cls) => source.includes(cls);
// Classes inside :is(), :not() and friends are ignored, so a selector list there never removes the rule.
const selectorUsed = (sel) => [...sel.replace(/\([^)]*\)/g, '').matchAll(/\.([a-zA-Z][\w-]*)/g)].every((m) => used(m[1]));

/** Splits a selector list on top-level commas only. */
function splitSelectors(text) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let k = 0; k < text.length; k++) {
    if (text[k] === '(') depth++;
    else if (text[k] === ')') depth--;
    else if (text[k] === ',' && depth === 0) {
      parts.push(text.slice(start, k));
      start = k + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

function prune(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) {
      out += css.slice(i);
      break;
    }
    const prelude = css.slice(i, open);
    // find the matching close brace
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const body = css.slice(open + 1, j - 1);
    const head = prelude.trim();
    if (/^@(media|supports)/.test(head.replace(/^\/\*[\s\S]*?\*\/\s*/, ''))) {
      const inner = prune(body);
      if (inner.trim()) out += `${prelude}{${inner}}`;
      else out += prelude.replace(/[^\n]*$/, '');
    } else if (head.startsWith('@') || head.includes('@')) {
      out += css.slice(i, j);
    } else {
      const comment = prelude.match(/^[\s\S]*\*\//)?.[0] ?? '';
      const selText = prelude.slice(comment.length);
      const selectors = splitSelectors(selText);
      const keep = selectors.filter(selectorUsed);
      if (keep.length) out += `${comment}\n${keep.join(',\n')} {${body}}`;
      else if (comment.trim()) out += comment;
    }
    i = j;
  }
  return out;
}

for (const f of files) {
  const before = readFileSync(f, 'utf8');
  const after = prune(before);
  writeFileSync(f, after);
  console.log(`${f}: ${before.length} -> ${after.length} bytes`);
}
