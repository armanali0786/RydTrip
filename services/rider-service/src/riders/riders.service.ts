import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Rider } from '@ridemesh/event-schema';
import { CreateRiderDto } from './dto/create-rider.dto';
import { RidersRepository } from './riders.repository';

@Injectable()
export class RidersService {
  constructor(private readonly repository: RidersRepository) {}

  create(dto: CreateRiderDto): Rider {
    const now = new Date().toISOString();
    const rider: Rider = {
      id: randomUUID(),
      name: dto.name,
      phone: dto.phone,
      createdAt: now,
      updatedAt: now,
    };
    return this.repository.save(rider);
  }

  findById(id: string): Rider {
    const rider = this.repository.findById(id);
    if (!rider) {
      throw new NotFoundException(`Rider ${id} not found`);
    }
    return rider;
  }
}
