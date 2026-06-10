# API Flow Guide

End-to-end lifecycle walkthrough — login → Shopify install → product → collection → inventory → purchase order → fulfillment → refund.

> Replace `<TOKEN>` with the JWT from step 1. Replace `<shop>` with `test-store-uzhiv0ib.myshopify.com`.

---

## 0. Architecture overview

```
┌────────┐   ①login    ┌──────────────┐  ②Shopify call  ┌─────────┐
│ Client │ ──────────▶│  NestJS API  │ ───────────────▶│ Shopify │
│Postman │   JWT       │   (yours)    │  X-Shopify-     │ Admin   │
└────────┘ ◀──────────│              │  Access-Token   └─────────┘
            REST JSON  │  Postgres    │ ◀───────────────
                       │  mirror      │   webhooks (Redis queue)
                       └──────────────┘
```

Two token systems:
- **App JWT** — your dashboard's auth, 15 min expiry, refresh via httpOnly cookie
- **Shopify Access Token** — `shpat_...`, lives in `Shop` table, auto-refreshed by cron

---

## Step 1 — Login (get app JWT)

```http
POST /api/auth/login
Content-Type: application/json

{
  "email":"admin@example.com",
  "password":"Admin@12345"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "user": { "id":"...", "email":"...", "role":"admin", "permissions":[...30 keys] }
}
```

`accessToken` → use as `Authorization: Bearer <TOKEN>` for every subsequent call.

Refresh cookie (`refresh_token`) set automatically. Hit `POST /api/auth/refresh` when access expires.

---

## Step 2 — Connect to Shopify (one time per shop)

Choose one:

### 2a. OAuth flow (production)
```
GET /api/shopify/install?shop=<shop>
```
→ browser redirected to Shopify consent → after approve, Shopify calls:
```
GET /api/shopify/callback?code=...&shop=...&hmac=...
```
→ NestJS exchanges code for `access_token` + `refresh_token` → stores in `Shop` table.

### 2b. Manual paste (dev)
```http
POST /api/shopify/shops/manual
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "domain": "test-store-uzhiv0ib.myshopify.com",
  "accessToken": "shpat_xxxx",
  "refreshToken": "shprt_xxxx"
}
```

### 2c. Verify shop registered
```http
GET /api/shopify/shops
Authorization: Bearer <TOKEN>
```

### Token lifecycle (automatic)
- Cron checks every 5 min → refreshes shops expiring in ≤10 min
- Any 401 from Shopify → AdminGraphQLService refreshes + retries once
- Manual force: `POST /api/shopify/shops/refresh`

---

## Step 3 — Create Product

### 3a. Create on Shopify
```http
POST /api/products
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "title": "Mountain Bike",
  "description": "Carbon frame, 27 gears",
  "productType": "Bicycle",
  "vendor": "Acme Cycles",
  "tags": ["new","outdoor"],
  "status": "DRAFT"
}
```
→ NestJS calls Shopify `productCreate` GraphQL mutation
→ Response includes `gid://shopify/Product/<id>` and Shopify product ID

### 3b. Mirror to Postgres
```http
POST /api/products/sync
Authorization: Bearer <TOKEN>
```
→ Runs `bulkOperationRunQuery` style cursor-paginated pull → upserts every product into Postgres `Product` table → variants + images cached.

> Real production: webhook `products/create` auto-syncs (needs Redis running).

### 3c. Read (fast, from mirror)
```http
GET /api/products?take=25&skip=0&q=bike&status=ACTIVE
Authorization: Bearer <TOKEN>
```

### 3d. Update
```http
PATCH /api/products/gid://shopify/Product/<id>
Content-Type: application/json

{ "status": "ACTIVE", "tags": ["new","outdoor","featured"] }
```

### 3e. Delete
```http
DELETE /api/products/gid://shopify/Product/<id>
```

---

## Step 4 — Group into Collection

### 4a. List existing collections
```http
GET /api/collections
Authorization: Bearer <TOKEN>
```

### 4b. Create collection (via Shopify GraphQL — not yet exposed; use Admin API directly or extend service)

Direct Shopify call:
```http
POST https://<shop>/admin/api/2025-01/graphql.json
X-Shopify-Access-Token: shpat_xxx

{
  "query": "mutation collectionCreate($input: CollectionInput!) { collectionCreate(input: $input) { collection { id title handle } userErrors { field message } } }",
  "variables": { "input": { "title": "Bikes", "ruleSet": { "rules": [{ "column": "TYPE", "relation": "EQUALS", "condition": "Bicycle" }], "appliedDisjunctively": false } } }
}
```

Smart collection auto-fills with products matching rule. For manual collection, use `products` field with array of `gid://`.

---

## Step 5 — Inventory tracking

### 5a. List inventory levels
```http
GET /api/inventory/levels
Authorization: Bearer <TOKEN>
```
Returns `inventory_item_id`, `location_id`, `available`, `committed`, `incoming` per row.

### 5b. Adjust stock (writes to Shopify + logs locally)
```http
POST /api/inventory/adjust
Content-Type: application/json

{
  "inventoryItemId": "54205492691245",
  "locationId": "<location-uuid>",
  "delta": 50,
  "reason": "correction",
  "reference": "manual-adj-001"
}
```
→ Inserts `InventoryAdjustment` row (audit trail)
→ Calls Shopify `inventorySetQuantities` mutation
→ Shopify pushes `inventory_levels/update` webhook (when Redis running) → mirror updates

### 5c. Stock alerts
```http
GET /api/inventory/alerts
```
Returns variants where `available < threshold` (configured per-variant via `StockAlert` table).

---

## Step 6 — Purchase Order lifecycle

Full workflow: DRAFT → PENDING_APPROVAL → APPROVED → PARTIALLY_RECEIVED → RECEIVED.

### 6a. Create vendor (once)
```http
POST /api/vendors
Content-Type: application/json

{
  "name": "Acme Cycle Distributors",
  "email": "sales@acme.com",
  "paymentTerms": "NET-30",
  "address": { "line1": "1 Industrial Rd", "city": "Detroit", "country": "US" }
}
```

### 6b. Create PO (DRAFT status)
```http
POST /api/purchase-orders
Content-Type: application/json

{
  "vendorId": "<vendor-uuid>",
  "locationId": "<location-uuid>",
  "expectedAt": "2026-07-15",
  "notes": "Q3 restock",
  "shipping": 50,
  "items": [
    { "variantId": "<variant-uuid>", "sku": "BIKE-RED-M", "title": "Red Bike M", "qty": 100, "unitCost": 250 },
    { "variantId": "<variant-uuid-2>", "sku": "BIKE-BLU-L", "title": "Blue Bike L", "qty": 50, "unitCost": 280 }
  ]
}
```
→ Auto-generates `PO-2026-00001` number → status `DRAFT`

### 6c. Submit for approval
```http
PATCH /api/purchase-orders/<po-id>/submit
```
→ Status `PENDING_APPROVAL`

### 6d. Approve (must be different user than creator — self-approve blocked)
```http
PATCH /api/purchase-orders/<po-id>/approve
```
→ Status `APPROVED` → ready to receive

### 6e. Receive goods (partial OK)
```http
POST /api/purchase-orders/<po-id>/receive
Content-Type: application/json

{
  "notes": "Half shipment, rest in 2 weeks",
  "items": [
    { "poItemId": "<po-item-id>", "quantity": 50, "condition": "good" }
  ]
}
```
→ Atomic transaction:
1. Insert `GoodsReceipt` + items (auto `GR-2026-00001`)
2. Increment `PurchaseOrderItem.receivedQty`
3. Insert `InventoryAdjustment` (audit)
4. Update PO status → `PARTIALLY_RECEIVED` or `RECEIVED`
5. Push to Shopify inventory (best-effort)

### 6f. Track receipts
```http
GET /api/goods-receipts
GET /api/goods-receipts/<gr-id>
```

---

## Step 7 — Order received from customer (Shopify-initiated)

Customer places order on storefront → Shopify creates Order → webhook fires.

### 7a. Webhook (Shopify → API)
```
POST /api/webhooks/shopify/orders-create
X-Shopify-Hmac-Sha256: <hmac>
X-Shopify-Topic: orders/create
Body: full order JSON
```
→ HMAC verified → pushed to BullMQ → processor upserts `Order`, `OrderLineItem`.

> Without Redis: skipped. Run manual sync via Admin API list.

### 7b. List orders (from mirror)
```http
GET /api/orders?status=paid&take=25
Authorization: Bearer <TOKEN>
```

### 7c. Get one
```http
GET /api/orders/<order-id>
```

---

## Step 8 — Fulfillment / Delivery

### 8a. Create fulfillment + tracking
```http
POST /api/orders/<order-shopify-gid>/fulfill
Content-Type: application/json

{
  "lineItems": [{ "id": "gid://shopify/LineItem/<id>", "quantity": 1 }],
  "tracking": {
    "company": "DHL",
    "number": "DHL-1234567890",
    "url": "https://track.dhl/DHL-1234567890"
  }
}
```
→ Calls Shopify `fulfillmentCreate` → buyer gets shipping notification email.

### 8b. Refund (after issue)
```http
POST /api/orders/<order-shopify-gid>/refund
Content-Type: application/json

{
  "amount": 25.00,
  "currencyCode": "USD",
  "note": "Customer returned item"
}
```
→ Shopify `refundCreate` mutation → `Refund` row stored locally.

---

## Step 9 — Customer view

### 9a. List + search
```http
GET /api/customers?q=jane&take=25
```

### 9b. Tag customer (e.g. mark VIP)
```http
PATCH /api/customers/<customer-id>/tags
Content-Type: application/json

{ "tags": ["vip", "newsletter"] }
```

### 9c. Segment creation (rule-based)
```http
POST /api/customers/segments
Content-Type: application/json

{
  "name": "High value",
  "rules": { "totalSpent": { "gt": 1000 }, "tags": ["vip"] }
}
```

---

## Step 10 — CMS & Banners (Online Store content)

### 10a. View current banners (from active theme)
```http
GET /api/banners/from-theme?template=index
```
Returns parsed sections from `templates/index.json` matching banner/hero/slideshow types.

### 10b. List themes
```http
GET /api/themes
GET /api/themes/published
```

### 10c. Read theme file
```http
GET /api/themes/<theme-id>/asset?key=config/settings_data.json
```

### 10d. Manage banner via dashboard CMS (own data, syncs to Shopify Metaobject on publish)
```http
POST /api/cms
Content-Type: application/json

{
  "type": "HERO_BANNER",
  "handle": "home-hero",
  "data": {
    "title": "Summer Sale",
    "subtitle": "Up to 50% off",
    "imageUrl": "https://cdn.shopify.com/...",
    "ctaText": "Shop now",
    "ctaUrl": "/collections/sale"
  }
}
```

Then publish (writes to Shopify Metaobject):
```http
PATCH /api/cms/<block-id>/publish
```

---

## Step 11 — Reports

```http
GET /api/reports/sales?since=-30d&until=today   # ShopifyQL
GET /api/reports/inventory                       # Pg aggregate
GET /api/reports/vendors                         # PO spend per vendor
```

---

## Step 12 — Audit + Settings

### Audit log
Every mutation (planned via interceptor) records to `AuditLog`:
```http
GET /api/audit-logs?resource=PurchaseOrder&take=50
```

### Settings (key/value, e.g. tax rate, alert threshold)
```http
PUT /api/settings/tax.default_rate
Content-Type: application/json
{ "value": 0.18 }

GET /api/settings/tax.default_rate
```

---

## Full lifecycle in 1 chain (a single product → sold → fulfilled → refunded)

```
①  POST /auth/login                              → JWT
②  POST /shopify/shops/manual                    → Shopify token saved
③  POST /products  { title: "Red Bike" }         → Shopify productCreate
④  POST /products/sync                           → mirror populated
⑤  POST /vendors  { name: "Acme" }               → vendor created
⑥  POST /purchase-orders  { ... }                → PO-2026-00001 DRAFT
⑦  PATCH /purchase-orders/:id/submit             → PENDING_APPROVAL
⑧  (different user logs in)
⑨  PATCH /purchase-orders/:id/approve            → APPROVED
⑩  POST /purchase-orders/:id/receive             → RECEIVED + inventory ↑
⑪  (customer places order on storefront)
⑫  webhook orders/create → Order upserted
⑬  GET /orders                                   → see order
⑭  POST /orders/:gid/fulfill  { tracking: {...}} → buyer email
⑮  (later)
⑯  POST /orders/:gid/refund  { amount: ... }    → refund + inventory restored
⑰  GET /audit-logs                               → full trail
```

---

## Permission map (RBAC)

| Endpoint group | Required permission(s) |
|---|---|
| Auth | (none — public) |
| Users mgmt | `user.manage` |
| Roles mgmt | `role.manage` |
| Product read | `product.read` |
| Product write | `product.create`, `product.update`, `product.delete` |
| Inventory read | `inventory.read` |
| Inventory write | `inventory.adjust`, `inventory.transfer` |
| Orders read | `order.read` |
| Fulfillment | `order.fulfill` |
| Refund | `order.refund` |
| Customers | `customer.read`, `customer.update` |
| Segments | `segment.manage` |
| PO read | `po.read` |
| PO create / submit | `po.create` |
| PO approve / cancel | `po.approve` |
| PO receive | `po.receive` |
| Vendor mgmt | `vendor.manage` |
| CMS read | `cms.read` |
| CMS publish | `cms.publish` |
| Media upload | `media.upload` |
| Reports | `reports.view` |
| Settings | `settings.update` |
| Audit | `audit.view` |

Roles seeded:
- `admin` — all 30 permissions
- `manager` — all except user/role mgmt
- `staff` — read most + fulfill + receive
- `viewer` — read-only

---

## Error responses

All errors uniform shape:
```json
{
  "statusCode": 403,
  "path": "/api/products",
  "timestamp": "2026-06-10T...",
  "message": "Missing permissions: product.create"
}
```

| Status | Meaning |
|---|---|
| 401 | JWT missing / expired |
| 403 | Permission denied |
| 404 | Resource not found |
| 409 | State conflict (e.g. self-approve PO) |
| 500 | Shopify call failed OR internal error |

---

## Common gotchas

1. **GET /products returns empty** — Postgres mirror not synced yet. Run `POST /products/sync`.
2. **POST /products 500** — `SHOP_TOKEN` expired. Either let cron refresh OR `POST /shopify/shops/refresh`.
3. **POST /inventory/adjust 500** — bad `locationId`. Use real Shopify location UUID from `GET /inventory/levels`.
4. **PO approve 403** — same user who created can't approve. Login as another user.
5. **Webhook 200 but no DB update** — Redis not running, queue not processed. Start Redis OR call sync endpoints.
6. **BigInt JSON error** — fixed via `BigInt.prototype.toJSON` in main.ts.

---

_Last updated: 2026-06-10_
