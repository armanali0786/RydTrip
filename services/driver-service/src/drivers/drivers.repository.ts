import { Injectable } from '@nestjs/common';
import { Driver, DriverStatus } from '@rydtrip/event-schema';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import type { Driver as DriverRow } from '../../prisma-client';

function toDomain(row: DriverRow): Driver {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    vehicleType: row.vehicleType,
    city: row.city,
    licenseNumber: row.licenseNumber,
    vehicleRegistrationNumber: row.vehicleRegistrationNumber,
    insurancePolicyNumber: row.insurancePolicyNumber,
    permitNumber: row.permitNumber ?? undefined,
    status: row.status as DriverStatus,
    rating: row.rating,
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
        city: dto.city,
        licenseNumber: dto.licenseNumber,
        vehicleRegistrationNumber: dto.vehicleRegistrationNumber,
        insurancePolicyNumber: dto.insurancePolicyNumber,
        permitNumber: dto.permitNumber,
        status: DriverStatus.OFFLINE,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<Driver | null> {
    const row = await this.prisma.driver.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  /** Minimal, PII-free projection — safe to expose to unauthenticated riders for a fare estimate. */
  async findVehicleType(id: string): Promise<string | null> {
    const row = await this.prisma.driver.findUnique({ where: { id }, select: { vehicleType: true } });
    return row?.vehicleType ?? null;
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

  async update(id: string, dto: UpdateDriverDto): Promise<Driver> {
    const row = await this.prisma.driver.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
      },
    });
    return toDomain(row);
  }
}
