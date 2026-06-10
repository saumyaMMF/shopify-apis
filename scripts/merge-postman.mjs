#!/usr/bin/env node
// Merge two Postman collections.
// Union of requests by (method + normalized URL path). For overlaps, prefer the one
// with non-empty `response` array (saved examples win).
import fs from 'node:fs';
import path from 'node:path';

// Prefer with-examples (has captures injected). Fall back to base.
const WX = path.resolve('docs/Shopify Dashboard API.with-examples.postman_collection.json');
const BASE = path.resolve('docs/Shopify Dashboard API.postman_collection.json');
const A = fs.existsSync(WX) ? WX : BASE;
const B = process.argv[2] ?? path.resolve('C:/Users/Saumya/Downloads/Shopify Dashboard API Copy.postman_collection.json');
const OUT = path.resolve('docs/Shopify Dashboard API.merged.postman_collection.json');

if (!fs.existsSync(A)) { console.error('missing A:', A); process.exit(1); }
if (!fs.existsSync(B)) { console.error('missing B:', B); process.exit(1); }

const a = JSON.parse(fs.readFileSync(A, 'utf8'));
const b = JSON.parse(fs.readFileSync(B, 'utf8'));

function getRawUrl(req) {
  if (!req) return '';
  if (typeof req.url === 'string') return req.url;
  return req.url?.raw ?? '';
}

function normalizeUrl(u) {
  if (!u) return '';
  // strip protocol & host placeholders; drop query string for matching
  const noQuery = u.split('?')[0].trim();
  // collapse {{base_url}} variants
  return noQuery.replace(/^\{\{base_url\}\}/, '').replace(/\/+$/, '').toLowerCase();
}

function pathPattern(p) {
  return normalizeUrl(p)
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/g, '/:id')
    .replace(/\/\d{5,}/g, '/:id')
    .replace(/\/gid:[^/]+/g, '/:gid');
}

function leafKey(req) {
  return `${(req.request?.method ?? 'GET').toUpperCase()} ${pathPattern(getRawUrl(req.request))}`;
}

// Walk collection → flatten to {parents:[folder names], leaf:requestNode}
function flatten(items, parents = [], out = []) {
  for (const it of items ?? []) {
    if (it.item) flatten(it.item, [...parents, it.name], out);
    else if (it.request) out.push({ parents, node: it });
  }
  return out;
}

const aLeaves = flatten(a.item);
const bLeaves = flatten(b.item);

// Build map: key → {fromA, fromB}
const map = new Map();
for (const l of aLeaves) {
  const k = leafKey(l.node);
  map.set(k, { a: l });
}
for (const l of bLeaves) {
  const k = leafKey(l.node);
  const cur = map.get(k) ?? {};
  cur.b = l;
  map.set(k, cur);
}

// Pick winner per key
let aOnly = 0, bOnly = 0, both = 0, examplesFromA = 0, examplesFromB = 0;
const picked = new Map(); // key → { parents, node }
for (const [k, v] of map.entries()) {
  if (v.a && v.b) {
    both++;
    // Always use A's parents (canonical structure). Graft B's responses onto A's node.
    const aResp = v.a.node.response ?? [];
    const bResp = v.b.node.response ?? [];
    const seen = new Set();
    const merged = [];
    for (const r of [...aResp, ...bResp]) {
      const id = (r.name ?? '') + '|' + (r.code ?? '');
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(r);
    }
    if (bResp.length > 0) examplesFromB++;
    if (aResp.length > 0) examplesFromA++;
    // Prefer B's request body/headers if A has placeholders only? Keep A's request, attach merged responses.
    const node = { ...v.a.node, response: merged };
    picked.set(k, { parents: v.a.parents, node });
  } else if (v.a) {
    aOnly++;
    picked.set(k, v.a);
  } else {
    bOnly++;
    picked.set(k, v.b);
  }
}

// Rebuild folder tree using parents lists (preserve A's order; append B-only at end of best-match folder)
function ensureFolder(root, parents) {
  let cursor = root;
  for (const name of parents) {
    let next = cursor.item.find((x) => x.item && x.name === name);
    if (!next) {
      next = { name, item: [] };
      cursor.item.push(next);
    }
    cursor = next;
  }
  return cursor;
}

const out = {
  info: { ...a.info, name: a.info?.name ?? 'Shopify Dashboard API' },
  item: [],
  variable: [],
};

// Preserve A's top-level structure first
function copyShellFromA(items) {
  return (items ?? []).map((x) => {
    if (x.item) return { name: x.name, description: x.description, item: copyShellFromA(x.item) };
    return null;
  }).filter(Boolean);
}
out.item = copyShellFromA(a.item);

// Now place each picked leaf into its parent path
for (const { parents, node } of picked.values()) {
  const folder = ensureFolder(out, parents);
  // dedupe by leafKey within folder (in case shell already has placeholder)
  const k = leafKey(node);
  folder.item = folder.item.filter((x) => x.item || leafKey(x) !== k);
  folder.item.push(node);
}

// Merge collection-level variables (union by key)
const vars = new Map();
for (const v of [...(a.variable ?? []), ...(b.variable ?? [])]) {
  if (!vars.has(v.key)) vars.set(v.key, v);
  else {
    const cur = vars.get(v.key);
    if (!cur.value && v.value) vars.set(v.key, v); // prefer one w/ value
  }
}
out.variable = [...vars.values()];

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

console.log(`A leaves: ${aLeaves.length}`);
console.log(`B leaves: ${bLeaves.length}`);
console.log(`both:     ${both}    (A had ex: ${examplesFromA}, B had ex: ${examplesFromB})`);
console.log(`A only:   ${aOnly}`);
console.log(`B only:   ${bOnly}`);
console.log(`total in output: ${picked.size}`);
console.log(`→ ${OUT}`);
