# Shopify Admin Dashboard

Enterprise Shopify operations console. Manage products, inventory, orders, customers, purchase orders, CMS, and reports without entering Shopify Admin.

## Stack

- **Frontend**: Next.js 15 (App Router) · TypeScript · Tailwind · ShadCN UI · React Query · Zustand
- **Backend**: NestJS · TypeScript · Prisma · PostgreSQL · Redis · BullMQ
- **Shopify**: Admin GraphQL API · Storefront API · Webhooks · Bulk Operations
- **Infra**: Docker · pnpm workspaces · Turborepo

## Repo layout

```
shopify-dashboard/
├── apps/
│   ├── api/                 NestJS backend
│   └── web/                 Next.js frontend
├── packages/
│   ├── shared/              Zod schemas, DTOs, enums
│   ├── ui/                  Shared shadcn components
│   └── shopify-sdk/         Typed GraphQL client
├── prisma/                  Schema + migrations
├── docker-compose.yml       Postgres + Redis
├── turbo.json
└── pnpm-workspace.yaml
```

## Quick start

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

- API: http://localhost:4000
- Web: http://localhost:3000
- Swagger: http://localhost:4000/docs

## Modules

| Module           | Backend route          | Frontend route       |
|------------------|------------------------|----------------------|
| Auth             | `/auth/*`              | `/login`             |
| Catalog          | `/products`            | `/catalog/products`  |
| Inventory        | `/inventory`           | `/inventory`         |
| Orders           | `/orders`              | `/orders`            |
| Customers        | `/customers`           | `/customers`         |
| Purchase Orders  | `/purchase-orders`     | `/purchasing`        |
| CMS              | `/cms`                 | `/cms`               |
| Media            | `/media`               | `/media`             |
| Reports          | `/reports`             | `/reports`           |
| Settings         | `/settings`            | `/settings`          |

## RBAC

Roles: `admin`, `manager`, `staff`, `viewer`. Permissions are key-based (`product.create`, `po.approve` …). See `apps/api/prisma/seed.ts`.

## Architecture diagram

See [docs/architecture.md](docs/architecture.md).
