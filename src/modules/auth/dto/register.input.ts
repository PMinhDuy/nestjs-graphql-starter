import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../users/user.entity';

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @Field(() => UserRole, { nullable: true, defaultValue: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
