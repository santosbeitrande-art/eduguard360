import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  tenantId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  buildingId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  floorId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  siteId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  number?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  code?: string;

  @IsOptional()
  @IsString()
  @IsIn(['apartment', 'office', 'shop', 'room', 'warehouse', 'parking'])
  type?: string;

  @IsOptional()
  @IsString()
  @IsIn(['occupied', 'vacant', 'maintenance', 'inactive'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  areaM2?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
