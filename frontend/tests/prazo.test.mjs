// T-094: regra pura do prazo (RF-006 contagem regressiva, RF-009 limiar). Node puro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { restante, duracao, tomDoPrazo } from '../src/lib/prazo.ts';

const AGORA = Date.parse('2026-10-23T09:00:00Z');

test('RF-006: contagem regressiva em dias, horas e minutos', () => {
  assert.equal(restante('2026-10-25T14:00:00Z', AGORA).texto, '2 d 5 h');
  assert.equal(restante('2026-10-23T12:12:00Z', AGORA).texto, '3 h 12 min');
  assert.equal(restante('2026-10-23T09:45:00Z', AGORA).texto, '45 min');
  assert.equal(restante('2026-10-23T09:00:30Z', AGORA).texto, 'menos de 1 min');
  assert.equal(duracao(26 * 60 * 60 * 1000), '1 d 2 h');
  assert.equal(duracao(2 * 60 * 60 * 1000), '2 h');
});

test('prazo vencido diz há quanto tempo e vira alerta', () => {
  const r = restante('2026-10-23T07:00:00Z', AGORA);
  assert.equal(r.vencido, true);
  assert.equal(r.texto, 'vencido há 2 h');
  assert.equal(tomDoPrazo(r), 'alert');
});

test('RF-009: dentro do limiar de 3 h é atenção; fora é normal', () => {
  assert.equal(tomDoPrazo(restante('2026-10-23T11:00:00Z', AGORA), 3), 'attention');
  assert.equal(tomDoPrazo(restante('2026-10-23T12:00:00Z', AGORA), 3), 'attention');
  assert.equal(tomDoPrazo(restante('2026-10-23T12:01:00Z', AGORA), 3), 'live');
  assert.equal(tomDoPrazo(restante('2026-10-23T11:00:00Z', AGORA), 1), 'live');
});

test('prazo inválido não quebra a tela', () => {
  const r = restante(null, AGORA);
  assert.equal(r.texto, '');
  assert.equal(tomDoPrazo(r), 'off');
});
