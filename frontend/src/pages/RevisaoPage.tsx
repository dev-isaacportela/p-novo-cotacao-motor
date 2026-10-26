// Revisão item a item (RF-007, T-054): cabeçalho fixo com etapa do funil e progresso, cartão por item em três colunas,
// declinados recolhidos ao fim com "desfazer", NAO_PARTICIPAR com "resgatar", edição salva ao sair do campo com a
// versão (409 ⇒ aviso e recarga), modal de busca no catálogo, aprovar com confirmação, banner de falha de envio.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motor, ErroMotor } from '@/lib/motor';
import { restante, tomDoPrazo } from '@/lib/prazo';
import { fmtInstante, moeda, numero, quantidade } from '@/lib/formato';
import { ROTULO_MARCA, faltaParaAprovar, ordenarPorPeso, percentual, precoEfetivo, progresso } from '@/lib/cobertura';
import { ROTULO_ETAPA, ROTULO_SITUACAO, ROTULO_STATUS, TOM_STATUS, type Detalhe, type Edicao, type ItemDetalhe, type ProdutoResumo } from '@/lib/tipos';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Alert, Badge, Button, CabecalhoFixo, Cartao, Code, Coluna, Colunas, Dash, Definicao, Definicoes, Input, LabelledField, MetaDot,
  PageHeader, Pilha, Rebaixado, SearchInput, Selos, Stat, Status, Table, Td, TextLink, Textarea, Th, Tr,
} from '@/components/page';

type Aviso = { tone: 'error' | 'warn' | 'success' | 'info'; texto: string; recarregar?: boolean };

export default function RevisaoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState<Detalhe | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [busca, setBusca] = useState<ItemDetalhe | null>(null);
  const [confirmarAprovacao, setConfirmarAprovacao] = useState(false);

  const carregar = useCallback(() => {
    motor<Detalhe>('GET', `oportunidades/${id}`)
      .then((x) => { setD(x); setAviso(null); })
      .catch((e: unknown) => setAviso({ tone: 'error', texto: e instanceof ErroMotor ? e.message : 'Não foi possível carregar a cotação.' }));
  }, [id]);

  useEffect(carregar, [carregar]);

  /** Toda edição leva a versão corrente; 409 pede recarga (RN-015). O detalhe é recarregado para refletir o motor. */
  async function editar(item: ItemDetalhe, edicao: Omit<Edicao, 'versao'>) {
    if (!d) return;
    setOcupado(true);
    try {
      await motor('PATCH', `oportunidades/${d.cabecalho.id}/itens/${item.id}`, { corpo: { versao: d.cabecalho.versao, ...edicao } });
      carregar();
    } catch (e) {
      tratar(e);
    } finally {
      setOcupado(false);
    }
  }

  function tratar(e: unknown) {
    if (e instanceof ErroMotor && e.status === 409) setAviso({ tone: 'warn', texto: 'Outra pessoa alterou esta cotação. Recarregue para continuar.', recarregar: true });
    else setAviso({ tone: 'error', texto: e instanceof ErroMotor ? `${e.regra ? e.regra + ': ' : ''}${e.message}` : 'Falha ao falar com o motor.' });
  }

  async function acao(rota: string, corpo?: unknown, sucesso?: string) {
    if (!d) return;
    setOcupado(true);
    try {
      await motor('POST', `oportunidades/${d.cabecalho.id}/${rota}`, { corpo: corpo ?? {} });
      if (sucesso) setAviso({ tone: 'success', texto: sucesso });
      carregar();
    } catch (e) {
      tratar(e);
    } finally {
      setOcupado(false);
    }
  }

  const ativos = useMemo(() => (d?.itens ?? []).filter((i) => i.situacao !== 'DECLINADO'), [d]);
  const declinados = useMemo(() => (d?.itens ?? []).filter((i) => i.situacao === 'DECLINADO'), [d]);
  const faltas = useMemo(() => (d ? faltaParaAprovar(d.itens, d.cabecalho.status) : []), [d]);

  if (!d) {
    return (
      <>
        <PageHeader module="Cotações" title="Revisão" />
        {aviso ? <Alert tone={aviso.tone}>{aviso.texto}</Alert> : <p className="text-[13px] text-ink-secondary">Carregando...</p>}
      </>
    );
  }

  const c = d.cabecalho;
  const r = restante(c.prazoResposta);
  const p = progresso(d.itens);
  const emRevisao = c.status === 'EM_REVISAO';

  return (
    <>
      <PageHeader
        module="Cotações"
        title={`${c.idExterno} · ${c.compradorNome ?? c.compradorCnpj ?? ''}`}
        description={<><Code>{c.portal}</Code> · {[c.compradorCnpj, c.compradorUf].filter(Boolean).join(' · ')}</>}
        actions={
          <>
            <Button onClick={() => navigate(`/oportunidades/${c.id}/historico`)}>Histórico</Button>
            <Button onClick={() => navigate('/fila')}>Voltar à fila</Button>
          </>
        }
      />

      {aviso ? (
        <Alert tone={aviso.tone} className="mb-4">
          {aviso.texto} {aviso.recarregar ? <TextLink onClick={carregar}>Recarregar</TextLink> : null}
        </Alert>
      ) : null}

      {d.proposta?.ultimoErro ? (
        <Alert tone="error" className="mb-4">
          Falha no envio ao portal: {d.proposta.ultimoErro}{' '}
          {c.status === 'APROVADA' ? <TextLink onClick={() => acao('reenviar', undefined, 'Envio reenfileirado com a mesma chave.')} disabled={ocupado}>Tentar novamente</TextLink> : null}
        </Alert>
      ) : null}

      <CabecalhoFixo>
        <Colunas>
          <Definicoes>
            <Definicao rotulo="Prazo">{r.texto ? <Status tone={tomDoPrazo(r)}>{r.texto}</Status> : null}</Definicao>
            <Definicao rotulo="Status"><Status tone={TOM_STATUS[c.status]}>{ROTULO_STATUS[c.status]}</Status></Definicao>
            <Definicao rotulo="Funil">{c.desfechoFunil === 'NAO_PARTICIPAR' ? `não participar · ${c.motivoDesfecho ?? ''}` : `${ROTULO_ETAPA[c.etapaFunil]}${c.desfechoFunil ? ' · participar' : ''}`}</Definicao>
            <Definicao rotulo="Progresso"><Stat>{p.confirmados}</Stat> confirmados <MetaDot /> <Stat>{p.declinados}</Stat> declinados <MetaDot /> <Stat>{p.pendentes}</Stat> pendentes</Definicao>
          </Definicoes>
          <Definicoes>
            <Definicao rotulo="Validade">{d.proposta?.validadeHoras != null ? `${d.proposta.validadeHoras} h` : null}</Definicao>
            <Definicao rotulo="Pagamento">{d.proposta?.condicaoPagamento}</Definicao>
            <Definicao rotulo="Frete">{d.proposta?.tipoFrete}</Definicao>
            <Definicao rotulo="IA">{c.marcas.includes('SEM_IA') ? 'sem processamento' : d.iaModelo ? `${d.iaModelo} · US$ ${numero(d.iaCusto, 4)}` : null}</Definicao>
          </Definicoes>
          <Pilha>
            {c.marcas.length ? <Selos>{c.marcas.map((m) => <Badge key={m} tone="attention">{ROTULO_MARCA[m] ?? m}</Badge>)}</Selos> : null}
            {c.status === 'NAO_PARTICIPAR' ? (
              <Button variant="primary" onClick={() => acao('resgatar', undefined, 'Cotação devolvida ao funil a partir da IA.')} disabled={ocupado}>Resgatar</Button>
            ) : null}
            {emRevisao ? (
              <span title={faltas.length ? `Falta: ${faltas.join('; ')}` : 'Aprova e envia ao portal'}>
                <Button variant="primary" onClick={() => setConfirmarAprovacao(true)} disabled={ocupado || faltas.length > 0}>Aprovar e enviar</Button>
              </span>
            ) : null}
            {c.status === 'APROVADA' && !d.proposta?.enviadoEm ? (
              <Button onClick={() => acao('reabrir', { versao: c.versao }, 'Cotação reaberta para revisão.')} disabled={ocupado}>Reabrir</Button>
            ) : null}
            {d.proposta?.protocoloPortal ? <Definicao rotulo="Protocolo">{d.proposta.protocoloPortal} · {fmtInstante(d.proposta.enviadoEm)}</Definicao> : null}
            {faltas.length && emRevisao ? <Rebaixado>Para aprovar: {faltas.join('; ')}.</Rebaixado> : null}
          </Pilha>
        </Colunas>
      </CabecalhoFixo>

      <Pilha>
        {ativos.map((i) => (
          <CartaoItem key={`${i.id}:${c.versao}`} item={i} editavel={emRevisao && !ocupado} onEditar={(e) => editar(i, e)} onBuscar={() => setBusca(i)} />
        ))}

        {declinados.length ? (
          <Cartao>
            <Coluna titulo={`${declinados.length} itens declinados`}>
              <Table>
                <tbody>
                  {declinados.map((i) => (
                    <Tr key={i.id}>
                      <Td><Code>{i.idExternoItem}</Code> {i.descricao}</Td>
                      <Td>{i.motivoDeclinio ?? <Dash />}</Td>
                      <Td numeric>{emRevisao ? <TextLink onClick={() => editar(i, { situacao: 'ANALISANDO' })} disabled={ocupado}>Desfazer</TextLink> : null}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Coluna>
          </Cartao>
        ) : null}
      </Pilha>

      <BuscaCatalogo key={busca?.id ?? 'fechado'} item={busca} onFechar={() => setBusca(null)} onEscolher={(codProd) => { const i = busca; setBusca(null); if (i) editar(i, { codProd }); }} />

      <Dialog open={confirmarAprovacao} onOpenChange={setConfirmarAprovacao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar e enviar ao portal?</DialogTitle>
            <DialogDescription>
              {p.confirmados} itens confirmados e {p.declinados} declinados vão para o portal {c.portal}. Depois do envio a proposta não muda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmarAprovacao(false)}>Cancelar</Button>
            <Button variant="primary" onClick={() => { setConfirmarAprovacao(false); acao('aprovar', { versao: c.versao }, 'Aprovada. O envio entrou na fila.'); }}>Aprovar e enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── cartão do item ────────────────────────────────────────────────────────

function CartaoItem({ item: i, editavel, onEditar, onBuscar }: { item: ItemDetalhe; editavel: boolean; onEditar: (e: Omit<Edicao, 'versao'>) => void; onBuscar: () => void }) {
  const linha = i.proposta;
  const ev = i.vinculo?.evidencia ?? null;
  const melhor = ev?.candidatos?.[0];
  const [preco, setPreco] = useState(linha?.precoFinal ?? linha?.precoSugerido ?? '');
  const [justificativa, setJustificativa] = useState(linha?.justificativa ?? '');
  const [observacao, setObservacao] = useState(linha?.observacao ?? '');
  const [motivo, setMotivo] = useState('');
  const [declinando, setDeclinando] = useState(false);

  function salvarPreco() {
    const n = Number(String(preco).replace(',', '.'));
    if (!Number.isFinite(n) || n === precoEfetivo(linha)) return;
    onEditar({ precoFinal: n, justificativa: justificativa || undefined });
  }

  return (
    <Cartao>
      <Colunas>
        <Coluna titulo={`Item ${i.idExternoItem} · pedido do comprador`}>
          <p className="text-[13px] font-semibold text-ink">{i.descricao}</p>
          <Definicoes>
            <Definicao rotulo="Quantidade">{quantidade(i.quantidade, i.unidade)}</Definicao>
            <Definicao rotulo="Código do comprador">{i.codigoComprador}</Definicao>
            <Definicao rotulo="Entrega">{i.entrega}</Definicao>
          </Definicoes>
          <Selos>
            <Badge tone={i.situacao === 'CONFIRMADO' ? 'accent' : i.situacao === 'SEM_CORRESPONDENCIA' ? 'alert' : 'neutral'}>{ROTULO_SITUACAO[i.situacao]}</Badge>
            {i.marcas.map((m) => <Badge key={m} tone={m === 'FORA_ESCOPO' ? 'alert' : 'attention'}>{ROTULO_MARCA[m] ?? m}</Badge>)}
          </Selos>
          <Atributos item={i} editavel={editavel} onEditar={onEditar} />
        </Coluna>

        <Coluna titulo="Casamento com o catálogo">
          {i.vinculo?.codProd ? (
            <Definicoes>
              <Definicao rotulo="Produto"><Code>{i.vinculo.codProd}</Code> {melhor && melhor.codProd === i.vinculo.codProd ? melhor.nome : linha?.marca ?? ''}</Definicao>
              <Definicao rotulo="Origem">{i.vinculo.origem.toLowerCase()}</Definicao>
              <Definicao rotulo="Confiança">{percentual(i.vinculo.confianca)}</Definicao>
            </Definicoes>
          ) : (
            <p className="text-[13px] text-ink-secondary">{i.situacao === 'ANALISANDO' ? 'Ainda em análise.' : 'Sem produto escolhido.'}</p>
          )}
          {ev ? (
            <Rebaixado>
              {ev.termCount != null ? <p>{ev.knownTermCount}/{ev.termCount} termos conhecidos{ev.unknownTerms?.length ? ` · desconhecidos: ${ev.unknownTerms.join(', ')}` : ''}</p> : null}
              {ev.impedimentos?.length ? <p>Impedimentos: {ev.impedimentos.join('; ')}</p> : null}
              {ev.divergencias?.length ? <p>Divergências: {ev.divergencias.join('; ')}</p> : null}
              {ev.atributosConferidos?.length ? <p>Conferidos: {ev.atributosConferidos.join(', ')}</p> : null}
            </Rebaixado>
          ) : null}
          {ev?.candidatos?.length ? (
            <Table>
              <thead><tr><Th>Candidato</Th><Th numeric>Cobertura</Th><Th /></tr></thead>
              <tbody>
                {ev.candidatos.slice(0, 5).map((cand) => (
                  <Tr key={cand.codProd}>
                    <Td>
                      <Code>{cand.codProd}</Code> {cand.nome}
                      <span className="block text-[12px] text-ink-secondary">
                        {[cand.marca, cand.embalagem, cand.status].filter(Boolean).join(' · ')}
                        {cand.missingTerms?.length ? ` · faltam: ${ordenarPorPeso(cand.missingTerms).map((t) => t.term).join(', ')}` : ''}
                      </span>
                    </Td>
                    <Td numeric>{percentual(cand.coverage)}</Td>
                    <Td numeric>{editavel && cand.codProd !== linha?.codProd ? <TextLink onClick={() => onEditar({ codProd: cand.codProd })}>Usar</TextLink> : null}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : null}
          {editavel ? <TextLink onClick={onBuscar}>Buscar outro produto no catálogo</TextLink> : null}
        </Coluna>

        <Coluna titulo="Proposta">
          {linha?.codProd ? (
            <Definicoes>
              <Definicao rotulo="Produto"><Code>{linha.codProd}</Code></Definicao>
              <Definicao rotulo="Marca">{linha.marca}</Definicao>
              <Definicao rotulo="Embalagem">{linha.embalagem}</Definicao>
              <Definicao rotulo="Anvisa">{linha.registroAnvisa}</Definicao>
              <Definicao rotulo="Preço sugerido">{linha.precoSugerido != null ? moeda(linha.precoSugerido) : null}</Definicao>
              <Definicao rotulo="Prazo de entrega">{linha.prazoEntregaDias != null ? `${linha.prazoEntregaDias} dias` : null}</Definicao>
            </Definicoes>
          ) : (
            <p className="text-[13px] text-ink-secondary">Escolha um produto para montar a linha da proposta.</p>
          )}
          {linha?.codProd ? (
            <>
              <LabelledField label="Preço final" hint={linha.precoSugerido != null && Number(preco) !== Number(linha.precoSugerido) ? 'Diferente do sugerido: exige justificativa (RN-008).' : undefined}>
                <Input value={preco} onChange={(e) => setPreco(e.target.value)} onBlur={salvarPreco} disabled={!editavel} inputMode="decimal" />
              </LabelledField>
              <LabelledField label="Justificativa">
                <Input value={justificativa} onChange={(e) => setJustificativa(e.target.value)} onBlur={salvarPreco} disabled={!editavel} placeholder="Por que o preço mudou" />
              </LabelledField>
              <LabelledField label="Observação">
                <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} onBlur={() => observacao !== (linha.observacao ?? '') && onEditar({ observacao })} disabled={!editavel} rows={2} />
              </LabelledField>
            </>
          ) : null}
          {editavel ? (
            <Selos>
              {i.situacao !== 'CONFIRMADO' && linha?.codProd ? <Button size="sm" variant="primary" onClick={() => onEditar({ situacao: 'CONFIRMADO' })}>Confirmar</Button> : null}
              {!declinando ? <Button size="sm" onClick={() => setDeclinando(true)}>Declinar</Button> : null}
            </Selos>
          ) : null}
          {declinando ? (
            <Pilha>
              <LabelledField label="Motivo do declínio" obrigatorio>
                <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Sem estoque, produto fora de linha..." />
              </LabelledField>
              <Selos>
                <Button size="sm" variant="danger" disabled={!motivo.trim()} onClick={() => { onEditar({ situacao: 'DECLINADO', motivo: motivo.trim() }); setDeclinando(false); }}>Declinar item</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeclinando(false)}>Cancelar</Button>
              </Selos>
            </Pilha>
          ) : null}
        </Coluna>
      </Colunas>
    </Cartao>
  );
}

// ── atributos extraídos pela IA, editáveis ────────────────────────────────

const CAMPOS_IA: [string, string][] = [
  ['tipoProduto', 'Tipo'], ['densidadeCalorica', 'Densidade calórica'], ['proteina', 'Proteína'], ['composicao', 'Composição'],
  ['sabor', 'Sabor'], ['apresentacao', 'Apresentação'], ['volumeOuPeso', 'Volume/peso'], ['quantidadePorEmbalagem', 'Qtd. por embalagem'], ['marcaCitada', 'Marca citada'],
];

function Atributos({ item: i, editavel, onEditar }: { item: ItemDetalhe; editavel: boolean; onEditar: (e: Omit<Edicao, 'versao'>) => void }) {
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const [campo] of CAMPOS_IA) v[campo] = i.atributosIa?.[campo] == null ? '' : String(i.atributosIa[campo]);
    return v;
  });

  if (!i.atributosIa) return <Rebaixado>Sem atributos extraídos{i.marcas.includes('SEM_IA') ? ' (IA indisponível)' : ''}.</Rebaixado>;

  function salvar(campo: string) {
    const atual = i.atributosIa?.[campo] == null ? '' : String(i.atributosIa[campo]);
    if (valores[campo] === atual) return;
    onEditar({ atributosIa: { ...i.atributosIa, [campo]: valores[campo] === '' ? null : valores[campo] } });
  }

  const fora = i.marcas.includes('FORA_ESCOPO');
  return (
    <Rebaixado>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {CAMPOS_IA.map(([campo, rotulo]) => (
          <LabelledField key={campo} label={rotulo}>
            <Input value={valores[campo] ?? ''} onChange={(e) => setValores((v) => ({ ...v, [campo]: e.target.value }))} onBlur={() => salvar(campo)} disabled={!editavel} />
          </LabelledField>
        ))}
      </div>
      {editavel ? (
        <TextLink className="mt-2" onClick={() => onEditar({ foraDoEscopo: !fora })}>{fora ? 'Marcar como no escopo' : 'Marcar fora do escopo'}</TextLink>
      ) : null}
    </Rebaixado>
  );
}

// ── modal de busca no catálogo ────────────────────────────────────────────

function BuscaCatalogo({ item, onFechar, onEscolher }: { item: ItemDetalhe | null; onFechar: () => void; onEscolher: (codProd: number) => void }) {
  const [termo, setTermo] = useState('');
  const [lista, setLista] = useState<ProdutoResumo[] | null>(null);
  const [erro, setErro] = useState('');

  async function buscar() {
    if (!termo.trim()) return;
    try {
      setLista(await motor<ProdutoResumo[]>('GET', 'catalogo/busca', { consulta: { termo: termo.trim() } }));
      setErro('');
    } catch (e) {
      setErro(e instanceof ErroMotor ? e.message : 'Falha na busca.');
    }
  }

  return (
    <Dialog open={item !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar no catálogo</DialogTitle>
          <DialogDescription>Use poucas palavras: o que identifica o produto, como "espessante 125g".</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={(e) => { e.preventDefault(); buscar(); }} className="flex gap-2">
            <SearchInput value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Termo curto" aria-label="Termo de busca" autoFocus className="flex-1" />
            <Button type="submit" variant="primary" size="sm">Buscar</Button>
          </form>
          {erro ? <Alert tone="warn" className="mt-3">{erro}</Alert> : null}
          {lista ? (
            lista.length === 0 ? (
              <p className="mt-3 text-[13px] text-ink-secondary">Nada encontrado. Tente outro termo.</p>
            ) : (
              <Table className="mt-3">
                <thead><tr><Th>Produto</Th><Th>Marca · embalagem</Th><Th>Status</Th><Th /></tr></thead>
                <tbody>
                  {lista.map((pr) => (
                    <Tr key={pr.codProd}>
                      <Td><Code>{pr.codProd}</Code> {pr.nome}</Td>
                      <Td>{[pr.marca, pr.embalagem].filter(Boolean).join(' · ') || <Dash />}</Td>
                      <Td><Status tone={pr.status && pr.status.toUpperCase().startsWith('A') ? 'live' : 'off'}>{pr.status ?? '—'}</Status></Td>
                      <Td numeric><TextLink onClick={() => onEscolher(pr.codProd)}>Usar</TextLink></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button onClick={onFechar}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
