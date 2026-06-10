import { Injectable } from '@nestjs/common';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const POLICIES_QUERY = `
  query ShopPolicies {
    shop {
      shopPolicies {
        id
        type
        title
        body
        url
        createdAt
        updatedAt
      }
    }
  }
`;

const POLICY_UPDATE = `
  mutation shopPolicyUpdate($shopPolicy: ShopPolicyInput!) {
    shopPolicyUpdate(shopPolicy: $shopPolicy) {
      shopPolicy { id type title body url }
      userErrors { field message }
    }
  }
`;

@Injectable()
export class PoliciesService {
  constructor(private gql: AdminGraphQLService) {}

  async list() {
    const data: any = await this.gql.request(POLICIES_QUERY);
    return data.shop.shopPolicies;
  }

  /**
   * type = REFUND_POLICY | PRIVACY_POLICY | TERMS_OF_SERVICE | SHIPPING_POLICY |
   *        SUBSCRIPTION_POLICY | LEGAL_NOTICE | TERMS_OF_SALE | CONTACT_INFORMATION
   */
  async update(type: string, body: string) {
    const data: any = await this.gql.request(POLICY_UPDATE, {
      shopPolicy: { type, body },
    });
    const ue = data.shopPolicyUpdate.userErrors;
    if (ue?.length) throw new Error(JSON.stringify(ue));
    return data.shopPolicyUpdate.shopPolicy;
  }
}
