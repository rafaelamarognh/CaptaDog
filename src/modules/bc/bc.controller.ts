import { Controller, Get, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { BcService } from './bc.service';

@Controller('bc')
export class BcController {
  constructor(private readonly bcService: BcService) {}

  /**
   * Autocomplete de edifícios/logradouros de BC
   * GET /bc/autocomplete?q=Millennium
   * → chama geo.bc.sc.gov.br/rest/app/react/localizar/autocomplete.json
   */
  @Get('autocomplete')
  async autocomplete(@Query('q') q: string) {
    if (!q || q.trim().length < 2) {
      return [];
    }
    return this.bcService.autocomplete(q.trim());
  }

  /**
   * Ficha completa de um lote (dados + testadas + contribuintes)
   * GET /bc/lote/:idLote
   * → agrega: /react/identificar/lote + /api/v2/testadas + /api/v1/contribuintes
   */
  @Get('lote/:idLote')
  async getLote(@Param('idLote') idLote: string): Promise<any> {
    const id = parseInt(idLote, 10);
    if (isNaN(id)) {
      throw new HttpException('idLote inválido', HttpStatus.BAD_REQUEST);
    }
    return this.bcService.getLote(id);
  }
}