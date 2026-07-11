/*
 * Copies each product's real app screenshot (docs/screenshot*.png in the
 * source onetime-suite repo) into software-src/shots/<slug>.png, resolving
 * repo-name drift via shots-map.js. Run whenever new screenshots land.
 */
const fs = require('fs');
const path = require('path');
const products = require('./products.js');
const overrides = require('./shots-map.js');

const SUITE_ROOT = 'C:/Users/ADMIN/Desktop/onetime-suite';
const OUT_DIR = path.join(__dirname, 'shots');

let copied = 0;
let missing = [];

for (const p of products) {
  const folder = overrides[p.slug] || p.repo;
  const docsDir = path.join(SUITE_ROOT, folder, 'docs');
  let src = null;
  if (fs.existsSync(docsDir)) {
    const pngs = fs.readdirSync(docsDir).filter((f) => /^screenshot.*\.png$/i.test(f));
    if (pngs.length) src = path.join(docsDir, pngs.sort()[0]);
  }
  if (src) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.copyFileSync(src, path.join(OUT_DIR, `${p.slug}.png`));
    copied++;
  } else {
    missing.push(p.slug);
  }
}

console.log(`copied ${copied}/${products.length} screenshots`);
if (missing.length) console.log('missing:', missing.join(', '));
