import { IsISO8601, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @Length(2, 160)
  description!: string;

  @IsOptional()
  @IsString()
  @Length(1, 160)
  supplier?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999)
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(3, 8)
  currency?: string;

  @IsISO8601({ strict: true })
  occurredAt!: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  reference?: string;
}
