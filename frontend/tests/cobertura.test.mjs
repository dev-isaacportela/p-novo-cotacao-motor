// T-094: regra pura da revisão (RF-007, RN-013). Node puro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { percentual, ordenarPorPeso, progresso, precoEfetivo, faltaParaAprovar } from '../src/lib/cobertura.ts';

test('cobertura vira percentual inteiro', () => {
  assert.equal(percentual(0.6017), '60%');
  assert.equal(percentual('0.787'), '79%');
  assert.equal(percentual(1), '100%');
  assert.equal(percentual(null), '');
});

test('termos ordenados do mais pesado para o mais leve, estável no empate', () => {
  const termos = [{ term: 'lata', weight: 0.2 }, { term: 'dieta', weight: 0.5 }, { term: 'enteral', weight: 0.5 }, { term: '800', weight: 0.1 }];
  assert.deepEqual(ordenarPorPeso(termos).map((t) => t.term), ['dieta', 'enteral', 'lata', '800']);
  assert.equal(termos[0].term, 'lata', 'não muda a lista original');
});

const itens = [
  { idExternoItem: '1', situacao: 'CONFIRMADO', proposta: { codProd: 2067, precoSugerido: '38.90', precoFinal: null } },
  { idExternoItem: '2', situacao: 'CONFIRMADO', proposta: { codProd: 1958, precoSugerido: null, precoFinal: '2.10' } },
  { idExternoItem: '3', situacao: 'DECLINADO', proposta: { codProd: null, declinado: true } },
  { idExternoItem: '4', situacao: 'SUGERIDO', proposta: { codProd: 2195, precoSugerido: null } },
  { idExternoItem: '5', situacao: 'CONFIRMADO', proposta: { codProd: 88, precoSugerido: null, precoFinal: null } },
];

test('progresso conta confirmados, declinados e pendentes', () => {
  assert.deepEqual(progresso(itens), { total: 5, confirmados: 3, declinados: 1, pendentes: 1 });
  assert.deepEqual(progresso([]), { total: 0, confirmados: 0, declinados: 0, pendentes: 0 });
});

test('preço efetivo é o final, senão o sugerido; nunca 0 inventado', () => {
  assert.equal(precoEfetivo(itens[0].proposta), 38.9);
  assert.equal(precoEfetivo(itens[1].proposta), 2.1);
  assert.equal(precoEfetivo(itens[4].proposta), null);
  assert.equal(precoEfetivo(null), null);
});

test('RN-013: o tooltip do aprovar lista o que falta, item a item', () => {
  assert.deepEqual(faltaParaAprovar(itens, 'EM_REVISAO'), ['item 4: confirmar ou declinar', 'item 5: informar o preço']);
  assert.deepEqual(faltaParaAprovar(itens.slice(0, 3), 'EM_REVISAO'), [], 'confirmados com preço e um declinado: pode aprovar');
  assert.deepEqual(faltaParaAprovar(itens.slice(0, 3), 'APROVADA'), ['cotação está aprovada']);
  assert.deepEqual(faltaParaAprovar([{ idExternoItem: '9', situacao: 'CONFIRMADO', proposta: { codProd: null } }]), ['item 9: escolher o produto', 'item 9: informar o preço']);
});
