import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreatePortfolioDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  tenantId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  schoolId?: string;

  @IsString()
  @Length(1, 64)
  organizationId!: string;

  @IsString()
  @Length(2, 160)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(2, 24)
  status?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
