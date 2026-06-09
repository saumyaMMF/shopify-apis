import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true, role: { select: { name: true } }, lastLoginAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: { email: string; password: string; firstName: string; lastName: string; roleId: string }) {
    const passwordHash = await argon2.hash(dto.password);
    return this.prisma.user.create({
      data: {
        email: dto.email, passwordHash,
        firstName: dto.firstName, lastName: dto.lastName, roleId: dto.roleId,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
  }

  assignRole(userId: string, roleId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { roleId } });
  }

  setActive(userId: string, isActive: boolean) {
    return this.prisma.user.update({ where: { id: userId }, data: { isActive } });
  }
}
