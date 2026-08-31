import { Injectable, NotFoundException } from '@nestjs/common';
import { Rider } from '@ridemesh/event-schema';
import { CreateRiderDto } from './dto/create-rider.dto';
import { RidersRepository } from './riders.repository';

@Injectable()
export class RidersService {
  constructor(private readonly repository: RidersRepository) {}

  async create(dto: CreateRiderDto): Promise<Rider> {
    return this.repository.create(dto);
  }

  async findById(id: string): Promise<Rider> {
    const rider = await this.repository.findById(id);
    if (!rider) {
      throw new NotFoundException(`Rider ${id} not found`);
    }
    return rider;
  }
}
