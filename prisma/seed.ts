import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PERMISSIONS: { key: string; resource: string; action: string }[] = [
  // catalog
  { key: 'product.read',       resource: 'product',   action: 'read' },
  { key: 'product.create',     resource: 'product',   action: 'create' },
  { key: 'product.update',     resource: 'product',   action: 'update' },
  { key: 'product.delete',     resource: 'product',   action: 'delete' },
  { key: 'product.bulkImport', resource: 'product',   action: 'bulkImport' },
  { key: 'collection.manage',  resource: 'collection',action: 'manage' },
  // inventory
  { key: 'inventory.read',     resource: 'inventory', action: 'read' },
  { key: 'inventory.adjust',   resource: 'inventory', action: 'adjust' },
  { key: 'inventory.transfer', resource: 'inventory', action: 'transfer' },
  // orders
  { key: 'order.read',         resource: 'order',     action: 'read' },
  { key: 'order.fulfill',      resource: 'order',     action: 'fulfill' },
  { key: 'order.refund',       resource: 'order',     action: 'refund' },
  { key: 'order.draft',        resource: 'order',     action: 'draft' },
  // customers
  { key: 'customer.read',      resource: 'customer',  action: 'read' },
  { key: 'customer.update',    resource: 'customer',  action: 'update' },
  { key: 'segment.manage',     resource: 'segment',   action: 'manage' },
  // PO
  { key: 'po.read',            resource: 'po',        action: 'read' },
  { key: 'po.create',          resource: 'po',        action: 'create' },
  { key: 'po.approve',         resource: 'po',        action: 'approve' },
  { key: 'po.receive',         resource: 'po',        action: 'receive' },
  { key: 'vendor.manage',      resource: 'vendor',    action: 'manage' },
  // cms
  { key: 'cms.read',           resource: 'cms',       action: 'read' },
  { key: 'cms.publish',        resource: 'cms',       action: 'publish' },
  // media
  { key: 'media.upload',       resource: 'media',     action: 'upload' },
  { key: 'media.delete',       resource: 'media',     action: 'delete' },
  // reports + settings + audit
  { key: 'reports.view',       resource: 'reports',   action: 'view' },
  { key: 'settings.update',    resource: 'settings',  action: 'update' },
  { key: 'audit.view',         resource: 'audit',     action: 'view' },
  // user mgmt
  { key: 'user.manage',        resource: 'user',      action: 'manage' },
  { key: 'role.manage',        resource: 'role',      action: 'manage' },
];

const ROLES = {
  admin:   PERMISSIONS.map(p => p.key),
  manager: PERMISSIONS.map(p => p.key).filter(k => !k.startsWith('user.') && !k.startsWith('role.')),
  staff: [
    'product.read','product.update',
    'inventory.read',
    'order.read','order.fulfill',
    'po.read','po.receive',
    'customer.read',
    'cms.read',
    'media.upload',
  ],
  viewer: PERMISSIONS.map(p => p.key).filter(k => k.endsWith('.read') || k === 'reports.view'),
};

async function main() {
  console.log('▶ Seeding permissions');
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key: p.key }, update: {}, create: p });
  }

  console.log('▶ Seeding roles');
  for (const [name, perms] of Object.entries(ROLES)) {
    const permRecords = await prisma.permission.findMany({ where: { key: { in: perms } } });
    await prisma.role.upsert({
      where: { name },
      update: { permissions: { set: permRecords.map(p => ({ id: p.id })) } },
      create: {
        name,
        description: `${name} role`,
        isSystem: true,
        permissions: { connect: permRecords.map(p => ({ id: p.id })) },
      },
    });
  }

  console.log('▶ Seeding admin user');
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });
  const passwordHash = await argon2.hash('Admin@12345');
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      roleId: adminRole.id,
    },
  });

  console.log('✓ Seed complete. Login: admin@example.com / Admin@12345');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
