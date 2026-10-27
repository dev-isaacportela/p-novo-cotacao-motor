// T-391: regra pura da proposta de licitação e das atas (spec 007). Node puro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliarPreco, pendenciasPorItem, percentualSaldo, tomDaLinha } from '../src/lib/licitacaoProposta.ts';

test('C-011: saldo da ata em percentual inteiro', () => {
  assert.equal(percentualSaldo(700, 1000), '70 %');
  assert.equal(percentualSaldo('1000.0000', '1000'), '100 %');
  assert.equal(percentualSaldo(0, 1000), '0 %');
  assert.equal(percentualSaldo(5, 0), '');
  assert.equal(percentualSaldo(null, null), '');
});

test('RN-004/RN-005: preço digitado contra mínimo e teto', () => {
  assert.equal(avaliarPreco('12,90', 12.9, 14), 'OK');
  assert.equal(avaliarPreco(12.5, 12.9, 14), 'ABAIXO_DO_MINIMO');
  assert.equal(avaliarPreco(14.5, 12.9, 14), 'ACIMA_DO_TETO');
  assert.equal(avaliarPreco(14.5, 12.9, null), 'OK');
  assert.equal(avaliarPreco('', 12.9, 14), 'SEM_PRECO');
  assert.equal(avaliarPreco('x', null, null), 'SEM_PRECO');
});

test('C-005: pendências agrupadas pelo item do edital', () => {
  const r = pendenciasPorItem(['item 10: sem produto nem declínio', 'item 7: sem preço', 'item 7: teto a conferir sem justificativa', 'exceção pendente']);
  assert.deepEqual(r['10'], ['sem produto nem declínio']);
  assert.deepEqual(r['7'], ['sem preço', 'teto a conferir sem justificativa']);
  assert.deepEqual(r[''], ['exceção pendente']);
  assert.deepEqual(pendenciasPorItem(null), {});
});

test('tom da linha: inviável alerta, teto a conferir atenção, declinado apagado', () => {
  assert.equal(tomDaLinha(['INVIAVEL', 'TETO_APLICADO'], false), 'alert');
  assert.equal(tomDaLinha(['TETO_A_CONFERIR'], false), 'attention');
  assert.equal(tomDaLinha(['TETO_APLICADO'], false), 'live');
  assert.equal(tomDaLinha(['INVIAVEL'], true), 'off');
});
