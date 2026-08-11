import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateBuildingDto {
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

  @IsOptional()
  @IsString()
  @Length(1, 64)
  portfolioId?: string;

  @IsString()
  @Length(1, 64)
  siteId!: string;

  @IsString()
  @Length(2, 160)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  floors?: number;

  @IsOptional()
  @IsString()
  @Length(2, 24)
  status?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
