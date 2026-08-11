import { IsBoolean, IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class RunBillingDto {
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'period must be in YYYY-MM format',
  })
  period!: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['residential', 'commercial', 'hospitality', 'campus', 'business_park'])
  segment?: 'residential' | 'commercial' | 'hospitality' | 'campus' | 'business_park';

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
