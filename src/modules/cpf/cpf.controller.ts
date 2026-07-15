import { Controller, Get, Param } from '@nestjs/common';
import { CpfService } from './cpf.service';

@Controller('cpf')
export class CpfController {
  constructor(private readonly cpfService: CpfService) {}

  /**
   * GET /cpf/05386714910
   * Retorna dados cadastrais da pessoa pelo CPF
   */
  @Get(':cpf')
  async getCpf(@Param('cpf') cpf: string) {
    return this.cpfService.getCpf(cpf);
  }
}