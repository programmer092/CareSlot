import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CreateSlotDto } from './dto/create-slot.dto';
import { ListSlotsQueryDto } from './dto/list-slots-query.dto';
import { SlotsService } from './slots.service';

@ApiTags('providers')
@ApiCookieAuth()
@ApiBearerAuth()
@Controller('providers')
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Get()
  @ApiOperation({ summary: 'List providers' })
  listProviders() {
    return this.slots.listProviders();
  }

  @Post('me/slots')
  @Roles('PROVIDER')
  @ApiOperation({ summary: 'Publish an availability slot (provider only)' })
  @ApiResponse({ status: 201, description: 'Slot created' })
  @ApiResponse({ status: 400, description: 'Invalid or past time range' })
  @ApiResponse({ status: 403, description: 'Caller is not a provider' })
  @ApiResponse({ status: 409, description: 'Identical slot already exists' })
  create(@Req() req: Request, @Body() dto: CreateSlotDto) {
    return this.slots.create(req.user.id, dto);
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
