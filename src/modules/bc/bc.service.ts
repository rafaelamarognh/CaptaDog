import { Injectable, Logger } from '@nestjs/common';

const BC_BASE = 'https://geo.bc.sc.gov.br';

/**
 * Monta os headers de autenticação para o portal de BC.
 *
 * O site geo.bc.sc.gov.br exige 3 mecanismos simultâneos:
 *   1. Authorization: Bearer <JWT>  — token público, expira em ~3 dias
 *   2. tokenhash                    — hash de sessão
 *   3. Referer / Origin             — deve ser o próprio domínio
 *   4. municipio / modulo           — identificadores fixos de BC
 *
 * Como renovar quando o 403 voltar:
 *   1. Acesse https://geo.bc.sc.gov.br/municipios/BalnearioCamboriu/imobiliario
 *   2. DevTools → Network → qualquer req → Request Headers
 *   3. Copie "authorization" (sem "Bearer ") → BC_JWT no .env
 *   4. Copie "tokenhash"                     → BC_TOKENHASH no .env
 */
function getBcHeaders(): Record<string, string> {
  const jwt       = process.env.BC_JWT       ?? '';
  const tokenhash = process.env.BC_TOKENHASH ?? '';
  return {
    'Accept':          'application/json, text/plain, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Authorization':   `Bearer ${jwt}`,
    'Connection':      'keep-alive',
    'Content-Type':    'application/json',
    'Host':            'geo.bc.sc.gov.br',
    'Referer':         'https://geo.bc.sc.gov.br/municipios/BalnearioCamboriu/imobiliario',
    'Origin':          'https://geo.bc.sc.gov.br',
    'modulo':          '2',
    'municipio':       '151',
    'tokenhash':       tokenhash,
    'sec-fetch-dest':  'empty',
    'sec-fetch-mode':  'cors',
    'sec-fetch-site':  'same-origin',
    'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  };
}

/**
 * Faz fetch com timeout, headers de browser e retorna null em caso de erro.
 */
async function fetchJson<T>(url: string, opts: RequestInit = {}, timeoutMs = 10_000): Promise<T | null> {
  const logger = new Logger('BcService.fetchJson');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: {
        ...getBcHeaders(),
        ...(opts.headers as Record<string, string> ?? {}),
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      logger.warn(`${res.status} ${res.statusText} — ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err: any) {
    clearTimeout(timer);
    logger.error(`Erro ao buscar ${url}: ${err?.message}`);
    return null;
  }
}

// ─── Tipos de resposta da API de BC ────────────────────────────────────────────

interface AutocompleteItem {
  id: string;
  descricao: string;
  id_edificio: string;
  id_edificacao: string;
}

interface AutocompleteResponse {
  data: AutocompleteItem[];
  recordsTotal: number;
}

interface LoteData {
  id: number;
  inscricao: string;
  nr_cadastro_imobiliario: number;
  nr_inscricao_anterior: string;
  tp_condominio: string;
  situacao: string;
  numero: string;
  loteamento: string;
  edificio: string[];
  area_lote: number;
  valor_venal_lote: number;
  valor_m2: number;
  nr_agua: string;
  nr_energia: string;
  complemento_endereco: string;
  nr_matricula: string;
}

interface LoteResponse {
  lote: LoteData;
}

interface Testada {
  idLote: number;
  codigo: number;
  logradouro: string;
  bairro: string;
  cep: string;
  medida: number;
  lado: string;
  complementoEndereco: string;
}

interface Contribuinte {
  id?: number | string;
  nome?: string;
  cpf_cnpj?: string;
  [key: string]: any;
}

interface ContribuintesResponse {
  contribuintes: Contribuinte[];
}

interface Unidade {
  id_unidade: number;
  inscricao: string;
  inscricao_anterior: string;
  nr_cadastro_imobiliario: number;
  codigo: string;
  tipo_edificacao: string;
  area: string;
  nr_matricula: string;
  nome_contribuinte_ordenacao: string;
  contribuintes: {
    id_pessoa: number;
    id_contribuinte: number;
    cpf_cnpj: string;
  }[];
}

interface UnidadesResponse {
  dados: Unidade[];
  pagination: { total: number };
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BcService {
  private readonly logger = new Logger(BcService.name);

  /**
   * Autocomplete: busca edifícios por filtro de texto
   * Retorna array normalizado igual ao formato do módulo cadastro de Itajaí
   */
  async autocomplete(q: string): Promise<{ id: string; descricao: string; idEdificio: string; idEdificacao: string }[]> {
    const url =
      `${BC_BASE}/rest/app/react/localizar/autocomplete.json` +
      `?length=50&filtro=${encodeURIComponent(q)}&entidade=edificio`;

    const data = await fetchJson<AutocompleteResponse>(url);
    if (!data?.data?.length) return [];

    return data.data.map((item) => ({
      id: item.id,               // id_entidade (idLote)
      descricao: item.descricao, // ex: "2388 - MILLENNIUM PALACE RESIDENCIAL"
      idEdificio: item.id_edificio,
      idEdificacao: item.id_edificacao,
    }));
  }

  /**
   * Busca ficha completa de um lote:
   * 1. Dados principais do lote
   * 2. Testadas (logradouros com CEP)
   * 3. Contribuintes (proprietários)
   *
   * Tudo em paralelo para mínima latência.
   */
  async getLote(idLote: number) {
    this.logger.log(`Buscando lote BC id=${idLote}`);

    // Dispara as 4 chamadas em paralelo
    const pagination = encodeURIComponent(JSON.stringify({
      filters:{}, page:1, pageSize:1000000000,
      filterValue:'', filterLabels:['inscricao_anterior','cadastro_imobiliario']
    }));

    const [loteRes, testadas, contribuintesRes, unidadesRes] = await Promise.all([
      fetchJson<LoteResponse>(
        `${BC_BASE}/rest/app/react/identificar/lote?id_lote=${idLote}`,
      ),
      fetchJson<Testada[]>(
        `${BC_BASE}/api/v2/testadas/${idLote}`,
      ),
      fetchJson<ContribuintesResponse>(
        `${BC_BASE}/api/v1/identificar/lote/${idLote}/contribuintes`,
      ),
      fetchJson<UnidadesResponse>(
        `${BC_BASE}/api/v2/unidades/lote/${idLote}?&pagination=${pagination}&forceAttachedUnitDisplay=undefined`,
      ),
    ]);

    // Lote não encontrado
    if (!loteRes?.lote) {
      return {
        erro: 'Lote não encontrado',
        idLote,
      };
    }

    const lote = loteRes.lote;

    // Endereço principal: primeira testada (geralmente a fachada principal)
    const enderecoFormatado = testadas?.length
      ? this.formatarEndereco(testadas[0], lote.numero)
      : `Nº ${lote.numero}`;

    // Contribuintes normalizados
    const contribuintes = (contribuintesRes?.contribuintes ?? []).map((c) =>
      this.normalizarContribuinte(c),
    );

    return {
      // Identificação
      idLote: lote.id,
      inscricao: lote.inscricao,
      inscricaoAnterior: lote.nr_inscricao_anterior,
      nrCadastroImobiliario: lote.nr_cadastro_imobiliario,
      nrMatricula: lote.nr_matricula,

      // Endereço
      endereco: enderecoFormatado,
      numero: lote.numero,
      complemento: lote.complemento_endereco || '',
      edificio: lote.edificio ?? [],
      loteamento: lote.loteamento,
      testadas: testadas ?? [],

      // Situação
      situacao: lote.situacao,
      tpCondominio: lote.tp_condominio,

      // Área e valores
      areaLote: lote.area_lote,
      valorVenalLote: lote.valor_venal_lote,
      valorM2: lote.valor_m2,

      // Infraestrutura
      nrAgua: lote.nr_agua,
      nrEnergia: lote.nr_energia,

      // Proprietários diretos do lote
      contribuintes,
      hasContribuintes: contribuintes.length > 0,

      // Unidades do condomínio (se for multi-unidade)
      unidades: (unidadesRes?.dados ?? []).map(u => ({
        idUnidade:       u.id_unidade,
        inscricao:       u.inscricao,
        inscricaoAnterior: u.inscricao_anterior,
        nrCadastro:      u.nr_cadastro_imobiliario,
        codigo:          u.codigo,
        tipoEdificacao:  u.tipo_edificacao,
        area:            u.area,
        nrMatricula:     u.nr_matricula,
        proprietario:    u.nome_contribuinte_ordenacao,
        // cpf_cnpj vem como " - " na API de BC — não disponível diretamente
        cpfCnpj:         (u.contribuintes?.[0]?.cpf_cnpj ?? '').trim() === '-'
                           ? null
                           : (u.contribuintes?.[0]?.cpf_cnpj ?? null),
      })),
      totalUnidades: unidadesRes?.pagination?.total ?? 0,
      isCondominio:  (unidadesRes?.pagination?.total ?? 0) > 0,

      // Município
      municipio: 'Balneário Camboriú',
      uf: 'SC',
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private formatarEndereco(testada: Testada, numero: string): string {
    const partes: string[] = [];
    if (testada.logradouro) partes.push(this.titleCase(testada.logradouro));
    if (numero) partes.push(`nº ${numero}`);
    if (testada.complementoEndereco) partes.push(testada.complementoEndereco);
    if (testada.bairro) partes.push(this.titleCase(testada.bairro));
    if (testada.cep) partes.push(`CEP ${testada.cep}`);
    return partes.join(', ');
  }

  private normalizarContribuinte(c: Contribuinte): Record<string, any> {
    // Loga o objeto raw para descobrir os nomes reais dos campos
    this.logger.debug(`Contribuinte raw: ${JSON.stringify(c)}`);

    return {
      id:      c.id ?? c['id_contribuinte'] ?? null,
      nome:    c.nome ?? c['nm_contribuinte'] ?? c['razao_social'] ?? c['ds_nome'] ?? '—',
      // Testa todos os nomes possíveis de CPF/CNPJ na API de BC
      cpfCnpj: c.cpf_cnpj ?? c['nr_cpf_cnpj'] ?? c['nr_cpf'] ?? c['nr_cnpj']
            ?? c['cpf'] ?? c['cnpj'] ?? c['documento'] ?? c['ds_cpf_cnpj'] ?? null,
      tipo:    c['tp_contribuinte'] ?? c['tipo'] ?? null,
      raw: c,
    };
  }

  private titleCase(str: string): string {
    const preps = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'no', 'na']);
    return str
      .toLowerCase()
      .split(' ')
      .map((w, i) => {
        if (i > 0 && preps.has(w)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(' ');
  }
}