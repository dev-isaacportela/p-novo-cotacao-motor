// Datas e valores — helpers puros de exibição. Sem React, sem SDK: é o que
// se testa com `node --test` (frontend/tests/formato.test.mjs).
//
// O Mitra grava datas como texto ISO em VARCHAR; a tela mostra dd/mm/aaaa.

/** `2026-08-27...` → `27/08/2026`. Entrada inválida volta como veio. */
export function fmtData(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso ?? '');
}

/** `2026-08-27T14:00:00` → `27/08/2026 14:00`. Sem hora, só a data. */
export function fmtDataHora(iso: string | null | undefined): string {
  const texto = String(iso ?? '');
  const hora = /T(\d{2}:\d{2})/.exec(texto)?.[1];
  return hora ? `${fmtData(texto)} ${hora}` : fmtData(texto);
}

/** `120.5` / `"120.50"` → `R$ 120,50`. Entrada não numérica vira vazio. */
export function moeda(valor: string | number | null | undefined): string {
  const n = Number(valor);
  return Number.isFinite(n)
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '';
}

/** `10.0000` + `UN` ⇒ `10 UN`; `12.5` ⇒ `12,5`. Sem número ⇒ vazio. */
export function quantidade(valor: string | number | null | undefined, unidade?: string | null): string {
  const n = Number(valor);
  if (valor === null || valor === undefined || valor === '' || !Number.isFinite(n)) return '';
  const texto = n.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  return unidade ? `${texto} ${unidade}` : texto;
}

/** Número com separador pt-BR e até `casas` decimais; nulo ⇒ vazio. */
export function numero(valor: string | number | null | undefined, casas = 2): string {
  const n = Number(valor);
  if (valor === null || valor === undefined || valor === '' || !Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: casas });
}

/** `2026-10-23T09:00:00Z` ⇒ data e hora locais `23/10/2026 06:00` (fuso do navegador). */
export function fmtInstante(iso: string | null | undefined): string {
  const t = Date.parse(String(iso ?? ''));
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

/** Data local de hoje em ISO (`aaaa-mm-dd`), para gravar e comparar. */
export function hojeIso(): string {
  const agora = new Date();
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
}
