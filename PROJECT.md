# Project Log — Shopify Admin Dashboard

Living record of work done, decisions made, and what remains. Update at end of each work session.

---

## Session log

### 2026-06-09 — Day 1: Scaffold

**Done:**
- Repo init at `D:\Projects\shopify-dashboard`, git initialized.
- Monorepo structure: `apps/api`, `apps/web`, `packages/` placeholders, `prisma/`, `docs/`.
- Root tooling: pnpm workspaces, Turborepo, shared `tsconfig.base.json`.
- `.env.example` with Shopify, JWT, DB, Redis, S3 keys documented.
- `docker-compose.yml` for Postgres 16 + Redis 7 + MinIO.
- **Prisma schema** (`prisma/schema.prisma`) — 24 models:
  - Auth: `User`, `Role`, `Permission`, `RefreshToken`
  - Catalog: `Product`, `Variant`, `ProductImage`, `Collection`, `CollectionProduct`
  - Inventory: `Location`, `InventoryLevel`, `InventoryAdjustment`, `InventoryTransfer`(+items), `StockAlert`
  - Orders: `Order`, `OrderLineItem`, `Fulfillment`, `Refund`, `DraftOrder`
  - Customers: `Customer`, `CustomerSegment`
  - PO: `Vendor`, `PurchaseOrder`, `PurchaseOrderItem`, `GoodsReceipt`, `GoodsReceiptItem`
  - CMS: `CmsBlock`
  - Media: `MediaAsset`
  - Settings: `Setting`
  - Sync: `WebhookEvent`, `SyncJob`
  - Audit: `AuditLog`
- **Prisma seed** (`prisma/seed.ts`) — 27 permissions, 4 roles (admin/manager/staff/viewer), default admin user `admin@example.com / Admin@12345`.
- **NestJS API** (`apps/api/`) — 14 modules wired:
  - `auth` (login, refresh w/ rotating tokens, logout, /me; argon2 + JWT + httpOnly cookie)
  - `users` (CRUD + role assign + active toggle)
  - `prisma` (global service)
  - `common` (guards: JwtAuthGuard, PermissionsGuard; decorators: @CurrentUser, @RequirePermissions; HTTP exception filter)
  - `shopify` (AdminGraphQLService w/ p-retry on THROTTLED; StorefrontService; WebhookController w/ HMAC verify; WebhookProcessor BullMQ worker; SyncService cursor-paginated)
  - `catalog` (products list/get/create/update/delete via GraphQL; collections list/get)
  - `inventory` (levels query, adjust → inventorySetQuantities, alerts list)
  - `orders` (list/get/fulfill/refund)
  - `customers` (list/get/tags/segments)
  - `purchase-orders` (full lifecycle: create → submit → approve → receive partial/full; auto PO# and GR# sequences; transactional GR + inventory adjustment + Shopify push; self-approve blocked; over-receive blocked)
  - `cms` (upsert + publish → Shopify Metaobjects)
  - `media` (staged upload + fileCreate)
  - `reports` (ShopifyQL sales pass-through, Pg vendor/inventory aggregates)
  - `settings` (key/value)
  - `audit` (log + list with filters, global module)
- **Next.js web** (`apps/web/`) — Next 15 App Router:
  - Login page (axios refresh interceptor, Zustand auth store w/ permission helper)
  - Dashboard layout group: Sidebar (perm-gated nav), Header (logout), Footer
  - Pages: dashboard, catalog/products, inventory, orders, customers, purchasing (list + new + [id] full workflow), cms, media, reports, settings, audit-logs
  - Tailwind + ShadCN tokens in `globals.css`, dark mode ready
  - React Query providers with devtools
  - Rewrites `/api/backend/*` → `http://localhost:4000/api/*`
- **Docs**:
  - `README.md` — overview, stack, quickstart, modules table
  - `docs/architecture.md` — diagrams, data flow, RBAC, security, caching, deployment
  - `docs/wireframes.md` — ASCII mockups of dashboard, products, PO detail, receive modal, CMS, inventory
  - `docs/Shopify Dashboard API.postman_collection.json` — 16 folders, ~55 requests for every NestJS endpoint with auto-token-capture on login

**Decisions:**
- Use mirrored DB (Postgres) for fast Product/Order/Customer queries; webhooks keep mirror fresh; full sync via BullMQ.
- RBAC via JWT `perms` claim populated from role at login (no DB lookup per request).
- Refresh token rotation on every refresh, httpOnly cookie scoped to `/api/auth`.
- Webhook topic in URL uses dash (orders-create) since `/` not URL-safe.
- React Router template used by Shopify CLI 4.x (was Remix) for the embedded test app — separate dir `D:\Projects\test-app`.
- PO `receivedQty` enforced never to exceed `orderedQty`.

**Commits:**
- `802b4c1` — init: enterprise shopify dashboard scaffold
- `e3d4fde` — docs: postman collection for dashboard api

---

## Parallel work (outside this repo)

### Test embedded app (`D:\Projects\test-app`)
- Scaffolded via `shopify app init` (React Router + Polaris + Prisma + App Bridge)
- Linked to Partner app `test-app` under "My Store" org (`221845034`)
- Running against dev store `test-store-uzhiv0ib.myshopify.com`
- Admin token in Prisma session DB: `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`
- Storefront token: `02724cd7aa7b5e26debacf47e5b174e3` (via Headless channel)
- Scopes expanded to ~40+ admin scopes (orders, customers, inventory, fulfillments, etc.)
- Product create demo working (productCreate mutation + metafield type fix)

### Postman collections (parked at `D:\Projects\shopify_project\`)
- `Shopify API.postman_collection.json` — big REST collection (legacy 2021-01)
- `Shopify Admin REST API.postman_collection.json` — slim REST subset
- `Shopify Embedded App Gaps.postman_collection.json` — 20 folders, OAuth + GraphQL + Storefront + Customer Account + GDPR + Billing + Metaobjects + Returns + B2B + Markets + Translations + Discounts + Functions + Webhooks GraphQL + Marketing + Pixels + ShopifyQL + Scopes (built to fill gaps in the two original REST collections)

---

## Backlog

### Critical (block App Store submission)
- [ ] GDPR webhook handlers actually wipe/export data (`customers/redact`, `customers/data_request`, `shop/redact`)
- [ ] `app/uninstalled` handler — wipe shop tokens + downgrade subscription
- [ ] Privacy policy page (static)
- [ ] App Store listing assets (icon 1024², feature image, screenshots, demo video)
- [ ] Public HTTPS deployment

### High (core features incomplete)
- [ ] Billing module — `appSubscriptionCreate` + plan gating middleware
- [ ] CSV bulk import for products (BullMQ worker file empty)
- [ ] Full webhook handler for `inventory_levels/update` (location id resolution)
- [ ] Receive Inventory **modal** in web (currently only "Receive all" button)
- [ ] Partial-receive UI with per-line qty inputs
- [ ] Vendors CRUD pages in web
- [ ] Goods Receipts list/detail pages in web
- [ ] CMS block editor forms per block type (currently view-only)
- [ ] Media drag-drop uploader using staged upload + S3 PUT
- [ ] Stock alert cron (`stock-alerts.cron.ts`) — fire Slack/email when below threshold
- [ ] Customer segment rule engine + cron to refresh memberships
- [ ] Audit log interceptor — auto-record mutations to AuditLog table

### Medium
- [ ] Shadcn primitives package (`packages/ui/`) — Button, Input, Dialog, Table, Toast, DataTable wrapper
- [ ] Zod DTOs in `packages/shared/` for cross-app type safety
- [ ] Typed Shopify SDK in `packages/shopify-sdk/` via codegen
- [ ] Vitest config + sample tests for PO service (approve flow, partial receive, over-receive guard)
- [ ] E2E test with Playwright (login → create PO → approve → receive)
- [ ] Pino structured logger + request id middleware
- [ ] OpenTelemetry traces
- [ ] Sentry SDK
- [ ] Rate-limit per user (current limit is global per IP)
- [ ] PDF export for PO (puppeteer or react-pdf)
- [ ] Email vendor PO via Resend/SendGrid
- [ ] Refund partial line items UI

### Low
- [ ] Inventory transfer pages
- [ ] Theme app extension (storefront UI block)
- [ ] Shopify Functions (custom discount / delivery)
- [ ] Web Pixel for first-party analytics
- [ ] i18n on web (next-intl)
- [ ] Mobile responsive sidebar (drawer on small screens)
- [ ] Dark mode toggle wired to localStorage
- [ ] Search across products/orders/customers (Pg trigram or Meilisearch)

---

## Environment

- **Node:** 22.12.0 (NVM-Windows)
- **pnpm:** to install (`npm i -g pnpm`)
- **OS:** Windows 10 (19045.6466)
- **Postgres / Redis:** local Docker preferred; user wants no Docker → swap to Neon + Upstash hosted, or SQLite
- **Shopify CLI:** 4.1.0 (in `D:\Projects\test-app`)
- **Shop:** test-store-uzhiv0ib.myshopify.com (dev store)
- **Partner org:** "My Store" (`221845034`)
- **Dev app:** `test-app` (Client ID `be739e9d73b10c852f3713af267041c7`)

---

## Open questions

- Will dashboard be standalone (own auth) or embedded inside Shopify admin? Current scaffold assumes standalone.
- Hosting target? (Vercel + Fly? Railway? AWS?)
- Need multi-tenant (manage multiple shops) or single-shop?
- Public app (App Store) or custom app for one merchant?

---

_Last updated: 2026-06-11_

---

### 2026-06-10 / 2026-06-11 — Days 2-3: Storefront API + Mobile-First UI + Customer Account OAuth

**Goal:** Mirror Shopify-hosted storefront/account pages into a mobile-first web app, using our NestJS API to wrap Storefront + Customer Account + Admin APIs.

**Backend additions (NestJS modules):**

1. **`storefront`** — public, no JWT. 42 routes.
   - Products, collections, search (sort/filters), predictive search, recommendations
   - Cart: create/get/lines add+update+remove, buyer-identity, discount, gift-cards, note, attributes, delivery, payment-info
   - CMS: shop, policies, menus, pages, blogs+articles
   - Custom: metaobjects + metaobject, product/collection/shop metafields
   - Selling plans on product, variant store availability (pickup)
   - Variant by selected options
   - Newsletter signup (customerCreate via Storefront API)
   - Localization, payment-settings
   - **Banners** wrapped from admin themes service → public for mobile (resolves `shopify://shop_images/*.jpg` → real CDN URLs via Files API, flattens block tree to `{heading, text, button, image}`)

2. **`customer-account`** — `X-Customer-Token` header auth. 23 routes.
   - Profile read/update, addresses CRUD (+ set default)
   - Orders list/get, buy-again, digital-assets (statusPageUrl), cancel, edit-shipping
   - Returns list, request return (after fetching `returnable` helper), subscriptions, store credit, gift cards, marketing prefs, payment methods
   - Mutations that Customer Account API doesn't expose (`orderCancel`, `orderUpdate`, `returnRequest`) **bridged via admin GraphQL** with ownership check (token's customer email vs order's customer email)
   - JWT decode auto-extracts `shopId` from token payload — no `SHOPIFY_SHOP_ID` env needed if not set
   - Customer Account API uses `Authorization: <raw_token>` (no `Bearer` prefix) — common gotcha

3. **`customer-account-auth`** — Customer Account OAuth (PKCE) flow.
   - `GET /storefront/customer/auth/login` → generates PKCE pair + state, sets cookies, redirects to `https://shopify.com/authentication/{shop_id}/oauth/authorize`
   - `GET /storefront/customer/auth/callback` → verifies state cookie, exchanges code for tokens, sets `sf_customer_refresh` httpOnly cookie, redirects to web app with `#access_token=...` in URL fragment
   - `POST /storefront/customer/auth/refresh` → uses refresh cookie → new access token
   - `POST /storefront/customer/auth/logout` → revokes + clears
   - **Cookie config:** `sameSite: 'none', secure: true` required so cookies survive cross-site OAuth bounce (browser → tunnel → shopify.com → tunnel/callback). `Lax` won't work.

**Web app (Next.js 15 — `(storefront)` route group):**

- Mobile-first: `max-w-md mx-auto` container, sticky header w/ cart badge, sticky checkout button
- `apps/web/src/lib/storefront.ts` — typed API client + `cartStore` + `customerStore` (localStorage)
- Routes:
  - `/shop` — home (banner carousel w/ resolved CDN images + overlay heading/text/button, collection tiles w/ gradient fallbacks, featured products)
  - `/shop/products`, `/shop/products/[handle]`, `/shop/collections/[handle]`, `/shop/search`
  - `/shop/cart` — lines + qty +/- + remove + checkout button; renders "cart is empty" UI when `totalQuantity === 0` (no checkout button shown)
  - `/shop/thank-you` — clears cart, polls customer orders API for fresh order (5min window), shows confirmation
  - `/shop/account` — Orders | Profile tabs, orders list (clickable to detail)
  - `/shop/account/profile` — name edit + addresses CRUD (add/edit/delete/set-default)
  - `/shop/account/orders/[id]` — line items + totals + shipping address + tracking + Buy-again + Cancel order
- OAuth login button → direct redirect to API origin (tunnel URL, NOT `/api/backend/*` proxy) so PKCE cookies share origin with callback
- `typedRoutes: false` in next.config.mjs (dynamic `[handle]` segments conflict at tsc time)

**Postman/docs:**

- Folder structure: top-level **Admin API** (19 folders) + **Storefront API** (2 folders: 20 Public, 21 Customer Account)
- 145 requests total
- Scripts: `add-storefront-postman.mjs`, `add-customer-account-postman.mjs`, `split-postman-sections.mjs`, `merge-postman.mjs`
- `merge-postman.mjs` grafts saved examples from user's hand-edited Copy collection onto regenerated base (preserves work across script regens)
- `Shopify Dashboard API.postman_environment.json` — env file w/ pre-filled local vars (base_url, customer_token, shop_id, order_id, etc.)
- `docs/STOREFRONT_USER_FLOW.md` — 14-step user journey doc (home → browse → cart → checkout → account → orders → returns) with API calls per step

**Setup config / env:**

- `SHOPIFY_SHOP_ID=95517901101`, `CUSTOMER_ACCOUNT_CLIENT_ID=43e3ceb1-09bf-420b-a73e-27068a8009e2`
- Customer Account API config in admin: Sales channels → Headless → Customer Account API → Callback URI (HTTPS required, not plain localhost)
- Solved HTTPS callback via **cloudflared tunnel** (`cloudflared tunnel --url http://localhost:4000`) — gives `https://*.trycloudflare.com` URL. URL changes on every restart — must update Shopify callback + `.env` again.
- For production: real domain + cert needed.

**Decisions:**

- Cart id stored in localStorage (no cookie — anonymous, opaque gid contains `?key=` already)
- Customer token in localStorage (refresh token in httpOnly cookie)
- Cart routes use `?id=` query param (cart gid contains `/` and `?` — breaks Express path routing)
- Admin GraphQL bridges customer mutations Customer Account API doesn't expose (with ownership check)
- Banner image URLs resolved on backend (frontend gets real CDN URLs, not `shopify://` refs)
- Mobile-first single-column UI; same routes serve desktop via responsive Tailwind
- Mobile native (React Native) app NOT built — web app on mobile viewport is sufficient for now
- Shopify checkout always hosted (cart.checkoutUrl redirect) — no direct payment API

**Commits this session:**
- `7ec589d` feat(storefront): expose banners as public storefront endpoints
- `48b509b` feat(storefront): add Storefront + Customer Account API modules
- `a028a0d` feat(storefront): add payment-related read routes
- `139456e` docs: storefront API user flow walkthrough (14 steps)
- `9518077` feat(web): mobile-first storefront UI (Next.js route group)
- `ec48cdd` feat(customer-auth): Customer Account API OAuth flow (PKCE)
- `6ed7a3d` feat(web): thank-you page + return-to-app after Shopify checkout
- `2e47335` fix(web): empty cart state + order detail page
- `4d9b109` fix(banners): resolve shopify:// image refs to CDN URLs + flatten blocks
- `a5a6528` feat(web): profile page with name edit + address book CRUD

**Outstanding for storefront (deferred):**

- Server-side "Sign out of all devices" (revoke all customer tokens) — currently just clears localStorage
- Country/locale selector in footer
- React Native mobile app (using same API)
- Push notifications (FCM/APNs) for order updates
- Production HTTPS deploy + real OAuth domain (not tunnel)
- Webhook → cache invalidation
- Redis cache for shop info/policies/menus/pages (rarely change)
- Wishlist (custom — not Shopify-native)
- Reviews / loyalty (3rd-party)
- Customer signup screen (currently OAuth only — newsletter signup creates customer w/ random password)
