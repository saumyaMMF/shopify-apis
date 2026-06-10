#!/usr/bin/env node
// Hit every API endpoint, report pass/fail.
// Usage: node scripts/test-all-apis.mjs

const BASE = process.env.API_URL || 'http://localhost:4000/api';
const EMAIL = 'admin@example.com';
const PASS = 'Admin@12345';

const C = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', n: '\x1b[0m', b: '\x1b[1m' };
const results = [];
let token = '';
let createdIds = {};

async function call(label, method, path, opts = {}) {
  const url = `${BASE}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token && !opts.noAuth) headers.Authorization = `Bearer ${token}`;
  const init = { method, headers };
  if (opts.body) init.body = JSON.stringify(opts.body);

  let status = 0, text = '', err = null;
  try {
    const res = await fetch(url, init);
    status = res.status;
    text = await res.text();
  } catch (e) { err = e.message; }

  const pass = err ? false : (opts.expect ? opts.expect.includes(status) : status >= 200 && status < 400);
  const symbol = pass ? `${C.g}✓${C.n}` : `${C.r}✗${C.n}`;
  const statusColor = pass ? C.g : (status >= 400 && status < 500 ? C.y : C.r);
  console.log(`${symbol} ${C.b}${method.padEnd(6)}${C.n} ${path.padEnd(45)} ${statusColor}${status || 'ERR'}${C.n} ${C.d}${label}${C.n}${err ? ` ${C.r}${err}${C.n}` : ''}`);
  results.push({ label, method, path, status, pass });
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status, json, text };
}

async function section(title) { console.log(`\n${C.b}━━ ${title} ━━${C.n}`); }

async function main() {
  console.log(`${C.b}Testing ${BASE}${C.n}\n`);

  // ============ AUTH ============
  await section('1. Auth');
  const login = await call('Login', 'POST', '/auth/login', { body: { email: EMAIL, password: PASS }, noAuth: true });
  token = login.json?.accessToken || '';
  if (!token) { console.log(`${C.r}No token — abort${C.n}`); process.exit(1); }

  await call('Me', 'GET', '/auth/me');
  await call('Refresh (no cookie)', 'POST', '/auth/refresh', { noAuth: true, expect: [401, 500] });
  // skip logout (would invalidate)

  // ============ USERS ============
  await section('2. Users');
  await call('List users', 'GET', '/users');
  await call('Create user (bad role)', 'POST', '/users', { body: { email: 'temp@x.com', password: 'Temp@1234', firstName: 'T', lastName: 'X', roleId: '00000000-0000-0000-0000-000000000000' }, expect: [400, 404, 409, 500] });

  // ============ CATALOG ============
  await section('3. Products');
  await call('List products', 'GET', '/products');
  await call('List products (search)', 'GET', '/products?q=snowboard&take=5');
  const createProd = await call('Create product (Shopify)', 'POST', '/products', { body: { title: 'AutoTest Product', status: 'DRAFT' } });
  if (createProd.json?.id) createdIds.productGid = createProd.json.id;

  await section('4. Collections');
  await call('List collections', 'GET', '/collections');

  // ============ INVENTORY ============
  await section('5. Inventory');
  await call('List levels', 'GET', '/inventory/levels');
  await call('Adjust inventory', 'POST', '/inventory/adjust', { body: { inventoryItemId: '1', locationId: 'bad', delta: 1, reason: 'test' }, expect: [200, 201, 400, 500] });
  await call('Alerts', 'GET', '/inventory/alerts');

  // ============ ORDERS ============
  await section('6. Orders');
  await call('List orders', 'GET', '/orders');

  // ============ CUSTOMERS ============
  await section('7. Customers');
  await call('List customers', 'GET', '/customers');
  await call('List segments', 'GET', '/customers/segments/list');

  // ============ VENDORS ============
  await section('8. Vendors');
  await call('List vendors', 'GET', '/vendors');
  const vendor = await call('Create vendor', 'POST', '/vendors', { body: { name: 'AutoTest Vendor', email: 'v@test.com', paymentTerms: 'NET-30' } });
  if (vendor.json?.id) createdIds.vendorId = vendor.json.id;
  if (createdIds.vendorId) {
    await call('Get vendor', 'GET', `/vendors/${createdIds.vendorId}`);
    await call('Update vendor', 'PATCH', `/vendors/${createdIds.vendorId}`, { body: { paymentTerms: 'NET-45' } });
  }

  // ============ PURCHASE ORDERS ============
  await section('9. Purchase Orders');
  await call('List POs', 'GET', '/purchase-orders');
  if (createdIds.vendorId) {
    const po = await call('Create PO', 'POST', '/purchase-orders', {
      body: {
        vendorId: createdIds.vendorId,
        locationId: 'loc-test',
        notes: 'auto test',
        items: [{ variantId: 'v1', sku: 'SKU-AT-1', title: 'Auto Item', qty: 10, unitCost: 5 }],
      },
    });
    if (po.json?.id) {
      createdIds.poId = po.json.id;
      await call('Get PO', 'GET', `/purchase-orders/${createdIds.poId}`);
      await call('Submit PO', 'PATCH', `/purchase-orders/${createdIds.poId}/submit`);
      await call('Approve PO (self-approve blocked)', 'PATCH', `/purchase-orders/${createdIds.poId}/approve`, { expect: [403] });
    }
  }

  // ============ GOODS RECEIPTS ============
  await section('10. Goods Receipts');
  await call('List receipts', 'GET', '/goods-receipts');

  // ============ CMS ============
  await section('11. CMS');
  await call('List blocks', 'GET', '/cms');
  await call('Upsert block', 'POST', '/cms', { body: { type: 'HERO_BANNER', handle: 'autotest-hero', data: { title: 'Auto', subtitle: 'Test' } } });

  // ============ MEDIA ============
  await section('12. Media');
  await call('List media', 'GET', '/media');
  await call('Staged upload (Shopify)', 'POST', '/media/staged-upload', { body: { filename: 'auto.png', mimeType: 'image/png' } });

  // ============ REPORTS ============
  await section('13. Reports');
  await call('Sales report (Shopify)', 'GET', '/reports/sales?since=-7d&until=today');
  await call('Inventory report', 'GET', '/reports/inventory');
  await call('Vendor spend', 'GET', '/reports/vendors');

  // ============ SETTINGS ============
  await section('14. Settings');
  await call('List settings', 'GET', '/settings');
  await call('Set setting', 'PUT', '/settings/test.key', { body: { value: 'autotest' } });
  await call('Get setting', 'GET', '/settings/test.key');

  // ============ AUDIT ============
  await section('15. Audit logs');
  await call('List audit logs', 'GET', '/audit-logs');

  // ============ SUMMARY ============
  console.log(`\n${C.b}━━ Summary ━━${C.n}`);
  const total = results.length;
  const pass = results.filter(r => r.pass).length;
  const fail = total - pass;
  console.log(`Total : ${total}`);
  console.log(`${C.g}Pass  : ${pass}${C.n}`);
  console.log(`${C.r}Fail  : ${fail}${C.n}`);

  if (fail) {
    console.log(`\n${C.r}Failures:${C.n}`);
    results.filter(r => !r.pass).forEach(r => {
      console.log(`  ${C.r}✗${C.n} ${r.method} ${r.path} → ${r.status}`);
    });
  }

  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
