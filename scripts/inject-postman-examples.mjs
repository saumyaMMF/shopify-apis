#!/usr/bin/env node
// Read all captured responses and inject them as "examples" into Postman collection.
// Output: docs/Shopify Dashboard API.with-examples.postman_collection.json
import fs from 'node:fs';
import path from 'node:path';

const SRC_COLLECTION = path.resolve('docs/Shopify Dashboard API.postman_collection.json');
const CAPTURES_DIR = path.resolve('docs/api-responses');
const OUT_COLLECTION = path.resolve('docs/Shopify Dashboard API.with-examples.postman_collection.json');

// Mapping: capture file path → Postman request lookup hint (method + URL pattern)
// We walk capture dirs, read request.method + request.url from each json file,
// then find a matching Postman request anywhere in the collection tree.

function loadCaptures() {
  const captures = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (data?.request?.method && data?.request?.url) {
            captures.push({ file: p, ...data });
          }
        } catch {}
      }
    }
  }
  walk(CAPTURES_DIR);
  return captures;
}

function normalizeUrl(u) {
  // Strip query string + collapse double slashes
  if (!u) return '';
  const noQuery = u.split('?')[0];
  return noQuery.replace(/^\/+/, '/').replace(/\/+$/, '');
}

function pathPattern(p) {
  // Convert /vendors/abc-uuid → /vendors/:id   (rough heuristic)
  return normalizeUrl(p).replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/g, '/:id')
                        .replace(/\/\d{5,}/g, '/:id')
                        .replace(/\/gid:[^/]+/g, '/:gid');
}

function getRequestUrl(req) {
  if (typeof req.url === 'string') return req.url;
  if (req.url?.raw) return req.url.raw;
  return '';
}

function walkRequests(items, parents = [], cb) {
  for (const it of items) {
    if (it.item) walkRequests(it.item, [...parents, it.name], cb);
    else if (it.request) cb(it, parents);
  }
}

function buildExample(name, cap) {
  const reqUrl = cap.request.url;
  const fullUrl = `{{base_url}}${reqUrl}`;
  const body = typeof cap.response.body === 'string'
    ? cap.response.body
    : JSON.stringify(cap.response.body, null, 2);
  const statusText = statusCodeText(cap.response.status);

  return {
    name,
    originalRequest: {
      method: cap.request.method,
      header: [
        { key: 'Content-Type', value: 'application/json' },
        ...(cap.request.headers?.Authorization
          ? [{ key: 'Authorization', value: 'Bearer {{access_token}}' }]
          : []),
      ],
      ...(cap.request.body
        ? { body: { mode: 'raw', raw: JSON.stringify(cap.request.body, null, 2), options: { raw: { language: 'json' } } } }
        : {}),
      url: {
        raw: fullUrl,
        host: ['{{base_url}}'],
        path: reqUrl.split('?')[0].split('/').filter(Boolean),
      },
    },
    status: statusText,
    code: cap.response.status,
    _postman_previewlanguage: 'json',
    header: [{ key: 'Content-Type', value: 'application/json' }],
    cookie: [],
    body,
  };
}

function statusCodeText(c) {
  const m = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request',
    401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict',
    500: 'Internal Server Error' };
  return m[c] ?? 'Response';
}

function main() {
  if (!fs.existsSync(SRC_COLLECTION)) { console.error('Collection not found:', SRC_COLLECTION); process.exit(1); }
  if (!fs.existsSync(CAPTURES_DIR)) { console.error('Captures not found:', CAPTURES_DIR); process.exit(1); }

  const collection = JSON.parse(fs.readFileSync(SRC_COLLECTION, 'utf8'));
  const captures = loadCaptures();
  console.log(`Loaded ${captures.length} captures`);

  // Build lookup index: method + path pattern → captures
  const idx = new Map();
  for (const cap of captures) {
    const key = `${cap.request.method} ${pathPattern(cap.request.url)}`;
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push(cap);
  }

  let matched = 0, unmatched = 0;
  walkRequests(collection.item, [], (item) => {
    const method = item.request?.method ?? 'GET';
    const rawUrl = getRequestUrl(item.request);
    // Strip {{base_url}} prefix
    const itemPath = rawUrl.replace(/\{\{base_url\}\}/, '');
    const key = `${method} ${pathPattern(itemPath)}`;
    const candidates = idx.get(key);
    if (candidates?.length) {
      const cap = candidates[0]; // first match
      const example = buildExample(`${item.name} — captured`, cap);
      item.response = item.response ?? [];
      // Replace any existing auto-injected example
      item.response = item.response.filter(r => !r.name?.endsWith('— captured'));
      item.response.push(example);
      matched++;
    } else {
      unmatched++;
    }
  });

  fs.writeFileSync(OUT_COLLECTION, JSON.stringify(collection, null, 2));
  console.log(`✓ Matched: ${matched}`);
  console.log(`⚠ Unmatched: ${unmatched}`);
  console.log(`→ Written: ${OUT_COLLECTION}`);
}

main();
