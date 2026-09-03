import { Injectable } from '@nestjs/common';
import { Rider } from '@rydtrip/event-schema';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiderDto } from './dto/create-rider.dto';
import { UpdateRiderDto } from './dto/update-rider.dto';
import type { Rider as RiderRow } from '../../prisma-client';

function toDomain(row: RiderRow): Rider {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    rating: row.rating,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class RidersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRiderDto, passwordHash: string): Promise<Rider> {
    const row = await this.prisma.rider.create({
      data: { name: dto.name, phone: dto.phone, email: dto.email, passwordHash },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<Rider | null> {
    const row = await this.prisma.rider.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findRowByIdentifier(identifier: string): Promise<RiderRow | null> {
    return this.prisma.rider.findFirst({ where: { OR: [{ phone: identifier }, { email: identifier }] } });
  }

  async update(id: string, dto: UpdateRiderDto): Promise<Rider> {
    const row = await this.prisma.rider.update({
      where: { id },
      data: { ...(dto.name !== undefined ? { name: dto.name } : {}), ...(dto.phone !== undefined ? { phone: dto.phone } : {}), ...(dto.email !== undefined ? { email: dto.email } : {}) },
    });
    return toDomain(row);
  }
}
