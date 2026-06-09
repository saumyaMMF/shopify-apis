import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  all() { return this.prisma.setting.findMany(); }
  get(key: string) { return this.prisma.setting.findUnique({ where: { key } }); }
  set(key: string, value: any, userId: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value, updatedBy: userId },
      create: { key, value, updatedBy: userId },
    });
  }
}
