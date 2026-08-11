import { IsOptional, IsString } from 'class-validator';

export class FinanceFiltersDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  period?: string;
}
