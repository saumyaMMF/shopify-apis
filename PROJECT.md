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

_Last updated: 2026-06-09_
