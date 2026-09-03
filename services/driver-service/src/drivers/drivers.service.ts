import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Driver, DriverStatus } from '@rydtrip/event-schema';
import { Prisma } from '../../prisma-client';
import { CreateDriverDto } from './dto/create-driver.dto';
import { LoginDriverDto } from './dto/login-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { assertValidDriverTransition, InvalidDriverTransitionError } from './driver-state-machine';
import { DriversRepository } from './drivers.repository';

const PASSWORD_SALT_ROUNDS = 10;

export interface AuthResult {
  accessToken: string;
  driver: Driver;
}

@Injectable()
export class DriversService {
  constructor(
    private readonly repository: DriversRepository,
    private readonly jwtService: JwtService,
  ) {}

  async create(dto: CreateDriverDto): Promise<Driver> {
    const passwordHash = await hash(dto.password, PASSWORD_SALT_ROUNDS);
    try {
      return await this.repository.create(dto, passwordHash);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'phone or email';
        throw new ConflictException(`A driver with this ${target} is already registered`);
      }
      throw err;
    }
  }

  async findById(id: string): Promise<Driver> {
    const driver = await this.repository.findById(id);
    if (!driver) {
      throw new NotFoundException(`Driver ${id} not found`);
    }
    return driver;
  }

  async findVehicleType(id: string): Promise<{ vehicleType: string }> {
    const vehicleType = await this.repository.findVehicleType(id);
    if (!vehicleType) {
      throw new NotFoundException(`Driver ${id} not found`);
    }
    return { vehicleType };
  }

  async findContact(id: string): Promise<{ name: string; phone: string; vehicleType: string }> {
    const driver = await this.findById(id);
    return { name: driver.name, phone: driver.phone, vehicleType: driver.vehicleType };
  }

  async login(dto: LoginDriverDto): Promise<AuthResult> {
    const row = await this.repository.findRowByIdentifier(dto.identifier);
    if (!row || !(await compare(dto.password, row.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const driver: Driver = {
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

    const accessToken = await this.jwtService.signAsync({
      sub: driver.id,
      role: 'driver',
      phone: driver.phone,
      email: driver.email,
    });

    return { accessToken, driver };
  }

  async updateStatus(id: string, targetStatus: DriverStatus): Promise<Driver> {
    const driver = await this.findById(id);

    try {
      assertValidDriverTransition(driver.status, targetStatus);
    } catch (err) {
      if (err instanceof InvalidDriverTransitionError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }

    return this.repository.updateStatus(id, targetStatus);
  }

  async updateProfile(id: string, dto: UpdateDriverDto): Promise<Driver> {
    await this.findById(id);
    try {
      return await this.repository.update(id, dto);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'phone or email';
        throw new ConflictException(`A driver with this ${target} is already registered`);
      }
      throw err;
    }
  }
}
