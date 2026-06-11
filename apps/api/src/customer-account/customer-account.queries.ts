// Customer Account API GraphQL operations.
// Endpoint: https://shopify.com/{shop_id}/account/customer/api/{version}/graphql
// Auth: Authorization: Bearer <customer access token from OAuth>

export const CUSTOMER_PROFILE = /* GraphQL */ `
  query CustomerProfile {
    customer {
      id
      firstName
      lastName
      displayName
      emailAddress { emailAddress }
      phoneNumber { phoneNumber }
      defaultAddress {
        id firstName lastName address1 address2 city zoneCode territoryCode zip phoneNumber company
      }
      creationDate
    }
  }
`;

export const CUSTOMER_ORDERS = /* GraphQL */ `
  query CustomerOrders($first: Int!, $after: String) {
    customer {
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
        pageInfo { hasNextPage endCursor }
        edges {
          cursor
          node {
            id
            name
            number
            processedAt
            financialStatus
            fulfillmentStatus
            totalPrice { amount currencyCode }
            subtotal { amount currencyCode }
            totalShipping { amount currencyCode }
            totalTax { amount currencyCode }
            statusPageUrl
            lineItems(first: 50) {
              edges {
                node {
                  id title quantity sku
                  variantTitle
                  image { url altText }
                  price { amount currencyCode }
                  totalPrice { amount currencyCode }
                }
              }
            }
            shippingAddress { firstName lastName address1 address2 city zip territoryCode }
            fulfillments(first: 10) {
              nodes {
                id status
                trackingInformation { number url company }
                latestShipmentStatus
              }
            }
          }
        }
      }
    }
  }
`;

export const CUSTOMER_ORDER_DETAIL = /* GraphQL */ `
  query CustomerOrder($id: ID!) {
    order(id: $id) {
      id name number processedAt
      financialStatus fulfillmentStatus
      totalPrice { amount currencyCode }
      subtotal { amount currencyCode }
      totalShipping { amount currencyCode }
      totalTax { amount currencyCode }
      statusPageUrl
      note
      lineItems(first: 100) {
        edges {
          node {
            id title quantity sku variantTitle
            variantId
            image { url altText }
            price { amount currencyCode }
            totalPrice { amount currencyCode }
          }
        }
      }
      shippingAddress { firstName lastName address1 address2 city zip territoryCode phoneNumber }
      billingAddress { firstName lastName address1 address2 city zip territoryCode }
      fulfillments(first: 10) {
        nodes {
          id status latestShipmentStatus
          trackingInformation { number url company }
        }
      }
    }
  }
`;

// Customer Account API has no top-level customer.returns. Returns live per-order.
// Walk recent orders and aggregate.
export const CUSTOMER_RETURNS = /* GraphQL */ `
  query CustomerReturns($first: Int!, $after: String) {
    customer {
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
        pageInfo { hasNextPage endCursor }
        edges {
          cursor
          node {
            id name processedAt
            returns(first: 20) {
              edges {
                node {
                  id name status
                  returnLineItems(first: 50) {
                    edges {
                      node {
                        id quantity returnReason
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Customer Account API does not expose returnRequest. Bridged via admin.
export const RETURN_REQUEST = '';

export const ORDER_CANCEL = /* GraphQL */ `
  mutation OrderCancel($orderId: ID!, $reason: OrderCancelReason!, $refund: Boolean!, $restock: Boolean!) {
    orderCancel(orderId: $orderId, reason: $reason, refund: $refund, restock: $restock) {
      job { id done }
      userErrors { field message code }
    }
  }
`;

export const ORDER_EDIT_SHIPPING_ADDRESS = /* GraphQL */ `
  mutation OrderEditShippingAddress($orderId: ID!, $address: CustomerAddressInput!) {
    orderEditShippingAddress(orderId: $orderId, address: $address) {
      order { id shippingAddress { address1 city zip } }
      userErrors { field message code }
    }
  }
`;

export const CUSTOMER_SUBSCRIPTION_CONTRACTS = /* GraphQL */ `
  query CustomerSubscriptions($first: Int!, $after: String) {
    customer {
      subscriptionContracts(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          cursor
          node {
            id status
            createdAt
            nextBillingDate
            lines(first: 20) {
              edges {
                node {
                  id title quantity
                  currentPrice { amount currencyCode }
                  variantImage { url altText }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const SUBSCRIPTION_CONTRACT_UPDATE = /* GraphQL */ `
  mutation SubscriptionContractUpdate($contractId: ID!, $input: SubscriptionContractInput!) {
    subscriptionContractUpdate(contractId: $contractId, input: $input) {
      contract { id status nextBillingDate }
      userErrors { field message code }
    }
  }
`;

export const SUBSCRIPTION_CONTRACT_PAUSE = /* GraphQL */ `
  mutation SubscriptionContractPause($contractId: ID!) {
    subscriptionContractPause(contractId: $contractId) {
      contract { id status }
      userErrors { field message code }
    }
  }
`;

export const SUBSCRIPTION_CONTRACT_CANCEL = /* GraphQL */ `
  mutation SubscriptionContractCancel($contractId: ID!) {
    subscriptionContractCancel(contractId: $contractId) {
      contract { id status }
      userErrors { field message code }
    }
  }
`;

export const CUSTOMER_STORE_CREDIT = /* GraphQL */ `
  query CustomerStoreCredit {
    customer {
      storeCreditAccounts(first: 20) {
        edges {
          node {
            id
            balance { amount currencyCode }
          }
        }
      }
    }
  }
`;

// Customer Account API does NOT expose digital download URLs.
// Shopify Digital Downloads app emails the customer a signed link instead.
// We surface statusPageUrl — the order page hosts the download buttons.
export const CUSTOMER_UPDATE = /* GraphQL */ `
  mutation CustomerUpdate($input: CustomerUpdateInput!) {
    customerUpdate(input: $input) {
      customer {
        id firstName lastName
        emailAddress { emailAddress }
        phoneNumber { phoneNumber }
      }
      userErrors { field message }
    }
  }
`;

export const CUSTOMER_ADDRESSES = /* GraphQL */ `
  query CustomerAddresses($first: Int!, $after: String) {
    customer {
      defaultAddress { id }
      addresses(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          cursor
          node {
            id firstName lastName company
            address1 address2 city zip
            territoryCode zoneCode
            phoneNumber
          }
        }
      }
    }
  }
`;

export const CUSTOMER_ADDRESS_CREATE = /* GraphQL */ `
  mutation CustomerAddressCreate($address: CustomerAddressInput!, $defaultAddress: Boolean) {
    customerAddressCreate(address: $address, defaultAddress: $defaultAddress) {
      customerAddress { id address1 city zip territoryCode }
      userErrors { field message code }
    }
  }
`;

export const CUSTOMER_ADDRESS_UPDATE = /* GraphQL */ `
  mutation CustomerAddressUpdate($addressId: ID!, $address: CustomerAddressInput!, $defaultAddress: Boolean) {
    customerAddressUpdate(addressId: $addressId, address: $address, defaultAddress: $defaultAddress) {
      customerAddress { id address1 city zip territoryCode }
      userErrors { field message code }
    }
  }
`;

export const CUSTOMER_ADDRESS_DELETE = /* GraphQL */ `
  mutation CustomerAddressDelete($addressId: ID!) {
    customerAddressDelete(addressId: $addressId) {
      deletedAddressId
      userErrors { field message code }
    }
  }
`;

export const CUSTOMER_GIFT_CARDS = /* GraphQL */ `
  query CustomerGiftCards($first: Int!, $after: String) {
    customer {
      giftCards(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          cursor
          node {
            id
            balance { amount currencyCode }
            initialValue { amount currencyCode }
            lastCharacters
            enabled
            expiresOn
          }
        }
      }
    }
  }
`;

export const CUSTOMER_PAYMENT_METHODS = /* GraphQL */ `
  query CustomerPaymentMethods {
    customer {
      paymentMethods(first: 20) {
        edges {
          node {
            id
            instrument {
              __typename
              ... on CustomerCreditCard {
                brand
                lastDigits
                expiryMonth
                expiryYear
                billingAddress { city zip countryCode }
              }
              ... on CustomerPaypalBillingAgreement {
                paypalAccountEmail
              }
              ... on CustomerShopPayAgreement {
                lastDigits
                expiryMonth
                expiryYear
              }
            }
          }
        }
      }
    }
  }
`;

export const CUSTOMER_MARKETING_PREFS = /* GraphQL */ `
  query CustomerMarketingPrefs {
    customer {
      emailAddress {
        emailAddress
        marketingState
        marketingUpdatedAt
      }
      phoneNumber {
        phoneNumber
        marketingState
        marketingUpdatedAt
      }
    }
  }
`;

export const ORDER_DIGITAL_ASSETS = /* GraphQL */ `
  query OrderStatus($id: ID!) {
    order(id: $id) {
      id name statusPageUrl
      lineItems(first: 100) {
        edges {
          node { id title quantity requiresShipping }
        }
      }
    }
  }
`;
