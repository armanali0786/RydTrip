import { Injectable } from '@nestjs/common';
import { Driver, DriverStatus } from '@rydtrip/event-schema';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import type { Driver as DriverRow } from '../../prisma-client';

function toDomain(row: DriverRow): Driver {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    vehicleType: row.vehicleType,
    status: row.status as DriverStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class DriversRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDriverDto, passwordHash: string): Promise<Driver> {
    const row = await this.prisma.driver.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        passwordHash,
        vehicleType: dto.vehicleType,
        status: DriverStatus.OFFLINE,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<Driver | null> {
    const row = await this.prisma.driver.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findRowByIdentifier(identifier: string): Promise<DriverRow | null> {
    return this.prisma.driver.findFirst({ where: { OR: [{ phone: identifier }, { email: identifier }] } });
  }

  async updateStatus(id: string, status: DriverStatus): Promise<Driver> {
    const row = await this.prisma.driver.update({
      where: { id },
      data: { status },
    });
    return toDomain(row);
  }
}
