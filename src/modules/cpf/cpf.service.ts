import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

const HUB_URL = 'https://ws.hubdodesenvolvedor.com.br/v2/cadastropf/';

@Injectable()
export class CpfService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getCpf(cpf: string): Promise<any> {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new HttpException('CPF inválido', HttpStatus.BAD_REQUEST);
    }

    const token = this.config.get<string>('HUB_TOKEN');
    if (!token) {
      throw new HttpException('Token HUB não configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const { data } = await firstValueFrom(
        this.http.get(HUB_URL, {
          params: { cpf: cpfLimpo, token, json: '' },
        }),
      );

      if (!data.status) {
        throw new HttpException(
          data.return ?? 'Erro na consulta CPF',
          HttpStatus.BAD_GATEWAY,
        );
      }

      return data.result;
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err?.response?.data ?? 'Erro ao consultar CPF',
        err?.response?.status ?? HttpStatus.BAD_GATEWAY,
      );
    }
  }
}