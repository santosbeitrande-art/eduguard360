import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  Length,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateListingDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  type: string; // plastic, metal, paper, glass, etc

  @IsNumber()
  @IsNotEmpty()
  @Min(0.1)
  weight: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
