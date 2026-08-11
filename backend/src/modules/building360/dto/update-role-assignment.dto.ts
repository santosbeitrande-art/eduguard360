import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateRoleAssignmentDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  tenantId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  personId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  organizationId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  siteId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  buildingId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  unitId?: string;

  @IsOptional()
  @IsString()
  @Length(2, 48)
  role?: string;

  @IsOptional()
  @IsString()
  @Length(2, 24)
  status?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
