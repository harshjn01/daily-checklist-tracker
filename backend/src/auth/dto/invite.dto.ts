import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class InviteDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;
}
