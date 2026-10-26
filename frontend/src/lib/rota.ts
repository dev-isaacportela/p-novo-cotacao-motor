// Regra pura: a rota que o front manda para a SF gateway. Sem import de SDK,
// para `tests/rota.test.mjs` rodar em Node puro.

type Consulta = Record<string, string | number | boolean | null | undefined>;

/**
 * Monta `/api/<caminho>?a=1&b=x`, ignorando valores vazios/nulos e codificando o
 * resto. Caminho sem barra inicial ganha uma; `/api` nunca e duplicado.
 */
export function montarRota(caminho: string, consulta: Consulta = {}): string {
  const limpo = caminho.replace(/^\/?(api\/)?/, '/');
  const pares = Object.entries(consulta)
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    .map(([chave, valor]) => `${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`);
  return `/api${limpo}${pares.length ? `?${pares.join('&')}` : ''}`;
}
