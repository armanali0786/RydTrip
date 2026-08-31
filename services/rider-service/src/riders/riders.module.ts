import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RidersController } from './riders.controller';
import { RidersRepository } from './riders.repository';
import { RidersService } from './riders.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-shared-secret-change-me',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '1d' },
    }),
  ],
  controllers: [RidersController],
  providers: [RidersService, RidersRepository],
  exports: [RidersService],
})
export class RidersModule {}
