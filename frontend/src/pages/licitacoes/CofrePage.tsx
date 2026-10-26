// Cofre de documentos (spec 006 RF-010, T-264, admin): situação por validade, inclusão com arquivo, validade nova e desativação.
import { useCallback, useEffect, useState } from 'react';
import { motor, ErroMotor } from '@/lib/motor';
import { fmtData } from '@/lib/formato';
import { ROTULO_SITUACAO_DOC, TOM_SITUACAO_DOC } from '@/lib/licitacao';
import type { Documento } from '@/lib/tiposLicitacao';
import { Alert, Button, Code, Dash, EmptyState, Input, LabelledField, PageHeader, Panel, PanelHeader, Pilha, Status, Table, Td, TextLink, Th, Tr } from '@/components/page';

function mensagem(e: unknown, padrao: string) {
  return e instanceof ErroMotor ? `${e.regra ? e.regra + ': ' : ''}${e.message}` : padrao;
}

function lerBase64(arquivo: File): Promise<string> {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result).split(',')[1] ?? '');
    leitor.onerror = () => falha(leitor.error);
    leitor.readAsDataURL(arquivo);
  });
}

export default function CofrePage() {
  const [lista, setLista] = useState<Documento[] | null>(null);
  const [aviso, setAviso] = useState<{ tone: 'error' | 'success'; texto: string } | null>(null);
  const [tipo, setTipo] = useState('');
  const [emissor, setEmissor] = useState('');
  const [numero, setNumero] = useState('');
  const [validade, setValidade] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);

  const carregar = useCallback(() => {
    motor<Documento[]>('GET', 'documentos').then(setLista).catch((e) => setAviso({ tone: 'error', texto: mensagem(e, 'Falha ao carregar o cofre.') }));
  }, []);
  useEffect(carregar, [carregar]);

  async function incluir() {
    try {
      await motor('POST', 'documentos', { corpo: { tipo, emissor: emissor || null, numero: numero || null, validade: validade || null, arquivoNome: arquivo?.name ?? null, arquivoBase64: arquivo ? await lerBase64(arquivo) : null } });
      setTipo(''); setEmissor(''); setNumero(''); setValidade(''); setArquivo(null);
      setAviso({ tone: 'success', texto: 'Documento guardado no cofre.' });
      carregar();
    } catch (e) {
      setAviso({ tone: 'error', texto: mensagem(e, 'Falha ao incluir.') });
    }
  }

  async function renovar(d: Documento) {
    const nova = window.prompt(`Nova validade de ${d.tipo} (aaaa-mm-dd)`, d.validade ?? '');
    if (nova == null) return;
    try {
      await motor('PATCH', `documentos/${d.id}`, { corpo: { tipo: d.tipo, emissor: d.emissor, numero: d.numero, validade: nova || null } });
      setAviso({ tone: 'success', texto: 'Validade atualizada.' });
      carregar();
    } catch (e) {
      setAviso({ tone: 'error', texto: mensagem(e, 'Falha ao atualizar.') });
    }
  }

  async function desativar(d: Documento) {
    try {
      await motor('DELETE', `documentos/${d.id}`);
      setAviso({ tone: 'success', texto: `${d.tipo} desativado; fica no histórico.` });
      carregar();
    } catch (e) {
      setAviso({ tone: 'error', texto: mensagem(e, 'Falha ao desativar.') });
    }
  }

  return (
    <>
      <PageHeader module="Licitações" title="Cofre de documentos" description="O que a conciliação compara com as exigências do edital. Vencendo em 30 dias, o motor avisa." />
      {aviso ? <Alert tone={aviso.tone} className="mb-4">{aviso.texto}</Alert> : null}
      <Pilha>
        <Panel className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); incluir(); }} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_10rem_1fr_auto] sm:items-end">
            <LabelledField label="Tipo" obrigatorio hint="CERTIDAO_FEDERAL, ATESTADO_CAPACIDADE, AUTORIZACAO_ANVISA..."><Input value={tipo} onChange={(e) => setTipo(e.target.value)} /></LabelledField>
            <LabelledField label="Emissor"><Input value={emissor} onChange={(e) => setEmissor(e.target.value)} /></LabelledField>
            <LabelledField label="Número"><Input value={numero} onChange={(e) => setNumero(e.target.value)} /></LabelledField>
            <LabelledField label="Validade"><Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} /></LabelledField>
            <LabelledField label="Arquivo"><Input type="file" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} /></LabelledField>
            <Button type="submit" variant="primary" disabled={!tipo.trim()}>Guardar</Button>
          </form>
        </Panel>
        <Panel>
          <PanelHeader title="Documentos ativos" hint="Sem validade é sempre válido. Desativar não apaga: o histórico continua." />
          {lista && lista.length === 0 ? <EmptyState title="Cofre vazio" hint="Guarde as certidões e atestados que os editais costumam exigir." /> : (
            <Table>
              <thead><tr><Th>Tipo</Th><Th>Emissor · número</Th><Th>Validade</Th><Th>Situação</Th><Th>Arquivo</Th><Th /></tr></thead>
              <tbody>
                {(lista ?? []).map((d) => (
                  <Tr key={d.id}>
                    <Td><Code>{d.tipo}</Code></Td>
                    <Td>{[d.emissor, d.numero].filter(Boolean).join(' · ') || <Dash />}</Td>
                    <Td>{d.validade ? fmtData(d.validade) : <Dash />}</Td>
                    <Td><Status tone={TOM_SITUACAO_DOC[d.situacao]}>{ROTULO_SITUACAO_DOC[d.situacao]}</Status></Td>
                    <Td>{d.arquivo ? d.arquivo.split('/').pop() : <Dash />}</Td>
                    <Td numeric><TextLink onClick={() => renovar(d)}>Nova validade</TextLink> <TextLink onClick={() => desativar(d)}>Desativar</TextLink></Td>
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
