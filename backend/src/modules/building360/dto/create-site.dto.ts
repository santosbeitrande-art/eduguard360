import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateSiteDto {
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
  @Length(2, 160)
  name!: string;

  @IsString()
  @Length(2, 120)
  city!: string;

  @IsOptional()
  @IsString()
  @IsIn(['residential', 'commercial', 'hospitality', 'campus', 'business_park'])
  type?: string;

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
