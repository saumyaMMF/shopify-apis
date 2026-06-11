#!/usr/bin/env node
// Append "20. Storefront (Public)" folder to base Postman collection.
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('docs/Shopify Dashboard API.postman_collection.json');
const col = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const FOLDER_NAME = '20. Storefront (Public)';

function req(name, method, urlPath, body, query) {
  const raw = `{{base_url}}${urlPath}`;
  const url = {
    raw: query?.length ? `${raw}?${query.map((q) => `${q.key}=${q.value}`).join('&')}` : raw,
    host: ['{{base_url}}'],
    path: urlPath.split('?')[0].split('/').filter(Boolean),
  };
  if (query?.length) url.query = query;
  const request = { method, url };
  if (body) {
    request.header = [{ key: 'Content-Type', value: 'application/json' }];
    request.body = { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
  }
  return { name, request };
}

const folder = {
  name: FOLDER_NAME,
  description: 'Public Storefront API — no auth. Customer-facing browse + cart + checkout via Shopify Storefront GraphQL.',
  item: [
    req('List products', 'GET', '/storefront/products', null, [
      { key: 'first', value: '24' },
      { key: 'after', value: '', disabled: true },
      { key: 'q', value: '', disabled: true },
    ]),
    req('Get product by handle', 'GET', '/storefront/products/{{product_handle}}'),
    req('List collections', 'GET', '/storefront/collections', null, [
      { key: 'first', value: '24' },
      { key: 'after', value: '', disabled: true },
    ]),
    req('Get collection by handle', 'GET', '/storefront/collections/{{collection_handle}}', null, [
      { key: 'first', value: '24' },
    ]),
    req('Cart create', 'POST', '/storefront/cart', {
      lines: [{ merchandiseId: 'gid://shopify/ProductVariant/000', quantity: 1 }],
    }),
    req('Cart get', 'GET', '/storefront/cart', null, [{ key: 'id', value: '{{cart_id}}' }]),
    req('Cart lines add', 'POST', '/storefront/cart/lines', {
      lines: [{ merchandiseId: 'gid://shopify/ProductVariant/000', quantity: 2 }],
    }, [{ key: 'id', value: '{{cart_id}}' }]),
    req('Cart lines update', 'PATCH', '/storefront/cart/lines', {
      lines: [{ id: 'gid://shopify/CartLine/000', quantity: 5 }],
    }, [{ key: 'id', value: '{{cart_id}}' }]),
    req('Cart lines remove', 'DELETE', '/storefront/cart/lines', {
      lineIds: ['gid://shopify/CartLine/000'],
    }, [{ key: 'id', value: '{{cart_id}}' }]),
    req('Cart buyer identity update', 'PATCH', '/storefront/cart/buyer-identity', {
      email: 'buyer@example.com',
      countryCode: 'US',
    }, [{ key: 'id', value: '{{cart_id}}' }]),
    req('Cart discount codes update', 'PATCH', '/storefront/cart/discount-codes', {
      discountCodes: ['SAVE10'],
    }, [{ key: 'id', value: '{{cart_id}}' }]),
    req('Cart note update', 'PATCH', '/storefront/cart/note', { note: 'Gift wrap please' }, [{ key: 'id', value: '{{cart_id}}' }]),
    req('Cart attributes update', 'PATCH', '/storefront/cart/attributes', {
      attributes: [{ key: 'delivery_window', value: 'morning' }],
    }, [{ key: 'id', value: '{{cart_id}}' }]),
    req('Cart gift card codes update', 'PATCH', '/storefront/cart/gift-cards', {
      giftCardCodes: ['GIFTCARD-XXXX'],
    }, [{ key: 'id', value: '{{cart_id}}' }]),

    // ---------- Shop / CMS ----------
    req('Shop info', 'GET', '/storefront/shop'),
    req('Policies', 'GET', '/storefront/policies'),
    req('Menu by handle', 'GET', '/storefront/menu/{{menu_handle}}'),
    req('Pages list', 'GET', '/storefront/pages', null, [{ key: 'first', value: '24' }]),
    req('Page by handle', 'GET', '/storefront/pages/{{page_handle}}'),
    req('Blogs list', 'GET', '/storefront/blogs', null, [{ key: 'first', value: '24' }]),
    req('Blog by handle', 'GET', '/storefront/blogs/{{blog_handle}}', null, [{ key: 'first', value: '24' }]),
    req('Article by handle', 'GET', '/storefront/blogs/{{blog_handle}}/articles/{{article_handle}}'),

    // ---------- Search / Discovery ----------
    req('Predictive search', 'GET', '/storefront/search/suggest', null, [
      { key: 'q', value: 'snowboard' },
      { key: 'limit', value: '6' },
    ]),
    req('Product recommendations', 'GET', '/storefront/recommendations', null, [
      { key: 'productId', value: '{{product_gid}}' },
      { key: 'intent', value: 'RELATED' },
    ]),
    req('Localization', 'GET', '/storefront/localization'),

    // ---------- New ----------
    req('Footer menu', 'GET', '/storefront/menu/footer'),
    req('Variant by selected options', 'POST', '/storefront/products/variant', {
      handle: '{{product_handle}}',
      selectedOptions: [{ name: 'Color', value: 'Ice' }],
    }),
    req('Search products', 'GET', '/storefront/search', null, [
      { key: 'q', value: 'snowboard' },
      { key: 'first', value: '12' },
      { key: 'sortKey', value: 'BEST_SELLING' },
      { key: 'reverse', value: 'false' },
    ]),
    req('Collection filtered + sorted', 'POST', '/storefront/collections/filtered', {
      handle: '{{collection_handle}}',
      first: 12,
      sortKey: 'PRICE',
      reverse: false,
      filters: [{ price: { min: 100, max: 2000 } }],
    }),
    req('Cart delivery groups', 'GET', '/storefront/cart/delivery', null, [{ key: 'id', value: '{{cart_id}}' }]),
    req('Newsletter signup', 'POST', '/storefront/newsletter', {
      email: 'subscriber@example.com',
      firstName: 'Sub',
      lastName: 'Scriber',
      acceptsMarketing: true,
    }),

    // ---------- New: Metaobjects + Metafields + Selling plans + Store availability ----------
    req('Metaobjects list', 'GET', '/storefront/metaobjects', null, [
      { key: 'type', value: 'banner' },
      { key: 'first', value: '10' },
    ]),
    req('Metaobject by handle', 'GET', '/storefront/metaobject', null, [
      { key: 'type', value: 'banner' },
      { key: 'handle', value: 'homepage-hero' },
    ]),
    req('Product metafields', 'POST', '/storefront/products/{{product_handle}}/metafields', {
      identifiers: [
        { namespace: 'custom', key: 'spec' },
        { namespace: 'custom', key: 'size_chart' },
      ],
    }),
    req('Collection metafields', 'POST', '/storefront/collections/{{collection_handle}}/metafields', {
      identifiers: [{ namespace: 'custom', key: 'hero' }],
    }),
    req('Shop metafields', 'POST', '/storefront/shop/metafields', {
      identifiers: [{ namespace: 'custom', key: 'support_phone' }],
    }),
    req('Product selling plans', 'GET', '/storefront/products/selling-plans-ski-wax/selling-plans'),
    req('Variant store availability (pickup)', 'GET', '/storefront/variant/store-availability', null, [
      { key: 'variantId', value: '{{variant_id}}' },
      { key: 'first', value: '5' },
    ]),
    req('Payment settings (accepted methods)', 'GET', '/storefront/payment-settings'),
    req('Cart payment info (B2B)', 'GET', '/storefront/cart/payment-info', null, [{ key: 'id', value: '{{cart_id}}' }]),
    req('Banners from theme', 'GET', '/storefront/banners/theme', null, [{ key: 'template', value: 'index' }]),
    req('Banners from metaobjects', 'GET', '/storefront/banners/metaobjects', null, [{ key: 'type', value: 'banner' }]),
  ],
};

// Remove any existing copy at any depth, then push new at root (split script re-nests)
function strip(items) {
  return items.filter((f) => {
    if (f.name === FOLDER_NAME) return false;
    if (f.item) f.item = strip(f.item);
    return true;
  });
}
col.item = strip(col.item);
col.item.push(folder);

if (!col.variable) col.variable = [];
for (const v of [
  { key: 'product_handle', value: '' },
  { key: 'collection_handle', value: '' },
  { key: 'cart_id', value: '' },
  { key: 'cart_line_id', value: '' },
  { key: 'menu_handle', value: 'main-menu' },
  { key: 'page_handle', value: '' },
  { key: 'blog_handle', value: 'news' },
  { key: 'article_handle', value: '' },
  { key: 'product_gid', value: '' },
]) {
  if (!col.variable.find((x) => x.key === v.key)) col.variable.push(v);
}

fs.writeFileSync(SRC, JSON.stringify(col, null, 2));
console.log(`✓ Added/updated '${FOLDER_NAME}' (${folder.item.length} requests) in ${SRC}`);
