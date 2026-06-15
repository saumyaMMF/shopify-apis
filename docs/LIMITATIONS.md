# Known Limitations & Inaccessible Data

What the app **cannot** do or access, and **why**. These are external platform/API
limits — not bugs in our code. Last reviewed: 2026-06-15.

---

## 1. Theme / presentation data — NOT accessible as structured data

The Shopify product/page/collection APIs return **data on the object**, never how it
*looks*. Anything configured in the **theme editor** lives in theme files
(`templates/*.json`, `sections/*.liquid`, `config/settings_data.json`), reachable only
as raw blobs via the Theme Asset API — not as clean JSON.

| Not accessible via data API | Where it actually lives |
|---|---|
| "Image with text" / hero / banner sections typed in theme editor | Theme files |
| Page/section layout, column counts, block order | Theme template JSON |
| Colors, fonts, spacing, custom CSS | Theme settings |
| The final rendered HTML of a storefront page | Liquid output (not an API resource) |
| Announcement bar text (unless built from a metafield) | Theme section setting |

**Rule:** want it in the API → store it in a **metafield** (or the page body). Type it
into a theme section → it's theme-only and invisible to our API.
**Live theme writes are also blocked** via the Admin API (only unpublished themes can be
edited programmatically).

---

## 2. Editing / deleting reviews — NOT supported by Judge.me API

Judge.me's public/private API is **create + read only**. Verified by testing every
request format (JSON, query string, form-encoded) + DELETE.

| Operation | API support |
|---|---|
| Create a review (`POST /reviews`) | ✅ works |
| List reviews (`GET /reviews`) | ✅ works |
| Get single review (`GET /reviews/:id`) | ✅ works |
| **Edit review** (`PUT /reviews/:id`) | ❌ returns fake `"Action performed successful"`, changes nothing |
| **Delete review** (`DELETE /reviews/:id`) | ❌ `404`, not supported |

**Consequence:** the in-app "Edit review" button was removed — it cannot function.
Review **edits/deletes must be done in the Judge.me dashboard** (or via the edit link in
Judge.me's review-request emails).
**What still works in-app:** displaying reviews + submitting new ones.
**Note:** Judge.me REST reads require the **private** token; the public token returns
`403`.

---

## 3. Other people's stores — NO API access at all

The APIs only reach stores we own / are installed on (`test-store-uzhiv0ib`). For any
other store (e.g. allbirds.com) the Admin API returns `401` and the Storefront API needs
*their* token. The only thing visible is the public website HTML (scraping) — not an API,
fragile, and not structured.

---

## 4. Customer OAuth requires a live HTTPS tunnel (dev only)

Customer sign-in (Headless Customer Account API) needs an **HTTPS** callback — Shopify
rejects `http://localhost`. In dev we use a cloudflared tunnel to `localhost:4000`.

- The tunnel URL **changes every restart** and **dies when the process stops**.
- On each new tunnel you must update **3 places**: `.env`
  (`CUSTOMER_ACCOUNT_REDIRECT_URI`), the web login origin
  (`NEXT_PUBLIC_API_ORIGIN` / fallback in `account/page.tsx`), and the **Headless →
  Customer Account API → Callback URI(s)** field in Shopify admin.
- Symptom when stale: login bounces to a dead `*.trycloudflare.com` → `DNS_PROBE_FINISHED_NXDOMAIN`.

This is a dev-only friction; production uses a stable HTTPS domain.

---

## 5. Storefront-token blind spots (use Admin API instead)

Even on our own store, the **public Storefront token** can't see some data:

| Hidden from Storefront token | Workaround used |
|---|---|
| Metafields without a `PUBLIC_READ` storefront-access definition | Read via **Admin API** (e.g. reviews aggregate, page custom fields) |
| Unpublished/draft pages, products, theme content | Admin API |
| Inventory quantity, cost, internal notes | Admin API with proper scopes |

---

## 6. Order operations blocked on the MCP token (data seeding)

When seeding dummy data, `orderCreate` was blocked (`write_orders` scope + offline-token
requirement). Worked around via `draftOrderCreate` → `draftOrderComplete`. Refunds and
fulfillment-status changes were blocked by the MCP app's safety rules — do those manually
in admin if needed.

---

## Quick mental model

- **Data on an object (product/page/customer + metafields)** → readable via API ✅
- **How it looks (theme design/layout/CSS) / rendered HTML** → not data, not readable ❌
- **3rd-party app content (Judge.me reviews)** → only via that app's own API, within its limits ⚠️
- **Other merchants' stores** → no access without their token ❌
