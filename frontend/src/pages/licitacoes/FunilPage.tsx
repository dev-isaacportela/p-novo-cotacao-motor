// Funil de licitações (spec 006 RF-005, RF-015, T-263, admin): versões, editor do rascunho, palavras publicadas,
// comparação com a vigente (obrigatória antes de ativar, RN-006) e teste de base suja.
import { useCallback, useEffect, useState } from 'react';
import { motor, ErroMotor } from '@/lib/motor';
import { fmtInstante, moeda } from '@/lib/formato';
import type { Comparacao, FunilConfig, FunilVersaoDetalhe, FunilVersaoResumo } from '@/lib/tiposLicitacao';
import {
  Alert, Badge, Button, CheckRow, Code, Dash, EmptyState, Input, LabelledField, PageHeader, Panel, PanelHeader, Pilha, Selos, Status, Table, Td, TextLink, Textarea, Th, Tr,
} from '@/components/page';

const VAZIA: FunilConfig = { portfolio: [], palavrasAdicionais: [], exclusoes: [], cnaes: [], ufs: [], raioKm: null, valorMinimo: null, modalidades: ['PREGAO', 'DISPENSA', 'CONCORRENCIA', 'REGISTRO_PRECO'], frequencia: 'PT2H', capacidadeSemanal: 20, periodoComparacaoDias: 30 };
const TOM_ESTADO = { RASCUNHO: 'attention', ATIVA: 'live', APOSENTADA: 'off' } as const;

function mensagem(e: unknown, padrao: string) {
  return e instanceof ErroMotor ? `${e.regra ? e.regra + ': ' : ''}${e.message}` : padrao;
}

const linhas = (s: string) => s.split(/[\n,;]/).map((x) => x.trim()).filter(Boolean);
const numeros = (s: string) => linhas(s).map(Number).filter(Number.isFinite);
const texto = (l: (string | number)[] | null | undefined) => (l ?? []).join('\n');

export default function FunilPage() {
  const [versoes, setVersoes] = useState<{ ativa: number | null; versoes: FunilVersaoResumo[] } | null>(null);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [detalhe, setDetalhe] = useState<FunilVersaoDetalhe | null>(null);
  const [aviso, setAviso] = useState<{ tone: 'error' | 'success'; texto: string } | null>(null);
  const avisar = (tone: 'error' | 'success', texto: string) => setAviso({ tone, texto });

  const carregarVersoes = useCallback(() => {
    motor<{ ativa: number | null; versoes: FunilVersaoResumo[] }>('GET', 'funil').then((v) => {
      setVersoes(v);
      setSelecionada((s) => s ?? v.versoes[0]?.versao ?? null);
    }).catch((e) => avisar('error', mensagem(e, 'Falha ao carregar o funil.')));
  }, []);
  useEffect(carregarVersoes, [carregarVersoes]);

  const carregarDetalhe = useCallback(() => {
    if (selecionada == null) return;
    motor<FunilVersaoDetalhe>('GET', `funil/versoes/${selecionada}`).then(setDetalhe).catch((e) => avisar('error', mensagem(e, 'Falha ao carregar a versão.')));
  }, [selecionada]);
  useEffect(carregarDetalhe, [carregarDetalhe]);

  async function novaVersao() {
    try {
      const r = await motor<FunilVersaoResumo>('POST', 'funil/versoes', { corpo: { config: detalhe?.config ?? VAZIA, dono: detalhe?.resumo.dono ?? null } });
      avisar('success', `Rascunho v${r.versao} criado a partir da v${detalhe?.resumo.versao ?? '—'}.`);
      carregarVersoes();
      setSelecionada(r.versao);
    } catch (e) { avisar('error', mensagem(e, 'Falha ao criar o rascunho.')); }
  }

  return (
    <>
      <PageHeader module="Licitações" title="Funil" description="Versões da configuração: rascunho, comparação com a vigente e ativação. Só uma versão fica ativa."
        actions={<Button variant="primary" onClick={novaVersao}>Nova versão</Button>} />
      {aviso ? <Alert tone={aviso.tone} className="mb-4">{aviso.texto}</Alert> : null}
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <Panel>
          <PanelHeader title="Versões" />
          {versoes && versoes.versoes.length === 0 ? <EmptyState title="Nenhuma versão" hint="Crie a primeira: ela pode ser ativada sem comparação." /> : (
            <Table>
              <tbody>
                {(versoes?.versoes ?? []).map((v) => (
                  <Tr key={v.versao} onClick={() => setSelecionada(v.versao)} className={`cursor-pointer ${v.versao === selecionada ? 'bg-accent' : ''}`}>
                    <Td><Code>v{v.versao}</Code><span className="block text-[12px] text-ink-secondary">{fmtInstante(v.criadoEm)}</span></Td>
                    <Td><Status tone={TOM_ESTADO[v.estado]}>{v.estado.toLowerCase()}</Status></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        {detalhe && detalhe.resumo.versao === selecionada ? <Versao key={detalhe.resumo.versao} d={detalhe} ativa={versoes?.ativa ?? null} avisar={avisar} onMudou={() => { carregarVersoes(); carregarDetalhe(); }} /> : <Panel><EmptyState title="Escolha uma versão" /></Panel>}
      </div>
      <BaseSuja avisar={avisar} />
    </>
  );
}

type Avisar = (tone: 'error' | 'success', texto: string) => void;

function Versao({ d, ativa, avisar, onMudou }: { d: FunilVersaoDetalhe; ativa: number | null; avisar: Avisar; onMudou: () => void }) {
  const c = d.config;
  const rascunho = d.resumo.estado === 'RASCUNHO';
  const [portfolio, setPortfolio] = useState(texto(c.portfolio));
  const [palavras, setPalavras] = useState(texto(c.palavrasAdicionais));
  const [exclusoes, setExclusoes] = useState(texto(c.exclusoes));
  const [cnaes, setCnaes] = useState(texto(c.cnaes));
  const [ufs, setUfs] = useState(texto(c.ufs));
  const [modalidades, setModalidades] = useState(texto(c.modalidades));
  const [raioKm, setRaioKm] = useState(c.raioKm == null ? '' : String(c.raioKm));
  const [valorMinimo, setValorMinimo] = useState(c.valorMinimo == null ? '' : String(c.valorMinimo));
  const [capacidade, setCapacidade] = useState(c.capacidadeSemanal == null ? '' : String(c.capacidadeSemanal));
  const [periodo, setPeriodo] = useState(String(c.periodoComparacaoDias ?? 30));
  const [ocupado, setOcupado] = useState(false);

  const config = (): FunilConfig => ({
    portfolio: numeros(portfolio), palavrasAdicionais: linhas(palavras), exclusoes: linhas(exclusoes), cnaes: linhas(cnaes), ufs: linhas(ufs).map((u) => u.toUpperCase()),
    raioKm: raioKm ? Number(raioKm) : null, valorMinimo: valorMinimo ? Number(valorMinimo) : null, modalidades: linhas(modalidades).map((m) => m.toUpperCase()),
    frequencia: c.frequencia, capacidadeSemanal: capacidade ? Number(capacidade) : null, periodoComparacaoDias: periodo ? Number(periodo) : null,
  });

  async function rodar(fn: () => Promise<unknown>, sucesso: string, falha: string) {
    setOcupado(true);
    try { await fn(); avisar('success', sucesso); onMudou(); } catch (e) { avisar('error', mensagem(e, falha)); } finally { setOcupado(false); }
  }
  const v = d.resumo.versao;
  const salvar = () => rodar(() => motor('PATCH', `funil/versoes/${v}`, { corpo: config() }), 'Rascunho salvo.', 'Falha ao salvar.');
  const publicar = () => rodar(() => motor('POST', `funil/versoes/${v}/publicar`), 'Palavras geradas a partir do portfólio.', 'Falha ao publicar.');
  const comparar = () => rodar(() => motor('POST', `funil/versoes/${v}/comparar`, { consulta: { periodo } }), 'Comparação feita com a versão vigente.', 'Falha ao comparar.');
  const ativar = () => rodar(() => motor('POST', `funil/versoes/${v}/ativar`), `v${v} ativa; a anterior foi aposentada.`, 'Falha ao ativar.');

  return (
    <Pilha>
      <Panel className="p-4">
        <Selos>
          <Code>v{v}</Code>
          <Status tone={TOM_ESTADO[d.resumo.estado]}>{d.resumo.estado.toLowerCase()}</Status>
          <span className="text-[12px] text-ink-secondary">dono {d.resumo.dono ?? '—'} · autor {d.resumo.autor}{d.resumo.ativadoEm ? ` · ativa desde ${fmtInstante(d.resumo.ativadoEm)}` : ''}</span>
        </Selos>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <LabelledField label="Portfólio (códigos de produto)" hint="Um por linha; as palavras saem do nome e da categoria no Busca360."><Textarea value={portfolio} onChange={(e) => setPortfolio(e.target.value)} rows={3} disabled={!rascunho} /></LabelledField>
          <LabelledField label="Palavras adicionais"><Textarea value={palavras} onChange={(e) => setPalavras(e.target.value)} rows={3} disabled={!rascunho} /></LabelledField>
          <LabelledField label="Exclusões (termos)"><Textarea value={exclusoes} onChange={(e) => setExclusoes(e.target.value)} rows={2} disabled={!rascunho} /></LabelledField>
          <LabelledField label="CNAEs"><Textarea value={cnaes} onChange={(e) => setCnaes(e.target.value)} rows={2} disabled={!rascunho} /></LabelledField>
          <LabelledField label="UFs prioritárias"><Input value={ufs} onChange={(e) => setUfs(e.target.value)} disabled={!rascunho} placeholder="SP, MG, PR" /></LabelledField>
          <LabelledField label="Modalidades"><Input value={modalidades} onChange={(e) => setModalidades(e.target.value)} disabled={!rascunho} /></LabelledField>
          <LabelledField label="Raio (km)"><Input value={raioKm} onChange={(e) => setRaioKm(e.target.value)} disabled={!rascunho} inputMode="numeric" /></LabelledField>
          <LabelledField label="Valor mínimo (R$)" hint="Abaixo disso descarta, salvo estratégica."><Input value={valorMinimo} onChange={(e) => setValorMinimo(e.target.value)} disabled={!rascunho} inputMode="decimal" /></LabelledField>
          <LabelledField label="Capacidade semanal de análise" hint="Acima disso, prioridade baixa espera (RF-016)."><Input value={capacidade} onChange={(e) => setCapacidade(e.target.value)} disabled={!rascunho} inputMode="numeric" /></LabelledField>
          <LabelledField label="Período da comparação (dias)"><Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} inputMode="numeric" /></LabelledField>
        </div>
        <Selos>
          {rascunho ? <Button variant="primary" onClick={salvar} disabled={ocupado}>Salvar rascunho</Button> : null}
          {rascunho ? <Button onClick={publicar} disabled={ocupado}>Gerar palavras</Button> : null}
          {rascunho ? <Button onClick={comparar} disabled={ocupado || ativa == null}>Comparar com a vigente</Button> : null}
          {rascunho ? (
            <span title={ativa != null && !d.resumo.comparada ? 'Compare antes de ativar (RN-006).' : undefined}>
              <Button variant="primary" onClick={ativar} disabled={ocupado || (ativa != null && !d.resumo.comparada)}>Ativar</Button>
            </span>
          ) : null}
        </Selos>
      </Panel>

      <Panel>
        <PanelHeader title={`Palavras-chave (${d.palavras.length})`} hint="Materializadas ao gerar; a versão ativa usa exatamente estas." />
        {d.palavras.length === 0 ? <EmptyState title="Sem palavras ainda" hint="Gere a partir do portfólio e das adicionais." /> : (
          <div className="flex flex-wrap gap-1.5 p-4">
            {d.palavras.map((p) => <Badge key={p.termo} tone={p.origem === 'PORTFOLIO' ? 'accent' : 'neutral'}>{p.termo}</Badge>)}
          </div>
        )}
      </Panel>

      {d.comparacao ? <ComparacaoPainel c={d.comparacao} versao={v} /> : null}
    </Pilha>
  );
}

function ComparacaoPainel({ c, versao }: { c: Comparacao; versao: number }) {
  const base = c.porVersao[String(c.versaoBase)];
  const nova = c.porVersao[String(versao)];
  return (
    <Panel>
      <PanelHeader title={`Comparação com a v${c.versaoBase ?? '—'}`} hint={`${c.total} licitações dos últimos ${c.periodoDias} dias, em ${fmtInstante(c.em)}.`} />
      <Table>
        <thead><tr><Th>Versão</Th><Th numeric>Seguem</Th><Th numeric>Descartadas</Th></tr></thead>
        <tbody>
          <Tr><Td>v{c.versaoBase} (vigente)</Td><Td numeric>{base?.seguem ?? <Dash />}</Td><Td numeric>{base?.descartadas ?? <Dash />}</Td></Tr>
          <Tr><Td>v{versao} (nova)</Td><Td numeric>{nova?.seguem ?? <Dash />}</Td><Td numeric>{nova?.descartadas ?? <Dash />}</Td></Tr>
        </tbody>
      </Table>
      {c.mudamDeLado.length ? (
        <>
          <PanelHeader title={`Mudam de lado (${c.mudamDeLado.length})`} />
          <Table>
            <thead><tr><Th>Licitação</Th><Th>Objeto</Th><Th>Vigente</Th><Th>Nova</Th></tr></thead>
            <tbody>
              {c.mudamDeLado.map((m) => (
                <Tr key={m.id}><Td>{m.numero} · {m.orgao}</Td><Td><span className="line-clamp-2 max-w-md">{m.objeto}</span></Td><Td>{m.vigente}</Td><Td>{m.nova}</Td></Tr>
              ))}
            </tbody>
          </Table>
        </>
      ) : <p className="px-4 py-3 text-[13px] text-ink-secondary">Nenhuma licitação muda de lado.</p>}
    </Panel>
  );
}

function BaseSuja({ avisar }: { avisar: Avisar }) {
  const [janela, setJanela] = useState('30');
  const [semExclusoes, setSemExclusoes] = useState(true);
  const [termos, setTermos] = useState('');
  const [resultado, setResultado] = useState<Record<string, unknown>[] | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function rodar() {
    setOcupado(true);
    try {
      setResultado(await motor<Record<string, unknown>[]>('POST', 'funil/base-suja', { corpo: { janelaDias: Number(janela) || 30, exclusoesDesligadas: semExclusoes, termosExtras: linhas(termos) } }));
    } catch (e) { avisar('error', mensagem(e, 'Falha ao rodar a base suja.')); } finally { setOcupado(false); }
  }

  return (
    <Panel className="mt-4">
      <PanelHeader title="Teste de base suja" hint="Reprocessa a janela sem as exclusões (e com termos extras) e lista o que a IA marcaria como alta ou média prioridade. Nada é gravado (RF-015)." />
      <div className="grid gap-3 p-4 sm:grid-cols-[8rem_1fr_1fr_auto] sm:items-end">
        <LabelledField label="Janela (dias)"><Input value={janela} onChange={(e) => setJanela(e.target.value)} inputMode="numeric" /></LabelledField>
        <LabelledField label="Termos extras"><Input value={termos} onChange={(e) => setTermos(e.target.value)} placeholder="espessante, módulo" /></LabelledField>
        <CheckRow marcado={semExclusoes} onToggle={() => setSemExclusoes((v) => !v)}>Desligar exclusões</CheckRow>
        <Button onClick={rodar} disabled={ocupado}>Rodar</Button>
      </div>
      {resultado ? (
        resultado.length === 0 ? <EmptyState title="Nada escapou" hint="O funil vigente não deixou passar oportunidade relevante na janela." /> : (
          <Table>
            <thead><tr><Th>Licitação</Th><Th>Objeto</Th><Th numeric>Valor</Th><Th>Prioridade</Th><Th>Motivo do descarte</Th></tr></thead>
            <tbody>
              {resultado.map((r, i) => (
                <Tr key={i}>
                  <Td>{String(r.numero ?? r.id ?? '')} · {String(r.orgao ?? '')}</Td>
                  <Td><span className="line-clamp-2 max-w-md">{String(r.objeto ?? '')}</span></Td>
                  <Td numeric>{r.valorEstimado != null ? moeda(Number(r.valorEstimado)) : <Dash />}</Td>
                  <Td>{String(r.prioridade ?? '').toLowerCase()}{r.aderencia != null ? ` · ${String(r.aderencia)} %` : ''}</Td>
                  <Td>{r.motivo ? String(r.motivo) : <TextLink onClick={() => avisar('success', JSON.stringify(r))}>detalhes</TextLink>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )
      ) : null}
    </Panel>
  );
}
