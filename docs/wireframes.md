# UI Wireframes (ASCII)

## Dashboard Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ Shopify Ops                                       Welcome, Alice  🔔 ⏻│
├──────────┬───────────────────────────────────────────────────────────┤
│Dashboard │                                                            │
│Products  │   ┌─Products─┐ ┌─Orders──┐ ┌─Customers┐ ┌─Stock──┐         │
│Inventory │   │  1,234   │ │   89    │ │   456    │ │  ⚠ 12  │         │
│Orders    │   └──────────┘ └─────────┘ └──────────┘ └────────┘         │
│Customers │                                                            │
│PO        │   ┌─Sales last 30 days─────────────────────────────┐       │
│CMS       │   │  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁                                │       │
│Media     │   └─────────────────────────────────────────────────┘       │
│Reports   │                                                            │
│Settings  │   Recent activity      Pending POs       Low stock         │
│Audit     │                                                            │
├──────────┴───────────────────────────────────────────────────────────┤
│ v0.1.0                                                © 2026          │
└──────────────────────────────────────────────────────────────────────┘
```

## Products List

```
Products                                              [+ New product]
─────────────────────────────────────────────────────────────────────
[Search by title or handle...........]  [Status ▾]  [Vendor ▾]  [⇩CSV]

┌──────────────────────┬──────────┬──────────┬─────────┬─────────────┐
│ Title                │ Status   │ Vendor   │ Variants│ Updated     │
├──────────────────────┼──────────┼──────────┼─────────┼─────────────┤
│ Green Snowboard      │ ACTIVE   │ Acme     │   3     │ 2 hrs ago   │
│ Gift Card            │ ACTIVE   │ —        │   4     │ 1 day ago   │
│ Multi-loc Snowboard  │ ACTIVE   │ Acme     │   1     │ 1 day ago   │
└──────────────────────┴──────────┴──────────┴─────────┴─────────────┘

← Prev   1 of 50   Next →                              25 of 1,234
```

## Purchase Order Detail

```
PO-2026-00042                                  [Submit] [Approve] [Cancel]
Vendor: Acme Distributors • Status: PENDING_APPROVAL
Expected: 2026-06-30 • Created: 2026-06-09 by alice@example.com
─────────────────────────────────────────────────────────────────────
┌────────┬───────────────────────┬────────┬─────────┬────────┬───────┐
│ SKU    │ Title                 │ Order  │ Received│ Unit   │ Total │
├────────┼───────────────────────┼────────┼─────────┼────────┼───────┤
│ SKU001 │ Widget A              │  100   │   0     │ 5.00   │ 500.00│
│ SKU002 │ Widget B              │   50   │   0     │ 8.00   │ 400.00│
│ SKU003 │ Widget C              │   25   │   0     │ 12.00  │ 300.00│
└────────┴───────────────────────┴────────┴─────────┴────────┴───────┘
                                            Subtotal:   1,200.00
                                            Tax:           96.00
                                            Shipping:      25.00
                                            Total: USD  1,321.00

[Receive items]   [Print PDF]   [Send to vendor email]

Goods Receipts:  (none yet)
```

## Receive Inventory Modal

```
┌─ Receive Goods — PO-2026-00042 ──────────────────────────────────┐
│                                                                  │
│  Receiver: alice@example.com    Date: 2026-06-15                 │
│  Notes: [partial shipment, B/O on Widget C...........]           │
│                                                                  │
│  ┌────────┬──────────┬─────────┬───────────┬──────────┐         │
│  │ SKU    │ Ordered  │ Recv'd  │ Receiving │ Condition│         │
│  ├────────┼──────────┼─────────┼───────────┼──────────┤         │
│  │ SKU001 │ 100      │ 0       │ [100]     │ Good   ▾ │         │
│  │ SKU002 │  50      │ 0       │ [50 ]     │ Good   ▾ │         │
│  │ SKU003 │  25      │ 0       │ [0  ]     │ —      ▾ │         │
│  └────────┴──────────┴─────────┴───────────┴──────────┘         │
│                                                                  │
│                          [Cancel]   [Confirm receive]            │
└──────────────────────────────────────────────────────────────────┘
```

## CMS Dashboard

```
CMS                                              [+ New block]
─────────────────────────────────────────────────────────────────────
┌─Header Menu─────┐ ┌─Footer Menu────┐ ┌─Hero Banner──────┐
│ main-nav  ●pub  │ │ footer    ●pub │ │ home-hero  ●pub  │
│ mobile    ○draft│ │                │ │ sale-hero  ○draft│
└─────────────────┘ └────────────────┘ └──────────────────┘
┌─Homepage Sections┐ ┌─Pages──────────┐ ┌─FAQ──────────────┐
│ feat-products ● │ │ about      ●pub│ │ shipping   ●pub  │
│ testimonials  ● │ │ contact    ●pub│ │ returns    ●pub  │
│ banner-cta    ● │ │ privacy    ○drf│ │ sizing     ●pub  │
└─────────────────┘ └────────────────┘ └──────────────────┘
```

## Inventory

```
Inventory                                        [Adjust] [Transfer]
─────────────────────────────────────────────────────────────────────
Location: [All locations ▾]   Stock: [All ▾]   [Search SKU...]

┌────────────┬───────────────┬──────────┬──────────┬─────────────┐
│ SKU        │ Location      │ Available│ Committed│ Incoming    │
├────────────┼───────────────┼──────────┼──────────┼─────────────┤
│ SKU001-RED │ Main Warehouse│   245    │    12    │     100     │
│ SKU001-RED │ Store #2      │    18    │     2    │       0     │
│ SKU002-BLU │ Main Warehouse│   ⚠  3   │     0    │      50     │ ← alert
└────────────┴───────────────┴──────────┴──────────┴─────────────┘
```
