import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class CreateContractDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  buildingId?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  code?: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 160)
  title!: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'terminated'])
  status?: 'active' | 'inactive' | 'terminated';

  @IsOptional()
  @IsString()
  @IsIn(['monthly', 'quarterly', 'annual'])
  billingCycle?: 'monthly' | 'quarterly' | 'annual';

  @IsOptional()
  @IsString()
  @Length(3, 8)
  currency?: string;

  @IsNumber()
  @Min(0)
  @Max(9999999999)
  amount!: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startsAt!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endsAt?: string;
}
