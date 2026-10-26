// Regra pura do cliente do motor (src/lib/rota.ts): a rota que vai para a SF gateway.
import test from 'node:test';
import assert from 'node:assert/strict';
import { montarRota } from '../src/lib/rota.ts';

test('montarRota: caminho simples ganha /api e barra', () => {
  assert.equal(montarRota('painel'), '/api/painel');
  assert.equal(montarRota('/painel'), '/api/painel');
  assert.equal(montarRota('/api/painel'), '/api/painel');
});

test('montarRota: consulta ignora vazio e nulo e codifica o resto', () => {
  assert.equal(
    montarRota('oportunidades', { status: 'EM_REVISAO', comprador: '', portal: null, pagina: 0, de: '2026-10-01' }),
    '/api/oportunidades?status=EM_REVISAO&pagina=0&de=2026-10-01',
  );
  assert.equal(montarRota('catalogo/busca', { termo: 'whey morango' }), '/api/catalogo/busca?termo=whey%20morango');
});
