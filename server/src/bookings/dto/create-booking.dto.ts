import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    example: ['4f3c2b1a-0000-4000-8000-000000000001'],
    description:
      'One slot, or several consecutive slots of the same provider to book ' +
      'a longer session (e.g. two 1-hour slots for a 2-hour appointment). ' +
      'All are booked together or none are.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  slotIds: string[];
}
