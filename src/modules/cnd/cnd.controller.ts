import { Controller, Get, Param } from '@nestjs/common';
import { CndService } from './cnd.service';

@Controller('cnd')
export class CndController {
  constructor(private readonly cndService: CndService) {}

  /**
   * GET /cnd/5303
   * codigoImovel = campo "aut_codigo_imovel" da ficha cadastral
   */
  @Get(':codigoImovel')
  async getCnd(@Param('codigoImovel') codigoImovel: string) {
    return this.cndService.getCnd(codigoImovel);
  }
}