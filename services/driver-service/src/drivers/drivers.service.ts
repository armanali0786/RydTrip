import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Driver, DriverStatus } from '@ridemesh/event-schema';
import { CreateDriverDto } from './dto/create-driver.dto';
import { assertValidDriverTransition, InvalidDriverTransitionError } from './driver-state-machine';
import { DriversRepository } from './drivers.repository';

@Injectable()
export class DriversService {
  constructor(private readonly repository: DriversRepository) {}

  async create(dto: CreateDriverDto): Promise<Driver> {
    return this.repository.create(dto);
  }

  async findById(id: string): Promise<Driver> {
    const driver = await this.repository.findById(id);
    if (!driver) {
      throw new NotFoundException(`Driver ${id} not found`);
    }
    return driver;
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
