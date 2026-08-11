import { IsBoolean, IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdatePersonDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  tenantId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  organizationId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  unitId?: string;

  @IsOptional()
  @IsString()
  @Length(2, 180)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  @Length(5, 160)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(5, 40)
  phone?: string;

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
