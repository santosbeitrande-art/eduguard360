import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 120)
  title!: string;

  @IsString()
  @IsNotEmpty()
  assetId!: string;

  @IsOptional()
  @IsString()
  requestedBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsString()
  @Length(0, 600)
  note?: string;
}
