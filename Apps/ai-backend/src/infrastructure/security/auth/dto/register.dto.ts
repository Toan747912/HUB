import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ROLES } from '../../rbac/role.enum';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsArray()
  @IsIn(ROLES, { each: true })
  roles?: string[];
}
