import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const CND_URL = 'https://iss.itajai.sc.gov.br/sefaz/jsp/cnd/controlador.jsp';
const CND_BASE = 'https://iss.itajai.sc.gov.br';

export interface Certidao {
  numero: string;
  tipo: string;
  validadeOriginal: string;
  validadeProrrogacao: string;
  chaveValidacao: string;
  situacao: string;
  link: string | null; // URL completa para baixar o PDF da certidão
}

export interface CndResult {
  codigoImovel: string;
  codReduzido: string;
  inscricaoImobiliaria: string;
  situacaoImovel: string;
  proprietario: string;
  cpfCnpj: string;
  certidoes: Certidao[];
  temCertidaoAtiva: boolean;
}

@Injectable()
export class CndService {
  constructor(private readonly http: HttpService) {}

  /**
   * codigoImovel = campo "aut_codigo_imovel" da ficha cadastral (ex: "5303")
   * Usa finalidade=7 que retorna dados mais completos incluindo histórico
   */
  async getCnd(codigoImovel: string): Promise<CndResult> {
    if (!codigoImovel) {
      throw new HttpException(
        'Parâmetro "codigoImovel" obrigatório',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Payload mais robusto — retorna histórico completo com links
    const body = new URLSearchParams({
      executar:               'validacadastro',
      geraCndDireto:          'sim',
      finalidade:             '7',        // ← chave: retorna dados mais completos
      tipoCND:                'imobiliario',
      sefaz_opcao_imobiliario:'4',
      inscricao:              codigoImovel,
      cnpj:                   '',
      submit:                 'Pesquisar',
    });

    try {
      const { data: html } = await firstValueFrom(
        this.http.post(CND_URL, body.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Referer: 'https://iss.itajai.sc.gov.br/',
            'User-Agent': 'Mozilla/5.0',
          },
          responseType: 'text',
        }),
      );

      return this.parseHtml(codigoImovel, html);
    } catch (err: any) {
      throw new HttpException(
        err?.response?.data ?? 'Erro ao consultar CND',
        err?.response?.status ?? HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // ── Parser ──────────────────────────────────────────────────────────────
  private parseHtml(codigoImovel: string, html: string): CndResult {
    // Extrai valor do <td> seguinte ao <td> que contém o label
    const campo = (label: string): string => {
      const re = new RegExp(
        `${this.escapeRe(label)}[^<]*<\\/td>\\s*<td[^>]*>([^<]+)`,
        'i',
      );
      const m = html.match(re);
      return m ? this.limpa(m[1]) : '';
    };

    const codReduzido          = campo('Cód. reduzido:');
    const inscricaoImobiliaria = campo('Inscrição imobiliária:');
    const situacaoImovel       = this.extrairSituacao(html);
    const proprietario         = campo('Proprietário:');
    const cpfCnpj              = campo('CPF/CNPJ:');

    // ── Certidões: tabela tabs-historico ──────────────────────────────────
    // Isola a div do histórico para não pegar linhas de outras tabelas
    const historicoMatch = html.match(/id="tabs-historico"([\s\S]*?)(?=<div\s+id="|$)/i);
    const blocoHistorico = historicoMatch ? historicoMatch[1] : html;

    const certidoes: Certidao[] = [];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch: RegExpExecArray | null;

    while ((trMatch = trRe.exec(blocoHistorico)) !== null) {
      const trContent = trMatch[1];
      const tdAll = [...trContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      if (tdAll.length < 5) continue;

      const cells = tdAll.map(t => t[1]);
      const numero = this.limpa(cells[0]);

      // só linhas com número no formato "NNNNN / AAAA"
      if (!/^\d+\s*\/\s*\d{4}/.test(numero)) continue;

      // extrai link do PDF se existir dentro da primeira célula
      const linkMatch = cells[0].match(/href='([^']+)'/i) || cells[0].match(/href="([^"]+)"/i);
      const link = linkMatch ? CND_BASE + linkMatch[1] : null;

      certidoes.push({
        numero,
        tipo:               this.limpa(cells[1] ?? ''),
        validadeOriginal:   this.limpa(cells[2] ?? ''),
        validadeProrrogacao:this.limpa(cells[3] ?? ''),
        chaveValidacao:     this.limpa(cells[4] ?? ''),
        situacao:           this.limpa(cells[5] ?? ''),
        link,
      });
    }

    const temCertidaoAtiva = certidoes.some(
      c => /ativo/i.test(c.situacao) || /negativa/i.test(c.tipo),
    );

    return {
      codigoImovel,
      codReduzido,
      inscricaoImobiliaria,
      situacaoImovel,
      proprietario,
      cpfCnpj,
      certidoes,
      temCertidaoAtiva,
    };
  }

  /** Situação fica dentro de <b> — tratamento especial */
  private extrairSituacao(html: string): string {
    const m = html.match(/Situa[çc][ãa]o do im[óo]vel:?[^<]*<\/td>\s*<td[^>]*>\s*<b>([^<]+)<\/b>/i);
    return m ? this.limpa(m[1]) : '';
  }

  /** Remove tags HTML, entidades numéricas e espaços extras */
  private limpa(s: string): string {
    return s
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&iacute;/gi, 'í')
      .replace(/&atilde;/gi, 'ã')
      .replace(/&ccedil;/gi, 'ç')
      .replace(/&aacute;/gi, 'á')
      .replace(/&eacute;/gi, 'é')
      .replace(/&otilde;/gi, 'õ')
      .replace(/&uacute;/gi, 'ú')
      .trim();
  }

  private escapeRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}