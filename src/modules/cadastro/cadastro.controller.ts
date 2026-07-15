import { Controller, Get, Query, Param } from '@nestjs/common';
import { CadastroService } from './cadastro.service';

@Controller('cadastro')
export class CadastroController {

  constructor(private readonly cadastroService: CadastroService) {}

  /** Lista de ruas para autocomplete
   *  GET /cadastro/ruas?q=Leopoldo
   */
  @Get('ruas')
  async getRuas(@Query('q') q: string) {
    return this.cadastroService.getRuas(q);
  }

  /** Lotes de uma rua, com filtro opcional de número
   *  GET /cadastro/lotes?rua=R. Leopoldo Hess&numero=18
   */
  @Get('lotes')
  async getLotes(
    @Query('rua') rua: string,
    @Query('numero') numero?: string,
  ) {
    return this.cadastroService.getLotes(rua, numero);
  }

  /** Ficha completa de um lote (malha + espelho)
   *  GET /cadastro/lote/202.066.03.0089
   */
  @Get('lote/:inscricao')
  async getLote(@Param('inscricao') inscricao: string) {
    return this.cadastroService.getLote(inscricao);
  }
}