import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const MALHA =
  'https://arcgis.itajai.sc.gov.br/server/rest/services/malha_cadastral_raster/FeatureServer/0/query';
const ESPELHO =
  'https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/lotes_unidades_espelho/FeatureServer/0/query';
const VIAS =
  'https://arcgis.itajai.sc.gov.br/server/rest/services/Hosted/itj_sistema_viario/FeatureServer/0/query';

@Injectable()
export class CadastroService {
  constructor(private readonly http: HttpService) {}

  // ── Lista de ruas (autocomplete) ─────────────────────
  async getRuas(q?: string): Promise<string[]> {
    const where = q ? `nome LIKE '%${this.esc(q.toUpperCase())}%'` : '1=1';
    const params = new URLSearchParams({
      where,
      outFields: 'nome',
      returnGeometry: 'false',
      returnDistinctValues: 'true',
      f: 'json',
    });
    const { data } = await firstValueFrom(this.http.get(`${VIAS}?${params}`));
    if (data.error) throw new HttpException(data.error.message, HttpStatus.BAD_GATEWAY);
    return (data.features ?? []).map((f: any) => f.attributes?.nome).filter(Boolean).sort();
  }

  // ── Lotes de uma rua ─────────────────────────────────
  async getLotes(rua: string, numero?: string): Promise<any[]> {
    if (!rua) throw new HttpException('Parâmetro "rua" obrigatório', HttpStatus.BAD_REQUEST);
    const where = `nomevia ='${this.esc(rua)}'`;
    const params = new URLSearchParams({
      returnGeometry: 'false',
      where,
      outSR: '4326',
      outFields: 'nomevia,numero,inscricao,inscrlig',
      returnDistinctValues: 'true',
      f: 'json',
    });
    const { data } = await firstValueFrom(this.http.get(`${MALHA}?${params}`));
    if (data.error) throw new HttpException(data.error.message, HttpStatus.BAD_GATEWAY);

    let lotes: any[] = (data.features ?? []).map((f: any) => f.attributes);
    if (numero) {
      const n = parseFloat(numero);
      const filtrados = lotes.filter((l) => l.numero === n);
      if (filtrados.length) lotes = filtrados;
    }
    return lotes;
  }

  // ── Ficha completa de um lote ────────────────────────
  // Retorna todas as unidades do espelho (pode ser 1 casa ou N aptos/garagens)
  async getLote(inscricao: string): Promise<any> {
    if (!inscricao) throw new HttpException('Parâmetro "inscricao" obrigatório', HttpStatus.BAD_REQUEST);

    // inscrlig: "202.066.03.0079" → "i202066030079"
    const inscrlig = 'i' + inscricao.replace(/\./g, '');

    const [malhaData, espelhoData] = await Promise.all([
      this.fetchMalha(inscricao),
      this.fetchEspelho(inscrlig),
    ]);

    // Espelho pode ter N unidades (aptos, garagens, salas...)
    const unidades: any[] = espelhoData.map((attrs: any) => ({
      aut_inscricao:    attrs.aut_inscricao   ?? null,
      aut_codigo_imovel: attrs.aut_codigo_imovel ?? null,
      aut_end_complemento: attrs.aut_end_complemento ?? null,
      ava_tipologia:    attrs.ava_tipologia    ?? null,
      ava_tipo_uso:     attrs.ava_tipo_uso     ?? null,
      nome_contribuinte: attrs.nome_contribuinte ?? null,
      tipo:             attrs.tipo             ?? null,
      titular:          attrs.titular          ?? null,
      vlr_venal_total:  attrs.vlr_venal_total  ?? null,
      codigo_contribuinte: attrs.codigo_contribuinte ?? null,
    }));

    return {
      inscricao,
      inscrlig,
      // dados do lote (geometria + campos gerais da malha)
      attrs: { ...malhaData.attributes, ...( espelhoData[0] ?? {}) },
      geometry: malhaData.geometry,
      // lista de unidades — 1 item = casa simples, N itens = prédio
      unidades,
      isCondominio: unidades.length > 1,
    };
  }

  // ── helpers privados ─────────────────────────────────
  private async fetchMalha(inscricao: string) {
    const params = new URLSearchParams({
      returnGeometry: 'true',
      where: `inscricao ='${this.esc(inscricao)}'`,
      outSR: '4326',
      outFields: '*',
      f: 'json',
    });
    const { data } = await firstValueFrom(this.http.get(`${MALHA}?${params}`));
    const feat = data.features?.[0] ?? {};
    return { attributes: feat.attributes ?? {}, geometry: feat.geometry ?? null };
  }

  private async fetchEspelho(inscrlig: string): Promise<any[]> {
    const params = new URLSearchParams({
      returnGeometry: 'false',
      where: `inscrlig ='${this.esc(inscrlig)}'`,
      outSR: '4326',
      outFields: '*',
      f: 'json',
    });
    const { data } = await firstValueFrom(this.http.get(`${ESPELHO}?${params}`));
    if (data.error || !data.features?.length) return [];
    return data.features.map((f: any) => f.attributes ?? {});
  }

  private esc(s: string): string {
    return String(s).replace(/'/g, "''");
  }
}