import { IsIn, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class RegisterPaymentDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  invoiceId!: string;

  @IsNumber()
  @Min(0.01)
  @Max(9999999999)
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(3, 8)
  currency?: string;

  @IsOptional()
  @IsString()
  @IsIn(['bank_transfer', 'cash', 'card', 'mobile_money'])
  method?: 'bank_transfer' | 'cash' | 'card' | 'mobile_money';

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  paidAt?: string;
}
