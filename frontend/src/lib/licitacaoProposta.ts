// Regra pura das telas de proposta de licitação e pós-venda (spec 007): percentual de saldo da ata, avaliação do preço
// digitado contra mínimo e teto, agrupamento das pendências por item e rótulos. Sem React — `tests/licitacaoProposta.test.mjs`.
import type { Tom } from './licitacao';

export const ROTULO_RESULTADO: Record<string, string> = { VENCEDOR: 'Vencedor', PERDEU: 'Perdeu', DESCLASSIFICADO: 'Desclassificado' };
export const TOM_RESULTADO: Record<string, Tom> = { VENCEDOR: 'live', PERDEU: 'off', DESCLASSIFICADO: 'alert' };
export const ROTULO_ORIGEM: Record<string, string> = { FONTE: 'portal', PESSOA: 'manual' };

/** Saldo sobre o registrado ⇒ "70 %"; vazio sem registrado. */
export function percentualSaldo(saldo: number | string | null | undefined, registrada: number | string | null | undefined): string {
  const s = Number(saldo), r = Number(registrada);
  if (registrada == null || !Number.isFinite(r) || r <= 0 || !Number.isFinite(s)) return '';
  return `${Math.round((s / r) * 100)} %`;
}

export type AvaliacaoPreco = 'OK' | 'ABAIXO_DO_MINIMO' | 'ACIMA_DO_TETO' | 'SEM_PRECO';

/** RN-004/RN-005 na tela: o preço digitado contra o mínimo e o teto (teto manda, depois mínimo). */
export function avaliarPreco(preco: number | string | null | undefined, valorMinimo: number | string | null | undefined, teto: number | string | null | undefined): AvaliacaoPreco {
  const p = Number(String(preco ?? '').replace(',', '.'));
  if (preco == null || preco === '' || !Number.isFinite(p)) return 'SEM_PRECO';
  if (teto != null && teto !== '' && p > Number(teto)) return 'ACIMA_DO_TETO';
  if (valorMinimo != null && valorMinimo !== '' && p < Number(valorMinimo)) return 'ABAIXO_DO_MINIMO';
  return 'OK';
}

export const ROTULO_AVALIACAO: Record<AvaliacaoPreco, string> = { OK: '', ABAIXO_DO_MINIMO: 'abaixo do mínimo', ACIMA_DO_TETO: 'acima do teto', SEM_PRECO: 'sem preço' };

/** Pendências do motor ("item 7: sem preço") agrupadas pelo id externo do item; o resto vai em "". */
export function pendenciasPorItem(pendencias: string[] | null | undefined): Record<string, string[]> {
  const r: Record<string, string[]> = {};
  for (const p of pendencias ?? []) {
    const m = /^item ([^:]+): (.+)$/.exec(p);
    const chave = m ? m[1] : '', texto = m ? m[2] : p;
    (r[chave] ??= []).push(texto);
  }
  return r;
}

/** Tom da linha pelas marcas do item: inviável é alerta, teto a conferir é atenção, o resto segue a situação. */
export function tomDaLinha(marcas: string[] | null | undefined, declinado: boolean): Tom {
  if (declinado) return 'off';
  if (marcas?.includes('INVIAVEL')) return 'alert';
  if (marcas?.includes('TETO_A_CONFERIR')) return 'attention';
  return 'live';
}
