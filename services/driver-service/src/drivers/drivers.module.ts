import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DriversController } from './drivers.controller';
import { DriversRepository } from './drivers.repository';
import { DriversService } from './drivers.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-shared-secret-change-me',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '1d' },
    }),
  ],
  controllers: [DriversController],
  providers: [DriversService, DriversRepository],
  exports: [DriversService],
})
export class DriversModule {}
