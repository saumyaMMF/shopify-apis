# Storefront API — User Flow

How a shopper moves through the app, which API runs at each step.

---

## 1. App opens (first launch)

User taps app icon. Lands on home.

| What user sees | API called | Why |
|---|---|---|
| Logo, brand colors, currency | `GET /storefront/shop` | shop name, brand, payment settings |
| Hero/slideshow banners | `GET /storefront/banners/theme?template=index` | merchant-configured carousel |
| Promo cards | `GET /storefront/banners/metaobjects?type=banner` | custom merchant content |
| Top nav links | `GET /storefront/menu/main-menu` | header items |
| Footer links | `GET /storefront/menu/footer` | footer items |
| Collection tiles | `GET /storefront/collections?first=6` | first 6 categories |
| Featured products grid | `GET /storefront/products?first=6` | first 6 products |
| Country/currency badge | `GET /storefront/localization` | detect locale |

**State stored locally:**
- `cart_id` (created on first add-to-cart, not now)
- `customer_token` (created on login, not now)

---

## 2. User browses categories

Taps "Snowboards" collection tile.

| What user sees | API called |
|---|---|
| Collection title, description, banner | `GET /storefront/collections/snowboards?first=24` |
| Product grid for that collection | (same call returns nested `products`) |
| Filter button (price, vendor, color) | `POST /storefront/collections/filtered` w/ `filters` |
| Sort dropdown (price asc/desc, newest, best selling) | same endpoint w/ `sortKey` |
| Load more / pagination | same w/ `after: endCursor` |

---

## 3. User searches

Taps magnifier in header.

| What user sees | API called |
|---|---|
| Search input (real-time suggestions) | `GET /storefront/search/suggest?q=snow&limit=8` (debounced 200ms) |
| Returns products + collections + articles + pages | same |
| User presses Enter → full results | `GET /storefront/search?q=snow&sortKey=BEST_SELLING&first=24` |

---

## 4. User taps a product card

Lands on product detail page.

| What user sees | API called |
|---|---|
| Product images, title, price, description | `GET /storefront/products/the-complete-snowboard` |
| Variant picker (size/color) | (same call returns `variants[]` + `options[]`) |
| Live price/stock per selected variant combo | `POST /storefront/products/variant` w/ selectedOptions |
| Custom info: size chart, materials, reviews count | `POST /storefront/products/the-complete-snowboard/metafields` |
| Subscribe & save plan (if available) | `GET /storefront/products/.../selling-plans` |
| Pickup in store badge | `GET /storefront/variant/store-availability?variantId=` |
| "You may also like" carousel | `GET /storefront/recommendations?productId=` |

---

## 5. User taps "Add to cart"

First-time tap → cart created. Subsequent → lines added.

| Step | API called | What happens |
|---|---|---|
| First tap (no cart yet) | `POST /storefront/cart` w/ `lines: [{ merchandiseId, quantity }]` | New cart, returns `cart.id` + `checkoutUrl` |
| Save `cart_id` in localStorage | (client only) | persists across reloads |
| Subsequent tap | `POST /storefront/cart/lines?id=<cart_id>` | adds line to existing cart |
| Header cart badge updates | client event `cart:update` | shows new `totalQuantity` |

---

## 6. User opens cart

Taps cart icon in header.

| What user sees | API called |
|---|---|
| Cart lines (product, variant, qty, price) | `GET /storefront/cart?id=<cart_id>` |
| Subtotal, tax, total | same call returns `cost` |
| Shipping estimate (after address entered) | `GET /storefront/cart/delivery?id=<cart_id>` |
| Apply discount code | `PATCH /storefront/cart/discount-codes?id=` w/ `discountCodes: ["SAVE10"]` |
| Apply gift card | `PATCH /storefront/cart/gift-cards?id=` w/ `giftCardCodes: [...]` |
| Add order note (gift wrap, instructions) | `PATCH /storefront/cart/note?id=` w/ `note` |
| Update line qty (+/- buttons) | `PATCH /storefront/cart/lines?id=` w/ `lines: [{ id, quantity }]` |
| Remove line | `DELETE /storefront/cart/lines?id=` w/ `lineIds: [...]` |
| Set email/country (pre-checkout) | `PATCH /storefront/cart/buyer-identity?id=` |

---

## 7. User taps "Checkout"

Redirect to Shopify-hosted checkout.

| Step | API called | What happens |
|---|---|---|
| Read `cart.checkoutUrl` from last cart response | (no API call) | URL already in state |
| Open in browser/webview | `window.location = checkoutUrl` | leaves your app |
| Shopify handles: address → shipping → payment → confirm | Shopify-hosted | no API, all on Shopify domain |
| Bogus Gateway / Stripe / Razorpay / Apple Pay | Shopify-hosted | |
| Order placed → "Thank you" page | Shopify-hosted | |
| Optional: deep link back to your app | webhook → push notif | |

**You do NOT process payments.** No `processPayment` mutation exists. Customer always pays on Shopify domain.

---

## 8. User signs in

Taps account icon in header.

| Step | API called |
|---|---|
| Tap "Sign in" | `GET /api/backend/storefront/customer/auth/login` *(planned — currently manual token paste)* |
| Redirect to Shopify OAuth page | Shopify hosted |
| User enters email → gets 6-digit code → enters it | Shopify hosted |
| Shopify redirects back | `GET /api/backend/storefront/customer/auth/callback?code=` |
| Backend exchanges code → token | Shopify hosted (token endpoint) |
| Token saved in httpOnly cookie / localStorage | (client) |
| Redirect to `/shop/account` | (client) |

---

## 9. User views account

Profile page after login.

| What user sees | API called | Header |
|---|---|---|
| Name, email, phone | `GET /storefront/customer` | `X-Customer-Token` |
| Order history | `GET /storefront/customer/orders?first=20` | same |
| Saved addresses | `GET /storefront/customer/addresses` | same |
| Saved payment methods | `GET /storefront/customer/payment-methods` | same |
| Gift cards owned | `GET /storefront/customer/gift-cards` | same |
| Store credit | `GET /storefront/customer/store-credit` | same |
| Subscriptions | `GET /storefront/customer/subscriptions` | same |
| Marketing prefs | `GET /storefront/customer/marketing-prefs` | same |
| Update name/email | `PATCH /storefront/customer` | same |

---

## 10. User opens past order

Taps an order in their list.

| What user sees | API called |
|---|---|
| Order detail (items, address, tracking) | `GET /storefront/customer/order?id=<order_gid>` |
| Tracking link | `order.statusPageUrl` (returned above) |
| "Buy again" button → re-add to cart | `GET /storefront/customer/order/buy-again?id=` returns variant ids → `POST /storefront/cart` |
| "Cancel order" (if unfulfilled) | `POST /storefront/customer/order/cancel?id=` |
| "Edit shipping address" (if unfulfilled) | `PATCH /storefront/customer/order/shipping-address?id=` |
| Digital downloads (if any) | `GET /storefront/customer/order/digital-assets?id=` → opens statusPageUrl |
| "Request return" button | first fetch returnable: `GET /storefront/customer/order/returnable?id=` → then `POST /storefront/customer/order/return?id=` |

---

## 11. User manages addresses

| Action | API called |
|---|---|
| Show address book | `GET /storefront/customer/addresses` |
| Add new address | `POST /storefront/customer/addresses` w/ `address: {...}, defaultAddress: true` |
| Edit existing | `PATCH /storefront/customer/address?id=<address_gid>` |
| Delete | `POST /storefront/customer/address/delete?id=` |

---

## 12. User reads content

CMS-driven pages.

| What user sees | API called |
|---|---|
| About Us, Contact, FAQ pages | `GET /storefront/pages/about-us` |
| Blog listing | `GET /storefront/blogs/news?first=10` |
| Article detail | `GET /storefront/blogs/news/articles/<article_handle>` |
| Privacy / Refund / Shipping / Terms | `GET /storefront/policies` |

---

## 13. User signs up for newsletter

Footer or popup.

| Step | API called |
|---|---|
| Email entered | `POST /storefront/newsletter` w/ `email, acceptsMarketing: true` |
| Confirmation toast | (client) |

---

## 14. User signs out

| Step | API called |
|---|---|
| Tap "Sign out" | `POST /api/backend/storefront/customer/auth/logout` *(planned)* |
| Clear `customer_token` from storage | (client) |
| Redirect to home | (client) |

---

## State stored locally (mobile/PWA)

| Key | When set | When cleared |
|---|---|---|
| `cart_id` | first add-to-cart | order completed / cart expires |
| `customer_token` | login | logout / expiry (~1hr) |
| `country` / `currency` | localization picker | user switches |
| `recently_viewed[]` (optional) | product detail open | manual / time |
| `wishlist[]` (optional, app-local) | tap heart icon | manual |

---

## Auth header summary

| Endpoint group | Auth required |
|---|---|
| Catalog (`/products`, `/collections`, `/search`, `/shop`, `/menu`, `/pages`, `/blogs`, `/policies`, `/banners`, `/metaobjects`, `/localization`, `/recommendations`) | **none** (public) |
| Cart (`/cart/*`) | **none** (cart is anonymous, just needs `id`) |
| Newsletter | **none** |
| Customer (`/customer/*`) | `X-Customer-Token: shcat_...` header |

---

## What's NOT in storefront API (use other path)

| Need | Path |
|---|---|
| Pay (charge card) | Redirect to `cart.checkoutUrl` (Shopify-hosted) |
| Apple Pay / Google Pay | Shopify handles on checkout page |
| Real-time inventory alerts | Webhooks → push notif |
| Wishlist | Custom DB or `customer.metafields` |
| Reviews | 3rd-party (Judge.me / Loox) |
| Loyalty points | 3rd-party (Smile / LoyaltyLion) |
| Contact form submit | Custom backend mailer |

---

## Mobile-specific gotchas

| Gotcha | Fix |
|---|---|
| `cart_id` contains `?key=...` query string | Always pass via `?id=...` query, encode (Postman/axios auto) |
| `customer_token` expires ~1hr | Implement refresh route; auto-refresh on 401 |
| Customer Account API expects raw token (no `Bearer` prefix) | Set header as `Authorization: <token>`, NOT `Bearer ...` |
| Cart's `merchandiseId` is **ProductVariant** gid, not Product | Always grab from product detail's `variants.edges[].node.id` |
| Order edits/cancel blocked once `FULFILLED` | Show buttons only when `displayFulfillmentStatus === 'UNFULFILLED'` |

---

## Endpoints count

| Group | Count | Public | Auth |
|---|---|---|---|
| Storefront public | 42 | 42 | 0 |
| Customer Account | 23 | 0 | 23 (X-Customer-Token) |
| **Total** | **65** | **42** | **23** |
