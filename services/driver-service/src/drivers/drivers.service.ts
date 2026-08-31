import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Driver, DriverStatus } from '@ridemesh/event-schema';
import { CreateDriverDto } from './dto/create-driver.dto';
import { assertValidDriverTransition, InvalidDriverTransitionError } from './driver-state-machine';
import { DriversRepository } from './drivers.repository';

@Injectable()
export class DriversService {
  constructor(private readonly repository: DriversRepository) {}

  create(dto: CreateDriverDto): Driver {
    const now = new Date().toISOString();
    const driver: Driver = {
      id: randomUUID(),
      name: dto.name,
      phone: dto.phone,
      vehicleType: dto.vehicleType,
      status: DriverStatus.OFFLINE,
      createdAt: now,
      updatedAt: now,
    };
    return this.repository.save(driver);
  }

  findById(id: string): Driver {
    const driver = this.repository.findById(id);
    if (!driver) {
      throw new NotFoundException(`Driver ${id} not found`);
    }
    return driver;
  }

  updateStatus(id: string, targetStatus: DriverStatus): Driver {
    const driver = this.findById(id);

    try {
      assertValidDriverTransition(driver.status, targetStatus);
    } catch (err) {
      if (err instanceof InvalidDriverTransitionError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }

    const updated: Driver = { ...driver, status: targetStatus, updatedAt: new Date().toISOString() };
    return this.repository.save(updated);
  }
}
