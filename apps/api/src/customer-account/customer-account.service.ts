import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { CustomerAccountClient } from './customer-account.client';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';
import {
  CUSTOMER_PROFILE,
  CUSTOMER_ORDERS,
  CUSTOMER_ORDER_DETAIL,
  CUSTOMER_RETURNS,
  CUSTOMER_GIFT_CARDS,
  CUSTOMER_PAYMENT_METHODS,
  CUSTOMER_MARKETING_PREFS,
  CUSTOMER_UPDATE,
  CUSTOMER_ADDRESSES,
  CUSTOMER_ADDRESS_CREATE,
  CUSTOMER_ADDRESS_UPDATE,
  CUSTOMER_ADDRESS_DELETE,
  CUSTOMER_SUBSCRIPTION_CONTRACTS,
  SUBSCRIPTION_CONTRACT_UPDATE,
  SUBSCRIPTION_CONTRACT_PAUSE,
  SUBSCRIPTION_CONTRACT_CANCEL,
  CUSTOMER_STORE_CREDIT,
  ORDER_DIGITAL_ASSETS,
} from './customer-account.queries';

export interface ReturnRequestLineItemInput {
  fulfillmentLineItemId: string;
  quantity: number;
  returnReason: string; // SIZE_TOO_SMALL | SIZE_TOO_LARGE | UNWANTED | DEFECTIVE | WRONG_ITEM | NOT_AS_DESCRIBED | STYLE | COLOR | OTHER
  returnReasonNote?: string;
}

// Admin GraphQL ops for cancel/edit-shipping (Customer Account API doesn't expose them).
const ADMIN_ORDER_CANCEL = /* GraphQL */ `
  mutation CustomerOrderCancel($orderId: ID!, $reason: OrderCancelReason!, $refund: Boolean!, $restock: Boolean!, $staffNote: String) {
    orderCancel(orderId: $orderId, reason: $reason, refund: $refund, restock: $restock, staffNote: $staffNote) {
      job { id done }
      userErrors { field message }
    }
  }
`;

// Get fulfillment line items so caller can pick valid ids for return.
const ADMIN_ORDER_FULFILLMENTS = /* GraphQL */ `
  query OrderFulfillments($id: ID!) {
    order(id: $id) {
      id
      displayFulfillmentStatus
      fulfillments {
        id status
        fulfillmentLineItems(first: 50) {
          edges {
            node {
              id
              quantity
              lineItem { id title sku }
            }
          }
        }
      }
    }
  }
`;

const ADMIN_RETURN_REQUEST = /* GraphQL */ `
  mutation ReturnRequest($input: ReturnRequestInput!) {
    returnRequest(input: $input) {
      return { id name status }
      userErrors { field message code }
    }
  }
`;

const ADMIN_ORDER_UPDATE_ADDRESS = /* GraphQL */ `
  mutation OrderUpdateShipping($input: OrderInput!) {
    orderUpdate(input: $input) {
      order {
        id
        shippingAddress { address1 address2 city zip provinceCode countryCode phone }
      }
      userErrors { field message }
    }
  }
`;

// Admin order detail incl customer email — used for ownership check.
const ADMIN_ORDER_OWNER = /* GraphQL */ `
  query OrderOwner($id: ID!) {
    order(id: $id) {
      id
      customer { id email }
      cancelledAt
      displayFulfillmentStatus
    }
  }
`;

@Injectable()
export class CustomerAccountService {
  constructor(private client: CustomerAccountClient, private admin: AdminGraphQLService) {}

  // Verify the order belongs to the token-bearing customer before admin op.
  private async assertOwnership(token: string, orderId: string) {
    const me: any = await this.getProfile(token);
    const myEmail = me?.emailAddress?.emailAddress?.toLowerCase();
    if (!myEmail) throw new ForbiddenException('Cannot verify customer email');
    const data: any = await this.admin.request(ADMIN_ORDER_OWNER, { id: orderId });
    const ownerEmail = data?.order?.customer?.email?.toLowerCase();
    if (!ownerEmail || ownerEmail !== myEmail) {
      throw new ForbiddenException('Order does not belong to this customer');
    }
    return data.order;
  }

  // ---------- Profile ----------
  getProfile(token: string) {
    return this.client.request(token, CUSTOMER_PROFILE).then((d: any) => d.customer);
  }

  updateProfile(token: string, input: { firstName?: string; lastName?: string }) {
    return this.client
      .request(token, CUSTOMER_UPDATE, { input })
      .then((d: any) => this.unwrap(d.customerUpdate, 'customer'));
  }

  // ---------- Addresses ----------
  listAddresses(token: string, first = 20, after?: string) {
    return this.client.request(token, CUSTOMER_ADDRESSES, { first, after }).then((d: any) => ({
      defaultAddressId: d.customer.defaultAddress?.id ?? null,
      addresses: d.customer.addresses,
    }));
  }

  createAddress(token: string, address: Record<string, unknown>, defaultAddress = false) {
    return this.client
      .request(token, CUSTOMER_ADDRESS_CREATE, { address, defaultAddress })
      .then((d: any) => this.unwrap(d.customerAddressCreate, 'customerAddress'));
  }

  updateAddress(token: string, addressId: string, address: Record<string, unknown>, defaultAddress = false) {
    return this.client
      .request(token, CUSTOMER_ADDRESS_UPDATE, { addressId, address, defaultAddress })
      .then((d: any) => this.unwrap(d.customerAddressUpdate, 'customerAddress'));
  }

  deleteAddress(token: string, addressId: string) {
    return this.client
      .request(token, CUSTOMER_ADDRESS_DELETE, { addressId })
      .then((d: any) => this.unwrap(d.customerAddressDelete, 'deletedAddressId'));
  }

  // ---------- Orders ----------
  listOrders(token: string, first = 20, after?: string) {
    return this.client.request(token, CUSTOMER_ORDERS, { first, after }).then((d: any) => d.customer.orders);
  }

  getOrder(token: string, id: string) {
    return this.client.request(token, CUSTOMER_ORDER_DETAIL, { id }).then((d: any) => d.order);
  }

  // ---------- Returns ----------
  async listReturns(token: string, first = 20, after?: string) {
    const data: any = await this.client.request(token, CUSTOMER_RETURNS, { first, after });
    const orders = data?.customer?.orders;
    // Flatten: one row per return, attach parent order info
    const rows = (orders?.edges ?? []).flatMap((oe: any) =>
      (oe.node.returns?.edges ?? []).map((re: any) => ({
        ...re.node,
        order: { id: oe.node.id, name: oe.node.name, processedAt: oe.node.processedAt },
      })),
    );
    return {
      pageInfo: orders?.pageInfo,
      returns: rows,
    };
  }

  async requestReturn(token: string, orderId: string, lineItems: ReturnRequestLineItemInput[]) {
    const owner = await this.assertOwnership(token, orderId);
    if (owner.displayFulfillmentStatus !== 'FULFILLED' && owner.displayFulfillmentStatus !== 'PARTIALLY_FULFILLED') {
      throw new BadRequestException(
        `Cannot return: order is ${owner.displayFulfillmentStatus}. Returns require a FULFILLED order.`,
      );
    }
    const data: any = await this.admin.request(ADMIN_RETURN_REQUEST, {
      input: {
        orderId,
        returnLineItems: lineItems.map((li) => ({
          fulfillmentLineItemId: li.fulfillmentLineItemId,
          quantity: li.quantity,
          returnReason: li.returnReason,
          customerNote: li.returnReasonNote, // admin field name differs
        })),
      },
    });
    return this.unwrap(data.returnRequest, 'return');
  }

  // Helper: list fulfillmentLineItemIds available for a return (caller needs these to build payload).
  async listReturnableLineItems(token: string, orderId: string) {
    await this.assertOwnership(token, orderId);
    const data: any = await this.admin.request(ADMIN_ORDER_FULFILLMENTS, { id: orderId });
    return data?.order;
  }

  // ---------- Order changes (admin-bridged + ownership check) ----------
  async cancelOrder(token: string, orderId: string, opts: { reason?: string; refund?: boolean; restock?: boolean } = {}) {
    const owner = await this.assertOwnership(token, orderId);
    if (owner.cancelledAt) throw new BadRequestException('Order already cancelled');
    if (owner.displayFulfillmentStatus && owner.displayFulfillmentStatus !== 'UNFULFILLED') {
      throw new BadRequestException(`Cannot cancel: order is ${owner.displayFulfillmentStatus}`);
    }
    const data: any = await this.admin.request(ADMIN_ORDER_CANCEL, {
      orderId,
      reason: opts.reason ?? 'CUSTOMER',
      refund: opts.refund ?? true,
      restock: opts.restock ?? true,
      staffNote: 'Cancelled by customer via storefront',
    });
    return this.unwrap(data.orderCancel, 'job');
  }

  async editShippingAddress(token: string, orderId: string, address: Record<string, unknown>) {
    const owner = await this.assertOwnership(token, orderId);
    if (owner.cancelledAt) throw new BadRequestException('Cannot edit cancelled order');
    if (owner.displayFulfillmentStatus && owner.displayFulfillmentStatus !== 'UNFULFILLED') {
      throw new BadRequestException(`Cannot edit shipping: order is ${owner.displayFulfillmentStatus}`);
    }
    // Map customer-style fields → admin MailingAddressInput
    const a: any = address;
    const shippingAddress: Record<string, unknown> = {
      address1: a.address1,
      address2: a.address2,
      city: a.city,
      zip: a.zip,
      countryCode: a.countryCode ?? a.territoryCode,
      provinceCode: a.provinceCode ?? a.zoneCode,
      phone: a.phone ?? a.phoneNumber,
      firstName: a.firstName,
      lastName: a.lastName,
      company: a.company,
    };
    Object.keys(shippingAddress).forEach((k) => shippingAddress[k] == null && delete shippingAddress[k]);

    const data: any = await this.admin.request(ADMIN_ORDER_UPDATE_ADDRESS, {
      input: { id: orderId, shippingAddress },
    });
    return this.unwrap(data.orderUpdate, 'order');
  }

  // ---------- Subscriptions ----------
  listSubscriptions(token: string, first = 20, after?: string) {
    return this.client
      .request(token, CUSTOMER_SUBSCRIPTION_CONTRACTS, { first, after })
      .then((d: any) => d.customer.subscriptionContracts);
  }

  updateSubscription(token: string, contractId: string, input: Record<string, unknown>) {
    return this.client
      .request(token, SUBSCRIPTION_CONTRACT_UPDATE, { contractId, input })
      .then((d: any) => this.unwrap(d.subscriptionContractUpdate, 'contract'));
  }

  pauseSubscription(token: string, contractId: string) {
    return this.client
      .request(token, SUBSCRIPTION_CONTRACT_PAUSE, { contractId })
      .then((d: any) => this.unwrap(d.subscriptionContractPause, 'contract'));
  }

  cancelSubscription(token: string, contractId: string) {
    return this.client
      .request(token, SUBSCRIPTION_CONTRACT_CANCEL, { contractId })
      .then((d: any) => this.unwrap(d.subscriptionContractCancel, 'contract'));
  }

  // ---------- Store credit ----------
  getStoreCredit(token: string) {
    return this.client.request(token, CUSTOMER_STORE_CREDIT).then((d: any) => d.customer.storeCreditAccounts);
  }

  // ---------- Gift cards owned by customer ----------
  listGiftCards(token: string, first = 20, after?: string) {
    return this.client.request(token, CUSTOMER_GIFT_CARDS, { first, after }).then((d: any) => d.customer.giftCards);
  }

  // ---------- Marketing preferences ----------
  marketingPrefs(token: string) {
    return this.client.request(token, CUSTOMER_MARKETING_PREFS).then((d: any) => d.customer);
  }

  // ---------- Payment methods (saved cards/wallets) ----------
  paymentMethods(token: string) {
    return this.client.request(token, CUSTOMER_PAYMENT_METHODS).then((d: any) => d.customer.paymentMethods);
  }

  // ---------- Digital assets ----------
  getDigitalAssets(token: string, orderId: string) {
    return this.client.request(token, ORDER_DIGITAL_ASSETS, { id: orderId }).then((d: any) => d.order);
  }

  // ---------- Buy again helper (returns line items so client can add to cart) ----------
  async buyAgain(token: string, orderId: string) {
    const order: any = await this.getOrder(token, orderId);
    const lines = order?.lineItems?.edges?.map((e: any) => ({
      merchandiseId: e.node.variantId, // ProductVariant gid — ready for cartLinesAdd
      title: e.node.title,
      quantity: e.node.quantity,
      sku: e.node.sku,
    })).filter((l: any) => l.merchandiseId) ?? [];
    return { orderName: order?.name, lines };
  }

  private unwrap(payload: any, key: string) {
    if (payload?.userErrors?.length) {
      throw new BadRequestException(payload.userErrors.map((e: any) => e.message).join('; '));
    }
    return payload?.[key];
  }
}
