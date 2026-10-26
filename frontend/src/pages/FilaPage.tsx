// Fila de oportunidades (RF-006, T-053): contadores clicáveis, ordem por prazo com contagem regressiva,
// filtros persistidos na sessão. Encerradas e NAO_PARTICIPAR só aparecem pelo contador.
import { useCallback, useEffect, useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { motor, ErroMotor } from '@/lib/motor';
import { restante, tomDoPrazo } from '@/lib/prazo';
import { fmtInstante } from '@/lib/formato';
import { ROTULO_MARCA } from '@/lib/cobertura';
import { ROTULO_STATUS, TOM_STATUS, type Fila, type StatusOportunidade } from '@/lib/tipos';
import {
  Alert, Badge, Button, Code, Contador, Contadores, Dash, EmptyState, FilterChip, PageHeader, Pagination, Panel, Pilha,
  RowMeta, RowTitle, SearchInput, Selos, Status, Table, Td, Th, Toolbar, Tr,
} from '@/components/page';

const CHAVE_FILTROS = 'cot-fila-filtros';
const ORDEM: StatusOportunidade[] = ['EM_REVISAO', 'APROVADA', 'EM_FUNIL', 'NOVA', 'ENVIADA', 'NAO_PARTICIPAR', 'GANHA', 'PERDIDA', 'EXPIRADA', 'CANCELADA'];

interface Filtros {
  status: StatusOportunidade | '';
  comprador: string;
  pagina: number;
}

function lerFiltros(): Filtros {
  try {
    const salvo = sessionStorage.getItem(CHAVE_FILTROS);
    if (salvo) return { status: '', comprador: '', pagina: 1, ...(JSON.parse(salvo) as Partial<Filtros>) };
  } catch {
    // sessão sem storage: filtros só em memória
  }
  return { status: '', comprador: '', pagina: 1 };
}

export default function FilaPage() {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<Filtros>(lerFiltros);
  const [busca, setBusca] = useState(filtros.comprador);
  const [fila, setFila] = useState<Fila | null>(null);
  const [erro, setErro] = useState('');
  const [ocupado, iniciar] = useTransition();                                  // "carregando" sem setState síncrono no efeito
  const [agora, setAgora] = useState(Date.now);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE_FILTROS, JSON.stringify(filtros));
    } catch {
      // preferência não crítica
    }
  }, [filtros]);

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(relogio);
  }, []);

  const carregar = useCallback(() => {
    iniciar(async () => {
      try {
        const f = await motor<Fila>('GET', 'oportunidades', { consulta: { status: filtros.status, comprador: filtros.comprador, pagina: filtros.pagina } });
        setFila(f);
        setErro('');
      } catch (e: unknown) {
        setErro(e instanceof ErroMotor ? e.message : 'Não foi possível falar com o motor.');
      }
    });
  }, [filtros]);

  useEffect(carregar, [carregar]);

  function mudar(parte: Partial<Filtros>) {
    setFiltros((f) => ({ ...f, pagina: 1, ...parte }));
  }

  const ultimaPagina = fila ? Math.max(1, Math.ceil(fila.total / fila.tamanho)) : 1;

  return (
    <>
      <PageHeader module="Cotações" title="Fila" description="Oportunidades a revisar, da mais urgente para a menos." actions={<Button onClick={carregar} disabled={ocupado}>Atualizar</Button>} />
      {erro ? <Alert tone="warn" className="mb-4">{erro}</Alert> : null}

      <Pilha>
        <Contadores>
          {ORDEM.map((s) => (
            <Contador key={s} rotulo={ROTULO_STATUS[s]} valor={fila?.contadores?.[s] ?? 0} ativo={filtros.status === s} onClick={() => mudar({ status: filtros.status === s ? '' : s })} />
          ))}
        </Contadores>

        <Panel>
          <Toolbar>
            <form onSubmit={(e) => { e.preventDefault(); mudar({ comprador: busca.trim() }); }} className="contents">
              <SearchInput placeholder="Comprador ou CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar comprador" />
              <Button type="submit" size="sm">Buscar</Button>
            </form>
            {filtros.status ? <FilterChip label="Status" value={ROTULO_STATUS[filtros.status]} onClear={() => mudar({ status: '' })} /> : null}
            {filtros.comprador ? <FilterChip label="Comprador" value={filtros.comprador} onClear={() => { setBusca(''); mudar({ comprador: '' }); }} /> : null}
          </Toolbar>

          {fila && fila.itens.length === 0 ? (
            <EmptyState title="Nenhuma oportunidade aqui" hint={filtros.status || filtros.comprador ? 'Limpe os filtros para ver a fila padrão.' : 'Quando o motor captar cotações, elas aparecem aqui ordenadas por prazo.'} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Prazo</Th>
                  <Th>Cotação</Th>
                  <Th>Comprador</Th>
                  <Th>Status</Th>
                  <Th numeric>Itens</Th>
                  <Th>Funil</Th>
                </tr>
              </thead>
              <tbody>
                {(fila?.itens ?? []).map((o) => {
                  const r = restante(o.prazoResposta, agora);
                  return (
                    <Tr key={o.id} onClick={() => navigate(`/oportunidades/${o.id}`)} className="cursor-pointer">
                      <Td>
                        {r.texto ? <Status tone={tomDoPrazo(r)}>{r.texto}</Status> : <Dash />}
                        <RowMeta>{fmtInstante(o.prazoResposta)}</RowMeta>
                      </Td>
                      <Td>
                        <RowTitle>{o.idExterno}</RowTitle>
                        <RowMeta><Code>{o.portal}</Code> · captada {fmtInstante(o.criadoEm)}</RowMeta>
                      </Td>
                      <Td>
                        {o.compradorNome ?? <Dash />}
                        <RowMeta>{[o.compradorCnpj, o.compradorUf].filter(Boolean).join(' · ')}</RowMeta>
                      </Td>
                      <Td>
                        <Status tone={TOM_STATUS[o.status]}>{ROTULO_STATUS[o.status]}</Status>
                        {o.marcas.length ? <Selos>{o.marcas.map((m) => <Badge key={m} tone="attention">{ROTULO_MARCA[m] ?? m}</Badge>)}</Selos> : null}
                      </Td>
                      <Td numeric>
                        {o.totalItens}
                        {o.itensDeclinados ? <RowMeta>{o.itensDeclinados} declinados</RowMeta> : null}
                      </Td>
                      <Td>{o.desfechoFunil === 'NAO_PARTICIPAR' ? o.motivoDesfecho ?? 'não participar' : o.etapaFunil.toLowerCase()}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          {fila ? (
            <Pagination page={fila.pagina} lastPage={ultimaPagina} total={fila.total} unit="cotações" busy={ocupado}
              onPrevious={() => setFiltros((f) => ({ ...f, pagina: f.pagina - 1 }))} onNext={() => setFiltros((f) => ({ ...f, pagina: f.pagina + 1 }))} />
          ) : null}
        </Panel>
      </Pilha>
    </>
  );
}
