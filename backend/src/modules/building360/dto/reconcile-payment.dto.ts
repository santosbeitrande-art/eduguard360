import { IsISO8601, IsNumber, IsString, Length, Max, Min } from 'class-validator';

export class ReconcilePaymentDto {
  @IsString()
  @Length(1, 64)
  paymentId!: string;

  @IsISO8601({ strict: true })
  statementDate!: string;

  @IsString()
  @Length(1, 120)
  statementReference!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999)
  amount!: number;
}
