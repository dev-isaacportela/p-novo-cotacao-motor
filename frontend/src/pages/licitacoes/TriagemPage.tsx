// Triagem de licitações (spec 006 RF-007, T-261): lista pré-lida com prioridade, aderência, fontes e marcas; filtros por
// status, prioridade e UF; decisão em diálogo; resgate do que saiu pela decisão.
import { useCallback, useEffect, useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { motor, ErroMotor } from '@/lib/motor';
import { fmtData, moeda } from '@/lib/formato';
import { ROTULO_MARCA } from '@/lib/cobertura';
import { aderencia, ROTULO_PRIORIDADE, ROTULO_STATUS_LICITACAO, TOM_STATUS_LICITACAO, tomDaPrioridade } from '@/lib/licitacao';
import type { LicitacaoLista, LicitacaoResumo } from '@/lib/tiposLicitacao';
import {
  Alert, Badge, Button, Code, Dash, EmptyState, Field, FilterChip, Input, LabelledField, PageHeader, Pagination, Panel, Pilha, RowMeta, RowTitle,
  SelectMenu, Selos, Status, Table, Td, TextLink, Th, Toolbar, Tr,
} from '@/components/page';
import { DialogoDecisao } from './DialogoDecisao';

const CHAVE_FILTROS = 'cot-licitacoes-filtros';
const STATUS = [
  { value: '', label: 'Em decisão e em espera' }, { value: 'EM_DECISAO', label: 'Em decisão' }, { value: 'EM_ESPERA', label: 'Em espera' },
  { value: 'EM_ANALISE', label: 'Em análise' }, { value: 'PRONTA_PARA_PROPOSTA', label: 'Pronta para proposta' }, { value: 'NAO_PARTICIPAR', label: 'Não participar' },
  { value: 'ENCERRADA', label: 'Encerrada' },
];
const PRIORIDADES = [{ value: '', label: 'Todas' }, { value: 'ALTA', label: 'Alta' }, { value: 'MEDIA', label: 'Média' }, { value: 'BAIXA', label: 'Baixa' }];

interface Filtros { status: string; prioridade: string; uf: string; pagina: number }

function lerFiltros(): Filtros {
  try {
    const salvo = sessionStorage.getItem(CHAVE_FILTROS);
    if (salvo) return { status: '', prioridade: '', uf: '', pagina: 1, ...(JSON.parse(salvo) as Partial<Filtros>) };
  } catch {
    // sessão sem storage
  }
  return { status: '', prioridade: '', uf: '', pagina: 1 };
}

export default function TriagemPage() {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<Filtros>(lerFiltros);
  const [uf, setUf] = useState(filtros.uf);
  const [lista, setLista] = useState<LicitacaoLista | null>(null);
  const [aviso, setAviso] = useState<{ tone: 'warn' | 'success'; texto: string } | null>(null);
  const [decidindo, setDecidindo] = useState<LicitacaoResumo | null>(null);
  const [ocupado, iniciar] = useTransition();

  useEffect(() => {
    try { sessionStorage.setItem(CHAVE_FILTROS, JSON.stringify(filtros)); } catch { /* preferência não crítica */ }
  }, [filtros]);

  const carregar = useCallback(() => {
    iniciar(async () => {
      try {
        setLista(await motor<LicitacaoLista>('GET', 'licitacoes', { consulta: { status: filtros.status, prioridade: filtros.prioridade, uf: filtros.uf, pagina: filtros.pagina } }));
      } catch (e: unknown) {
        setAviso({ tone: 'warn', texto: e instanceof ErroMotor ? e.message : 'Não foi possível falar com o motor.' });
      }
    });
  }, [filtros]);

  useEffect(carregar, [carregar]);

  const mudar = (parte: Partial<Filtros>) => setFiltros((f) => ({ ...f, pagina: 1, ...parte }));

  async function resgatar(l: LicitacaoResumo) {
    try {
      await motor('POST', `licitacoes/${l.id}/resgatar`);
      setAviso({ tone: 'success', texto: `${l.numero} voltou para a decisão.` });
      carregar();
    } catch (e) {
      setAviso({ tone: 'warn', texto: e instanceof ErroMotor ? e.message : 'Falha ao resgatar.' });
    }
  }

  const ultimaPagina = lista ? Math.max(1, Math.ceil(lista.total / lista.tamanho)) : 1;
  const decidivel = (s: string) => s === 'EM_DECISAO' || s === 'EM_ESPERA';

  return (
    <>
      <PageHeader module="Licitações" title="Triagem" description="Licitações pré-lidas pela IA, da sessão mais próxima para a mais distante. A decisão é sua." actions={<Button onClick={carregar} disabled={ocupado}>Atualizar</Button>} />
      {aviso ? <Alert tone={aviso.tone} className="mb-4">{aviso.texto}</Alert> : null}
      <Pilha>
        <Panel>
          <Toolbar>
            <Field label="Status"><SelectMenu value={filtros.status} onChange={(v) => mudar({ status: v })} options={STATUS} label="Status" className="w-56" /></Field>
            <Field label="Prioridade"><SelectMenu value={filtros.prioridade} onChange={(v) => mudar({ prioridade: v })} options={PRIORIDADES} label="Prioridade" className="w-36" /></Field>
            <form onSubmit={(e) => { e.preventDefault(); mudar({ uf: uf.trim().toUpperCase() }); }} className="contents">
              <LabelledField label="UF"><Input value={uf} onChange={(e) => setUf(e.target.value)} maxLength={2} className="w-16" /></LabelledField>
              <Button type="submit" size="sm">Filtrar</Button>
            </form>
            {filtros.uf ? <FilterChip label="UF" value={filtros.uf} onClear={() => { setUf(''); mudar({ uf: '' }); }} /> : null}
          </Toolbar>

          {lista && lista.itens.length === 0 ? (
            <EmptyState title="Nada para decidir" hint="Quando o funil aprovar licitações e a IA pré-ler, elas aparecem aqui." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Sessão</Th><Th>Licitação</Th><Th>Objeto</Th><Th numeric>Valor estimado</Th><Th>Prioridade</Th><Th>Status</Th><Th />
                </tr>
              </thead>
              <tbody>
                {(lista?.itens ?? []).map((l) => (
                  <Tr key={l.id} onClick={() => navigate(`/licitacoes/${l.id}`)} className="cursor-pointer">
                    <Td>{l.sessaoEm ? fmtData(l.sessaoEm) : <Dash />}<RowMeta>{l.modalidade?.toLowerCase()}</RowMeta></Td>
                    <Td>
                      <RowTitle>{l.numero ?? l.id}</RowTitle>
                      <RowMeta>{l.orgao} · {[l.municipio, l.uf].filter(Boolean).join('/')}</RowMeta>
                      <RowMeta>{l.fontes.map((f) => <Code key={f}>{f}</Code>)}</RowMeta>
                    </Td>
                    <Td><span className="line-clamp-2 max-w-md">{l.objeto}</span>{l.resumoIa ? <RowMeta>{l.resumoIa}</RowMeta> : null}</Td>
                    <Td numeric>{l.valorEstimado != null ? moeda(l.valorEstimado) : <Dash />}</Td>
                    <Td>
                      {l.prioridade ? <Status tone={tomDaPrioridade(l.prioridade)}>{ROTULO_PRIORIDADE[l.prioridade] ?? l.prioridade.toLowerCase()}</Status> : <Dash />}
                      {l.aderencia != null ? <RowMeta>aderência {aderencia(l.aderencia)}</RowMeta> : null}
                      {l.marcas.length ? <Selos>{l.marcas.map((m) => <Badge key={m} tone="attention">{ROTULO_MARCA[m] ?? m}</Badge>)}</Selos> : null}
                    </Td>
                    <Td>
                      <Status tone={TOM_STATUS_LICITACAO[l.status] ?? 'off'}>{ROTULO_STATUS_LICITACAO[l.status] ?? l.status}</Status>
                      {l.estrategico ? <RowMeta>estratégica</RowMeta> : null}
                      {l.status === 'NAO_PARTICIPAR' && l.motivoDesfecho ? <RowMeta>{l.motivoDesfecho}</RowMeta> : null}
                    </Td>
                    <Td numeric>
                      {decidivel(l.status) ? <TextLink onClick={(e) => { e.stopPropagation(); setDecidindo(l); }}>Decidir</TextLink> : null}
                      {l.status === 'NAO_PARTICIPAR' ? <TextLink onClick={(e) => { e.stopPropagation(); resgatar(l); }}>Resgatar</TextLink> : null}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
          {lista ? (
            <Pagination page={lista.pagina} lastPage={ultimaPagina} total={lista.total} unit="licitações" busy={ocupado}
              onPrevious={() => setFiltros((f) => ({ ...f, pagina: f.pagina - 1 }))} onNext={() => setFiltros((f) => ({ ...f, pagina: f.pagina + 1 }))} />
          ) : null}
        </Panel>
      </Pilha>

      <DialogoDecisao key={decidindo?.id ?? 'fechado'} licitacao={decidindo} onFechar={() => setDecidindo(null)}
        onDecidido={(status) => { setDecidindo(null); setAviso({ tone: 'success', texto: status === 'EM_ANALISE' ? 'Decisão registrada: a leitura completa entrou na fila.' : 'Decisão registrada.' }); carregar(); }} />
    </>
  );
}
