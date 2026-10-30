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

// ── Cabeçalho da análise ─────────────────────────────────────────────────

const MODALIDADE: Record<string, string> = {
  PREGAO: 'Pregão', DISPENSA: 'Dispensa', CONCORRENCIA: 'Concorrência', LEILAO: 'Leilão', INEXIGIBILIDADE: 'Inexigibilidade',
  ADESAO_ATA: 'Adesão a ata', CREDENCIAMENTO: 'Credenciamento',
};

/** "PREGAO" ⇒ "Pregão"; desconhecida vira a primeira letra maiúscula. */
export function nomeModalidade(m: string | null | undefined): string {
  if (!m) return 'Licitação';
  return MODALIDADE[m.toUpperCase()] ?? m.charAt(0).toUpperCase() + m.slice(1).toLowerCase().replace(/_/g, ' ');
}

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'para']);

/** Órgão como os portais mandam, tudo em caixa alta ⇒ nome próprio; quem já vem misturado fica como está. */
export function nomeProprio(s: string | null | undefined): string {
  if (!s) return '';
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().split(/\s+/).map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(' ');
}

/** Distância em dias de calendário até a data (fuso local): "hoje", "amanhã", "em 17 dias", "há 3 dias". */
export function diasAte(iso: string | null | undefined, agora: Date = new Date()): string {
  if (!iso) return '';
  const alvo = new Date(iso);
  if (Number.isNaN(alvo.getTime())) return '';
  const dia = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const n = Math.round((dia(alvo) - dia(agora)) / 86_400_000);
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`;
}

/** Porte da pré-leitura ⇒ "15 de 16 itens no escopo"; sem contagem, vazio. */
export function porteDaPreLeitura(porte: Record<string, unknown> | null | undefined): string {
  const total = Number(porte?.itensTotal);
  const escopo = Number(porte?.itensNoEscopo);
  if (!Number.isFinite(total) || total <= 0) return '';
  return Number.isFinite(escopo) ? `${escopo} de ${total} ${total === 1 ? 'item' : 'itens'} no escopo` : `${total} ${total === 1 ? 'item' : 'itens'}`;
}

export type Aba = 'parecer' | 'documentos' | 'estrategia' | 'calendario' | 'historico';
export interface ProximoPasso { texto: string; aba?: Aba; acao?: string }

/**
 * O que falta para a licitação andar, em uma frase (spec 006 RF-008, RN-011; desde 30/10/2026 as exigências pendentes
 * seguram a aprovação da proposta, não a montagem). `conciliada` = edital lido e conciliado;
 * `pendentes` = exigências sem documento atendido nem justificativa. Null quando a ação do cabeçalho já basta ou não há passo.
 */
export function proximoPasso(status: string, conciliada: boolean, pendentes: number, decisaoParticipar: boolean): ProximoPasso | null {
  if (status === 'EM_DECISAO' || status === 'EM_ESPERA') return { texto: 'Leia o parecer da pré-leitura e decida se a Benenutri participa.', aba: 'parecer' };
  if (status === 'EM_ANALISE' && !conciliada) {
    return { texto: decisaoParticipar ? 'O edital está sendo lido e conciliado com o cofre. Atualize em instantes.' : 'A leitura do edital começa depois da decisão de participar.' };
  }
  if (status === 'EM_ANALISE' && pendentes > 0) {
    return { texto: `Você já pode montar a proposta. ${pendentes} ${pendentes === 1 ? 'exigência de habilitação está' : 'exigências de habilitação estão'} sem documento nem justificativa e só ${pendentes === 1 ? 'trava' : 'travam'} a aprovação.`, aba: 'documentos', acao: 'Resolver' };
  }
  if (status === 'EM_ANALISE') return { texto: 'Documentos resolvidos. Marque como pronta para montar a proposta.' };
  if (status === 'PRONTA_PARA_PROPOSTA') return { texto: 'Monte a proposta: os itens, preços e tetos saem da leitura do edital.' };
  return null;
}
