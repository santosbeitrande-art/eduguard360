import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateDemoRequestDto {
  @IsString()
  @Length(2, 160)
  name!: string;

  @IsString()
  @Length(2, 160)
  organizationName!: string;

  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsString()
  @Length(2, 120)
  city!: string;

  @IsString()
  @Length(2, 160)
  buildingName!: string;

  @IsIn(['essencial', 'gestao', 'portfolio'])
  plan!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsIn([true])
  privacyConsent!: true;
}
