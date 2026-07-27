/*
 * verify-seo.js — checks structured data, titles, meta descriptions,
 * tag balance and internal links across the main site pages.
 *
 * Run:  node verify-seo.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PAGES = [
    'index.html',
    'about/index.html',
    'services/index.html',
    'services/facebook-ads/index.html',
    'services/google-ads/index.html',
    'services/pr-press/index.html',
    'services/ecommerce-website/index.html',
    'services/ai-software/index.html',
    'services/cro/index.html',
    'case-studies/index.html',
    'case-study/herban-bud/index.html',
    'case-study/burger/index.html',
    'ecommerce-blueprint/index.html',
    'portfolio/index.html',
    'press/index.html',
    'team/index.html'
];
const SERVICE_PAGES = PAGES.filter(p => p.startsWith('services/') && p !== 'services/index.html');
const STRICT_META = ['index.html', ...SERVICE_PAGES]; // title <=60 + desc 120-160 enforced here
const LINK_WHITELIST = ['/blog', '/blog/']; // ships right after this changeset

let failures = 0;
const fail = (page, msg) => { failures++; console.log(`FAIL  ${page}: ${msg}`); };
const ok = (msg) => console.log(`  ok  ${msg}`);

function extractBlocks(html) {
    const blocks = [];
    const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
    let m;
    while ((m = re.exec(html))) blocks.push(m[1]);
    return blocks;
}

function typesIn(node, acc) {
    if (!node || typeof node !== 'object') return acc;
    if (node['@type']) acc.push(node['@type']);
    for (const k of Object.keys(node)) {
        const v = node[k];
        if (Array.isArray(v)) v.forEach(x => typesIn(x, acc));
        else if (v && typeof v === 'object') typesIn(v, acc);
    }
    return acc;
}

/* simple tag-balance check for structural tags (ignores void elements) */
function tagBalance(html) {
    const VOID = new Set(['meta', 'link', 'img', 'br', 'hr', 'input', 'source', 'area', 'base', 'col', 'embed', 'track', 'wbr']);
    const noScripts = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
    const stack = [];
    const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
    let m;
    while ((m = re.exec(noScripts))) {
        const tag = m[1].toLowerCase();
        if (VOID.has(tag) || /\/\s*>$/.test(m[0]) || m[0].startsWith('<!')) continue;
        if (m[0][1] === '/') {
            if (stack.length && stack[stack.length - 1] === tag) stack.pop();
            else return `unmatched closing </${tag}>`;
        } else {
            stack.push(tag);
        }
    }
    return stack.length ? `unclosed <${stack[stack.length - 1]}> (${stack.length} open)` : null;
}

const titles = {};
const allHrefs = new Map(); // page -> hrefs

for (const rel of PAGES) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) { fail(rel, 'file missing'); continue; }
    const html = fs.readFileSync(full, 'utf8');

    // 1. ld+json parse + @context/@type shape
    const blocks = extractBlocks(html);
    if (!blocks.length) fail(rel, 'no ld+json blocks found');
    const types = [];
    for (const b of blocks) {
        try {
            const parsed = JSON.parse(b);
            if (parsed['@context'] !== 'https://schema.org') fail(rel, 'ld+json missing @context https://schema.org');
            if (!parsed['@type'] && !parsed['@graph']) fail(rel, 'ld+json missing @type/@graph');
            types.push(...typesIn(parsed, []));
        } catch (e) {
            fail(rel, `ld+json does not parse: ${e.message}`);
        }
    }
    ok(`${rel} — ${blocks.length} ld+json block(s) parse; types: ${[...new Set(types)].join(', ')}`);

    // required types
    if (SERVICE_PAGES.includes(rel)) {
        if (!types.includes('Service')) fail(rel, 'missing Service schema');
        if (!types.includes('FAQPage')) fail(rel, 'missing FAQPage schema');
        if (!types.includes('BreadcrumbList')) fail(rel, 'missing BreadcrumbList schema');
    }
    if (!types.includes('Organization')) fail(rel, 'missing Organization schema (shared chrome)');

    // 2. title/meta
    const t = html.match(/<title>([^<]*)<\/title>/);
    const d = html.match(/<meta name="description" content="([^"]*)">/);
    if (!t) fail(rel, 'missing <title>');
    else {
        if (titles[t[1]]) fail(rel, `duplicate title also used by ${titles[t[1]]}`);
        titles[t[1]] = rel;
        if (STRICT_META.includes(rel) && t[1].length > 60) fail(rel, `title ${t[1].length} chars > 60: "${t[1]}"`);
    }
    if (!d) fail(rel, 'missing meta description');
    else if (STRICT_META.includes(rel) && (d[1].length < 120 || d[1].length > 160)) {
        fail(rel, `meta description ${d[1].length} chars (need 120-160): "${d[1]}"`);
    }

    // 3. tag balance
    const tb = tagBalance(html);
    if (tb) fail(rel, `tag balance: ${tb}`);

    // collect internal hrefs
    const hrefs = [];
    const re2 = /href="(\/[^"#]*)[^"]*"/g;
    let m2;
    while ((m2 = re2.exec(html))) hrefs.push(m2[1]);
    allHrefs.set(rel, hrefs);
}

// 4. internal link targets exist
const checked = new Set();
for (const [page, hrefs] of allHrefs) {
    for (const h of hrefs) {
        if (LINK_WHITELIST.includes(h)) continue;
        const clean = h.replace(/\/$/, '');
        if (checked.has(clean)) continue;
        checked.add(clean);
        const asDir = path.join(ROOT, clean, 'index.html');
        const asFile = path.join(ROOT, clean);
        if (!fs.existsSync(asDir) && !fs.existsSync(asFile)) {
            fail(page, `broken internal link: ${h}`);
        }
    }
}

console.log('\n--- titles ---');
for (const [t, p] of Object.entries(titles)) console.log(`${String(t.length).padStart(3)}  ${t}  (${p})`);

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
