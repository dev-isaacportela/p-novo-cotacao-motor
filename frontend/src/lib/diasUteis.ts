// Regra pura de dias úteis (spec 006 RN-009): N dias úteis antes ou depois de uma data, pulando fim de semana e
// feriados. Sem React, sem SDK — `tests/diasUteis.test.mjs`. Datas em ISO `aaaa-mm-dd`; a conta é em UTC para o fuso
// local não mover o dia.

const DIA = 86_400_000;

function paraMs(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

function paraIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Dia útil: segunda a sexta e fora da lista de feriados. */
export function ehDiaUtil(iso: string, feriados: Iterable<string> = []): boolean {
  const dia = new Date(paraMs(iso)).getUTCDay();
  if (dia === 0 || dia === 6) return false;
  for (const f of feriados) if (f === iso) return false;
  return true;
}

function andar(iso: string, n: number, sentido: 1 | -1, feriados: Iterable<string>): string {
  const lista = [...feriados];
  let ms = paraMs(iso);
  let faltam = n;
  while (faltam > 0) {
    ms += sentido * DIA;
    if (ehDiaUtil(paraIso(ms), lista)) faltam--;
  }
  return paraIso(ms);
}

/** `n` dias úteis antes de `iso` (n = 0 devolve a própria data). */
export function diasUteisAntes(iso: string, n: number, feriados: Iterable<string> = []): string {
  return andar(iso, n, -1, feriados);
}

/** `n` dias úteis depois de `iso`. */
export function diasUteisDepois(iso: string, n: number, feriados: Iterable<string> = []): string {
  return andar(iso, n, 1, feriados);
}

/** Feriados nacionais fixos de 2026 e 2027, os mesmos que o motor semeia (V003). */
export const FERIADOS_NACIONAIS = [
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-04-21', '2026-05-01', '2026-06-04', '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
  '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-26', '2027-04-21', '2027-05-01', '2027-05-27', '2027-09-07', '2027-10-12', '2027-11-02', '2027-11-15', '2027-11-20', '2027-12-25',
];
