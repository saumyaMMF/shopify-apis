import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CustomerAccountService, ReturnRequestLineItemInput } from './customer-account.service';

@ApiTags('storefront-customer')
@Controller('storefront/customer')
export class CustomerAccountController {
  constructor(private svc: CustomerAccountService) {}

  // ---------- Profile ----------
  @Get()
  profile(@Headers('x-customer-token') token: string) {
    return this.svc.getProfile(this.req(token));
  }

  @Patch()
  updateProfile(
    @Headers('x-customer-token') token: string,
    @Body() body: { firstName?: string; lastName?: string },
  ) {
    return this.svc.updateProfile(this.req(token), body);
  }

  // ---------- Addresses ----------
  @Get('addresses')
  addresses(@Headers('x-customer-token') token: string, @Query() q: any) {
    return this.svc.listAddresses(this.req(token), q.first ? Number(q.first) : 20, q.after);
  }

  @Post('addresses')
  addressCreate(
    @Headers('x-customer-token') token: string,
    @Body() body: { address: Record<string, unknown>; defaultAddress?: boolean },
  ) {
    return this.svc.createAddress(this.req(token), body.address, body.defaultAddress);
  }

  @Patch('address')
  addressUpdate(
    @Headers('x-customer-token') token: string,
    @Query('id') id: string,
    @Body() body: { address: Record<string, unknown>; defaultAddress?: boolean },
  ) {
    return this.svc.updateAddress(this.req(token), this.requireId(id), body.address, body.defaultAddress);
  }

  @Post('address/delete')
  addressDelete(@Headers('x-customer-token') token: string, @Query('id') id: string) {
    return this.svc.deleteAddress(this.req(token), this.requireId(id));
  }

  // ---------- Orders ----------
  @Get('orders')
  orders(@Headers('x-customer-token') token: string, @Query() q: any) {
    return this.svc.listOrders(this.req(token), q.first ? Number(q.first) : 20, q.after);
  }

  @Get('order')
  order(@Headers('x-customer-token') token: string, @Query('id') id: string) {
    return this.svc.getOrder(this.req(token), this.requireId(id));
  }

  @Get('order/digital-assets')
  digital(@Headers('x-customer-token') token: string, @Query('id') id: string) {
    return this.svc.getDigitalAssets(this.req(token), this.requireId(id));
  }

  @Get('order/buy-again')
  buyAgain(@Headers('x-customer-token') token: string, @Query('id') id: string) {
    return this.svc.buyAgain(this.req(token), this.requireId(id));
  }

  @Post('order/cancel')
  cancel(
    @Headers('x-customer-token') token: string,
    @Query('id') id: string,
    @Body() body: { reason?: string; refund?: boolean; restock?: boolean },
  ) {
    return this.svc.cancelOrder(this.req(token), this.requireId(id), body ?? {});
  }

  @Patch('order/shipping-address')
  editShipping(
    @Headers('x-customer-token') token: string,
    @Query('id') id: string,
    @Body() address: Record<string, unknown>,
  ) {
    return this.svc.editShippingAddress(this.req(token), this.requireId(id), address);
  }

  // ---------- Returns ----------
  @Get('returns')
  returns(@Headers('x-customer-token') token: string, @Query() q: any) {
    return this.svc.listReturns(this.req(token), q.first ? Number(q.first) : 20, q.after);
  }

  @Post('order/return')
  requestReturn(
    @Headers('x-customer-token') token: string,
    @Query('id') id: string,
    @Body() body: { lineItems: ReturnRequestLineItemInput[] },
  ) {
    if (!body?.lineItems?.length) throw new BadRequestException('lineItems required');
    return this.svc.requestReturn(this.req(token), this.requireId(id), body.lineItems);
  }

  // Lists fulfillmentLineItem ids needed to build a return payload.
  @Get('order/returnable')
  returnable(@Headers('x-customer-token') token: string, @Query('id') id: string) {
    return this.svc.listReturnableLineItems(this.req(token), this.requireId(id));
  }

  // ---------- Subscriptions ----------
  @Get('subscriptions')
  subs(@Headers('x-customer-token') token: string, @Query() q: any) {
    return this.svc.listSubscriptions(this.req(token), q.first ? Number(q.first) : 20, q.after);
  }

  @Patch('subscription')
  updateSub(
    @Headers('x-customer-token') token: string,
    @Query('id') id: string,
    @Body() input: Record<string, unknown>,
  ) {
    return this.svc.updateSubscription(this.req(token), this.requireId(id), input);
  }

  @Post('subscription/pause')
  pauseSub(@Headers('x-customer-token') token: string, @Query('id') id: string) {
    return this.svc.pauseSubscription(this.req(token), this.requireId(id));
  }

  @Post('subscription/cancel')
  cancelSub(@Headers('x-customer-token') token: string, @Query('id') id: string) {
    return this.svc.cancelSubscription(this.req(token), this.requireId(id));
  }

  // ---------- Store credit ----------
  @Get('store-credit')
  credit(@Headers('x-customer-token') token: string) {
    return this.svc.getStoreCredit(this.req(token));
  }

  @Get('gift-cards')
  giftCards(@Headers('x-customer-token') token: string, @Query() q: any) {
    return this.svc.listGiftCards(this.req(token), q.first ? Number(q.first) : 20, q.after);
  }

  @Get('marketing-prefs')
  marketing(@Headers('x-customer-token') token: string) {
    return this.svc.marketingPrefs(this.req(token));
  }

  private req(token: string) {
    if (!token) throw new BadRequestException('Missing X-Customer-Token header');
    return token;
  }

  private requireId(id: string) {
    if (!id) throw new BadRequestException('Missing id query param (?id=...)');
    return id;
  }
}
