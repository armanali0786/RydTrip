import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Rider } from '@rydtrip/event-schema';
import { CreateRiderDto } from './dto/create-rider.dto';
import { LoginRiderDto } from './dto/login-rider.dto';
import { RidersRepository } from './riders.repository';

const PASSWORD_SALT_ROUNDS = 10;

export interface AuthResult {
  accessToken: string;
  rider: Rider;
}

@Injectable()
export class RidersService {
  constructor(
    private readonly repository: RidersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async create(dto: CreateRiderDto): Promise<Rider> {
    const passwordHash = await hash(dto.password, PASSWORD_SALT_ROUNDS);
    return this.repository.create(dto, passwordHash);
  }

  async findById(id: string): Promise<Rider> {
    const rider = await this.repository.findById(id);
    if (!rider) {
      throw new NotFoundException(`Rider ${id} not found`);
    }
    return rider;
  }

  async login(dto: LoginRiderDto): Promise<AuthResult> {
    const row = await this.repository.findRowByIdentifier(dto.identifier);
    if (!row || !(await compare(dto.password, row.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const rider: Rider = {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };

    const accessToken = await this.jwtService.signAsync({
      sub: rider.id,
      role: 'rider',
      phone: rider.phone,
      email: rider.email,
    });

    return { accessToken, rider };
  }
}
