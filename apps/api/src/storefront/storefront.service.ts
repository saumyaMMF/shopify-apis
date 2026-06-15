import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StorefrontService as StorefrontClient } from '../shopify/storefront.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';
import {
  PRODUCTS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  COLLECTIONS_QUERY,
  COLLECTION_BY_HANDLE_QUERY,
  CART_CREATE,
  CART_GET,
  CART_LINES_ADD,
  CART_LINES_UPDATE,
  CART_LINES_REMOVE,
  CART_BUYER_IDENTITY_UPDATE,
  CART_DISCOUNT_CODES_UPDATE,
  CART_NOTE_UPDATE,
  CART_ATTRIBUTES_UPDATE,
  CART_GIFT_CARDS_UPDATE,
  SHOP_INFO,
  SHOP_POLICIES,
  MENU_BY_HANDLE,
  PAGES_LIST,
  PAGE_BY_HANDLE,
  BLOGS_LIST,
  BLOG_BY_HANDLE,
  ARTICLE_BY_HANDLE,
  PREDICTIVE_SEARCH,
  PRODUCT_RECOMMENDATIONS,
  LOCALIZATION,
  VARIANT_BY_SELECTED_OPTIONS,
  PRODUCT_REVIEWS,
  PRODUCTS_SEARCH,
  COLLECTION_FILTERED,
  CART_DELIVERY,
  CUSTOMER_CREATE_SF,
  METAOBJECTS_LIST,
  METAOBJECT_BY_HANDLE,
  PRODUCT_METAFIELDS,
  COLLECTION_METAFIELDS,
  SHOP_METAFIELDS,
  PRODUCT_SELLING_PLANS,
  VARIANT_STORE_AVAILABILITY,
  CART_PAYMENT_INFO,
} from './storefront.queries';

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
  attributes?: { key: string; value: string }[];
}

export interface CartLineUpdateInput {
  id: string;
  quantity?: number;
  merchandiseId?: string;
}

export interface BuyerIdentityInput {
  email?: string;
  phone?: string;
  countryCode?: string;
  customerAccessToken?: string;
}

@Injectable()
export class StorefrontApiService {
  constructor(private client: StorefrontClient, private admin: AdminGraphQLService) {}

  async listProducts(opts: { first?: number; after?: string; query?: string }) {
    const data = await this.client.request<any>(PRODUCTS_QUERY, {
      first: opts.first ?? 24,
      after: opts.after,
      query: opts.query,
    });
    return data.products;
  }

  async getProductByHandle(handle: string) {
    const data = await this.client.request<any>(PRODUCT_BY_HANDLE_QUERY, { handle });
    if (!data.product) throw new NotFoundException(`Product '${handle}' not found`);
    return data.product;
  }

  async listCollections(opts: { first?: number; after?: string }) {
    const data = await this.client.request<any>(COLLECTIONS_QUERY, {
      first: opts.first ?? 24,
      after: opts.after,
    });
    return data.collections;
  }

  async getCollectionByHandle(handle: string, opts: { first?: number; after?: string }) {
    const data = await this.client.request<any>(COLLECTION_BY_HANDLE_QUERY, {
      handle,
      first: opts.first ?? 24,
      after: opts.after,
    });
    if (!data.collection) throw new NotFoundException(`Collection '${handle}' not found`);
    return data.collection;
  }

  async cartCreate(input?: { lines?: CartLineInput[]; buyerIdentity?: BuyerIdentityInput }) {
    const data = await this.client.request<any>(CART_CREATE, { input });
    return this.unwrap(data.cartCreate);
  }

  async cartGet(id: string) {
    const data = await this.client.request<any>(CART_GET, { id });
    if (!data.cart) throw new NotFoundException(`Cart '${id}' not found`);
    return data.cart;
  }

  async cartLinesAdd(cartId: string, lines: CartLineInput[]) {
    const data = await this.client.request<any>(CART_LINES_ADD, { cartId, lines });
    return this.unwrap(data.cartLinesAdd);
  }

  async cartLinesUpdate(cartId: string, lines: CartLineUpdateInput[]) {
    const data = await this.client.request<any>(CART_LINES_UPDATE, { cartId, lines });
    return this.unwrap(data.cartLinesUpdate);
  }

  async cartLinesRemove(cartId: string, lineIds: string[]) {
    const data = await this.client.request<any>(CART_LINES_REMOVE, { cartId, lineIds });
    return this.unwrap(data.cartLinesRemove);
  }

  async cartBuyerIdentityUpdate(cartId: string, buyerIdentity: BuyerIdentityInput) {
    const data = await this.client.request<any>(CART_BUYER_IDENTITY_UPDATE, { cartId, buyerIdentity });
    return this.unwrap(data.cartBuyerIdentityUpdate);
  }

  async cartDiscountCodesUpdate(cartId: string, discountCodes: string[]) {
    const data = await this.client.request<any>(CART_DISCOUNT_CODES_UPDATE, { cartId, discountCodes });
    return this.unwrap(data.cartDiscountCodesUpdate);
  }

  async cartNoteUpdate(cartId: string, note: string) {
    const data = await this.client.request<any>(CART_NOTE_UPDATE, { cartId, note });
    return this.unwrap(data.cartNoteUpdate);
  }

  async cartAttributesUpdate(cartId: string, attributes: { key: string; value: string }[]) {
    const data = await this.client.request<any>(CART_ATTRIBUTES_UPDATE, { cartId, attributes });
    return this.unwrap(data.cartAttributesUpdate);
  }

  async cartGiftCardCodesUpdate(cartId: string, giftCardCodes: string[]) {
    const data = await this.client.request<any>(CART_GIFT_CARDS_UPDATE, { cartId, giftCardCodes });
    return this.unwrap(data.cartGiftCardCodesUpdate);
  }

  // ---------- Shop / CMS ----------
  async getShopInfo() {
    const data = await this.client.request<any>(SHOP_INFO);
    return data.shop;
  }

  async getPolicies() {
    const data = await this.client.request<any>(SHOP_POLICIES);
    return data.shop;
  }

  async getMenu(handle: string) {
    const data = await this.client.request<any>(MENU_BY_HANDLE, { handle });
    return data.menu;
  }

  async listPages(first = 24, after?: string) {
    const data = await this.client.request<any>(PAGES_LIST, { first, after });
    return data.pages;
  }

  async getPage(handle: string) {
    // Core page (title/body/seo) from Storefront API.
    const data = await this.client.request<any>(PAGE_BY_HANDLE, { handle });
    const page = data.page;
    if (!page) return null;

    // Custom fields (metafields) via admin — returns ALL metafields without
    // needing a Storefront-access definition. Same pattern as productReviews().
    const ADMIN_PAGE_METAFIELDS = `
      query PageMetafields($q: String!) {
        pages(first: 1, query: $q) {
          edges { node { metafields(first: 50) { edges { node {
            namespace key value type
            reference { ... on MediaImage { image { url } alt } ... on GenericFile { url } }
            references(first: 25) { edges { node {
              ... on MediaImage { image { url } alt } ... on GenericFile { url }
            } } }
          } } } } }
        }
      }
    `;
    let metafields: any[] = [];
    try {
      const mfData = await this.admin.request(ADMIN_PAGE_METAFIELDS, { q: `handle:${handle}` });
      metafields = ((mfData as any).pages?.edges?.[0]?.node?.metafields?.edges ?? []).map((e: any) => e.node);
    } catch {}

    const fileUrl = (ref: any): string | null => ref?.image?.url ?? ref?.url ?? null;

    // Flatten to a convenient { "namespace.key": typedValue } map.
    const customFields: Record<string, any> = {};
    for (const m of metafields) {
      let v: any = m.value;
      if (m.type === 'file_reference') v = fileUrl(m.reference);
      else if (m.type === 'list.file_reference') v = (m.references?.edges ?? []).map((e: any) => fileUrl(e.node)).filter(Boolean);
      else if (m.type === 'number_integer') v = Number(m.value);
      else if (m.type === 'number_decimal') v = parseFloat(m.value);
      else if (m.type === 'boolean') v = m.value === 'true';
      else if (m.type?.startsWith('list.') || m.type === 'json') {
        try { v = JSON.parse(m.value); } catch {}
      }
      customFields[`${m.namespace}.${m.key}`] = v;
    }
    // Strip heavy reference objects from the raw array (keep value + type).
    metafields = metafields.map((m: any) => ({ namespace: m.namespace, key: m.key, value: m.value, type: m.type }));

    return { ...page, metafields, customFields };
  }

  async listBlogs(first = 24, after?: string) {
    const data = await this.client.request<any>(BLOGS_LIST, { first, after });
    return data.blogs;
  }

  async getBlog(handle: string, first = 24, after?: string) {
    const data = await this.client.request<any>(BLOG_BY_HANDLE, { handle, first, after });
    return data.blog;
  }

  async getArticle(blogHandle: string, articleHandle: string) {
    const data = await this.client.request<any>(ARTICLE_BY_HANDLE, { blogHandle, articleHandle });
    return data.blog?.articleByHandle;
  }

  // ---------- Search / Discovery ----------
  async predictiveSearch(query: string, limit = 6) {
    const data = await this.client.request<any>(PREDICTIVE_SEARCH, { query, limit });
    return data.predictiveSearch;
  }

  async recommendations(productId: string, intent: string = 'RELATED') {
    const data = await this.client.request<any>(PRODUCT_RECOMMENDATIONS, { productId, intent });
    return data.productRecommendations;
  }

  // ---------- New: Product reviews aggregate (Shopify standard metafields) ----------
  // Reviews metafields aren't publicly exposed via Storefront API by default
  // (need metafield definition w/ storefront access: PUBLIC_READ). Use admin API
  // so reviews always work for our app — single source of truth.
  async productReviews(handle: string) {
    const ADMIN_REVIEWS = `
      query AdminProductReviews($handle: String!) {
        productByHandle(handle: $handle) {
          id handle title
          rating: metafield(namespace: "reviews", key: "rating") { value type }
          ratingCount: metafield(namespace: "reviews", key: "rating_count") { value type }
        }
      }
    `;
    const data = await this.admin.request(ADMIN_REVIEWS, { handle });
    const p = (data as any).productByHandle;

    if (!p) return null;
    let rating: number | null = null;
    let scaleMin: number | null = null;
    let scaleMax: number | null = null;
    if (p.rating?.value) {
      try {
        const j = JSON.parse(p.rating.value);
        rating = j.value != null ? Number(j.value) : null;
        scaleMin = j.scale_min != null ? Number(j.scale_min) : null;
        scaleMax = j.scale_max != null ? Number(j.scale_max) : null;
      } catch {}
    }
    const count = p.ratingCount?.value != null ? Number(p.ratingCount.value) : 0;
    return {
      productId: p.id,
      handle: p.handle,
      title: p.title,
      rating,
      count,
      scaleMin: scaleMin ?? 1,
      scaleMax: scaleMax ?? 5,
    };
  }

  // ---------- New: Full review list (Judge.me public REST API) ----------
  // Aggregate stars come from productReviews() (Shopify metafields synced by
  // Judge.me). Individual review text/author live in Judge.me only — fetch via
  // its public API. Requires JUDGEME_PUBLIC_TOKEN + JUDGEME_SHOP_DOMAIN in env.
  private async judgemeFetch(path: string, params: Record<string, string>) {
    const token = process.env.JUDGEME_PUBLIC_TOKEN;
    const shopDomain = process.env.JUDGEME_SHOP_DOMAIN;
    if (!token || !shopDomain) return null;
    const qs = new URLSearchParams({ api_token: token, shop_domain: shopDomain, ...params });
    const res = await fetch(`https://judge.me/api/v1/${path}?${qs.toString()}`);
    if (!res.ok) throw new Error(`Judge.me ${path} ${res.status}`);
    return res.json() as Promise<any>;
  }

  // Resolve a product handle -> numeric Shopify product id (Judge.me external_id).
  private async shopifyProductExternalId(handle: string): Promise<string> {
    const ID_QUERY = `query($handle:String!){ productByHandle(handle:$handle){ id } }`;
    const idData = await this.admin.request(ID_QUERY, { handle });
    const gid = (idData as any).productByHandle?.id as string | undefined;
    if (!gid) throw new NotFoundException('Product not found');
    return gid.split('/').pop()!;
  }

  // Submit a new review to Judge.me. Requires the PRIVATE token (write scope).
  async createProductReview(
    handle: string,
    input: { name: string; email: string; rating: number; body: string; title?: string },
  ) {
    const token = process.env.JUDGEME_PUBLIC_TOKEN; // holds the private token
    const shopDomain = process.env.JUDGEME_SHOP_DOMAIN;
    if (!token || !shopDomain) {
      throw new BadRequestException('Reviews are not configured');
    }
    if (!input.email || !input.name || !input.body || !input.rating) {
      throw new BadRequestException('Name, email, rating and review text are required');
    }
    const rating = Math.max(1, Math.min(5, Math.round(Number(input.rating))));
    const externalId = await this.shopifyProductExternalId(handle);

    const body = {
      api_token: token,
      shop_domain: shopDomain,
      platform: 'shopify',
      id: externalId, // product external id
      email: input.email,
      name: input.name,
      rating,
      body: input.body,
      title: input.title ?? '',
    };
    const res = await fetch('https://judge.me/api/v1/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new BadRequestException(`Could not submit review (${res.status}) ${text}`.trim());
    }
    return { ok: true };
  }

  async productReviewList(handle: string, page = 1, perPage = 10) {
    // 1) Resolve Shopify numeric product id from handle (admin).
    const ID_QUERY = `query($handle:String!){ productByHandle(handle:$handle){ id } }`;
    const idData = await this.admin.request(ID_QUERY, { handle });
    const gid = (idData as any).productByHandle?.id as string | undefined;
    if (!gid) throw new NotFoundException('Product not found');
    const externalId = gid.split('/').pop()!;

    if (!process.env.JUDGEME_PUBLIC_TOKEN || !process.env.JUDGEME_SHOP_DOMAIN) {
      return { configured: false, reviews: [], currentPage: page, perPage, total: 0 };
    }

    let prod: any, data: any;
    try {
      // 2) Map Shopify product id -> Judge.me internal product id.
      prod = await this.judgemeFetch('products/-1', { external_id: externalId });
      const jmProductId = prod?.product?.id;
      if (!jmProductId) {
        return { configured: true, reviews: [], currentPage: page, perPage, total: 0 };
      }

      // 3) Fetch reviews for that product.
      data = await this.judgemeFetch('reviews', {
        product_id: String(jmProductId),
        page: String(page),
        per_page: String(perPage),
      });
    } catch (err: any) {
      // Bad/expired token or Judge.me outage — degrade to empty instead of 500.
      return { configured: true, error: String(err?.message ?? err), reviews: [], currentPage: page, perPage, total: 0 };
    }
    const reviews = (data?.reviews ?? []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      title: r.title ?? '',
      body: r.body ?? '',
      name: r.reviewer?.name ?? 'Anonymous',
      verified: r.verified === 'buyer' || r.verified === true,
      createdAt: r.created_at,
      pictures: (r.pictures ?? []).map((pic: any) => pic.urls?.original || pic.urls?.compact).filter(Boolean),
      reply: r.hidden ? null : r.reply ?? null,
    }));
    return { configured: true, reviews, currentPage: page, perPage, total: reviews.length };
  }

  // NOTE: Judge.me's API is create + read only. It exposes no working update or
  // delete for reviews (PUT no-ops, DELETE 404s), so review editing is not
  // possible in-app — only via the Judge.me dashboard. See docs/LIMITATIONS.md.

  // ---------- New: Variant by selected options ----------
  async variantBySelectedOptions(handle: string, selectedOptions: { name: string; value: string }[]) {
    const data = await this.client.request<any>(VARIANT_BY_SELECTED_OPTIONS, { handle, selectedOptions });
    return data.product?.variantBySelectedOptions ?? null;
  }

  // ---------- New: Products w/ search + sort ----------
  async productsSearch(opts: { first?: number; after?: string; query?: string; sortKey?: string; reverse?: boolean }) {
    const data = await this.client.request<any>(PRODUCTS_SEARCH, {
      first: opts.first ?? 24,
      after: opts.after,
      query: opts.query,
      sortKey: opts.sortKey, // RELEVANCE | TITLE | PRICE | BEST_SELLING | CREATED_AT | VENDOR | PRODUCT_TYPE | UPDATED_AT
      reverse: opts.reverse ?? false,
    });
    return data.products;
  }

  // ---------- New: Collection w/ filters + sort ----------
  async collectionFiltered(
    handle: string,
    opts: { first?: number; after?: string; filters?: any[]; sortKey?: string; reverse?: boolean },
  ) {
    const data = await this.client.request<any>(COLLECTION_FILTERED, {
      handle,
      first: opts.first ?? 24,
      after: opts.after,
      filters: opts.filters,
      sortKey: opts.sortKey, // COLLECTION_DEFAULT | BEST_SELLING | TITLE | PRICE | CREATED | MANUAL | ID | RELEVANCE
      reverse: opts.reverse ?? false,
    });
    return data.collection;
  }

  // ---------- New: Cart delivery groups ----------
  async cartDelivery(id: string) {
    const data = await this.client.request<any>(CART_DELIVERY, { id });
    return data.cart;
  }

  // ---------- New: Newsletter / customer create ----------
  async newsletterSignup(input: { email: string; firstName?: string; lastName?: string; password?: string; acceptsMarketing?: boolean }) {
    const payload: any = {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      acceptsMarketing: input.acceptsMarketing ?? true,
    };
    // Storefront customerCreate requires password. Generate random if not provided (newsletter-only flow).
    payload.password = input.password ?? (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)) + 'A1!';
    const data = await this.client.request<any>(CUSTOMER_CREATE_SF, { input: payload });
    if (data.customerCreate?.customerUserErrors?.length) {
      throw new Error(data.customerCreate.customerUserErrors.map((e: any) => e.message).join('; '));
    }
    return data.customerCreate?.customer;
  }

  // ---------- New: Metaobjects ----------
  async listMetaobjects(type: string, first = 24, after?: string) {
    const data = await this.client.request<any>(METAOBJECTS_LIST, { type, first, after });
    return data.metaobjects;
  }

  async getMetaobject(type: string, handle: string) {
    const data = await this.client.request<any>(METAOBJECT_BY_HANDLE, { type, handle });
    return data.metaobject;
  }

  // ---------- New: Metafields ----------
  async productMetafields(handle: string, identifiers: { namespace: string; key: string }[]) {
    const data = await this.client.request<any>(PRODUCT_METAFIELDS, { handle, identifiers });
    return data.product;
  }

  async collectionMetafields(handle: string, identifiers: { namespace: string; key: string }[]) {
    const data = await this.client.request<any>(COLLECTION_METAFIELDS, { handle, identifiers });
    return data.collection;
  }

  async shopMetafields(identifiers: { namespace: string; key: string }[]) {
    const data = await this.client.request<any>(SHOP_METAFIELDS, { identifiers });
    return data.shop;
  }

  // ---------- New: Selling plans ----------
  async productSellingPlans(handle: string) {
    const data = await this.client.request<any>(PRODUCT_SELLING_PLANS, { handle });
    return data.product;
  }

  // ---------- New: Cart payment info (B2B) ----------
  async cartPaymentInfo(id: string) {
    const data = await this.client.request<any>(CART_PAYMENT_INFO, { id });
    return data.cart;
  }

  // ---------- New: Pickup availability ----------
  async variantStoreAvailability(variantId: string, first = 10) {
    const data = await this.client.request<any>(VARIANT_STORE_AVAILABILITY, { id: variantId, first });
    return data.node;
  }

  // ---------- Localization ----------
  async getLocalization() {
    const data = await this.client.request<any>(LOCALIZATION);
    return data.localization;
  }

  private unwrap(payload: { cart: any; userErrors: { field: string[]; message: string }[] }) {
    if (payload.userErrors?.length) {
      throw new BadRequestException(payload.userErrors.map((e) => e.message).join('; '));
    }
    return payload.cart;
  }
}
