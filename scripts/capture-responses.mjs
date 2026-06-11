#!/usr/bin/env node
// Hit every endpoint and save response JSON to docs/api-responses/<group>/<endpoint>.json
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.API_URL || 'http://localhost:4000/api';
const OUT = path.resolve('docs/api-responses');
fs.mkdirSync(OUT, { recursive: true });

let token = '';
const tracked = { vendorId: '', poId: '', poItemId: '', productGid: '', customerGid: '', userId: '', cmsId: '', pageId: '' };

const C = { g: '\x1b[32m', r: '\x1b[31m', d: '\x1b[2m', n: '\x1b[0m' };

async function save(group, name, method, p, opts = {}) {
  const url = `${BASE}${p}`;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token && !opts.noAuth) headers.Authorization = `Bearer ${token}`;
  const init = { method, headers };
  if (opts.body) init.body = JSON.stringify(opts.body);

  let status = 0, json = null, text = '', err = null;
  try {
    const res = await fetch(url, init);
    status = res.status;
    text = await res.text();
    try { json = JSON.parse(text); } catch {}
  } catch (e) { err = e.message; }

  const ok = !err && status >= 200 && status < 400;
  const dir = path.join(OUT, group);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.json`);
  const record = {
    request: {
      method,
      url: p,
      headers: opts.noAuth ? {} : { Authorization: 'Bearer <REDACTED>' },
      body: opts.body ?? null,
    },
    response: {
      status,
      ok,
      error: err,
      body: json ?? text,
    },
    capturedAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  };
  fs.writeFileSync(file, JSON.stringify(record, null, 2));
  console.log(`${ok ? C.g + '✓' : C.r + '✗'} ${C.n}${method.padEnd(6)} ${p.padEnd(48)} ${ok ? C.g : C.r}${status}${C.n} ${C.d}→ ${path.relative(process.cwd(), file)}${C.n}`);
  return json;
}

async function section(title) { console.log(`\n━━ ${title} ━━`); }

async function main() {
  console.log(`Capturing all endpoints from ${BASE}\nOutput: ${OUT}\n`);

  // ============ 1. Auth ============
  await section('1. Auth');
  const login = await save('01-auth', 'login', 'POST', '/auth/login', {
    body: { email: 'admin@example.com', password: 'Admin@12345' },
    noAuth: true,
  });
  token = login?.accessToken ?? '';
  if (!token) { console.log('No token — abort'); process.exit(1); }
  await save('01-auth', 'me', 'GET', '/auth/me');

  // ============ 2. Users ============
  await section('2. Users');
  await save('02-users', 'list', 'GET', '/users');

  // ============ 3. Roles & Permissions ============
  await section('3. Roles & Permissions');
  const roles = await save('03-roles', 'list-roles', 'GET', '/roles');
  if (roles?.[0]) await save('03-roles', 'get-role', 'GET', `/roles/${roles[0].id}`);
  await save('03-roles', 'list-permissions', 'GET', '/permissions');

  // ============ 4. Catalog - Products ============
  await section('4. Catalog - Products');
  const products = await save('04-products', 'list', 'GET', '/products?take=5');
  if (products?.items?.[0]) {
    await save('04-products', 'get', 'GET', `/products/${products.items[0].legacyResourceId}`);
    tracked.productGid = products.items[0].id;
  }
  const created = await save('04-products', 'create', 'POST', '/products', {
    body: { title: 'API Capture Test', status: 'DRAFT', vendor: 'Capture' },
  });
  if (created?.id) {
    await save('04-products', 'update', 'PATCH', `/products/${encodeURIComponent(created.id)}`, {
      body: { tags: ['captured'] },
    });
    await save('04-products', 'delete', 'DELETE', `/products/${encodeURIComponent(created.id)}`);
  }

  // ============ 5. Catalog - Collections ============
  await section('5. Catalog - Collections');
  const cols = await save('05-collections', 'list', 'GET', '/collections');
  if (cols?.[0]) await save('05-collections', 'get', 'GET', `/collections/${cols[0].legacyResourceId}`);

  // ============ 6. Inventory ============
  await section('6. Inventory');
  await save('06-inventory', 'levels', 'GET', '/inventory/levels?take=3');
  await save('06-inventory', 'locations', 'GET', '/inventory/locations');
  await save('06-inventory', 'alerts', 'GET', '/inventory/alerts');

  // ============ 7. Orders ============
  await section('7. Orders');
  const orders = await save('07-orders', 'list', 'GET', '/orders?take=3');
  if (orders?.items?.[0]) {
    await save('07-orders', 'get', 'GET', `/orders/${orders.items[0].legacyResourceId}`);
  }

  // ============ 8. Customers ============
  await section('8. Customers');
  const customers = await save('08-customers', 'list', 'GET', '/customers?take=3');
  if (customers?.items?.[0]) {
    await save('08-customers', 'get', 'GET', `/customers/${customers.items[0].legacyResourceId}`);
    tracked.customerGid = customers.items[0].id;
  }
  await save('08-customers', 'segments-list', 'GET', '/customers/segments/list');

  // ============ 9. Vendors ============
  await section('9. Vendors');
  await save('09-vendors', 'list', 'GET', '/vendors');
  const vendor = await save('09-vendors', 'create', 'POST', '/vendors', {
    body: { name: 'Capture Vendor', email: 'capture@v.com', paymentTerms: 'NET-30' },
  });
  if (vendor?.id) {
    tracked.vendorId = vendor.id;
    await save('09-vendors', 'get', 'GET', `/vendors/${vendor.id}`);
    await save('09-vendors', 'update', 'PATCH', `/vendors/${vendor.id}`, { body: { paymentTerms: 'NET-45' } });
  }

  // ============ 10. Purchase Orders ============
  await section('10. Purchase Orders');
  await save('10-po', 'list', 'GET', '/purchase-orders');
  if (tracked.vendorId) {
    const po = await save('10-po', 'create', 'POST', '/purchase-orders', {
      body: {
        vendorId: tracked.vendorId,
        locationId: 'loc-capture',
        notes: 'Captured PO',
        items: [{ variantId: 'v-cap', sku: 'CAP-1', title: 'Capture Item', qty: 10, unitCost: 5 }],
      },
    });
    if (po?.id) {
      tracked.poId = po.id;
      tracked.poItemId = po.items?.[0]?.id;
      await save('10-po', 'get', 'GET', `/purchase-orders/${po.id}`);
      await save('10-po', 'submit', 'PATCH', `/purchase-orders/${po.id}/submit`);
    }
  }

  // ============ 11. Goods Receipts ============
  await section('11. Goods Receipts');
  await save('11-gr', 'list', 'GET', '/goods-receipts');

  // ============ 12. CMS ============
  await section('12. CMS');
  await save('12-cms', 'list', 'GET', '/cms');
  const cms = await save('12-cms', 'upsert', 'POST', '/cms', {
    body: { type: 'HERO_BANNER', handle: 'captured-hero', data: { title: 'Captured', subtitle: 'demo' } },
  });
  if (cms?.id) await save('12-cms', 'get', 'GET', `/cms/${cms.id}`);

  // ============ 13. Themes & Banners ============
  await section('13. Themes & Banners');
  const themes = await save('13-themes', 'list', 'GET', '/themes');
  await save('13-themes', 'published', 'GET', '/themes/published');
  if (themes?.[0]) {
    await save('13-themes', 'assets', 'GET', `/themes/${themes[0].id.replace(/\D/g, '')}/assets`);
  }
  await save('13-themes', 'banners-from-theme', 'GET', '/banners/from-theme?template=index');
  await save('13-themes', 'banners-from-metaobjects', 'GET', '/banners/from-metaobjects?type=banner');

  // ============ 14. Pages & Policies ============
  await section('14. Pages & Policies');
  const pages = await save('14-pages', 'list', 'GET', '/pages?limit=10');
  if (pages?.[0]) await save('14-pages', 'get', 'GET', `/pages/${pages[0].id}`);
  await save('14-pages', 'list-policies', 'GET', '/policies');

  // ============ 15. Media ============
  await section('15. Media');
  await save('15-media', 'list', 'GET', '/media');

  // ============ 16. Reports ============
  await section('16. Reports');
  await save('16-reports', 'sales', 'GET', '/reports/sales?since=-7d&until=today');
  await save('16-reports', 'inventory', 'GET', '/reports/inventory');
  await save('16-reports', 'vendors', 'GET', '/reports/vendors');

  // ============ 17. Settings ============
  await section('17. Settings');
  await save('17-settings', 'list', 'GET', '/settings');
  await save('17-settings', 'set', 'PUT', '/settings/capture.test', { body: { value: 'demo' } });
  await save('17-settings', 'get', 'GET', '/settings/capture.test');

  // ============ 18. Audit ============
  await section('18. Audit');
  await save('18-audit', 'list', 'GET', '/audit-logs?take=10');

  // ============ 19. Shopify shops ============
  await section('19. Shopify Shops');
  await save('19-shops', 'list', 'GET', '/shopify/shops');

  // ============ 20. Storefront (public) ============
  await section('20. Storefront (Public)');
  await save('20-storefront', 'shop', 'GET', '/storefront/shop', { noAuth: true });
  await save('20-storefront', 'menu-footer', 'GET', '/storefront/menu/footer', { noAuth: true });
  await save('20-storefront', 'variant-by-options', 'POST', '/storefront/products/variant', {
    noAuth: true,
    body: { handle: 'the-complete-snowboard', selectedOptions: [{ name: 'Color', value: 'Ice' }] },
  });
  await save('20-storefront', 'search-products', 'GET', '/storefront/search?q=snowboard&sortKey=BEST_SELLING&first=5', { noAuth: true });
  await save('20-storefront', 'collection-filtered', 'POST', '/storefront/collections/filtered', {
    noAuth: true,
    body: { handle: 'hydrogen', first: 5, sortKey: 'PRICE', filters: [{ price: { min: 100, max: 2000 } }] },
  });
  await save('20-storefront', 'newsletter-signup', 'POST', '/storefront/newsletter', {
    noAuth: true,
    body: { email: `subscriber-${Date.now()}@yopmail.com`, firstName: 'Sub', acceptsMarketing: true },
  });
  await save('20-storefront', 'metaobjects-list', 'GET', '/storefront/metaobjects?type=banner&first=10', { noAuth: true });
  await save('20-storefront', 'metaobject', 'GET', '/storefront/metaobject?type=banner&handle=homepage-hero', { noAuth: true });
  await save('20-storefront', 'product-metafields', 'POST', '/storefront/products/the-complete-snowboard/metafields', {
    noAuth: true,
    body: { identifiers: [{ namespace: 'custom', key: 'spec' }, { namespace: 'custom', key: 'size_chart' }] },
  });
  await save('20-storefront', 'collection-metafields', 'POST', '/storefront/collections/hydrogen/metafields', {
    noAuth: true,
    body: { identifiers: [{ namespace: 'custom', key: 'hero' }] },
  });
  await save('20-storefront', 'shop-metafields', 'POST', '/storefront/shop/metafields', {
    noAuth: true,
    body: { identifiers: [{ namespace: 'custom', key: 'support_phone' }] },
  });
  await save('20-storefront', 'selling-plans', 'GET', '/storefront/products/selling-plans-ski-wax/selling-plans', { noAuth: true });
  await save('20-storefront', 'variant-store-availability', 'GET', `/storefront/variant/store-availability?variantId=${encodeURIComponent('gid://shopify/ProductVariant/52130746401069')}&first=5`, { noAuth: true });
  await save('20-storefront', 'payment-settings', 'GET', '/storefront/payment-settings', { noAuth: true });
  await save('20-storefront', 'policies', 'GET', '/storefront/policies', { noAuth: true });
  await save('20-storefront', 'menu', 'GET', '/storefront/menu/main-menu', { noAuth: true });
  await save('20-storefront', 'pages-list', 'GET', '/storefront/pages?first=10', { noAuth: true });
  await save('20-storefront', 'blogs-list', 'GET', '/storefront/blogs?first=10', { noAuth: true });
  await save('20-storefront', 'blog-news', 'GET', '/storefront/blogs/news?first=10', { noAuth: true });
  await save('20-storefront', 'search-suggest', 'GET', '/storefront/search/suggest?q=snowboard&limit=5', { noAuth: true });
  await save('20-storefront', 'recommendations', 'GET', '/storefront/recommendations?productId=' + encodeURIComponent('gid://shopify/Product/10291140034861') + '&intent=RELATED', { noAuth: true });
  await save('20-storefront', 'localization', 'GET', '/storefront/localization', { noAuth: true });
  const sfProducts = await save('20-storefront', 'products-list', 'GET', '/storefront/products?first=5', { noAuth: true });
  const sfHandle = sfProducts?.edges?.[0]?.node?.handle;
  const sfVariantId = sfProducts?.edges?.[0]?.node?.variants?.edges?.[0]?.node?.id;
  if (sfHandle) {
    const prod = await save('20-storefront', 'product-by-handle', 'GET', `/storefront/products/${encodeURIComponent(sfHandle)}`, { noAuth: true });
    if (!sfVariantId && prod?.variants?.edges?.[0]?.node?.id) {
      tracked.sfVariantId = prod.variants.edges[0].node.id;
    }
  }
  const variantId = sfVariantId ?? tracked.sfVariantId;
  const sfCols = await save('20-storefront', 'collections-list', 'GET', '/storefront/collections?first=5', { noAuth: true });
  const colHandle = sfCols?.edges?.[0]?.node?.handle;
  if (colHandle) {
    await save('20-storefront', 'collection-by-handle', 'GET', `/storefront/collections/${encodeURIComponent(colHandle)}?first=5`, { noAuth: true });
  }
  if (variantId) {
    const cart = await save('20-storefront', 'cart-create', 'POST', '/storefront/cart', {
      noAuth: true,
      body: { lines: [{ merchandiseId: variantId, quantity: 1 }] },
    });
    const cartId = cart?.id;
    if (cartId) {
      const q = `id=${encodeURIComponent(cartId)}`;
      await save('20-storefront', 'cart-get', 'GET', `/storefront/cart?${q}`, { noAuth: true });
      const added = await save('20-storefront', 'cart-lines-add', 'POST', `/storefront/cart/lines?${q}`, {
        noAuth: true,
        body: { lines: [{ merchandiseId: variantId, quantity: 1 }] },
      });
      const lineId = added?.lines?.edges?.[0]?.node?.id;
      if (lineId) {
        await save('20-storefront', 'cart-lines-update', 'PATCH', `/storefront/cart/lines?${q}`, {
          noAuth: true,
          body: { lines: [{ id: lineId, quantity: 3 }] },
        });
        await save('20-storefront', 'cart-lines-remove', 'DELETE', `/storefront/cart/lines?${q}`, {
          noAuth: true,
          body: { lineIds: [lineId] },
        });
      }
      await save('20-storefront', 'cart-buyer-identity-update', 'PATCH', `/storefront/cart/buyer-identity?${q}`, {
        noAuth: true,
        body: { email: 'buyer@example.com', countryCode: 'US' },
      });
      await save('20-storefront', 'cart-discount-codes-update', 'PATCH', `/storefront/cart/discount-codes?${q}`, {
        noAuth: true,
        body: { discountCodes: ['SAVE10'] },
      });
      await save('20-storefront', 'cart-note-update', 'PATCH', `/storefront/cart/note?${q}`, {
        noAuth: true,
        body: { note: 'Gift wrap please' },
      });
      await save('20-storefront', 'cart-attributes-update', 'PATCH', `/storefront/cart/attributes?${q}`, {
        noAuth: true,
        body: { attributes: [{ key: 'delivery_window', value: 'morning' }] },
      });
      await save('20-storefront', 'cart-gift-cards-update', 'PATCH', `/storefront/cart/gift-cards?${q}`, {
        noAuth: true,
        body: { giftCardCodes: ['GIFTCARD-XXXX'] },
      });
      await save('20-storefront', 'cart-payment-info', 'GET', `/storefront/cart/payment-info?${q}`, { noAuth: true });
    }
  }

  // ============ 21. Storefront Customer Account ============
  // Needs a valid customer access token from Customer Account API OAuth flow.
  // Set env CUSTOMER_TOKEN to capture these. If absent or expired, section is skipped.
  const cT = process.env.CUSTOMER_TOKEN;
  if (cT) {
    await section('21. Storefront — Customer Account');
    const cAuth = { noAuth: true, headers: { 'X-Customer-Token': cT } };
    await save('21-customer-account', 'profile', 'GET', '/storefront/customer', cAuth);
    await save('21-customer-account', 'addresses-list', 'GET', '/storefront/customer/addresses?first=10', cAuth);
    await save('21-customer-account', 'orders-list', 'GET', '/storefront/customer/orders?first=10', cAuth);
    const orderId = process.env.ORDER_ID;
    if (orderId) {
      const enc = encodeURIComponent(orderId);
      await save('21-customer-account', 'order-get', 'GET', `/storefront/customer/order?id=${enc}`, cAuth);
      await save('21-customer-account', 'order-buy-again', 'GET', `/storefront/customer/order/buy-again?id=${enc}`, cAuth);
      await save('21-customer-account', 'order-digital-assets', 'GET', `/storefront/customer/order/digital-assets?id=${enc}`, cAuth);
      await save('21-customer-account', 'order-returnable', 'GET', `/storefront/customer/order/returnable?id=${enc}`, cAuth);
    }
    await save('21-customer-account', 'returns-list', 'GET', '/storefront/customer/returns?first=10', cAuth);
    await save('21-customer-account', 'subscriptions-list', 'GET', '/storefront/customer/subscriptions?first=10', cAuth);
    await save('21-customer-account', 'store-credit', 'GET', '/storefront/customer/store-credit', cAuth);
    await save('21-customer-account', 'profile-update', 'PATCH', '/storefront/customer', {
      ...cAuth,
      body: { firstName: 'Baljeet', lastName: 'Singh' },
    });
  } else {
    console.log(`${C.d}— skipping 21. Storefront Customer Account (set CUSTOMER_TOKEN env var to capture)${C.n}`);
  }

  console.log(`\n${C.g}✓ Done.${C.n} Responses in ${OUT}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
