// Relatório de lacunas de cadastro (RF-016, T-055): termos desconhecidos por frequência, itens sem correspondência, CSV.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motor, ErroMotor } from '@/lib/motor';
import type { Lacunas } from '@/lib/tipos';
import { Alert, Button, Code, EmptyState, Input, LabelledField, PageHeader, Panel, PanelHeader, Pilha, Table, Td, TextLink, Th, Tr } from '@/components/page';

function csvDe(r: Lacunas): string {
  const campo = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const linhas = ['tipo;termo_ou_descricao;frequencia;portal;cotacao;item'];
  for (const t of r.termos) linhas.push(`TERMO;${campo(t.termo)};${t.frequencia};;;`);
  for (const i of r.semCorrespondencia) linhas.push(`SEM_CORRESPONDENCIA;${campo(i.descricao)};;${campo(i.portal)};${campo(i.idExterno)};${campo(i.idExternoItem)}`);
  return linhas.join('\n') + '\n';
}

export default function LacunasPage() {
  const navigate = useNavigate();
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [r, setR] = useState<Lacunas | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    motor<Lacunas>('GET', 'relatorios/lacunas', { consulta: { de: de ? `${de}T00:00:00Z` : '', ate: ate ? `${ate}T23:59:59Z` : '' } })
      .then((x) => { setR(x); setErro(''); })
      .catch((e: unknown) => setErro(e instanceof ErroMotor ? e.message : 'Não foi possível carregar o relatório.'));
  }, [de, ate]);

  useEffect(carregar, [carregar]);

  function baixar() {
    if (!r) return;
    const url = URL.createObjectURL(new Blob(['﻿' + csvDe(r)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lacunas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader module="Cotações" title="Lacunas de cadastro" description="O que o catálogo não conhece: realimenta o cadastro no Busca360."
        actions={
          <>
            <LabelledField label="De"><Input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></LabelledField>
            <LabelledField label="Até"><Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></LabelledField>
            <Button onClick={baixar} disabled={!r}>Baixar CSV</Button>
          </>
        } />
      {erro ? <Alert tone="error" className="mb-4">{erro}</Alert> : null}
      <Pilha>
        <Panel>
          <PanelHeader title="Termos desconhecidos" hint="Dos itens marcados como possível lacuna (RN-004), por frequência." />
          {r && r.termos.length === 0 ? <EmptyState title="Nenhum termo desconhecido no período" /> : (
            <Table>
              <thead><tr><Th>Termo</Th><Th numeric>Frequência</Th></tr></thead>
              <tbody>{(r?.termos ?? []).map((t) => <Tr key={t.termo}><Td>{t.termo}</Td><Td numeric>{t.frequencia}</Td></Tr>)}</tbody>
            </Table>
          )}
        </Panel>
        <Panel>
          <PanelHeader title="Itens sem correspondência" hint="Nenhum candidato com cobertura mínima (RN-003)." />
          {r && r.semCorrespondencia.length === 0 ? <EmptyState title="Nenhum item sem correspondência no período" /> : (
            <Table>
              <thead><tr><Th>Cotação</Th><Th>Item</Th><Th>Descrição</Th></tr></thead>
              <tbody>
                {(r?.semCorrespondencia ?? []).map((i) => (
                  <Tr key={i.itemId}>
                    <Td><TextLink onClick={() => navigate(`/oportunidades/${i.oportunidadeId}`)}>{i.idExterno}</TextLink> <Code>{i.portal}</Code></Td>
                    <Td><Code>{i.idExternoItem}</Code></Td>
                    <Td>{i.descricao}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </Pilha>
    </>
  );
}
