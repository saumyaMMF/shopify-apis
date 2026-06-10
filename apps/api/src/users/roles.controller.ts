import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class RolesController {
  constructor(private prisma: PrismaService) {}

  @Get('roles')
  @RequirePermissions('role.manage')
  list() {
    return this.prisma.role.findMany({
      include: { permissions: { select: { key: true } }, _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
  }

  @Get('roles/:id')
  @RequirePermissions('role.manage')
  get(@Param('id') id: string) {
    return this.prisma.role.findUnique({
      where: { id },
      include: { permissions: true, users: { select: { id: true, email: true } } },
    });
  }

  @Post('roles')
  @RequirePermissions('role.manage')
  async create(@Body() body: { name: string; description?: string; permissionKeys: string[] }) {
    const perms = await this.prisma.permission.findMany({
      where: { key: { in: body.permissionKeys } },
    });
    return this.prisma.role.create({
      data: {
        name: body.name,
        description: body.description,
        permissions: { connect: perms.map((p) => ({ id: p.id })) },
      },
    });
  }

  @Patch('roles/:id')
  @RequirePermissions('role.manage')
  async update(@Param('id') id: string, @Body() body: { description?: string; permissionKeys?: string[] }) {
    const data: any = {};
    if (body.description !== undefined) data.description = body.description;
    if (body.permissionKeys) {
      const perms = await this.prisma.permission.findMany({
        where: { key: { in: body.permissionKeys } },
      });
      data.permissions = { set: perms.map((p) => ({ id: p.id })) };
    }
    return this.prisma.role.update({ where: { id }, data, include: { permissions: true } });
  }

  @Get('permissions')
  @RequirePermissions('role.manage')
  permissions() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }
}
