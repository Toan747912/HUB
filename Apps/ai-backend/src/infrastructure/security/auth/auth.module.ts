import { Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import { RedisModule } from '../../cache/redis.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BruteForceService } from './brute-force.service';
import { AppJwtService } from './jwt.service';
import { PasswordService } from './password.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { UserRepository } from './user.repository';

@Module({
  imports: [RedisModule, AuditModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserRepository,
    PasswordService,
    AppJwtService,
    RefreshTokenRepository,
    BruteForceService,
  ],
  exports: [AuthService, UserRepository, AppJwtService, RefreshTokenRepository, PasswordService],
})
export class AuthModule {}
