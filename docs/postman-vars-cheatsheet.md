# Postman Var Cheat Sheet — Where to Get IDs

## Format: `var` ← from `endpoint` → `path in response`

---

## Admin API

| var | source endpoint | field |
|---|---|---|
| `access_token` | `POST /auth/login` | auto-captured by test script |
| `user_id` | `GET /users` | `[].id` |
| `role_id` | `GET /roles` | `[].id` |
| `product_id` (numeric) | `GET /products?take=5` | `items[].legacyResourceId` |
| `product_gid` | `GET /products` | `items[].id` (`gid://shopify/Product/...`) |
| `collection_id` | `GET /collections` | `[].legacyResourceId` |
| `inventory_item_id` | `GET /inventory/levels` | `items[].variant.inventoryItem.id` |
| `location_id` | `GET /inventory/locations` | `[].id` |
| `order_id` (admin) | `GET /orders?take=5` | `items[].legacyResourceId` |
| `customer_id` (admin) | `GET /customers` | `items[].legacyResourceId` |
| `segment_id` | `GET /customers/segments/list` | `[].id` |
| `vendor_id` | `GET /vendors` | `[].id` |
| `po_id` | `GET /purchase-orders` | `[].id` |
| `po_item_id` | `GET /purchase-orders/:id` | `items[].id` |
| `gr_id` | `GET /goods-receipts` | `[].id` |
| `cms_id` | `GET /cms` | `[].id` |
| `theme_id` | `GET /themes` | `[].id` (or numeric: strip `gid://shopify/OnlineStoreTheme/`) |
| `page_id` | `GET /pages?limit=10` | `[].id` |
| `media_id` | `GET /media` | `[].id` |
| `setting_key` | `GET /settings` | `[].key` |

---
# Storefront Cheat Sheet — Every ID

## Folder 20: Storefront (Public)

| Request | ID needed | Where to get | Format |
|---|---|---|---|
| List products | — | — | — |
| **Get product by handle** | `{{product_handle}}` | `List products` → `edges[].node.handle` | `the-complete-snowboard` |
| List collections | — | — | — |
| **Get collection by handle** | `{{collection_handle}}` | `List collections` → `edges[].node.handle` | `hydrogen` |
| **Cart create** | `merchandiseId` (in body) | `Get product by handle` → `variants.edges[].node.id` | `gid://shopify/ProductVariant/52130746335533` |
| **Cart get** | `{{cart_id}}` (query) | `Cart create` response → `id` | `gid://shopify/Cart/hWNDAm...?key=...` |
| **Cart lines add** | `{{cart_id}}` + `merchandiseId` (body) | cart_id from create; variantId from product detail | same as above |
| **Cart lines update** | `{{cart_id}}` + line `id` (body) | line id from `Cart get` → `lines.edges[].node.id` | `gid://shopify/CartLine/xxx?cart=yyy` |
| **Cart lines remove** | `{{cart_id}}` + `lineIds[]` (body) | line id from `Cart get` | same as above |
| **Cart buyer identity update** | `{{cart_id}}` | from `Cart create` | — |
| **Cart discount codes update** | `{{cart_id}}` | from `Cart create` | — |

## Folder 21: Storefront — Customer Account

All require header `X-Customer-Token: {{customer_token}}`.

| Request | ID needed | Where to get | Format |
|---|---|---|---|
| `customer_token` (any req) | header | Browser → store `/account` → F12 Network → `customer/api/...` req → `Authorization` header value | `shcat_eyJraW...` (no Bearer) |
| Profile | — | — | — |
| List orders | — | — | — |
| **Get order** | `{{order_id}}` | `List orders` → `edges[].node.id` | `gid://shopify/Order/123` |
| **Order digital assets** | `{{order_id}}` | same as above | — |
| **Buy again** | `{{order_id}}` | same as above | — |
| **Cancel order** | `{{order_id}}` | same as above | — |
| **Edit shipping address** | `{{order_id}}` | same as above | — |
| List returns | — | — | — |
| **Request return** | `{{order_id}}` + `fulfillmentLineItemId` (body) | `Get order` → `lineItems.edges[].node.id` (actually fulfillmentLineItem — see note) | `gid://shopify/FulfillmentLineItem/xxx` |
| List subscriptions | — | — | — |
| **Update subscription** | `{{subscription_id}}` | `List subscriptions` → `edges[].node.id` | `gid://shopify/SubscriptionContract/123` |
| **Pause subscription** | `{{subscription_id}}` | same as above | — |
| **Cancel subscription** | `{{subscription_id}}` | same as above | — |
| Store credit balance | — | — | — |

## ID Type Reference

| Type | Example | Used in |
|---|---|---|
| Handle (slug) | `the-complete-snowboard` | products, collections paths |
| Product GID | `gid://shopify/Product/10291139674413` | NOT for cart |
| **Variant GID** | `gid://shopify/ProductVariant/52130746335533` | cart `merchandiseId` |
| **Cart GID** | `gid://shopify/Cart/abc?key=def` | all cart ops as `?id=` |
| **CartLine GID** | `gid://shopify/CartLine/xxx?cart=yyy` | line update/remove body |
| **Order GID** | `gid://shopify/Order/123` | customer order ops |
| **Subscription GID** | `gid://shopify/SubscriptionContract/123` | subscription ops |
| **FulfillmentLineItem GID** | `gid://shopify/FulfillmentLineItem/xxx` | return request body |

## Common Gotchas

| Symptom | Cause | Fix |
|---|---|---|
| 500 on cart create | sent `Product` gid not `ProductVariant` | use variant.id from product detail |
| 404 on cart get | cart_id has `/` `?` — broke path | use `?id=` query (already wired) |
| 400 "missing prefix shcat_" | sent token with `Bearer` prefix | pass raw token, no Bearer |
| 401 customer routes | token expired (~1hr) | re-grab from DevTools |
| 403 scope error | Customer Account API not enabled | Partners → app → enable + reinstall |
| Empty orders | none placed yet | place test order via checkoutUrl + Bogus Gateway card `1` |

## Order to Test Things

```
1. List products              → handle
2. Get product by handle      → variant.id
3. Cart create {variant.id}   → cart.id + checkoutUrl
4. Cart get                   → confirm
5. Cart lines add             → multi-item
6. (open checkoutUrl in browser → buy via Bogus Gateway → order created)
7. Grab customer_token from store /account page
8. List orders                → order.id
9. Get order                  → see line items
10. Request return / Cancel   → test mutations
```

Save as `docs/storefront-cheatsheet.md`?
## Flow Examples

**Storefront browse → buy**
```
1. GET /storefront/products            → pick handle
2. GET /storefront/products/:handle    → copy variant.id
3. POST /storefront/cart {merchandiseId} → copy cart.id + checkoutUrl
4. (redirect customer to checkoutUrl)
```

**Customer order self-service**
```
1. Grab customer_token from browser
2. GET /storefront/customer/orders         → copy order.id
3. GET /storefront/customer/orders/:id     → copy lineItems for return
4. POST /storefront/customer/orders/:id/return {lineItems}
```

**Admin PO lifecycle**
```
1. GET /vendors                  → vendorId
2. POST /purchase-orders         → poId
3. PATCH /purchase-orders/:id/submit
4. PATCH /purchase-orders/:id/approve
5. POST /purchase-orders/:id/receive
```

---

Save as `docs/postman-vars-cheatsheet.md`?