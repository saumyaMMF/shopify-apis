#!/usr/bin/env node
// Wrap top-level folders into two sections: "Admin API" and "Storefront API".
// Idempotent: if already split, just resort.
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('docs/Shopify Dashboard API.postman_collection.json');
const col = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const ADMIN = 'Admin API';
const STORE = 'Storefront API';

// Flatten: if already wrapped, pull leaves out
let leaves = [];
for (const node of col.item) {
  if (node.name === ADMIN || node.name === STORE) leaves.push(...(node.item ?? []));
  else leaves.push(node);
}

const storefrontFolders = leaves.filter((f) => /storefront/i.test(f.name));
const admin = leaves.filter((f) => !/storefront/i.test(f.name));

col.item = [
  {
    name: ADMIN,
    description: 'Authenticated admin/dashboard endpoints. Require JWT via /auth/login.',
    item: admin,
  },
  {
    name: STORE,
    description: 'Public customer-facing Storefront API (no auth). Products, collections, cart, checkout.',
    item: storefrontFolders,
  },
];

fs.writeFileSync(SRC, JSON.stringify(col, null, 2));
console.log(`✓ Split: ${ADMIN} (${admin.length}) | ${STORE} (${storefrontFolders.length})`);
