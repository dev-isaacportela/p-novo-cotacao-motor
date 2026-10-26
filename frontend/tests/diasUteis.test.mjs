// T-293: regra pura de dias úteis (spec 006 RN-009). Node puro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { diasUteisAntes, diasUteisDepois, ehDiaUtil, FERIADOS_NACIONAIS } from '../src/lib/diasUteis.ts';

test('segunda menos 3 úteis é a quarta anterior; feriado no caminho empurra um dia', () => {
  assert.equal(diasUteisAntes('2026-11-09', 3), '2026-11-04');
  assert.equal(diasUteisAntes('2026-11-09', 3, ['2026-11-04']), '2026-11-03');
  assert.equal(diasUteisAntes('2026-11-10', 3, FERIADOS_NACIONAIS), '2026-11-05');
  assert.equal(diasUteisAntes('2026-11-06', 0), '2026-11-06');
});

test('depois pula o fim de semana', () => {
  assert.equal(diasUteisDepois('2026-11-06', 3), '2026-11-11');
  assert.equal(diasUteisDepois('2026-11-13', 1, FERIADOS_NACIONAIS), '2026-11-16');
});

test('dia útil é segunda a sexta fora do feriado', () => {
  assert.equal(ehDiaUtil('2026-11-07'), false);
  assert.equal(ehDiaUtil('2026-11-02', FERIADOS_NACIONAIS), false);
  assert.equal(ehDiaUtil('2026-11-03', FERIADOS_NACIONAIS), true);
});
