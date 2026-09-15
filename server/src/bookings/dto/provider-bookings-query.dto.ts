import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../shared/pagination.dto';

export class ProviderBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'Bikash',
    description: 'Case-insensitive match on the client name.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;
}
