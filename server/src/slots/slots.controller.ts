import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { BookingsService } from '../bookings/bookings.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { ListSlotsQueryDto } from './dto/list-slots-query.dto';
import { SlotsService } from './slots.service';

// `me/...` routes are declared before `:id/...` so "me" is never parsed as an id.
@ApiTags('providers')
@ApiCookieAuth()
@ApiBearerAuth()
@Controller('providers')
export class SlotsController {
  constructor(
    private readonly slots: SlotsService,
    private readonly bookings: BookingsService,
  ) {}

  // ---------- provider only ----------

  @Get('me/slots')
  @Roles('PROVIDER')
  @ApiOperation({ summary: 'List my slots in a range, with who booked them' })
  listMine(@Req() req: Request, @Query() query: ListSlotsQueryDto) {
    return this.slots.listMine(req.user.id, query);
  }

  @Post('me/slots')
  @Roles('PROVIDER')
  @ApiOperation({ summary: 'Publish an availability slot (30–60 minutes)' })
  @ApiResponse({ status: 201, description: 'Slot created' })
  @ApiResponse({
    status: 400,
    description: 'Invalid, past, or wrong-length window',
  })
  @ApiResponse({ status: 403, description: 'Caller is not a provider' })
  @ApiResponse({ status: 409, description: 'Identical slot already exists' })
  create(@Req() req: Request, @Body() dto: CreateSlotDto) {
    return this.slots.create(req.user.id, dto);
  }

  @Patch('me/slots/:id')
  @Roles('PROVIDER')
  @ApiOperation({ summary: 'Change the time of one of my unbooked slots' })
  @ApiResponse({
    status: 400,
    description: 'Slot already started, or invalid window',
  })
  @ApiResponse({ status: 403, description: 'Slot belongs to another provider' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  @ApiResponse({ status: 409, description: 'Slot has a confirmed booking' })
  update(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) slotId: string,
    @Body() dto: CreateSlotDto,
  ) {
    return this.slots.update(req.user.id, slotId, dto);
  }

  @Delete('me/slots/:id')
  @Roles('PROVIDER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one of my unbooked slots' })
  @ApiResponse({ status: 400, description: 'Slot already started' })
  @ApiResponse({ status: 204, description: 'Slot deleted' })
  @ApiResponse({ status: 403, description: 'Slot belongs to another provider' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  @ApiResponse({ status: 409, description: 'Slot has a confirmed booking' })
  remove(@Req() req: Request, @Param('id', ParseUUIDPipe) slotId: string) {
    return this.slots.remove(req.user.id, slotId);
  }

  @Get('me/bookings')
  @Roles('PROVIDER')
  @ApiOperation({ summary: 'List bookings made on my slots' })
  listMyBookings(@Req() req: Request) {
    return this.bookings.listForProvider(req.user.id);
  }

  // ---------- any signed-in user ----------

  @Get()
  @ApiOperation({ summary: 'List providers' })
  listProviders() {
    return this.slots.listProviders();
  }

  @Get(':id/slots')
  @ApiOperation({ summary: "List a provider's available slots in a range" })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  listAvailable(
    @Param('id', ParseUUIDPipe) providerId: string,
    @Query() query: ListSlotsQueryDto,
  ) {
    return this.slots.listAvailable(providerId, query);
  }
}
