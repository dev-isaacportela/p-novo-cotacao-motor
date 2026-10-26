// Regra pura do prazo de resposta (RF-006, RF-009): contagem regressiva e
// tom pelo limiar de alerta. Sem React, sem SDK — `tests/prazo.test.mjs`.

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

export interface Restante {
  /** Milissegundos até o prazo; negativo quando venceu. */
  ms: number;
  vencido: boolean;
  /** "2 d 5 h", "3 h 12 min", "45 min", "vencido há 2 h". */
  texto: string;
}

/** Quanto falta até `prazoIso` a partir de `agoraMs` (padrão: agora). Prazo inválido ⇒ texto vazio. */
export function restante(prazoIso: string | null | undefined, agoraMs: number = Date.now()): Restante {
  const prazo = Date.parse(String(prazoIso ?? ''));
  if (!Number.isFinite(prazo)) return { ms: NaN, vencido: false, texto: '' };
  const ms = prazo - agoraMs;
  if (ms < 0) return { ms, vencido: true, texto: `vencido há ${duracao(-ms)}` };
  return { ms, vencido: false, texto: duracao(ms) };
}

/** Duração legível, com duas unidades no máximo. Abaixo de um minuto: "menos de 1 min". */
export function duracao(ms: number): string {
  const total = Math.max(0, Math.floor(ms / MINUTO));
  if (total < 1) return 'menos de 1 min';
  const dias = Math.floor(total / (24 * 60));
  const horas = Math.floor((total % (24 * 60)) / 60);
  const minutos = total % 60;
  if (dias >= 1) return horas ? `${dias} d ${horas} h` : `${dias} d`;
  if (horas >= 1) return minutos ? `${horas} h ${minutos} min` : `${horas} h`;
  return `${minutos} min`;
}

/**
 * Tom do prazo para `Status`: vencido ⇒ alert; dentro do limiar de alerta (horas, RF-009) ⇒ attention;
 * senão live. Prazo inválido ⇒ off.
 */
export function tomDoPrazo(r: Restante, limiarHoras = 3): 'live' | 'attention' | 'alert' | 'off' {
  if (!Number.isFinite(r.ms)) return 'off';
  if (r.vencido) return 'alert';
  return r.ms <= limiarHoras * HORA ? 'attention' : 'live';
}

export const UM_DIA_MS = DIA;
