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

test('cabeçalho da análise: modalidade, órgão e distância da sessão', async () => {
  const { nomeModalidade, nomeProprio, diasAte, porteDaPreLeitura } = await import('../src/lib/licitacao.ts');
  assert.equal(nomeModalidade('PREGAO'), 'Pregão');
  assert.equal(nomeModalidade('pregao'), 'Pregão');
  assert.equal(nomeModalidade('DIALOGO_COMPETITIVO'), 'Dialogo competitivo');
  assert.equal(nomeModalidade(null), 'Licitação');
  assert.equal(nomeProprio('SECRETARIA DE ESTADO DA SAUDE'), 'Secretaria de Estado da Saude');
  assert.equal(nomeProprio('Hospital Universitário de Campinas'), 'Hospital Universitário de Campinas', 'misturado fica');
  const agora = new Date(2026, 9, 30, 10, 0);
  assert.equal(diasAte(new Date(2026, 10, 16, 8, 0).toISOString(), agora), 'em 17 dias');
  assert.equal(diasAte(new Date(2026, 9, 30, 23, 0).toISOString(), agora), 'hoje');
  assert.equal(diasAte(new Date(2026, 9, 31, 1, 0).toISOString(), agora), 'amanhã');
  assert.equal(diasAte(new Date(2026, 9, 27, 9, 0).toISOString(), agora), 'há 3 dias');
  assert.equal(diasAte(null, agora), '');
  assert.equal(porteDaPreLeitura({ itensTotal: 16, itensNoEscopo: 15, valorEstimado: 1 }), '15 de 16 itens no escopo');
  assert.equal(porteDaPreLeitura({ itensTotal: 1 }), '1 item');
  assert.equal(porteDaPreLeitura(null), '');
});

test('RN-011: próximo passo da análise', async () => {
  const { proximoPasso } = await import('../src/lib/licitacao.ts');
  assert.equal(proximoPasso('EM_DECISAO', false, 0, false)?.aba, 'parecer');
  assert.match(proximoPasso('EM_ANALISE', false, 0, true)?.texto ?? '', /sendo lido/);
  assert.deepEqual(proximoPasso('EM_ANALISE', true, 20, true), { texto: 'Você já pode montar a proposta. 20 exigências de habilitação estão sem documento nem justificativa e só travam a aprovação.', aba: 'documentos', acao: 'Resolver' });
  assert.match(proximoPasso('EM_ANALISE', true, 1, true)?.texto ?? '', /1 exigência de habilitação está .* só trava a aprovação/);
  assert.match(proximoPasso('EM_ANALISE', true, 0, true)?.texto ?? '', /pronta/);
  assert.equal(proximoPasso('EM_REVISAO', true, 0, true), null);
});
