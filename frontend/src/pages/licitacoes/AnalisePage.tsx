// Análise da licitação (spec 006 RF-009..RF-013, T-262): cabeçalho com a ação do momento, fatos da licitação, o próximo
// passo em uma frase e as abas Parecer (pré-leitura, edital e achados com salto para a página), Documentos (conciliação com
// o cofre), Estratégia (pontos com prazo), Calendário e Histórico.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motor, ErroMotor } from '@/lib/motor';
import { fmtData, fmtInstante, moeda, numero } from '@/lib/formato';
import { ROTULO_MARCA } from '@/lib/cobertura';
import {
  aderencia, diasAte, nomeModalidade, nomeProprio, paginasDoTexto, porteDaPreLeitura, proximoPasso, ROTULO_ESTADO_PONTO, ROTULO_EVENTO,
  ROTULO_EXIGENCIA, ROTULO_PRIORIDADE, ROTULO_STATUS_LICITACAO, TOM_ESTADO_PONTO, TOM_EXIGENCIA, TOM_STATUS_LICITACAO, tomDaPrioridade,
  type Aba,
} from '@/lib/licitacao';
import type { Achado, Documento, Exigencia, LicitacaoDetalhe, PontoEstrategia } from '@/lib/tiposLicitacao';
import type { Evento } from '@/lib/tipos';
import {
  Alert, Badge, Button, Cartao, Code, ComLateral, Coluna, Contador, Contadores, Dash, Dialog, DialogBody, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, EmptyState, Fato, Fatos, Field, LabelledField, LinhaDoTempo, LinkExterno, MetaDot, Momento, PageHeader, Panel,
  PanelHeader, Paragrafo, Pilha, Rebaixado, RowMeta, SelectMenu, Selos, Status, Table, Tabs, TabsContent, TabsList, TabsTrigger, Td, TextLink,
  Textarea, TextoPaginado, Th, Toolbar, Tr,
} from '@/components/page';
import { DialogoDecisao } from './DialogoDecisao';

type Aviso = { tone: 'error' | 'warn' | 'success'; texto: string };

function mensagem(e: unknown, padrao: string) {
  return e instanceof ErroMotor ? `${e.regra ? e.regra + ': ' : ''}${e.message}` : padrao;
}

const COM_PROPOSTA = ['EM_REVISAO', 'APROVADA', 'ENVIADA', 'GANHA', 'PERDIDA'];

export default function AnalisePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState<LicitacaoDetalhe | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [decidindo, setDecidindo] = useState(false);
  const [pagina, setPagina] = useState<number | null>(null);
  const [aba, setAba] = useState<Aba>('parecer');

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

  const voltar = <Button onClick={() => navigate('/licitacoes')}>Voltar à triagem</Button>;

  if (!d) {
    return (
      <>
        <PageHeader module="Licitações" title="Análise" actions={voltar} />
        {aviso ? <Alert tone={aviso.tone}>{aviso.texto}</Alert> : <Paragrafo>Carregando a licitação…</Paragrafo>}
      </>
    );
  }

  const c = d.cabecalho;
  const pendentes = d.exigencias.filter((e) => e.status !== 'ATENDIDO' && !e.justificativa);
  // sem edital lido não há exigência, e "nenhuma pendente" não quer dizer tudo atendido (o motor recusa com RN-011)
  const conciliada = d.edital != null && ['CONCILIACAO', 'ESTRATEGIA'].includes(c.etapa ?? '');
  const passo = proximoPasso(c.status, conciliada, pendentes.length, c.decisao === 'PARTICIPAR');
  const porte = porteDaPreLeitura(d.preLeitura?.porte);

  const principal =
    c.status === 'EM_DECISAO' || c.status === 'EM_ESPERA' ? <Button variant="primary" onClick={() => setDecidindo(true)} disabled={ocupado}>Decidir</Button>
    : c.status === 'NAO_PARTICIPAR' ? <Button variant="primary" onClick={() => acao('resgatar', 'Licitação de volta à decisão.')} disabled={ocupado}>Resgatar</Button>
    : c.status === 'EM_ANALISE' ? <Button variant="primary" onClick={() => acao('pronta', 'Pronta para proposta.')} disabled={ocupado || !conciliada}>Pronta para proposta</Button>
    : c.status === 'PRONTA_PARA_PROPOSTA' ? <Button variant="primary" onClick={() => navigate(`/licitacoes/${id}/proposta`)}>Montar proposta</Button>
    : COM_PROPOSTA.includes(c.status) ? <Button variant="primary" onClick={() => navigate(`/licitacoes/${id}/proposta`)}>Ver proposta</Button>
    : null;

  return (
    <>
      <PageHeader module="Licitações" title={`${nomeModalidade(c.modalidade)} ${c.numero ?? c.id}`} description={c.objeto}
        meta={<>{nomeProprio(c.orgao)}<MetaDot />{[c.municipio, c.uf].filter(Boolean).join('/')}<MetaDot />{c.fontes.map((f) => <Code key={f}>{f}</Code>)}
          {d.linkPortal ? <><MetaDot /><LinkExterno href={d.linkPortal}>Abrir no portal</LinkExterno></> : null}</>}
        actions={<>{voltar}{principal}</>} />

      <Pilha>
        {aviso ? <Alert tone={aviso.tone}>{aviso.texto}</Alert> : null}

        <Cartao>
          <Pilha>
            <Fatos>
              <Fato rotulo="Situação"><Status tone={TOM_STATUS_LICITACAO[c.status] ?? 'off'}>{ROTULO_STATUS_LICITACAO[c.status] ?? c.status}</Status></Fato>
              <Fato rotulo="Sessão" detalhe={diasAte(c.sessaoEm)}>{c.sessaoEm ? fmtInstante(c.sessaoEm) : null}</Fato>
              <Fato rotulo="Valor estimado" detalhe={porte}>{c.valorEstimado != null ? moeda(c.valorEstimado) : null}</Fato>
              <Fato rotulo="Pré-leitura" detalhe={c.aderencia != null ? `aderência ${aderencia(c.aderencia)}` : null}>
                {c.prioridade ? <Status tone={tomDaPrioridade(c.prioridade)}>prioridade {ROTULO_PRIORIDADE[c.prioridade] ?? c.prioridade}</Status> : null}
              </Fato>
              <Fato rotulo="Decisão" detalhe={c.decisao ? [d.decisaoPor, d.decisaoEm ? fmtInstante(d.decisaoEm) : null, d.decisaoMotivo].filter(Boolean).join(' · ') : null}>
                {c.decisao ? (c.decisao === 'PARTICIPAR' ? 'Participar' : 'Não participar') : null}
              </Fato>
            </Fatos>
            {c.estrategico || c.marcas.length ? (
              <Selos>
                {c.estrategico ? <Badge tone="accent">estratégica</Badge> : null}
                {c.marcas.map((m) => <Badge key={m} tone="attention">{ROTULO_MARCA[m] ?? m}</Badge>)}
              </Selos>
            ) : null}
          </Pilha>
        </Cartao>

        {passo ? (
          <Alert tone="info">
            {passo.texto}{passo.aba && passo.aba !== aba ? <> <TextLink onClick={() => setAba(passo.aba as Aba)}>{passo.acao ?? 'Ver'}</TextLink></> : null}
          </Alert>
        ) : null}

        <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
          <TabsList>
            <TabsTrigger value="parecer">Parecer</TabsTrigger>
            <TabsTrigger value="documentos">Documentos{d.exigencias.length ? ` (${pendentes.length ? `${pendentes.length} pendentes` : d.exigencias.length})` : ''}</TabsTrigger>
            <TabsTrigger value="estrategia">Estratégia{d.estrategia.length ? ` (${d.estrategia.length})` : ''}</TabsTrigger>
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="parecer"><Parecer d={d} irPara={setPagina} /></TabsContent>
          <TabsContent value="documentos"><Documentos id={c.id} exigencias={d.exigencias} editavel={c.status === 'EM_ANALISE'} onMudou={carregar} avisar={setAviso} /></TabsContent>
          <TabsContent value="estrategia"><Estrategia id={c.id} pontos={d.estrategia} onMudou={carregar} avisar={setAviso} /></TabsContent>
          <TabsContent value="calendario"><Calendario d={d} /></TabsContent>
          <TabsContent value="historico"><Historico id={c.id} /></TabsContent>
        </Tabs>
      </Pilha>

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

type Secao = { chave: string; titulo: string; achados: Achado[]; colunas: string[]; campos: (keyof Achado)[] };

function Parecer({ d, irPara }: { d: LicitacaoDetalhe; irPara: (p: number) => void }) {
  const e = d.edital;
  const l = e?.leitura;
  const todas: Secao[] = [
    { chave: 'itens', titulo: 'Itens', achados: l?.itens ?? [], colunas: ['Quantidade', 'Exigências técnicas'], campos: ['quantidade', 'exigenciasTecnicas'] },
    { chave: 'documentos', titulo: 'Documentos', achados: l?.documentos ?? [], colunas: ['Tipo'], campos: ['tipoDocumento'] },
    { chave: 'prazos', titulo: 'Prazos', achados: l?.prazos ?? [], colunas: ['Tipo', 'Data'], campos: ['tipo', 'data'] },
    { chave: 'riscos', titulo: 'Riscos', achados: l?.riscos ?? [], colunas: ['Tipo', 'Fundamento'], campos: ['tipo', 'fundamento'] },
    { chave: 'amostras', titulo: 'Amostras', achados: l?.amostras ?? [], colunas: [], campos: [] },
  ];
  const secoes = todas.filter((s) => s.achados.length > 0);
  const [ativa, setAtiva] = useState<string | null>(null);
  const secao = secoes.find((s) => s.chave === ativa) ?? secoes[0];
  const paginas = paginasDoTexto(e?.texto);
  const totalPaginas = e?.arquivos.reduce((t, a) => t + (a.paginas ?? 0), 0) ?? 0;

  return (
    <Pilha>
      {d.preLeitura ? (
        <Cartao>
          <Pilha>
            <Coluna titulo="Resumo da pré-leitura"><Paragrafo>{d.preLeitura.resumo}</Paragrafo></Coluna>
            {d.preLeitura.motivo ? <Coluna titulo="Por que essa prioridade"><Paragrafo>{d.preLeitura.motivo}</Paragrafo></Coluna> : null}
          </Pilha>
        </Cartao>
      ) : null}

      {!e ? (
        <Panel>
          <EmptyState title="Edital ainda não lido" hint={d.cabecalho.decisao === 'PARTICIPAR' ? 'A leitura completa está na fila; atualize em instantes.' : 'A leitura completa só roda depois da decisão de participar.'} />
        </Panel>
      ) : (
        <Cartao>
          <Pilha>
            <Fatos>
              <Fato rotulo="Arquivos do edital" detalhe={<Selos>{e.arquivos.map((a) => a.url
                ? <LinkExterno key={a.nome} href={a.url}>{a.nome}</LinkExterno>
                : <span key={a.nome}>{a.nome}</span>)}{!e.arquivos.some((a) => a.url) && d.linkPortal ? <LinkExterno href={d.linkPortal}>PDFs no portal</LinkExterno> : null}</Selos>}>
                {e.arquivos.length} {e.arquivos.length === 1 ? 'arquivo' : 'arquivos'} · {totalPaginas} p.
              </Fato>
              <Fato rotulo="Leitura por IA" detalhe={e.lidoEm ? `${fmtInstante(e.lidoEm)} · US$ ${numero(e.custo, 2)}` : null}>{e.modelo}</Fato>
              <Fato rotulo="IA nesta licitação" detalhe="pré-leitura, leitura e conciliação">{d.iaCusto != null ? `US$ ${numero(d.iaCusto, 2)}` : null}</Fato>
            </Fatos>
            {l?.criterioJulgamento?.texto ? <Coluna titulo="Critério de julgamento"><Paragrafo>{l.criterioJulgamento.texto}</Paragrafo></Coluna> : null}
            {l?.modoDisputa?.texto ? <Coluna titulo="Modo de disputa"><Paragrafo>{l.modoDisputa.texto}</Paragrafo></Coluna> : null}
          </Pilha>
        </Cartao>
      )}

      {e && d.cabecalho.marcas.includes('SEM_TEXTO_EDITAL') ? <Alert tone="warn">O edital não tem texto extraível (escaneado). Leia os arquivos e registre o parecer à mão.</Alert> : null}

      {l && secao ? (
        <ComLateral
          principal={
            <Panel>
              <PanelHeader title="Achados do edital" hint="O que a leitura encontrou; a página leva ao trecho no texto ao lado." />
              <Toolbar>
                <Contadores>
                  {secoes.map((s) => <Contador key={s.chave} rotulo={s.titulo} valor={s.achados.length} ativo={s.chave === secao.chave} onClick={() => setAtiva(s.chave)} />)}
                </Contadores>
              </Toolbar>
              <Table>
                <thead><tr><Th>Descrição</Th>{secao.colunas.map((col) => <Th key={col}>{col}</Th>)}<Th>Página</Th></tr></thead>
                <tbody>
                  {secao.achados.map((a, i) => (
                    <Tr key={i}>
                      <Td>{a.descricao}{a.trecho ? <Rebaixado>“{a.trecho}”</Rebaixado> : null}</Td>
                      {secao.campos.map((campo) => <Td key={String(campo)}>{a[campo] == null ? <Dash /> : campo === 'quantidade' ? `${a.quantidade} ${a.unidade ?? ''}` : String(a[campo])}</Td>)}
                      <Td><Pagina a={a} irPara={irPara} /></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          }
          lateral={
            <Panel>
              <PanelHeader title="Texto do edital" hint={`${paginas.length} páginas com texto`} />
              <TextoPaginado paginas={paginas} />
            </Panel>
          }
        />
      ) : null}
    </Pilha>
  );
}

// ── Documentos (conciliação) ──────────────────────────────────────────────

type Filtro = 'todas' | 'pendentes' | 'atendidas' | 'justificadas';

function Documentos({ id, exigencias, editavel, onMudou, avisar }: { id: number; exigencias: Exigencia[]; editavel: boolean; onMudou: () => void; avisar: (a: Aviso) => void }) {
  const [resolvendo, setResolvendo] = useState<Exigencia | null>(null);
  const [cofre, setCofre] = useState<Documento[]>([]);
  const [documentoId, setDocumentoId] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');

  useEffect(() => { motor<Documento[]>('GET', 'documentos').then(setCofre).catch(() => setCofre([])); }, []);

  const grupos: Record<Filtro, Exigencia[]> = {
    todas: exigencias,
    pendentes: exigencias.filter((e) => e.status !== 'ATENDIDO' && !e.justificativa),
    atendidas: exigencias.filter((e) => e.status === 'ATENDIDO'),
    justificadas: exigencias.filter((e) => e.status !== 'ATENDIDO' && !!e.justificativa),
  };
  const lista = grupos[filtro];

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
      <PanelHeader title="Exigências de habilitação" hint="Conciliadas com o cofre por tipo e validade. Para avançar, cada uma precisa de documento atendido ou justificativa (RN-011)." />
      {exigencias.length === 0 ? <EmptyState title="Sem exigências ainda" hint="Elas aparecem quando a leitura completa e a conciliação terminam." /> : (
        <>
          <Toolbar>
            <Contadores>
              <Contador rotulo="Todas" valor={grupos.todas.length} ativo={filtro === 'todas'} onClick={() => setFiltro('todas')} />
              <Contador rotulo="Pendentes" valor={grupos.pendentes.length} ativo={filtro === 'pendentes'} onClick={() => setFiltro('pendentes')} />
              <Contador rotulo="Atendidas" valor={grupos.atendidas.length} ativo={filtro === 'atendidas'} onClick={() => setFiltro('atendidas')} />
              <Contador rotulo="Justificadas" valor={grupos.justificadas.length} ativo={filtro === 'justificadas'} onClick={() => setFiltro('justificadas')} />
            </Contadores>
          </Toolbar>
          {lista.length === 0 ? <EmptyState title="Nada neste filtro" hint="Escolha outro contador acima." /> : (
            <Table>
              <thead><tr><Th>Exigência</Th><Th>Documento</Th><Th>Situação</Th><Th>Justificativa</Th>{editavel ? <Th /> : null}</tr></thead>
              <tbody>
                {lista.map((e) => (
                  <Tr key={e.id}>
                    <Td>{e.descricao}{e.pagina != null ? <RowMeta>página {e.pagina} do edital</RowMeta> : null}</Td>
                    <Td>{e.tipoDocumento ? <Code>{e.tipoDocumento}</Code> : <Dash />}</Td>
                    <Td><Status tone={TOM_EXIGENCIA[e.status]}>{ROTULO_EXIGENCIA[e.status]}</Status>{e.detalhe ? <RowMeta>{e.detalhe}</RowMeta> : null}</Td>
                    <Td>{e.justificativa ? <>{e.justificativa}<RowMeta>{e.justificadoPor}</RowMeta></> : <Dash />}</Td>
                    {editavel ? <Td numeric><TextLink onClick={() => abrir(e)}>Resolver</TextLink></Td> : null}
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
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
          <Pilha>
            <Selos>
              <Badge tone={p.tipo === 'IMPUGNACAO' ? 'alert' : 'accent'}>{p.tipo === 'IMPUGNACAO' ? 'impugnação' : 'esclarecimento'}</Badge>
              <Status tone={TOM_ESTADO_PONTO[p.estado]}>{ROTULO_ESTADO_PONTO[p.estado]}</Status>
            </Selos>
            {p.prazo || p.pagina != null ? <RowMeta>{[p.prazo ? `prazo ${fmtData(p.prazo)}` : null, p.pagina != null ? `página ${p.pagina} do edital` : null].filter(Boolean).join(' · ')}</RowMeta> : null}
            {p.trecho ? <Rebaixado>“{p.trecho}”</Rebaixado> : null}
            <Paragrafo>{p.fundamento}</Paragrafo>
            <Selos>
              {p.estado === 'SUGERIDO' ? <Button size="sm" variant="primary" onClick={() => mudar(p, 'APROVADO')}>Aprovar</Button> : null}
              {p.estado === 'APROVADO' ? <Button size="sm" variant="primary" onClick={() => mudar(p, 'ENVIADO_PELA_PESSOA')}>Marcar como enviado</Button> : null}
              {p.estado === 'SUGERIDO' || p.estado === 'APROVADO' || p.estado === 'FORA_DO_PRAZO' ? <Button size="sm" onClick={() => mudar(p, 'DESCARTADO')}>Descartar</Button> : null}
            </Selos>
          </Pilha>
        </Cartao>
      ))}
    </Pilha>
  );
}

// ── Calendário ────────────────────────────────────────────────────────────

function Calendario({ d }: { d: LicitacaoDetalhe }) {
  return (
    <Panel>
      <PanelHeader title="Calendário legal" hint="Datas do edital; esclarecimento e impugnação por regra quando o edital não diz (RN-009)." />
      {d.calendario.length === 0 ? <EmptyState title="Sem prazos ainda" hint="O calendário nasce com a leitura completa." /> : (
        <Table>
          <thead><tr><Th>Prazo</Th><Th>Data</Th><Th>Origem</Th><Th>Alerta</Th></tr></thead>
          <tbody>
            {d.calendario.map((e) => (
              <Tr key={e.id}>
                <Td>{ROTULO_EVENTO[e.tipo] ?? e.tipo}</Td>
                <Td>{fmtData(e.data)}<RowMeta>{diasAte(e.data)}</RowMeta></Td>
                <Td>{e.origem === 'EDITAL' ? 'edital' : 'regra padrão'}</Td>
                <Td>{e.alertadoEm ? fmtInstante(e.alertadoEm) : <Dash />}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

// ── Histórico ─────────────────────────────────────────────────────────────

const ORIGEM: Record<Evento['origem'], string> = { PORTAL: 'portal', USUARIO: 'pessoa', MOTOR: 'motor' };

function Historico({ id }: { id: number }) {
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  useEffect(() => { motor<Evento[]>('GET', `oportunidades/${id}/eventos`).then(setEventos).catch(() => setEventos([])); }, [id]);
  if (!eventos) return <Paragrafo>Carregando o histórico…</Paragrafo>;
  if (eventos.length === 0) return <Panel><EmptyState title="Sem eventos" hint="Captação, funil, decisão e leitura aparecem aqui." /></Panel>;
  return (
    <Cartao>
      <LinhaDoTempo>
        {eventos.map((e) => (
          <Momento key={e.id} quando={fmtInstante(e.em)} titulo={<>{e.acao.toLowerCase()} · {ORIGEM[e.origem]} {e.autor}{e.regra ? <> · <Code>{e.regra}</Code></> : null}</>}>
            {Object.entries(e.depois ?? {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(' · ')}
          </Momento>
        ))}
      </LinhaDoTempo>
    </Cartao>
  );
}
