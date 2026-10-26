// T-293: regra pura das telas de licitação (spec 006). Node puro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { aderencia, paginasDoTexto, situacaoDocumento, tomDaPrioridade } from '../src/lib/licitacao.ts';

test('aderência vira percentual inteiro com espaço', () => {
  assert.equal(aderencia(80), '80 %');
  assert.equal(aderencia('79.6'), '80 %');
  assert.equal(aderencia(null), '');
  assert.equal(aderencia('x'), '');
});

test('prioridade dá o tom do selo', () => {
  assert.equal(tomDaPrioridade('ALTA'), 'live');
  assert.equal(tomDaPrioridade('MEDIA'), 'attention');
  assert.equal(tomDaPrioridade(null), 'off');
});

test('RN-012: situação do documento por data', () => {
  assert.equal(situacaoDocumento('2026-11-10', '2026-10-23'), 'VENCE_EM_BREVE');
  assert.equal(situacaoDocumento('2026-10-22', '2026-10-23'), 'VENCIDO');
  assert.equal(situacaoDocumento('2027-01-15', '2026-10-23'), 'VALIDO');
  assert.equal(situacaoDocumento('2026-11-22', '2026-10-23'), 'VENCE_EM_BREVE', 'no limite entra');
  assert.equal(situacaoDocumento(null, '2026-10-23'), 'VALIDO');
});

test('texto do edital vira uma entrada por página', () => {
  const p = paginasDoTexto('=== Página 1 ===\nEDITAL\n\n=== Página 2 ===\nHabilitação\n\n');
  assert.deepEqual(p, [{ pagina: 1, texto: 'EDITAL' }, { pagina: 2, texto: 'Habilitação' }]);
  assert.deepEqual(paginasDoTexto(null), []);
});
