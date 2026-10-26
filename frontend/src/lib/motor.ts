// Cliente do motor Java, sempre pela SF gateway `cotMotorChamar`.
//
// O front nunca chama a API REST do motor direto: a plataforma e quem conhece
// o usuario (:VAR_USER) e o endereco/token do motor (COT_PARAMETRO). Toda tela
// usa `motor()`; a regra pura (`montarRota`) e o que `tests/motor.test.mjs` cobre.

import { acao } from './mitra-api';
import { montarRota } from './rota';

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Consulta = Record<string, string | number | boolean | null | undefined>;

/** Erro de regra devolvido pelo motor: `422 { regra, mensagem, itens }` ou `409` de conflito. */
export class ErroMotor extends Error {
  status: number;
  regra?: string;
  itens?: number[];
  constructor(status: number, mensagem: string, regra?: string, itens?: number[]) {
    super(mensagem);
    this.status = status;
    this.regra = regra;
    this.itens = itens;
  }
}

/** Chama o motor. Lanca `ErroMotor` em 4xx/5xx; devolve o corpo em sucesso. */
export async function motor<T = unknown>(metodo: Metodo, caminho: string, opcoes: { consulta?: Consulta; corpo?: unknown } = {}): Promise<T> {
  const saida = await acao('motorChamar', { metodo, rota: montarRota(caminho, opcoes.consulta), corpo: opcoes.corpo ?? {} });
  if (saida.ok) return saida.corpo as T;
  const corpo = (saida.corpo ?? {}) as { mensagem?: string; regra?: string; itens?: number[] };
  throw new ErroMotor(Number(saida.status ?? 500), corpo.mensagem || saida.error || `Falha ao chamar o motor (${saida.status}).`, corpo.regra, corpo.itens);
}
