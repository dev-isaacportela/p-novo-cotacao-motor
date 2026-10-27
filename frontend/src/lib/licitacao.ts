// Regra pura das telas de licitação (spec 006): rótulos e tons, aderência, situação de documento por data e a quebra
// do texto do edital em páginas para o salto a partir de um achado. Sem React, sem SDK — `tests/licitacao.test.mjs`.

export type Tom = 'live' | 'attention' | 'alert' | 'off';

/** Aderência 0–100 vinda da pré-leitura ⇒ "80 %"; vazio sem valor. */
export function aderencia(valor: number | string | null | undefined): string {
  const n = Number(valor);
  if (valor == null || valor === '' || !Number.isFinite(n)) return '';
  return `${Math.round(n)} %`;
}

export const ROTULO_PRIORIDADE: Record<string, string> = { ALTA: 'alta', MEDIA: 'média', BAIXA: 'baixa' };

export function tomDaPrioridade(p: string | null | undefined): Tom {
  if (p === 'ALTA') return 'live';
  if (p === 'MEDIA') return 'attention';
  if (p === 'BAIXA') return 'off';
  return 'off';
}

export const ROTULO_STATUS_LICITACAO: Record<string, string> = {
  NOVA: 'Nova',
  EM_FUNIL: 'No funil',
  EM_DECISAO: 'Em decisão',
  EM_ESPERA: 'Em espera',
  EM_ANALISE: 'Em análise',
  PRONTA_PARA_PROPOSTA: 'Pronta para proposta',
  EM_REVISAO: 'Proposta em revisão',
  APROVADA: 'Proposta aprovada',
  ENVIADA: 'Enviada',
  GANHA: 'Ganha',
  PERDIDA: 'Perdida',
  NAO_PARTICIPAR: 'Não participar',
  ENCERRADA: 'Encerrada',
};

export const TOM_STATUS_LICITACAO: Record<string, Tom> = {
  NOVA: 'off',
  EM_FUNIL: 'off',
  EM_DECISAO: 'attention',
  EM_ESPERA: 'off',
  EM_ANALISE: 'attention',
  PRONTA_PARA_PROPOSTA: 'live',
  EM_REVISAO: 'attention',
  APROVADA: 'live',
  ENVIADA: 'live',
  GANHA: 'live',
  PERDIDA: 'off',
  NAO_PARTICIPAR: 'off',
  ENCERRADA: 'off',
};

export const ROTULO_CAMADA: Record<string, string> = { REGRAS: 'regras', PRE_LEITURA: 'pré-leitura', DECISAO: 'decisão' };

export type SituacaoDocumento = 'VALIDO' | 'VENCE_EM_BREVE' | 'VENCIDO';

/** RN-012: vencido antes de hoje; vence em breve dentro da antecedência; sem validade é sempre válido. */
export function situacaoDocumento(validadeIso: string | null | undefined, hojeIso: string, antecedenciaDias = 30): SituacaoDocumento {
  if (!validadeIso) return 'VALIDO';
  if (validadeIso < hojeIso) return 'VENCIDO';
  const limite = new Date(Date.UTC(...(hojeIso.split('-').map(Number) as [number, number, number]).map((v, i) => (i === 1 ? v - 1 : v)) as [number, number, number]));
  limite.setUTCDate(limite.getUTCDate() + antecedenciaDias);
  return validadeIso <= limite.toISOString().slice(0, 10) ? 'VENCE_EM_BREVE' : 'VALIDO';
}

export const ROTULO_SITUACAO_DOC: Record<SituacaoDocumento, string> = { VALIDO: 'Válido', VENCE_EM_BREVE: 'Vence em breve', VENCIDO: 'Vencido' };
export const TOM_SITUACAO_DOC: Record<SituacaoDocumento, Tom> = { VALIDO: 'live', VENCE_EM_BREVE: 'attention', VENCIDO: 'alert' };

export const ROTULO_EXIGENCIA: Record<string, string> = { ATENDIDO: 'Atendido', AUSENTE: 'Ausente', INADEQUADO: 'Inadequado' };
export const TOM_EXIGENCIA: Record<string, Tom> = { ATENDIDO: 'live', AUSENTE: 'alert', INADEQUADO: 'attention' };

export const ROTULO_ESTADO_PONTO: Record<string, string> = {
  SUGERIDO: 'Sugerido', APROVADO: 'Aprovado', ENVIADO_PELA_PESSOA: 'Enviado', DESCARTADO: 'Descartado', FORA_DO_PRAZO: 'Fora do prazo',
};
export const TOM_ESTADO_PONTO: Record<string, Tom> = { SUGERIDO: 'attention', APROVADO: 'live', ENVIADO_PELA_PESSOA: 'live', DESCARTADO: 'off', FORA_DO_PRAZO: 'alert' };

export const ROTULO_EVENTO: Record<string, string> = {
  ESCLARECIMENTO: 'Esclarecimento', IMPUGNACAO: 'Impugnação', SESSAO: 'Sessão pública', RECURSO: 'Recurso', ASSINATURA: 'Assinatura', VIGENCIA_ATA: 'Fim da vigência da ata',
};

export interface PaginaTexto {
  pagina: number;
  texto: string;
}

const MARCADOR = /^=== Página (\d+) ===$/m;

/** Texto do edital como o motor guarda (`=== Página N ===`) ⇒ uma entrada por página, para o salto a partir do achado. */
export function paginasDoTexto(texto: string | null | undefined): PaginaTexto[] {
  if (!texto) return [];
  const partes = texto.split(MARCADOR);
  const paginas: PaginaTexto[] = [];
  for (let i = 1; i < partes.length; i += 2) paginas.push({ pagina: Number(partes[i]), texto: (partes[i + 1] ?? '').trim() });
  return paginas;
}
