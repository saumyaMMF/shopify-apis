# Architecture

## High-level

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Next.js 15)                      │
│   App Router · React Query · Zustand · ShadCN · Tailwind    │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS · JWT bearer + httpOnly refresh cookie
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              NestJS API Gateway (BFF layer)                  │
│  Auth · RBAC Guard · Rate Limit · Validation · Swagger      │
└──┬────────────┬─────────────┬─────────────┬─────────────────┘
   │            │             │             │
   ▼            ▼             ▼             ▼
┌──────┐  ┌──────────┐  ┌─────────┐  ┌────────────┐
│ Pg   │  │  Redis   │  │ BullMQ  │  │ Shopify    │
│ +    │  │ cache +  │  │ workers │  │ Admin GQL  │
│Prisma│  │ sessions │  │ sync    │  │ + Webhooks │
└──────┘  └──────────┘  └─────────┘  └────────────┘
                              │
                              ▼
                       ┌────────────┐
                       │ S3 / R2    │
                       │ media CDN  │
                       └────────────┘
```

## Boundaries

- **Next.js (`apps/web`)**: SSR shell + client islands. Never talks to Shopify directly.
- **NestJS (`apps/api`)**: only surface that holds the Shopify admin token. All REST exposed under `/api/*`.
- **Postgres**: source of truth for app data (POs, vendors, CMS, auth, audit). Mirrors of Shopify Products/Orders/Customers for fast list views.
- **Redis**: BullMQ queues, session/cache (rate limit buckets, ShopifyQL response cache).
- **BullMQ workers**: `webhook`, `sync`, `bulk-import`, `image` queues. Each runs in the same process for dev; split out in prod.

## Data flow

### Read path (e.g. Product list)
1. Web calls `GET /api/products?q=…`
2. NestJS query Postgres mirror (`Product` table)
3. Response cached at React Query for 30 s

### Write path (e.g. Create product)
1. Web calls `POST /api/products`
2. NestJS calls `productCreate` mutation on Shopify Admin GQL
3. Shopify emits `products/create` webhook → queued → processor upserts Postgres mirror
4. React Query invalidation triggers refetch

### Webhook flow
1. Shopify POSTs to `/api/webhooks/shopify/:topic`
2. Controller verifies HMAC against `SHOPIFY_API_SECRET`
3. Pushes raw payload to `webhook` BullMQ queue (200 OK immediately)
4. Worker processes with retries (8 attempts, exp backoff)
5. Failed >8 attempts → DEAD status, alert via Slack

### Purchase Order → Inventory
1. User creates PO (DRAFT) → submits (PENDING_APPROVAL)
2. Different user approves (APPROVED) — self-approve blocked
3. Goods received → transaction:
   - Insert `GoodsReceipt` + items
   - Increment `PurchaseOrderItem.receivedQty`
   - Insert `InventoryAdjustment`
   - Push `inventoryAdjustQuantities` to Shopify
   - Update PO status (PARTIALLY_RECEIVED or RECEIVED)

## RBAC

- JWT carries `perms: string[]` claim populated from user's role at login.
- `@RequirePermissions('po.approve')` decorator + `PermissionsGuard` checks claim.
- Frontend mirrors permissions in Zustand store; `useAuthStore.has(perm)` gates UI.
- Roles seeded: `admin`, `manager`, `staff`, `viewer`. New roles editable via API (future: `/roles`).

## Caching strategy

| Layer | TTL | Invalidation |
|---|---|---|
| React Query | 30 s | on mutation |
| Redis (ShopifyQL) | 5 min | manual |
| Postgres mirror | infinite | webhook + nightly delta sync |
| HTTP CDN | 1 h | versioned URL on image |

## Deployment

- API: Fly.io / Railway / ECS (with Postgres + Redis sidecars)
- Web: Vercel
- Media: Cloudflare R2 + CDN
- Webhooks: ensure public HTTPS endpoint registered in Shopify Partners

## Security

- Argon2 password hashing
- httpOnly + sameSite=lax refresh token cookie, scoped to `/api/auth`
- Bearer access tokens, 15-min expiry
- Refresh tokens hashed + rotated on each use, revocable
- Helmet middleware
- Throttler (120 req/min/IP)
- Webhook HMAC verification mandatory
- All Shopify tokens server-side only

## Observability (recommended)

- Pino logger → structured JSON
- OpenTelemetry traces → Tempo/Honeycomb
- Sentry for error reporting
- Prometheus `/metrics` endpoint
