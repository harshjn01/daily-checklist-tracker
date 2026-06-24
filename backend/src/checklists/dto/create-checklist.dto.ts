import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateChecklistDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}
