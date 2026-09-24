import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PatientsController } from './patients.controller';
import { PortalController } from './portal.controller';
import { PatientsService } from './patients.service';
import { Patient } from './patient.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'openrx-secret-key-2024',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [PatientsController, PortalController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
