import { IsIn } from 'class-validator';

export class UpdateDemoRequestStatusDto {
  @IsIn(['under_review', 'completed'])
  status!: 'under_review' | 'completed';
}
