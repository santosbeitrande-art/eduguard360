import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?351\d{9}$/, {
    message: 'Invalid Portuguese phone number format. Example: +351912345678',
  })
  phone: string;
}
