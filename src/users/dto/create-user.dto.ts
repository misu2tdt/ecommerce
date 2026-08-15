import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'shopper@example.test', format: 'email' })
  @IsString()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'fictional-password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
