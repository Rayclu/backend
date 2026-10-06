import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TwoFactorAuthService } from './services/two-factor-auth.service';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // JwtModule.registerAsync({
    //   imports: [ConfigModule],
    //   useFactory: async (configService: ConfigService) => ({
    //     secret: configService.get<string>('jwt.secret'),
    //     signOptions: { expiresIn: configService.get<string>('jwt.expiresIn') },
    //   }),
    //   inject: [ConfigService],
    // }),
    JwtModule.register({
      global: true,
      secret: process.env.secret,
      signOptions: { expiresIn: '60s' },
    }),

  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorAuthService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
