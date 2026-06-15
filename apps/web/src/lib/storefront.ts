import axios, { AxiosError } from 'axios';

// Storefront client — no JWT, no withCredentials. Uses Next.js rewrite to NestJS.
export const sf = axios.create({
  baseURL: '/api/backend/storefront',
  timeout: 15000, // fail fast instead of hanging the UI
});

// Customer token (passed as X-Customer-Token header) — read from localStorage on every request.
sf.interceptors.request.use((cfg) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('customer_token');
    if (t) cfg.headers['X-Customer-Token'] = t;
  }
  return cfg;
});

// Retry transient failures (network error / timeout / 5xx) up to 2 times with
// backoff. Mutations (POST/PATCH/DELETE) are NOT retried to avoid duplicates.
const MAX_RETRIES = 2;
sf.interceptors.response.use(undefined, async (error: AxiosError) => {
  const cfg: any = error.config ?? {};
  const method = (cfg.method ?? 'get').toLowerCase();
  const isIdempotent = method === 'get' || method === 'head';
  const status = error.response?.status;
  const transient = !error.response || error.code === 'ECONNABORTED' || (status != null && status >= 500);

  if (isIdempotent && transient) {
    cfg.__retryCount = (cfg.__retryCount ?? 0) + 1;
    if (cfg.__retryCount <= MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 300 * cfg.__retryCount));
      return sf(cfg);
    }
  }
  return Promise.reject(error);
});

// Normalize an axios error to a user-safe message.
export function apiErrorMessage(err: unknown): string {
  const e = err as AxiosError<any>;
  if (e?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (!e?.response) return 'Network error. Check your connection and try again.';
  return e.response.data?.message ?? 'Something went wrong. Please try again.';
}

// ---------- Types ----------
export interface Money { amount: string; currencyCode: string }
export interface Img { url: string; altText?: string | null; width?: number; height?: number }
export interface Variant {
  id: string;
  title: string;
  sku?: string | null;
  availableForSale: boolean;
  price: Money;
  compareAtPrice?: Money | null;
  image?: Img | null;
  selectedOptions: { name: string; value: string }[];
}
export interface ProductCard {
  id: string;
  handle: string;
  title: string;
  vendor?: string;
  availableForSale: boolean;
  featuredImage?: Img | null;
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
}
export interface CartLine {
  id: string;
  quantity: number;
  merchandise: Variant & { product: { id: string; handle: string; title: string; featuredImage?: Img | null } };
  cost: { totalAmount: Money };
}
export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount?: Money | null;
  };
  lines: { edges: { node: CartLine }[] };
  buyerIdentity: { email?: string | null; phone?: string | null; countryCode?: string | null };
}

// ---------- Cart id persistence ----------
const CART_KEY = 'cart_id';
export const cartStore = {
  get(): string | null { return typeof window !== 'undefined' ? localStorage.getItem(CART_KEY) : null; },
  set(id: string) { if (typeof window !== 'undefined') localStorage.setItem(CART_KEY, id); },
  clear() { if (typeof window !== 'undefined') localStorage.removeItem(CART_KEY); },
};
const CUSTOMER_KEY = 'customer_token';
export const customerStore = {
  get(): string | null { return typeof window !== 'undefined' ? localStorage.getItem(CUSTOMER_KEY) : null; },
  set(t: string) { if (typeof window !== 'undefined') localStorage.setItem(CUSTOMER_KEY, t); },
  clear() { if (typeof window !== 'undefined') localStorage.removeItem(CUSTOMER_KEY); },
};

// ---------- API helpers ----------
export const StorefrontAPI = {
  // Catalog
  shop: () => sf.get('/shop').then((r) => r.data),
  banners: (template = 'index') => sf.get('/banners/theme', { params: { template } }).then((r) => r.data),
  menu: (handle: string) => sf.get(`/menu/${handle}`).then((r) => r.data),
  products: (params: { first?: number; after?: string; q?: string } = {}) =>
    sf.get('/products', { params: { first: 24, ...params } }).then((r) => r.data),
  product: (handle: string) => sf.get(`/products/${handle}`).then((r) => r.data),
  collections: (params: { first?: number; after?: string } = {}) =>
    sf.get('/collections', { params: { first: 24, ...params } }).then((r) => r.data),
  collection: (handle: string, params: { first?: number; after?: string } = {}) =>
    sf.get(`/collections/${handle}`, { params: { first: 24, ...params } }).then((r) => r.data),
  recommendations: (productId: string, intent = 'RELATED') =>
    sf.get('/recommendations', { params: { productId, intent } }).then((r) => r.data),
  predictiveSearch: (q: string, limit = 6) =>
    sf.get('/search/suggest', { params: { q, limit } }).then((r) => r.data),

  // Cart
  cartCreate: (lines: { merchandiseId: string; quantity: number }[]) =>
    sf.post<Cart>('/cart', { lines }).then((r) => r.data),
  cartGet: (id: string) => sf.get<Cart>('/cart', { params: { id } }).then((r) => r.data),
  cartLinesAdd: (id: string, lines: { merchandiseId: string; quantity: number }[]) =>
    sf.post<Cart>('/cart/lines', { lines }, { params: { id } }).then((r) => r.data),
  cartLinesUpdate: (id: string, lines: { id: string; quantity: number }[]) =>
    sf.patch<Cart>('/cart/lines', { lines }, { params: { id } }).then((r) => r.data),
  cartLinesRemove: (id: string, lineIds: string[]) =>
    sf.delete<Cart>('/cart/lines', { data: { lineIds }, params: { id } }).then((r) => r.data),

  // Customer
  customerProfile: () => sf.get('/customer').then((r) => r.data),
  customerOrders: () => sf.get('/customer/orders', { params: { first: 20 } }).then((r) => r.data),
  customerOrder: (id: string) => sf.get('/customer/order', { params: { id } }).then((r) => r.data),
  customerAddresses: () => sf.get('/customer/addresses').then((r) => r.data),

  // Pages (with custom fields / metafields)
  page: (handle: string) =>
    sf
      .get<{
        id: string;
        title: string;
        handle: string;
        body: string;
        bodySummary: string;
        seo: { title: string | null; description: string | null };
        metafields: { namespace: string; key: string; value: string; type: string }[];
        customFields: Record<string, any>;
      }>(`/pages/${handle}`)
      .then((r) => r.data),

  // Reviews
  productReviews: (handle: string) =>
    sf.get<{ rating: number | null; count: number; scaleMin: number; scaleMax: number }>(`/products/${handle}/reviews`).then((r) => r.data),

  // Submit a review (Judge.me)
  createReview: (
    handle: string,
    review: { name: string; email: string; rating: number; body: string; title?: string },
  ) => sf.post<{ ok: boolean }>(`/products/${handle}/reviews`, review).then((r) => r.data),

  // Full review list (Judge.me)
  productReviewList: (handle: string, page = 1) =>
    sf
      .get<{
        configured: boolean;
        reviews: { id: number; rating: number; title: string; body: string; name: string; verified: boolean; createdAt: string; pictures: string[]; reply: string | null }[];
        currentPage: number;
        perPage: number;
      }>(`/products/${handle}/reviews/list`, { params: { page } })
      .then((r) => r.data),
};

// ---------- Ensure cart exists ----------
export async function ensureCart(firstLine?: { merchandiseId: string; quantity: number }): Promise<Cart> {
  let id = cartStore.get();
  if (!id) {
    const cart = await StorefrontAPI.cartCreate(firstLine ? [firstLine] : []);
    cartStore.set(cart.id);
    return cart;
  }
  try {
    return await StorefrontAPI.cartGet(id);
  } catch {
    cartStore.clear();
    const cart = await StorefrontAPI.cartCreate(firstLine ? [firstLine] : []);
    cartStore.set(cart.id);
    return cart;
  }
}
