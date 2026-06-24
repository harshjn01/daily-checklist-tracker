import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignChecklistDto {
  @IsString()
  @IsNotEmpty({ message: 'Checklist ID is required' })
  checklistId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userIds?: string[]; // If null or empty, it means global assignment
}
