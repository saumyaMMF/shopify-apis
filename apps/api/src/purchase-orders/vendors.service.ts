import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface VendorDto {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: any;
  taxNumber?: string;
  paymentTerms?: string;
}

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  list() { return this.prisma.vendor.findMany({ orderBy: { name: 'asc' } }); }

  async findById(id: string) {
    const v = await this.prisma.vendor.findUnique({ where: { id } });
    if (!v) throw new NotFoundException();
    return v;
  }

  create(dto: VendorDto) { return this.prisma.vendor.create({ data: dto }); }

  update(id: string, dto: Partial<VendorDto>) {
    return this.prisma.vendor.update({ where: { id }, data: dto });
  }

  deactivate(id: string) {
    return this.prisma.vendor.update({ where: { id }, data: { isActive: false } });
  }
}
