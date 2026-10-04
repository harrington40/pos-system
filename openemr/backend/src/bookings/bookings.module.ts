import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import { SettingsModule } from '../settings/settings.module';
import { BookingsService } from './bookings.service';
import {
    BookingPublicController,
    BookingsController,
} from './bookings.controller';

@Module({
    imports: [PatientsModule, SettingsModule],
    controllers: [BookingPublicController, BookingsController],
    providers: [BookingsService],
    exports: [BookingsService],
})
export class BookingsModule {}
