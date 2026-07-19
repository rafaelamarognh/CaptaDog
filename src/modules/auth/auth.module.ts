import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';

@Global() // deixa JwtAuthGuard disponível pra outros módulos importarem fácil
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET!, // gera algo forte e joga no .env
      signOptions: { expiresIn: '12h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}