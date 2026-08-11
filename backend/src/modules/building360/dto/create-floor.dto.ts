import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateFloorDto {
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
  buildingId!: string;

  @IsString()
  @Length(1, 80)
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(-50)
  @Max(500)
  level?: number;

  @IsOptional()
  @IsString()
  @Length(2, 24)
  status?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
