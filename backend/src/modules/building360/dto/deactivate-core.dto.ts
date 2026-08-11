import { IsOptional, IsString, Length } from 'class-validator';

export class DeactivateCoreDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  tenantId?: string;
}
