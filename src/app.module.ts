import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { CadastroModule } from './modules/cadastro/cadastro.module';
import { CndModule } from './modules/cnd/cnd.module';
import { CpfModule } from './modules/cpf/cpf.module';
import { BcModule } from './modules/bc/bc.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CadastroModule,
    CndModule,
    CpfModule,
    BcModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}