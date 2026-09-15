import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  imports: [BookingsModule],
  controllers: [SlotsController],
  providers: [SlotsService],
})
export class SlotsModule {}
