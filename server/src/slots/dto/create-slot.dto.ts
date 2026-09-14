import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, Matches } from 'class-validator';

const HAS_TZ = /(Z|[+-]\d{2}:\d{2})$/;
const TZ_MESSAGE =
  'must be ISO 8601 with a timezone, e.g. 2026-09-20T09:00:00Z';

export class CreateSlotDto {
  @ApiProperty({ example: '2026-09-20T09:00:00Z' })
  @IsISO8601()
  @Matches(HAS_TZ, { message: `startAt ${TZ_MESSAGE}` })
  startAt: string;

  @ApiProperty({ example: '2026-09-20T10:00:00Z' })
  @IsISO8601()
  @Matches(HAS_TZ, { message: `endAt ${TZ_MESSAGE}` })
  endAt: string;
}
