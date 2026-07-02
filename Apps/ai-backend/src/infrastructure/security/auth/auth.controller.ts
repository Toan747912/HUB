import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../rbac/role.enum';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Dev/seed-oriented: no existing user-provisioning path exists yet in this codebase.
  // Production user provisioning (admin-only invite flow, etc.) is out of scope here.
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto): Promise<{ success: true }> {
    await this.auth.register(body.username, body.password, body.roles as Role[] | undefined);
    return { success: true };
  }

  // Tighter than the global default (30 req/min) — brute-force protection.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.auth.login(body.username, body.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: RefreshDto): Promise<{ success: true }> {
    await this.auth.logout(body.refreshToken);
    return { success: true };
  }
}
