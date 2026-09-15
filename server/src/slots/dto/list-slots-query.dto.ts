import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../shared/pagination.dto';

export class ListSlotsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-20T00:00:00Z',
    description: 'Start of the range (inclusive). Defaults to now.',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-09-27T00:00:00Z',
    description:
      'End of the range (exclusive). Defaults to 7 days after `from`.',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
