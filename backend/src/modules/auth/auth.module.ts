import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../users/entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

const jwtExpiresIn = (value: string | undefined, fallback: JwtSignOptions['expiresIn']) => {
  if (!value) return fallback;
  const seconds = Number(value);
  return Number.isInteger(seconds) && seconds > 0
    ? seconds
    : value as JwtSignOptions['expiresIn'];
};

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-key',
      signOptions: { expiresIn: jwtExpiresIn(process.env.JWT_EXPIRES_IN, '7d') },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
