import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('webhook')
export class WebhookProcessor extends WorkerHost {
  private log = new Logger('WebhookProcessor');
  constructor(private prisma: PrismaService) { super(); }

  async process(job: Job<{ topic: string; shop: string; body: any }>) {
    const { topic, body } = job.data;
    this.log.log(`topic=${topic}`);

    await this.prisma.webhookEvent.create({
      data: { topic, shopifyId: String(body.id ?? ''), payload: body, status: 'PROCESSING' },
    });

    try {
      switch (topic) {
        case 'orders/create':
        case 'orders/updated':
          await this.upsertOrder(body); break;
        case 'products/create':
        case 'products/update':
          await this.upsertProduct(body); break;
        case 'customers/create':
        case 'customers/update':
          await this.upsertCustomer(body); break;
        case 'inventory_levels/update':
          await this.updateInventoryLevel(body); break;
        case 'app/uninstalled':
          this.log.warn('App uninstalled — wipe shop data per retention policy'); break;
        case 'customers/data_request':
        case 'customers/redact':
        case 'shop/redact':
          this.log.log(`GDPR ${topic} received`); break;
        default:
          this.log.warn(`Unhandled topic: ${topic}`);
      }
    } catch (err: any) {
      this.log.error(`processing failed: ${err.message}`);
      throw err;
    }
  }

  private async upsertOrder(o: any) {
    // sketch — flesh out with full mapping
    await this.prisma.order.upsert({
      where: { shopifyId: BigInt(o.id) },
      update: { financialStatus: o.financial_status, fulfillmentStatus: o.fulfillment_status, syncedAt: new Date() },
      create: {
        shopifyGid: `gid://shopify/Order/${o.id}`,
        shopifyId: BigInt(o.id),
        name: o.name,
        email: o.email,
        financialStatus: o.financial_status,
        fulfillmentStatus: o.fulfillment_status,
        totalPrice: o.total_price, subtotalPrice: o.subtotal_price,
        totalTax: o.total_tax, totalDiscounts: o.total_discounts,
        currency: o.currency,
        shippingAddress: o.shipping_address, billingAddress: o.billing_address,
        tags: (o.tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean),
        shopifyCreatedAt: new Date(o.created_at),
        shopifyUpdatedAt: new Date(o.updated_at),
      },
    });
  }

  private async upsertProduct(p: any) {
    await this.prisma.product.upsert({
      where: { shopifyId: BigInt(p.id) },
      update: { title: p.title, status: p.status?.toUpperCase() ?? 'DRAFT', syncedAt: new Date() },
      create: {
        shopifyGid: `gid://shopify/Product/${p.id}`,
        shopifyId: BigInt(p.id),
        title: p.title, handle: p.handle,
        status: (p.status ?? 'DRAFT').toUpperCase(),
        productType: p.product_type, vendor: p.vendor,
        tags: (p.tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean),
        shopifyCreatedAt: new Date(p.created_at),
        shopifyUpdatedAt: new Date(p.updated_at),
      },
    });
  }

  private async upsertCustomer(c: any) {
    await this.prisma.customer.upsert({
      where: { shopifyId: BigInt(c.id) },
      update: { email: c.email, totalSpent: c.total_spent ?? 0, ordersCount: c.orders_count ?? 0, syncedAt: new Date() },
      create: {
        shopifyGid: `gid://shopify/Customer/${c.id}`,
        shopifyId: BigInt(c.id),
        email: c.email, firstName: c.first_name, lastName: c.last_name,
        phone: c.phone,
        acceptsMarketing: c.accepts_marketing ?? false,
        totalSpent: c.total_spent ?? 0, ordersCount: c.orders_count ?? 0,
        tags: (c.tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean),
        shopifyCreatedAt: new Date(c.created_at),
      },
    });
  }

  private async updateInventoryLevel(level: any) {
    // map inventory_item_id + location_id to InventoryLevel row
    // omitted for brevity; locationId must be resolved from Shopify Location.id
  }
}
