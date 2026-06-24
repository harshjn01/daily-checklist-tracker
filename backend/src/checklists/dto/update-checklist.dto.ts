import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateChecklistDto {
  @IsString()
  @IsOptional()
  title?: string;

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
