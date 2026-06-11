#!/usr/bin/env node
// Append "21. Storefront — Customer Account" folder. Idempotent.
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('docs/Shopify Dashboard API.postman_collection.json');
const col = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const FOLDER_NAME = '21. Storefront — Customer Account';
const CUSTOMER_HEADER = [{ key: 'X-Customer-Token', value: '{{customer_token}}' }];

function req(name, method, urlPath, body, query) {
  const raw = `{{base_url}}${urlPath}`;
  const url = {
    raw: query?.length ? `${raw}?${query.map((q) => `${q.key}=${q.value}`).join('&')}` : raw,
    host: ['{{base_url}}'],
    path: urlPath.split('?')[0].split('/').filter(Boolean),
  };
  if (query?.length) url.query = query;
  const request = { method, header: [...CUSTOMER_HEADER], url };
  if (body) {
    request.header.push({ key: 'Content-Type', value: 'application/json' });
    request.body = { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
  }
  return { name, request };
}

const folder = {
  name: FOLDER_NAME,
  description:
    'Customer-facing self-service: profile, orders, returns, subscriptions, store credit. Auth via X-Customer-Token header (OAuth access token from Customer Account API login flow).',
  item: [
    req('Profile', 'GET', '/storefront/customer'),
    req('Profile update', 'PATCH', '/storefront/customer', { firstName: 'Baljeet', lastName: 'Singh' }),

    req('List addresses', 'GET', '/storefront/customer/addresses', null, [{ key: 'first', value: '20' }]),
    req('Create address', 'POST', '/storefront/customer/addresses', {
      address: {
        firstName: 'Test',
        lastName: 'User',
        address1: '42 Test Lane',
        city: 'Pune',
        zip: '411001',
        territoryCode: 'IN',
        zoneCode: 'MH',
        phoneNumber: '+919999988877',
      },
      defaultAddress: false,
    }),
    req('Update address', 'PATCH', '/storefront/customer/address', {
      address: { address1: '99 Updated Rd', city: 'Pune', zip: '411002', territoryCode: 'IN', zoneCode: 'MH' },
    }, [{ key: 'id', value: '{{address_id}}' }]),
    req('Delete address', 'POST', '/storefront/customer/address/delete', null, [{ key: 'id', value: '{{address_id}}' }]),


    req('List orders', 'GET', '/storefront/customer/orders', null, [
      { key: 'first', value: '20' },
      { key: 'after', value: '', disabled: true },
    ]),
    req('Get order', 'GET', '/storefront/customer/order', null, [{ key: 'id', value: '{{order_id}}' }]),
    req('Order digital assets', 'GET', '/storefront/customer/order/digital-assets', null, [{ key: 'id', value: '{{order_id}}' }]),
    req('Buy again (returns line items)', 'GET', '/storefront/customer/order/buy-again', null, [{ key: 'id', value: '{{order_id}}' }]),
    req('Cancel order', 'POST', '/storefront/customer/order/cancel', {
      reason: 'CUSTOMER',
      refund: true,
      restock: true,
    }, [{ key: 'id', value: '{{order_id}}' }]),
    req('Edit shipping address', 'PATCH', '/storefront/customer/order/shipping-address', {
      address1: '123 New St',
      city: 'Mumbai',
      zip: '400001',
      territoryCode: 'IN',
    }, [{ key: 'id', value: '{{order_id}}' }]),

    req('List returns', 'GET', '/storefront/customer/returns', null, [{ key: 'first', value: '20' }]),
    req('Get returnable line items', 'GET', '/storefront/customer/order/returnable', null, [{ key: 'id', value: '{{order_id}}' }]),
    req('Request return', 'POST', '/storefront/customer/order/return', {
      lineItems: [
        {
          fulfillmentLineItemId: 'gid://shopify/FulfillmentLineItem/000',
          quantity: 1,
          returnReason: 'DEFECTIVE',
          returnReasonNote: 'Stitching loose',
        },
      ],
    }, [{ key: 'id', value: '{{order_id}}' }]),

    req('List subscriptions', 'GET', '/storefront/customer/subscriptions', null, [{ key: 'first', value: '20' }]),
    req('Update subscription', 'PATCH', '/storefront/customer/subscription', {
      nextBillingDate: '2026-08-01',
    }, [{ key: 'id', value: '{{subscription_id}}' }]),
    req('Pause subscription', 'POST', '/storefront/customer/subscription/pause', null, [{ key: 'id', value: '{{subscription_id}}' }]),
    req('Cancel subscription', 'POST', '/storefront/customer/subscription/cancel', null, [{ key: 'id', value: '{{subscription_id}}' }]),

    req('Store credit balance', 'GET', '/storefront/customer/store-credit'),
    req('Gift cards (owned by customer)', 'GET', '/storefront/customer/gift-cards', null, [{ key: 'first', value: '20' }]),
    req('Marketing preferences', 'GET', '/storefront/customer/marketing-prefs'),
    req('Payment methods (saved cards/wallets)', 'GET', '/storefront/customer/payment-methods'),
  ],
};

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
  { key: 'customer_token', value: '' },
  { key: 'order_id', value: '' },
  { key: 'subscription_id', value: '' },
  { key: 'address_id', value: '' },
  { key: 'fulfillment_line_item_id', value: '' },
]) {
  if (!col.variable.find((x) => x.key === v.key)) col.variable.push(v);
}

fs.writeFileSync(SRC, JSON.stringify(col, null, 2));
console.log(`✓ Added/updated '${FOLDER_NAME}' (${folder.item.length} requests)`);
