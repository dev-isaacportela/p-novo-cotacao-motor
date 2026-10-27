// Atas de registro de preços (spec 007 RF-010..RF-012, T-353): lista com vigência e saldo, registro manual da ata de uma
// licitação ganha, empenhos que abatem o saldo e viram pedido.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motor, ErroMotor } from '@/lib/motor';
import { fmtData, fmtInstante, moeda, numero } from '@/lib/formato';
import { percentualSaldo, ROTULO_ORIGEM } from '@/lib/licitacaoProposta';
import type { AtaDetalhe, AtaResumo } from '@/lib/tiposLicitacao';
import {
  Alert, Button, Code, Dash, Definicao, Definicoes, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  EmptyState, Input, LabelledField, PageHeader, Panel, PanelHeader, Pilha, RowMeta, RowTitle, Status, Table, Td, TextLink, Th, Tr,
} from '@/components/page';

type Aviso = { tone: 'error' | 'success'; texto: string };

function mensagem(e: unknown, padrao: string) {
  return e instanceof ErroMotor ? `${e.regra ? e.regra + ': ' : ''}${e.message}` : padrao;
}

export default function AtasPage() {
  const navigate = useNavigate();
  const [busca] = useSearchParams();
  const [lista, setLista] = useState<AtaResumo[] | null>(null);
  const [aberta, setAberta] = useState<AtaDetalhe | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [registrando, setRegistrando] = useState(busca.has('oportunidade'));
  const [empenhando, setEmpenhando] = useState(false);

  const carregar = useCallback(() => {
    motor<AtaResumo[]>('GET', 'atas').then(setLista).catch((e: unknown) => setAviso({ tone: 'error', texto: mensagem(e, 'Não foi possível carregar as atas.') }));
  }, []);
  useEffect(carregar, [carregar]);

  const abrir = useCallback((id: number) => {
    motor<AtaDetalhe>('GET', `atas/${id}`).then(setAberta).catch((e: unknown) => setAviso({ tone: 'error', texto: mensagem(e, 'Não foi possível abrir a ata.') }));
  }, []);

  function registrada(a: AtaDetalhe) {
    setRegistrando(false); setEmpenhando(false); setAviso({ tone: 'success', texto: `Ata ${a.ata.numero} registrada; fim da vigência no calendário.` }); carregar(); abrir(a.ata.id);
  }

  return (
    <>
      <PageHeader module="Licitações" title="Atas de registro de preços" description="O que a Benenutri ganhou e ainda pode ser empenhado. Cada empenho vira um pedido."
        actions={<Button variant="primary" onClick={() => setRegistrando(true)}>Registrar ata</Button>} />
      {aviso ? <Alert tone={aviso.tone} className="mb-4">{aviso.texto}</Alert> : null}
      <Pilha>
        <Panel>
          <PanelHeader title="Atas" hint="Vigente = hoje dentro da vigência. Saldo = registrado − empenhado." />
          {lista && lista.length === 0 ? <EmptyState title="Nenhuma ata registrada" hint="Quando o portal publicar a ata de uma licitação ganha ela aparece aqui; também dá para registrar à mão." /> : (
            <Table>
              <thead><tr><Th>Ata</Th><Th>Órgão</Th><Th>Vigência</Th><Th numeric>Itens</Th><Th numeric>Com saldo</Th><Th>Situação</Th></tr></thead>
              <tbody>
                {(lista ?? []).map((r) => (
                  <Tr key={r.ata.id}>
                    <Td><TextLink onClick={() => abrir(r.ata.id)}>{r.ata.numero}</TextLink><RowMeta>licitação {r.numeroLicitacao ?? r.ata.oportunidadeId} · {ROTULO_ORIGEM[r.ata.origem]}</RowMeta></Td>
                    <Td>{r.orgao ?? <Dash />}</Td>
                    <Td>{fmtData(r.ata.vigenciaInicio)} – {fmtData(r.ata.vigenciaFim)}</Td>
                    <Td numeric>{r.ata.itens.length}</Td>
                    <Td numeric>{r.ata.itens.filter((i) => Number(i.saldo) > 0).length}</Td>
                    <Td><Status tone={r.vigente ? 'live' : 'off'}>{r.vigente ? 'vigente' : 'fora da vigência'}</Status></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        {aberta ? (
          <Panel>
            <PanelHeader title={`Ata ${aberta.ata.numero}`} hint={`${aberta.orgao ?? ''} · licitação ${aberta.numeroLicitacao ?? ''}`}>
              <Button onClick={() => navigate(`/licitacoes/${aberta.ata.oportunidadeId}/proposta`)}>Proposta</Button>
              <Button variant="primary" onClick={() => setEmpenhando(true)} disabled={!aberta.ata.itens.some((i) => Number(i.saldo) > 0)}>Empenhar</Button>
            </PanelHeader>
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <Definicoes>
                <Definicao rotulo="Vigência">{fmtData(aberta.ata.vigenciaInicio)} – {fmtData(aberta.ata.vigenciaFim)}</Definicao>
                <Definicao rotulo="Órgão (CNPJ)">{aberta.ata.orgaoCnpj}</Definicao>
                <Definicao rotulo="Registro">{aberta.ata.registradoPor ? `${aberta.ata.registradoPor} (${ROTULO_ORIGEM[aberta.ata.origem]})` : ROTULO_ORIGEM[aberta.ata.origem]}</Definicao>
              </Definicoes>
            </div>
            <Table>
              <thead><tr><Th>Item</Th><Th numeric>Registrado</Th><Th numeric>Empenhado</Th><Th numeric>Saldo</Th><Th numeric>Preço</Th></tr></thead>
              <tbody>
                {aberta.ata.itens.map((i) => (
                  <Tr key={i.id}>
                    <Td><RowTitle>{i.descricao ?? `item ${i.itemId}`}</RowTitle><RowMeta>{i.codProd ? <Code>{i.codProd}</Code> : null}</RowMeta></Td>
                    <Td numeric>{numero(i.quantidadeRegistrada, 0)}</Td>
                    <Td numeric>{numero(i.quantidadeEmpenhada, 0)}</Td>
                    <Td numeric><Status tone={Number(i.saldo) > 0 ? (Number(i.saldoPct) <= 10 ? 'attention' : 'live') : 'off'}>{numero(i.saldo, 0)} · {percentualSaldo(i.saldo, i.quantidadeRegistrada)}</Status></Td>
                    <Td numeric>{i.precoRegistrado != null ? moeda(i.precoRegistrado) : <Dash />}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <PanelHeader title="Empenhos" hint="Cada empenho abate o saldo e cria o pedido na mesma hora (RN-012)." />
            {aberta.empenhos.length === 0 ? <p className="px-4 py-3 text-[13px] text-ink-secondary">Nenhum empenho ainda.</p> : (
              <Table>
                <thead><tr><Th>Empenho</Th><Th>Data</Th><Th numeric>Itens</Th><Th>Pedido</Th><Th>Registro</Th></tr></thead>
                <tbody>
                  {aberta.empenhos.map((e) => (
                    <Tr key={e.id}>
                      <Td><Code>{e.numero}</Code></Td>
                      <Td>{fmtData(e.data)}</Td>
                      <Td numeric>{e.itens.length}</Td>
                      <Td>{e.pedidoId ? <TextLink onClick={() => navigate(`/oportunidades/${aberta.ata.oportunidadeId}`)}>pedido {e.pedidoId}</TextLink> : <Dash />}</Td>
                      <Td>{e.registradoPor} · {fmtInstante(e.criadoEm)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        ) : null}
      </Pilha>

      {registrando ? <DialogoAta oportunidadeId={busca.get('oportunidade') ?? ''} onFechar={() => setRegistrando(false)} onRegistrada={registrada} /> : null}
      {empenhando && aberta ? <DialogoEmpenho ata={aberta} onFechar={() => setEmpenhando(false)} onEmpenhado={() => { setEmpenhando(false); setAviso({ tone: 'success', texto: 'Empenho registrado e pedido criado.' }); carregar(); abrir(aberta.ata.id); }} /> : null}
    </>
  );
}

function DialogoAta({ oportunidadeId, onFechar, onRegistrada }: { oportunidadeId: string; onFechar: () => void; onRegistrada: (a: AtaDetalhe) => void }) {
  const [oportunidade, setOportunidade] = useState(oportunidadeId);
  const [numero, setNumero] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function confirmar() {
    setOcupado(true);
    try {
      const ata = await motor<AtaDetalhe['ata']>('POST', 'atas', { corpo: { oportunidadeId: Number(oportunidade), numero: numero.trim(), orgaoCnpj: cnpj.trim() || null, vigenciaInicio: inicio || null, vigenciaFim: fim || null, itens: [] } });
      onRegistrada({ ata, orgao: null, numeroLicitacao: null, vigente: false, empenhos: [] });
    } catch (e) { setErro(mensagem(e, 'Falha ao registrar a ata.')); }
    finally { setOcupado(false); }
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar ata</DialogTitle><DialogDescription>Só de licitação ganha (RN-010). Os itens entram com o que foi vencido na proposta.</DialogDescription></DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <LabelledField label="Licitação (id)" obrigatorio><Input value={oportunidade} onChange={(e) => setOportunidade(e.target.value)} inputMode="numeric" /></LabelledField>
            <LabelledField label="Número da ata" obrigatorio><Input value={numero} onChange={(e) => setNumero(e.target.value)} /></LabelledField>
            <LabelledField label="CNPJ do órgão"><Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} inputMode="numeric" /></LabelledField>
            <div className="grid gap-3 sm:grid-cols-2">
              <LabelledField label="Início da vigência" obrigatorio><Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></LabelledField>
              <LabelledField label="Fim da vigência" obrigatorio><Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></LabelledField>
            </div>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={confirmar} disabled={ocupado || !oportunidade || !numero.trim() || !inicio || !fim}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoEmpenho({ ata, onFechar, onEmpenhado }: { ata: AtaDetalhe; onFechar: () => void; onEmpenhado: () => void }) {
  const [numeroEmpenho, setNumeroEmpenho] = useState('');
  const [data, setData] = useState('');
  const [qtd, setQtd] = useState<Record<number, string>>({});
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const itens = ata.ata.itens.filter((i) => Number(i.saldo) > 0);
  const lista = itens.filter((i) => Number(qtd[i.id]) > 0).map((i) => ({ ataItemId: i.id, quantidade: Number(qtd[i.id]) }));
  const acima = itens.some((i) => Number(qtd[i.id]) > Number(i.saldo));

  async function confirmar() {
    setOcupado(true);
    try { await motor('POST', `atas/${ata.ata.id}/empenhos`, { corpo: { numero: numeroEmpenho.trim(), data: data || null, itens: lista } }); onEmpenhado(); }
    catch (e) { setErro(mensagem(e, 'Falha ao empenhar.')); }
    finally { setOcupado(false); }
  }

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Empenho na ata {ata.ata.numero}</DialogTitle><DialogDescription>Quantidade por item, nunca acima do saldo (RN-011). Cria o pedido ao confirmar.</DialogDescription></DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <LabelledField label="Número do empenho" obrigatorio><Input value={numeroEmpenho} onChange={(e) => setNumeroEmpenho(e.target.value)} /></LabelledField>
              <LabelledField label="Data"><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></LabelledField>
            </div>
            <Table>
              <thead><tr><Th>Item</Th><Th numeric>Saldo</Th><Th numeric>Quantidade</Th></tr></thead>
              <tbody>
                {itens.map((i) => (
                  <Tr key={i.id}>
                    <Td><RowTitle>{i.descricao ?? `item ${i.itemId}`}</RowTitle></Td>
                    <Td numeric>{numero(i.saldo, 0)}</Td>
                    <Td numeric><Input value={qtd[i.id] ?? ''} onChange={(e) => setQtd((q) => ({ ...q, [i.id]: e.target.value }))} inputMode="numeric" aria-label={`Quantidade do item ${i.descricao ?? i.itemId}`} aria-invalid={Number(qtd[i.id]) > Number(i.saldo) || undefined} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={confirmar} disabled={ocupado || !numeroEmpenho.trim() || lista.length === 0 || acima}>Empenhar {lista.length ? `(${lista.length})` : ''}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
