// Regra pura da revisão (RF-007, RN-013): cobertura do casamento, progresso da
// cotação e o que falta para aprovar. Sem React, sem SDK — `tests/cobertura.test.mjs`.

export interface Termo {
  term: string;
  weight: number;
}

/** 0.6017 ⇒ "60%"; nulo ou inválido ⇒ "". */
export function percentual(fracao: number | string | null | undefined): string {
  if (fracao === null || fracao === undefined || fracao === '') return '';
  const n = Number(fracao);
  return Number.isFinite(n) ? `${Math.round(n * 100)}%` : '';
}

/** Termos do mais pesado para o mais leve; empate mantém a ordem de chegada. */
export function ordenarPorPeso<T extends Termo>(termos: readonly T[]): T[] {
  return [...termos].sort((a, b) => b.weight - a.weight);
}

export type Situacao = 'ANALISANDO' | 'SUGERIDO' | 'CANDIDATOS' | 'SEM_CORRESPONDENCIA' | 'CONFIRMADO' | 'DECLINADO';

export interface ItemParaRegra {
  idExternoItem: string;
  situacao: Situacao;
  marcas?: readonly string[];
  proposta?: { codProd?: number | null; precoSugerido?: number | string | null; precoFinal?: number | string | null; declinado?: boolean } | null;
}

export interface Progresso {
  total: number;
  confirmados: number;
  declinados: number;
  pendentes: number;
}

/** Confirmados e declinados contam como resolvidos; o resto ainda precisa do revisor. */
export function progresso(itens: readonly ItemParaRegra[]): Progresso {
  const confirmados = itens.filter((i) => i.situacao === 'CONFIRMADO').length;
  const declinados = itens.filter((i) => i.situacao === 'DECLINADO').length;
  return { total: itens.length, confirmados, declinados, pendentes: itens.length - confirmados - declinados };
}

/** Preço efetivo da linha: final, senão sugerido; nulo quando não há. */
export function precoEfetivo(linha: ItemParaRegra['proposta']): number | null {
  const v = linha?.precoFinal ?? linha?.precoSugerido;
  const n = Number(v);
  return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : n;
}

/**
 * RN-013 na tela: lista o que impede a aprovação, item a item, para o tooltip do botão. Vazia = pode aprovar.
 * Item não declinado precisa estar confirmado, com produto e com preço maior que zero.
 */
export function faltaParaAprovar(itens: readonly ItemParaRegra[], status?: string): string[] {
  const faltas: string[] = [];
  if (status && status !== 'EM_REVISAO') faltas.push(`cotação está ${status.replace(/_/g, ' ').toLowerCase()}`);
  for (const i of itens) {
    if (i.situacao === 'DECLINADO') continue;
    const rotulo = `item ${i.idExternoItem}`;
    if (i.situacao !== 'CONFIRMADO') faltas.push(`${rotulo}: confirmar ou declinar`);
    else if (!i.proposta?.codProd) faltas.push(`${rotulo}: escolher o produto`);
    const preco = precoEfetivo(i.proposta);
    if (i.situacao === 'CONFIRMADO' && (preco === null || preco <= 0)) faltas.push(`${rotulo}: informar o preço`);
  }
  return faltas;
}

/** Marcas do item e da cotação viram rótulos curtos para os selos. */
export const ROTULO_MARCA: Record<string, string> = {
  SEM_IA: 'sem IA',
  FORA_ESCOPO: 'fora do escopo',
  LACUNA_CADASTRO: 'lacuna de cadastro',
  CONFERIR_UNIDADE: 'conferir unidade',
  PENDENTE_PRECO: 'pendente de preço',
  RECONFERIR: 'reconferir',
  SEM_PRE_LEITURA: 'sem pré-leitura',
  SEM_TEXTO_EDITAL: 'edital sem texto',
};
