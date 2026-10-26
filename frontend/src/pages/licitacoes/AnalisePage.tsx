// Análise da licitação (spec 006 RF-009..RF-013, T-262): cabeçalho com decisão, abas Parecer (achados com salto para a
// página do edital), Documentos (conciliação com o cofre), Estratégia (pontos com prazo), Calendário e Histórico.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motor, ErroMotor } from '@/lib/motor';
import { fmtData, fmtInstante, moeda, numero } from '@/lib/formato';
import { ROTULO_MARCA } from '@/lib/cobertura';
import {
  aderencia, paginasDoTexto, ROTULO_ESTADO_PONTO, ROTULO_EVENTO, ROTULO_EXIGENCIA, ROTULO_PRIORIDADE, ROTULO_STATUS_LICITACAO,
  TOM_ESTADO_PONTO, TOM_EXIGENCIA, TOM_STATUS_LICITACAO, tomDaPrioridade,
} from '@/lib/licitacao';
import type { Achado, Documento, Exigencia, LicitacaoDetalhe, PontoEstrategia } from '@/lib/tiposLicitacao';
import type { Evento } from '@/lib/tipos';
import {
  Alert, Badge, Button, CabecalhoFixo, Cartao, Code, Dash, Definicao, Definicoes, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, EmptyState, Field, LabelledField, LinhaDoTempo, Momento, PageHeader, Panel, PanelHeader, Pilha, Rebaixado, SelectMenu, Selos,
  Status, Table, Tabs, TabsContent, TabsList, TabsTrigger, Td, TextLink, Textarea, Th, Tr,
} from '@/components/page';
import { DialogoDecisao } from './DialogoDecisao';

type Aviso = { tone: 'error' | 'warn' | 'success'; texto: string };

function mensagem(e: unknown, padrao: string) {
  return e instanceof ErroMotor ? `${e.regra ? e.regra + ': ' : ''}${e.message}` : padrao;
}

export default function AnalisePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState<LicitacaoDetalhe | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [decidindo, setDecidindo] = useState(false);
  const [pagina, setPagina] = useState<number | null>(null);

  const carregar = useCallback(() => {
    motor<LicitacaoDetalhe>('GET', `licitacoes/${id}`)
      .then((x) => setD(x))
      .catch((e: unknown) => setAviso({ tone: 'error', texto: mensagem(e, 'Não foi possível carregar a licitação.') }));
  }, [id]);

  useEffect(carregar, [carregar]);

  useEffect(() => {
    if (pagina == null) return;
    document.getElementById(`pagina-${pagina}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pagina]);

  async function acao(rota: string, sucesso: string) {
    setOcupado(true);
    try {
      await motor('POST', `licitacoes/${id}/${rota}`);
      setAviso({ tone: 'success', texto: sucesso });
      carregar();
    } catch (e) {
      setAviso({ tone: 'error', texto: mensagem(e, 'Falha ao falar com o motor.') });
    } finally {
      setOcupado(false);
    }
  }

  if (!d) {
    return (
      <>
        <PageHeader module="Licitações" title="Análise" />
        {aviso ? <Alert tone={aviso.tone}>{aviso.texto}</Alert> : <p className="text-[13px] text-ink-secondary">Carregando...</p>}
      </>
    );
  }

  const c = d.cabecalho;
  const pendentes = d.exigencias.filter((e) => e.status !== 'ATENDIDO' && !e.justificativa);
  const semTexto = c.marcas.includes('SEM_TEXTO_EDITAL');

  return (
    <>
      <PageHeader module="Licitações" title={`${c.numero ?? c.id} · ${c.orgao ?? ''}`}
        description={<>{c.modalidade?.toLowerCase()} · {[c.municipio, c.uf].filter(Boolean).join('/')} · {c.fontes.map((f) => <Code key={f}>{f}</Code>)}</>}
        actions={<Button onClick={() => navigate('/licitacoes')}>Voltar à triagem</Button>} />
      {aviso ? <Alert tone={aviso.tone} className="mb-4">{aviso.texto}</Alert> : null}

      <CabecalhoFixo>
        <Definicoes>
          <Definicao rotulo="Status"><Status tone={TOM_STATUS_LICITACAO[c.status] ?? 'off'}>{ROTULO_STATUS_LICITACAO[c.status] ?? c.status}</Status></Definicao>
          <Definicao rotulo="Sessão">{c.sessaoEm ? fmtInstante(c.sessaoEm) : null}</Definicao>
          <Definicao rotulo="Valor estimado">{c.valorEstimado != null ? moeda(c.valorEstimado) : null}</Definicao>
          <Definicao rotulo="Pré-leitura">
            {c.prioridade ? <><Status tone={tomDaPrioridade(c.prioridade)}>{ROTULO_PRIORIDADE[c.prioridade] ?? c.prioridade}</Status> {c.aderencia != null ? `· aderência ${aderencia(c.aderencia)}` : ''}</> : null}
          </Definicao>
          <Definicao rotulo="Decisão">{c.decisao ? `${c.decisao === 'PARTICIPAR' ? 'participar' : 'não participar'} · ${d.decisaoPor ?? ''} · ${fmtInstante(d.decisaoEm)}${d.decisaoMotivo ? ` · ${d.decisaoMotivo}` : ''}` : null}</Definicao>
          <Definicao rotulo="IA">{d.iaModelo ? `${d.iaModelo} · US$ ${numero(d.iaCusto, 4)}` : null}</Definicao>
        </Definicoes>
        <Pilha>
          <Selos>
            {c.estrategico ? <Badge tone="accent">estratégica</Badge> : null}
            {c.marcas.map((m) => <Badge key={m} tone="attention">{ROTULO_MARCA[m] ?? m}</Badge>)}
          </Selos>
          <Selos>
            {c.status === 'EM_DECISAO' || c.status === 'EM_ESPERA' ? <Button variant="primary" onClick={() => setDecidindo(true)} disabled={ocupado}>Decidir</Button> : null}
            {c.status === 'NAO_PARTICIPAR' ? <Button variant="primary" onClick={() => acao('resgatar', 'Licitação de volta à decisão.')} disabled={ocupado}>Resgatar</Button> : null}
            {c.status === 'EM_ANALISE' ? (
              <span title={pendentes.length ? `${pendentes.length} exigência(s) sem documento nem justificativa (RN-011)` : 'Marca como pronta para montar a proposta'}>
                <Button variant="primary" onClick={() => acao('pronta', 'Pronta para proposta.')} disabled={ocupado || pendentes.length > 0}>Pronta para proposta</Button>
              </span>
            ) : null}
          </Selos>
        </Pilha>
      </CabecalhoFixo>

      <Tabs defaultValue="parecer">
        <TabsList>
          <TabsTrigger value="parecer">Parecer</TabsTrigger>
          <TabsTrigger value="documentos">Documentos{pendentes.length ? ` (${pendentes.length})` : ''}</TabsTrigger>
          <TabsTrigger value="estrategia">Estratégia{d.estrategia.length ? ` (${d.estrategia.length})` : ''}</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="parecer"><Parecer d={d} semTexto={semTexto} irPara={setPagina} /></TabsContent>
        <TabsContent value="documentos"><Documentos id={c.id} exigencias={d.exigencias} editavel={c.status === 'EM_ANALISE'} onMudou={carregar} avisar={setAviso} /></TabsContent>
        <TabsContent value="estrategia"><Estrategia id={c.id} pontos={d.estrategia} onMudou={carregar} avisar={setAviso} /></TabsContent>
        <TabsContent value="calendario">
          <Panel>
            <PanelHeader title="Calendário legal" hint="Datas do edital; esclarecimento e impugnação por regra quando o edital não diz (RN-009)." />
            {d.calendario.length === 0 ? <EmptyState title="Sem prazos ainda" hint="O calendário nasce com a leitura completa." /> : (
              <Table>
                <thead><tr><Th>Prazo</Th><Th>Data</Th><Th>Origem</Th><Th>Alerta</Th></tr></thead>
                <tbody>
                  {d.calendario.map((e) => (
                    <Tr key={e.id}><Td>{ROTULO_EVENTO[e.tipo] ?? e.tipo}</Td><Td>{fmtData(e.data)}</Td><Td>{e.origem === 'EDITAL' ? 'edital' : 'regra padrão'}</Td><Td>{e.alertadoEm ? fmtInstante(e.alertadoEm) : <Dash />}</Td></Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="historico"><Historico id={c.id} /></TabsContent>
      </Tabs>

      <DialogoDecisao key={decidindo ? c.id : 'fechado'} licitacao={decidindo ? c : null} onFechar={() => setDecidindo(false)}
        onDecidido={() => { setDecidindo(false); setAviso({ tone: 'success', texto: 'Decisão registrada.' }); carregar(); }} />
    </>
  );
}

// ── Parecer ───────────────────────────────────────────────────────────────

function Pagina({ a, irPara }: { a: Achado; irPara: (p: number) => void }) {
  if (a.pagina == null) return <Badge tone="attention">a conferir</Badge>;
  return <TextLink onClick={() => irPara(a.pagina as number)}>p. {a.pagina}</TextLink>;
}

function Parecer({ d, semTexto, irPara }: { d: LicitacaoDetalhe; semTexto: boolean; irPara: (p: number) => void }) {
  const e = d.edital;
  const l = e?.leitura;
  const paginas = paginasDoTexto(e?.texto);
  return (
    <Pilha>
      {d.preLeitura ? (
        <Cartao>
          <Definicoes>
            <Definicao rotulo="Resumo da pré-leitura">{d.preLeitura.resumo}</Definicao>
            <Definicao rotulo="Motivo">{d.preLeitura.motivo}</Definicao>
            <Definicao rotulo="Porte">{d.preLeitura.porte ? Object.entries(d.preLeitura.porte).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : null}</Definicao>
          </Definicoes>
        </Cartao>
      ) : null}
      {!e ? <EmptyState title="Sem leitura completa" hint={d.cabecalho.decisao === 'PARTICIPAR' ? 'A leitura está na fila; atualize em instantes.' : 'A leitura completa só roda depois da decisão de participar.'} /> : null}
      {e && semTexto ? <Alert tone="warn">O edital não tem texto extraível (escaneado). Leia os arquivos abaixo e registre o parecer à mão.</Alert> : null}
      {e ? (
        <Cartao>
          <Definicoes>
            <Definicao rotulo="Arquivos">{e.arquivos.map((a) => `${a.nome} (${a.paginas} p.)`).join(' · ')}</Definicao>
            <Definicao rotulo="Leitura">{e.lidoEm ? `${e.modelo} · ${e.promptVersao} · US$ ${numero(e.custo, 4)} · ${fmtInstante(e.lidoEm)}` : null}</Definicao>
            <Definicao rotulo="Critério de julgamento">{l?.criterioJulgamento?.texto}</Definicao>
            <Definicao rotulo="Modo de disputa">{l?.modoDisputa?.texto}</Definicao>
          </Definicoes>
        </Cartao>
      ) : null}
      {l ? (
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <Pilha>
            <Lista titulo="Itens" achados={l.itens} colunas={['Quantidade', 'Exigências técnicas']} campos={['quantidade', 'exigenciasTecnicas']} irPara={irPara} />
            <Lista titulo="Documentos de habilitação" achados={l.documentos} colunas={['Tipo']} campos={['tipoDocumento']} irPara={irPara} />
            <Lista titulo="Amostras" achados={l.amostras} colunas={[]} campos={[]} irPara={irPara} />
            <Lista titulo="Prazos" achados={l.prazos} colunas={['Tipo', 'Data']} campos={['tipo', 'data']} irPara={irPara} />
            <Lista titulo="Riscos" achados={l.riscos} colunas={['Tipo', 'Fundamento']} campos={['tipo', 'fundamento']} irPara={irPara} />
          </Pilha>
          <Panel className="lg:sticky lg:top-4 lg:self-start">
            <PanelHeader title="Texto do edital" hint="Clique na página de um achado para pular até ela." />
            <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
              {paginas.map((p) => (
                <section key={p.pagina} id={`pagina-${p.pagina}`} className="mb-4 scroll-mt-2">
                  <p className="mb-1 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">Página {p.pagina}</p>
                  <pre className="font-sans text-[12px] whitespace-pre-wrap text-ink-secondary">{p.texto}</pre>
                </section>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}
    </Pilha>
  );
}

function Lista({ titulo, achados, colunas, campos, irPara }: { titulo: string; achados: Achado[] | undefined; colunas: string[]; campos: (keyof Achado)[]; irPara: (p: number) => void }) {
  if (!achados?.length) return null;
  return (
    <Panel>
      <PanelHeader title={`${titulo} (${achados.length})`} />
      <Table>
        <thead><tr><Th>Descrição</Th>{colunas.map((c) => <Th key={c}>{c}</Th>)}<Th>Página</Th></tr></thead>
        <tbody>
          {achados.map((a, i) => (
            <Tr key={i}>
              <Td>{a.descricao}{a.trecho ? <Rebaixado>“{a.trecho}”</Rebaixado> : null}</Td>
              {campos.map((c) => <Td key={String(c)}>{a[c] == null ? <Dash /> : c === 'quantidade' ? `${a.quantidade} ${a.unidade ?? ''}` : String(a[c])}</Td>)}
              <Td><Pagina a={a} irPara={irPara} /></Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Panel>
  );
}

// ── Documentos (conciliação) ──────────────────────────────────────────────

function Documentos({ id, exigencias, editavel, onMudou, avisar }: { id: number; exigencias: Exigencia[]; editavel: boolean; onMudou: () => void; avisar: (a: Aviso) => void }) {
  const [resolvendo, setResolvendo] = useState<Exigencia | null>(null);
  const [cofre, setCofre] = useState<Documento[]>([]);
  const [documentoId, setDocumentoId] = useState('');
  const [justificativa, setJustificativa] = useState('');

  useEffect(() => { motor<Documento[]>('GET', 'documentos').then(setCofre).catch(() => setCofre([])); }, []);

  function abrir(e: Exigencia) {
    setResolvendo(e);
    setDocumentoId(e.documentoId ? String(e.documentoId) : '');
    setJustificativa(e.justificativa ?? '');
  }

  async function salvar() {
    if (!resolvendo) return;
    try {
      await motor('PATCH', `licitacoes/${id}/exigencias/${resolvendo.id}`, { corpo: { documentoId: documentoId ? Number(documentoId) : null, justificativa } });
      setResolvendo(null);
      onMudou();
    } catch (e) {
      avisar({ tone: 'error', texto: mensagem(e, 'Falha ao resolver a exigência.') });
    }
  }

  return (
    <Panel>
      <PanelHeader title="Exigências de habilitação" hint="Regra por tipo e validade contra o cofre; para avançar, tudo atendido ou justificado (RN-011)." />
      {exigencias.length === 0 ? <EmptyState title="Sem exigências conciliadas" hint="A conciliação roda logo depois da leitura completa." /> : (
        <Table>
          <thead><tr><Th>Exigência</Th><Th>Tipo</Th><Th>Situação</Th><Th>Justificativa</Th><Th /></tr></thead>
          <tbody>
            {exigencias.map((e) => (
              <Tr key={e.id}>
                <Td>{e.descricao}{e.pagina != null ? <RowMetaInline>p. {e.pagina}</RowMetaInline> : null}</Td>
                <Td>{e.tipoDocumento ? <Code>{e.tipoDocumento}</Code> : <Dash />}</Td>
                <Td><Status tone={TOM_EXIGENCIA[e.status]}>{ROTULO_EXIGENCIA[e.status]}</Status>{e.detalhe ? <RowMetaInline>{e.detalhe}</RowMetaInline> : null}</Td>
                <Td>{e.justificativa ? <>{e.justificativa}<RowMetaInline>{e.justificadoPor}</RowMetaInline></> : <Dash />}</Td>
                <Td numeric>{editavel ? <TextLink onClick={() => abrir(e)}>Resolver</TextLink> : null}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <Dialog open={resolvendo !== null} onOpenChange={(aberto) => !aberto && setResolvendo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver exigência</DialogTitle>
            <DialogDescription>{resolvendo?.descricao}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Pilha>
              <Field label="Documento do cofre" hint="Aponte o documento que atende; vencido continua inadequado.">
                <SelectMenu value={documentoId} onChange={setDocumentoId} label="Documento do cofre" placeholder="Nenhum"
                  options={[{ value: '', label: 'Nenhum' }, ...cofre.map((doc) => ({ value: String(doc.id), label: `${doc.tipo}${doc.numero ? ` ${doc.numero}` : ''}`, hint: doc.validade ? `válido até ${fmtData(doc.validade)}` : 'sem validade' }))]} />
              </Field>
              <LabelledField label="Justificativa" hint="Por que seguir mesmo sem o documento atendido (ou em branco para apagar).">
                <Textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} rows={3} />
              </LabelledField>
            </Pilha>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setResolvendo(null)}>Cancelar</Button>
            <Button variant="primary" onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

function RowMetaInline({ children }: { children: React.ReactNode }) {
  return <span className="block text-[12px] text-ink-secondary">{children}</span>;
}

// ── Estratégia ────────────────────────────────────────────────────────────

function Estrategia({ id, pontos, onMudou, avisar }: { id: number; pontos: PontoEstrategia[]; onMudou: () => void; avisar: (a: Aviso) => void }) {
  async function mudar(p: PontoEstrategia, estado: PontoEstrategia['estado']) {
    try {
      await motor('PATCH', `licitacoes/${id}/estrategia/${p.id}`, { corpo: { estado } });
      onMudou();
    } catch (e) {
      avisar({ tone: 'error', texto: mensagem(e, 'Falha ao mudar o ponto.') });
    }
  }
  if (pontos.length === 0) return <Panel><EmptyState title="Sem pontos sugeridos" hint="A IA sugere esclarecimentos e impugnações a partir dos riscos do edital; nada é enviado pelo motor." /></Panel>;
  return (
    <Pilha>
      {pontos.map((p) => (
        <Cartao key={p.id}>
          <Selos>
            <Badge tone={p.tipo === 'IMPUGNACAO' ? 'alert' : 'accent'}>{p.tipo === 'IMPUGNACAO' ? 'impugnação' : 'esclarecimento'}</Badge>
            <Status tone={TOM_ESTADO_PONTO[p.estado]}>{ROTULO_ESTADO_PONTO[p.estado]}</Status>
            {p.prazo ? <span className="text-[12px] text-ink-secondary">prazo {fmtData(p.prazo)}</span> : null}
            {p.pagina != null ? <span className="text-[12px] text-ink-secondary">p. {p.pagina}</span> : null}
          </Selos>
          {p.trecho ? <Rebaixado>“{p.trecho}”</Rebaixado> : null}
          <p className="text-[13px] text-ink">{p.fundamento}</p>
          <Selos>
            {p.estado === 'SUGERIDO' ? <Button size="sm" variant="primary" onClick={() => mudar(p, 'APROVADO')}>Aprovar</Button> : null}
            {p.estado === 'APROVADO' ? <Button size="sm" variant="primary" onClick={() => mudar(p, 'ENVIADO_PELA_PESSOA')}>Marcar como enviado</Button> : null}
            {p.estado === 'SUGERIDO' || p.estado === 'APROVADO' || p.estado === 'FORA_DO_PRAZO' ? <Button size="sm" onClick={() => mudar(p, 'DESCARTADO')}>Descartar</Button> : null}
          </Selos>
        </Cartao>
      ))}
    </Pilha>
  );
}

// ── Histórico ─────────────────────────────────────────────────────────────

const ORIGEM: Record<Evento['origem'], string> = { PORTAL: 'portal', USUARIO: 'pessoa', MOTOR: 'motor' };

function Historico({ id }: { id: number }) {
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  useEffect(() => { motor<Evento[]>('GET', `oportunidades/${id}/eventos`).then(setEventos).catch(() => setEventos([])); }, [id]);
  if (!eventos) return <p className="text-[13px] text-ink-secondary">Carregando...</p>;
  return (
    <Panel className="p-4">
      <LinhaDoTempo>
        {eventos.map((e) => (
          <Momento key={e.id} quando={fmtInstante(e.em)} titulo={<>{e.acao.toLowerCase()} · {ORIGEM[e.origem]} {e.autor}{e.regra ? <> · <Code>{e.regra}</Code></> : null}</>}>
            {Object.entries(e.depois ?? {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(' · ')}
          </Momento>
        ))}
      </LinhaDoTempo>
    </Panel>
  );
}
