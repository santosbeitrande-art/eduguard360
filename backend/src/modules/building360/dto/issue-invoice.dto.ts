import { IsOptional, IsString, Matches } from 'class-validator';

export class IssueInvoiceDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  chargeId!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  issuedAt?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueDate?: string;
}
