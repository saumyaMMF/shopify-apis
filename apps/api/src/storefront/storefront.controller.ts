import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  StorefrontApiService,
  CartLineInput,
  CartLineUpdateInput,
  BuyerIdentityInput,
} from './storefront.service';
import { BannersService } from '../themes/banners.service';

@ApiTags('storefront')
@Controller('storefront')
export class StorefrontController {
  constructor(private sf: StorefrontApiService, private banners: BannersService) {}

  // ---------- Banners (public — backend uses admin token internally) ----------
  // Returns slideshow/hero blocks parsed from published theme's settings_data.json
  @Get('banners/theme')
  bannersFromTheme(@Query('template') template?: string) {
    return this.banners.fromTheme(template ?? 'index');
  }

  // Returns banner metaobjects (merchant-defined custom content type)
  @Get('banners/metaobjects')
  bannersFromMetaobjects(@Query('type') type?: string) {
    return this.banners.fromMetaobjects(type ?? 'banner');
  }

  @Get('products')
  listProducts(@Query() q: any) {
    return this.sf.listProducts({
      first: q.first ? Number(q.first) : undefined,
      after: q.after,
      query: q.q,
    });
  }

  @Get('products/:handle')
  getProduct(@Param('handle') handle: string) {
    return this.sf.getProductByHandle(handle);
  }

  @Get('collections')
  listCollections(@Query() q: any) {
    return this.sf.listCollections({
      first: q.first ? Number(q.first) : undefined,
      after: q.after,
    });
  }

  @Get('collections/:handle')
  getCollection(@Param('handle') handle: string, @Query() q: any) {
    return this.sf.getCollectionByHandle(handle, {
      first: q.first ? Number(q.first) : undefined,
      after: q.after,
    });
  }

  @Post('cart')
  cartCreate(@Body() body: { lines?: CartLineInput[]; buyerIdentity?: BuyerIdentityInput }) {
    return this.sf.cartCreate(body ?? {});
  }

  // Cart id passed as ?id= query (opaque gid has '/' and '?', breaks path routing)
  @Get('cart')
  cartGet(@Query('id') id: string) {
    return this.sf.cartGet(this.requireId(id));
  }

  @Post('cart/lines')
  cartLinesAdd(@Query('id') id: string, @Body() body: { lines: CartLineInput[] }) {
    return this.sf.cartLinesAdd(this.requireId(id), body.lines);
  }

  @Patch('cart/lines')
  cartLinesUpdate(@Query('id') id: string, @Body() body: { lines: CartLineUpdateInput[] }) {
    return this.sf.cartLinesUpdate(this.requireId(id), body.lines);
  }

  @Delete('cart/lines')
  cartLinesRemove(@Query('id') id: string, @Body() body: { lineIds: string[] }) {
    return this.sf.cartLinesRemove(this.requireId(id), body.lineIds);
  }

  @Patch('cart/buyer-identity')
  cartBuyerIdentityUpdate(@Query('id') id: string, @Body() body: BuyerIdentityInput) {
    return this.sf.cartBuyerIdentityUpdate(this.requireId(id), body);
  }

  @Patch('cart/discount-codes')
  cartDiscountCodesUpdate(@Query('id') id: string, @Body() body: { discountCodes: string[] }) {
    return this.sf.cartDiscountCodesUpdate(this.requireId(id), body.discountCodes);
  }

  @Patch('cart/note')
  cartNoteUpdate(@Query('id') id: string, @Body() body: { note: string }) {
    return this.sf.cartNoteUpdate(this.requireId(id), body.note);
  }

  @Patch('cart/attributes')
  cartAttributesUpdate(@Query('id') id: string, @Body() body: { attributes: { key: string; value: string }[] }) {
    return this.sf.cartAttributesUpdate(this.requireId(id), body.attributes);
  }

  @Patch('cart/gift-cards')
  cartGiftCardsUpdate(@Query('id') id: string, @Body() body: { giftCardCodes: string[] }) {
    return this.sf.cartGiftCardCodesUpdate(this.requireId(id), body.giftCardCodes);
  }

  // ---------- Shop / CMS ----------
  @Get('shop')
  shop() { return this.sf.getShopInfo(); }

  @Get('policies')
  policies() { return this.sf.getPolicies(); }

  @Get('menu/:handle')
  menu(@Param('handle') handle: string) { return this.sf.getMenu(handle); }

  @Get('pages')
  pages(@Query() q: any) { return this.sf.listPages(q.first ? Number(q.first) : 24, q.after); }

  @Get('pages/:handle')
  page(@Param('handle') handle: string) { return this.sf.getPage(handle); }

  @Get('blogs')
  blogs(@Query() q: any) { return this.sf.listBlogs(q.first ? Number(q.first) : 24, q.after); }

  @Get('blogs/:handle')
  blog(@Param('handle') handle: string, @Query() q: any) {
    return this.sf.getBlog(handle, q.first ? Number(q.first) : 24, q.after);
  }

  @Get('blogs/:blogHandle/articles/:articleHandle')
  article(@Param('blogHandle') b: string, @Param('articleHandle') a: string) {
    return this.sf.getArticle(b, a);
  }

  // ---------- Search ----------
  @Get('search/suggest')
  predictive(@Query() q: any) {
    if (!q.q) throw new BadRequestException('q required');
    return this.sf.predictiveSearch(q.q, q.limit ? Number(q.limit) : 6);
  }

  @Get('recommendations')
  recommendations(@Query() q: any) {
    if (!q.productId) throw new BadRequestException('productId required');
    return this.sf.recommendations(q.productId, q.intent ?? 'RELATED');
  }

  // ---------- Localization ----------
  @Get('localization')
  localization() { return this.sf.getLocalization(); }

  // ---------- New: Product reviews aggregate ----------
  @Get('products/:handle/reviews')
  productReviews(@Param('handle') handle: string) {
    return this.sf.productReviews(handle);
  }

  // ---------- New: Variant by selected options ----------
  // POST body: { handle: "the-complete-snowboard", selectedOptions: [{ name: "Color", value: "Ice" }] }
  @Post('products/variant')
  variant(@Body() body: { handle: string; selectedOptions: { name: string; value: string }[] }) {
    if (!body?.handle || !body?.selectedOptions?.length) throw new BadRequestException('handle + selectedOptions required');
    return this.sf.variantBySelectedOptions(body.handle, body.selectedOptions);
  }

  // ---------- New: Search w/ sort ----------
  @Get('search')
  search(@Query() q: any) {
    return this.sf.productsSearch({
      first: q.first ? Number(q.first) : 24,
      after: q.after,
      query: q.q,
      sortKey: q.sortKey,
      reverse: q.reverse === 'true',
    });
  }

  // ---------- New: Collection w/ filters + sort ----------
  // POST so filters can be a complex array.
  // body: { handle, first?, after?, sortKey?, reverse?, filters: [{ price: { min, max } }, { productVendor: "X" }, { tag: "y" }, { available: true }] }
  @Post('collections/filtered')
  collectionFiltered(@Body() body: any) {
    if (!body?.handle) throw new BadRequestException('handle required');
    return this.sf.collectionFiltered(body.handle, {
      first: body.first ?? 24,
      after: body.after,
      filters: body.filters,
      sortKey: body.sortKey,
      reverse: body.reverse ?? false,
    });
  }

  // ---------- New: Cart delivery groups ----------
  @Get('cart/delivery')
  cartDelivery(@Query('id') id: string) {
    return this.sf.cartDelivery(this.requireId(id));
  }

  // ---------- New: Newsletter signup ----------
  @Post('newsletter')
  newsletter(@Body() body: { email: string; firstName?: string; lastName?: string; password?: string; acceptsMarketing?: boolean }) {
    if (!body?.email) throw new BadRequestException('email required');
    return this.sf.newsletterSignup(body);
  }

  // ---------- New: Metaobjects ----------
  @Get('metaobjects')
  metaobjects(@Query() q: any) {
    if (!q.type) throw new BadRequestException('type required');
    return this.sf.listMetaobjects(q.type, q.first ? Number(q.first) : 24, q.after);
  }

  @Get('metaobject')
  metaobject(@Query() q: any) {
    if (!q.type || !q.handle) throw new BadRequestException('type + handle required');
    return this.sf.getMetaobject(q.type, q.handle);
  }

  // ---------- New: Metafields ----------
  // body: { identifiers: [{ namespace: "custom", key: "spec" }, ...] }
  @Post('products/:handle/metafields')
  productMetafields(@Param('handle') handle: string, @Body() body: { identifiers: { namespace: string; key: string }[] }) {
    if (!body?.identifiers?.length) throw new BadRequestException('identifiers required');
    return this.sf.productMetafields(handle, body.identifiers);
  }

  @Post('collections/:handle/metafields')
  collectionMetafields(@Param('handle') handle: string, @Body() body: { identifiers: { namespace: string; key: string }[] }) {
    if (!body?.identifiers?.length) throw new BadRequestException('identifiers required');
    return this.sf.collectionMetafields(handle, body.identifiers);
  }

  @Post('shop/metafields')
  shopMetafields(@Body() body: { identifiers: { namespace: string; key: string }[] }) {
    if (!body?.identifiers?.length) throw new BadRequestException('identifiers required');
    return this.sf.shopMetafields(body.identifiers);
  }

  // ---------- New: Selling plans ----------
  @Get('products/:handle/selling-plans')
  sellingPlans(@Param('handle') handle: string) {
    return this.sf.productSellingPlans(handle);
  }

  // ---------- New: Shop payment settings (already in /shop, exposed standalone) ----------
  @Get('payment-settings')
  async paymentSettings() {
    const shop: any = await this.sf.getShopInfo();
    return shop?.paymentSettings ?? null;
  }

  // ---------- New: Cart payment info (B2B) ----------
  @Get('cart/payment-info')
  cartPaymentInfo(@Query('id') id: string) {
    return this.sf.cartPaymentInfo(this.requireId(id));
  }

  // ---------- New: Pickup availability ----------
  @Get('variant/store-availability')
  storeAvailability(@Query() q: any) {
    if (!q.variantId) throw new BadRequestException('variantId required');
    return this.sf.variantStoreAvailability(q.variantId, q.first ? Number(q.first) : 10);
  }

  private requireId(id: string) {
    if (!id) throw new BadRequestException('Missing cart id query param (?id=...)');
    return id;
  }
}
