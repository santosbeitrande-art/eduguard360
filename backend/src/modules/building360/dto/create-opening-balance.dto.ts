import { IsISO8601, IsIn, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateOpeningBalanceDto {
  @IsIn(['system_cash', 'historical_debt'])
  kind!: 'system_cash' | 'historical_debt';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999)
  amount!: number;

  @IsISO8601({ strict: true })
  asOfDate!: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  unitId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 600)
  note?: string;
}
