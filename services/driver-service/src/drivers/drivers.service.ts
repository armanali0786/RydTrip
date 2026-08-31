import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Driver, DriverStatus } from '@rydtrip/event-schema';
import { CreateDriverDto } from './dto/create-driver.dto';
import { LoginDriverDto } from './dto/login-driver.dto';
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
    return this.repository.create(dto, passwordHash);
  }

  async findById(id: string): Promise<Driver> {
    const driver = await this.repository.findById(id);
    if (!driver) {
      throw new NotFoundException(`Driver ${id} not found`);
    }
    return driver;
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
      status: row.status as DriverStatus,
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
}
