export const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      pageInfo { hasNextPage endCursor }
      edges {
        cursor
        node {
          id handle title description vendor productType tags availableForSale
          featuredImage { url altText width height }
          priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
          images(first: 5) { edges { node { url altText } } }
        }
      }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      id handle title descriptionHtml vendor productType tags availableForSale
      featuredImage { url altText width height }
      images(first: 20) { edges { node { url altText width height } } }
      options { id name values }
      variants(first: 100) {
        edges {
          node {
            id title sku availableForSale
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            selectedOptions { name value }
            image { url altText }
          }
        }
      }
      seo { title description }
    }
  }
`;

export const COLLECTIONS_QUERY = /* GraphQL */ `
  query Collections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        cursor
        node {
          id handle title description
          image { url altText }
        }
      }
    }
  }
`;

export const COLLECTION_BY_HANDLE_QUERY = /* GraphQL */ `
  query CollectionByHandle($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      id handle title descriptionHtml
      image { url altText }
      products(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          cursor
          node {
            id handle title vendor availableForSale
            featuredImage { url altText }
            priceRange { minVariantPrice { amount currencyCode } }
          }
        }
      }
    }
  }
`;

const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
      totalTaxAmount { amount currencyCode }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id title sku
              price { amount currencyCode }
              image { url altText }
              product { id handle title featuredImage { url altText } }
              selectedOptions { name value }
            }
          }
          cost { totalAmount { amount currencyCode } }
        }
      }
    }
    buyerIdentity { email phone countryCode }
  }
`;

export const CART_CREATE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartCreate($input: CartInput) {
    cartCreate(input: $input) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

export const CART_GET = /* GraphQL */ `
  ${CART_FRAGMENT}
  query CartGet($id: ID!) {
    cart(id: $id) { ...CartFields }
  }
`;

export const CART_LINES_ADD = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

export const CART_LINES_UPDATE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

export const CART_LINES_REMOVE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

export const CART_BUYER_IDENTITY_UPDATE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

export const CART_DISCOUNT_CODES_UPDATE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

export const CART_NOTE_UPDATE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartNoteUpdate($cartId: ID!, $note: String!) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

export const CART_ATTRIBUTES_UPDATE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

export const CART_GIFT_CARDS_UPDATE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartGiftCardCodesUpdate($cartId: ID!, $giftCardCodes: [String!]!) {
    cartGiftCardCodesUpdate(cartId: $cartId, giftCardCodes: $giftCardCodes) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

// ---------------- Shop / CMS ----------------
export const SHOP_INFO = /* GraphQL */ `
  query ShopInfo {
    shop {
      name
      description
      primaryDomain { url host }
      brand {
        logo { image { url altText } }
        colors {
          primary { background foreground }
          secondary { background foreground }
        }
      }
      paymentSettings {
        currencyCode
        enabledPresentmentCurrencies
        acceptedCardBrands
        supportedDigitalWallets
        countryCode
      }
    }
  }
`;

export const SHOP_POLICIES = /* GraphQL */ `
  query ShopPolicies {
    shop {
      privacyPolicy { id title handle body url }
      refundPolicy { id title handle body url }
      shippingPolicy { id title handle body url }
      termsOfService { id title handle body url }
      subscriptionPolicy { id title handle body url }
    }
  }
`;

export const MENU_BY_HANDLE = /* GraphQL */ `
  query MenuByHandle($handle: String!) {
    menu(handle: $handle) {
      id title handle
      items {
        id title url type resourceId
        items {
          id title url type resourceId
          items { id title url type resourceId }
        }
      }
    }
  }
`;

export const PAGES_LIST = /* GraphQL */ `
  query PagesList($first: Int!, $after: String) {
    pages(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges { cursor node { id title handle bodySummary onlineStoreUrl } }
    }
  }
`;

export const PAGE_BY_HANDLE = /* GraphQL */ `
  query PageByHandle($handle: String!) {
    page(handle: $handle) {
      id title handle body bodySummary
      seo { title description }
      createdAt updatedAt
    }
  }
`;

export const BLOGS_LIST = /* GraphQL */ `
  query BlogsList($first: Int!, $after: String) {
    blogs(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges { cursor node { id title handle } }
    }
  }
`;

export const BLOG_BY_HANDLE = /* GraphQL */ `
  query BlogByHandle($handle: String!, $first: Int!, $after: String) {
    blog(handle: $handle) {
      id title handle
      articles(first: $first, after: $after, sortKey: PUBLISHED_AT, reverse: true) {
        pageInfo { hasNextPage endCursor }
        edges {
          cursor
          node {
            id title handle excerpt publishedAt
            image { url altText }
            author: authorV2 { name }
            tags
          }
        }
      }
    }
  }
`;

export const ARTICLE_BY_HANDLE = /* GraphQL */ `
  query ArticleByHandle($blogHandle: String!, $articleHandle: String!) {
    blog(handle: $blogHandle) {
      articleByHandle(handle: $articleHandle) {
        id title handle contentHtml publishedAt
        image { url altText }
        author: authorV2 { name email }
        tags
        seo { title description }
      }
    }
  }
`;

// ---------------- Search / Discovery ----------------
export const PREDICTIVE_SEARCH = /* GraphQL */ `
  query PredictiveSearch($query: String!, $limit: Int) {
    predictiveSearch(query: $query, limit: $limit, types: [PRODUCT, COLLECTION, ARTICLE, PAGE, QUERY]) {
      products {
        id title handle
        featuredImage { url altText }
        priceRange { minVariantPrice { amount currencyCode } }
      }
      collections { id title handle }
      articles { id title handle }
      pages { id title handle }
      queries { text styledText }
    }
  }
`;

export const PRODUCT_RECOMMENDATIONS = /* GraphQL */ `
  query ProductRecommendations($productId: ID!, $intent: ProductRecommendationIntent) {
    productRecommendations(productId: $productId, intent: $intent) {
      id title handle
      featuredImage { url altText }
      priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
      availableForSale
    }
  }
`;

// ---------------- New: Variant lookup by selected options ----------------
export const VARIANT_BY_SELECTED_OPTIONS = /* GraphQL */ `
  query VariantBySelectedOptions($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
    product(handle: $handle) {
      variantBySelectedOptions(selectedOptions: $selectedOptions) {
        id title sku availableForSale
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        image { url altText }
        selectedOptions { name value }
      }
    }
  }
`;

// ---------------- New: Products w/ sort ----------------
export const PRODUCTS_SEARCH = /* GraphQL */ `
  query ProductsSearch($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
      pageInfo { hasNextPage endCursor }
      edges {
        cursor
        node {
          id handle title description vendor productType tags availableForSale
          featuredImage { url altText width height }
          priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
        }
      }
    }
  }
`;

// ---------------- New: Collection w/ filters + sort ----------------
export const COLLECTION_FILTERED = /* GraphQL */ `
  query CollectionFiltered(
    $handle: String!
    $first: Int!
    $after: String
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
  ) {
    collection(handle: $handle) {
      id handle title
      products(first: $first, after: $after, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
        pageInfo { hasNextPage endCursor }
        filters {
          id label type
          values { id label count input }
        }
        edges {
          cursor
          node {
            id handle title vendor availableForSale
            featuredImage { url altText }
            priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
          }
        }
      }
    }
  }
`;

// ---------------- New: Cart delivery groups ----------------
export const CART_DELIVERY = /* GraphQL */ `
  query CartDelivery($id: ID!) {
    cart(id: $id) {
      id
      cost {
        subtotalAmount { amount currencyCode }
        totalAmount { amount currencyCode }
        totalTaxAmount { amount currencyCode }
        totalDutyAmount { amount currencyCode }
      }
      deliveryGroups(first: 10) {
        edges {
          node {
            id groupType
            deliveryAddress { address1 city zip countryCode }
            deliveryOptions {
              handle title code
              estimatedCost { amount currencyCode }
              deliveryMethodType
            }
            selectedDeliveryOption { handle title }
          }
        }
      }
    }
  }
`;

// ---------------- New: Newsletter (customerCreate via Storefront API) ----------------
export const CUSTOMER_CREATE_SF = /* GraphQL */ `
  mutation NewsletterSignup($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer { id email firstName lastName acceptsMarketing }
      customerUserErrors { field message code }
    }
  }
`;

// ---------------- New: Metaobjects ----------------
export const METAOBJECTS_LIST = /* GraphQL */ `
  query MetaobjectsList($type: String!, $first: Int!, $after: String) {
    metaobjects(type: $type, first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        cursor
        node {
          id handle type updatedAt
          fields { key value type reference { ... on MediaImage { image { url altText } } } }
        }
      }
    }
  }
`;

export const METAOBJECT_BY_HANDLE = /* GraphQL */ `
  query MetaobjectByHandle($type: String!, $handle: String!) {
    metaobject(handle: { type: $type, handle: $handle }) {
      id handle type updatedAt
      fields {
        key value type
        reference {
          __typename
          ... on MediaImage { image { url altText width height } }
          ... on Product { id handle title }
          ... on Collection { id handle title }
          ... on Page { id handle title }
        }
      }
    }
  }
`;

// ---------------- New: Metafields ----------------
export const PRODUCT_METAFIELDS = /* GraphQL */ `
  query ProductMetafields($handle: String!, $identifiers: [HasMetafieldsIdentifier!]!) {
    product(handle: $handle) {
      id handle title
      metafields(identifiers: $identifiers) {
        id namespace key type value
        reference {
          __typename
          ... on MediaImage { image { url altText } }
          ... on Product { id handle title }
          ... on Metaobject { id handle type }
        }
      }
    }
  }
`;

export const COLLECTION_METAFIELDS = /* GraphQL */ `
  query CollectionMetafields($handle: String!, $identifiers: [HasMetafieldsIdentifier!]!) {
    collection(handle: $handle) {
      id handle title
      metafields(identifiers: $identifiers) {
        id namespace key type value
        reference { __typename ... on MediaImage { image { url altText } } }
      }
    }
  }
`;

export const SHOP_METAFIELDS = /* GraphQL */ `
  query ShopMetafields($identifiers: [HasMetafieldsIdentifier!]!) {
    shop {
      metafields(identifiers: $identifiers) {
        id namespace key type value
        reference { __typename ... on MediaImage { image { url altText } } }
      }
    }
  }
`;

// ---------------- New: Selling plans (subscriptions) on product ----------------
export const PRODUCT_SELLING_PLANS = /* GraphQL */ `
  query ProductSellingPlans($handle: String!) {
    product(handle: $handle) {
      id handle title
      sellingPlanGroups(first: 10) {
        edges {
          node {
            appName name
            options { name values }
            sellingPlans(first: 20) {
              edges {
                node {
                  id name description recurringDeliveries
                  priceAdjustments {
                    orderCount
                    adjustmentValue {
                      __typename
                      ... on SellingPlanFixedAmountPriceAdjustment { adjustmentAmount { amount currencyCode } }
                      ... on SellingPlanFixedPriceAdjustment { price { amount currencyCode } }
                      ... on SellingPlanPercentagePriceAdjustment { adjustmentPercentage }
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

// ---------------- New: Variant store availability (pickup) ----------------
export const VARIANT_STORE_AVAILABILITY = /* GraphQL */ `
  query VariantStoreAvailability($id: ID!, $first: Int!) {
    node(id: $id) {
      ... on ProductVariant {
        id title sku
        storeAvailability(first: $first) {
          edges {
            node {
              available pickUpTime
              location { name address { address1 city zip countryCode } }
            }
          }
        }
      }
    }
  }
`;

// ---------------- Localization ----------------
export const LOCALIZATION = /* GraphQL */ `
  query Localization {
    localization {
      country { isoCode name currency { isoCode symbol } }
      language { isoCode name endonymName }
      availableCountries { isoCode name currency { isoCode } }
      availableLanguages { isoCode name endonymName }
    }
  }
`;
