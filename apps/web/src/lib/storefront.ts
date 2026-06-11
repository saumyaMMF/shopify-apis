import axios from 'axios';

// Storefront client — no JWT, no withCredentials. Uses Next.js rewrite to NestJS.
export const sf = axios.create({ baseURL: '/api/backend/storefront' });

// Customer token (passed as X-Customer-Token header) — read from localStorage on every request.
sf.interceptors.request.use((cfg) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('customer_token');
    if (t) cfg.headers['X-Customer-Token'] = t;
  }
  return cfg;
});

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

  // Pages
  page: (handle: string) => sf.get(`/pages/${handle}`).then((r) => r.data),
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
