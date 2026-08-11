import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class ImportOnboardingCsvDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  tenantId?: string;

  @IsString()
  @IsIn(['organization', 'site', 'building', 'unit', 'person', 'role_assignment'])
  target!: 'organization' | 'site' | 'building' | 'unit' | 'person' | 'role_assignment';

  @IsString()
  @Length(5, 500000)
  csvText!: string;
}
