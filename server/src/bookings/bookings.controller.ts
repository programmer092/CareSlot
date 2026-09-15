import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('bookings')
@ApiCookieAuth()
@ApiBearerAuth()
@Roles('CLIENT')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Book one slot, or several consecutive slots as one session',
  })
  @ApiResponse({ status: 201, description: 'Bookings confirmed, one per slot' })
  @ApiResponse({
    status: 400,
    description: 'Past slot, mixed providers, or non-consecutive slots',
  })
  @ApiResponse({ status: 403, description: 'Caller is not a client' })
  @ApiResponse({ status: 404, description: 'A slot was not found' })
  @ApiResponse({
    status: 409,
    description: 'A slot is already booked; nothing was booked',
  })
  create(@Req() req: Request, @Body() dto: CreateBookingDto) {
    return this.bookings.create(req.user.id, dto.slotIds);
  }

  @Get('me')
  @ApiOperation({ summary: 'List my bookings' })
  listMine(@Req() req: Request) {
    return this.bookings.listMine(req.user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel one of my bookings' })
  @ApiResponse({ status: 400, description: 'Appointment already started' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @ApiResponse({ status: 403, description: 'Booking belongs to someone else' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Already cancelled' })
  cancel(@Req() req: Request, @Param('id', ParseUUIDPipe) bookingId: string) {
    return this.bookings.cancel(req.user.id, bookingId);
  }
}
