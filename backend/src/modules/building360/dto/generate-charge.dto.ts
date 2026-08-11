import { IsOptional, IsString, Matches } from 'class-validator';

export class GenerateChargeDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  contractId!: string;

  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'period must be in YYYY-MM format',
  })
  period!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueDate?: string;
}
