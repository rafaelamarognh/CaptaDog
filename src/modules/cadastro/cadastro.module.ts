import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CadastroController } from './cadastro.controller';
import { CadastroService } from './cadastro.service';

@Module({
  imports: [HttpModule],
  controllers: [CadastroController],
  providers: [CadastroService],
})
export class CadastroModule {}