// Configurações (ADMIN, RF-013, RF-015, RF-017, T-056): lista de exclusão, chaves por seção (casamento, IA, proposta,
// operação), pisos, simulador em modo gravado e fila de erros com reprocessar.
import { useCallback, useEffect, useState } from 'react';
import { motor, ErroMotor } from '@/lib/motor';
import { fmtData, fmtInstante, moeda } from '@/lib/formato';
import type { Configuracao, Exclusao, Piso, Trabalho } from '@/lib/tipos';
import type { SituacaoTabelaGoverno } from '@/lib/tiposLicitacao';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Alert, Button, Code, Dash, EmptyState, Field, Input, LabelledField, PageHeader, Panel, PanelHeader, Pilha, SelectMenu, Status, Table, Td, TextLink, Th, Tr,
} from '@/components/page';

const SECOES: [string, string][] = [['casamento', 'Casamento'], ['ia', 'IA'], ['proposta', 'Proposta'], ['alerta', 'Operação'], ['preco', 'Operação'], ['funil', 'Casamento'], ['lance', 'Lance em licitação'], ['governo', 'Lance em licitação'], ['pacote', 'Lance em licitação'], ['ata', 'Pós-venda']];
const TIPOS_EXCLUSAO = [
  { value: 'TERMO', label: 'Termo' }, { value: 'COMPRADOR_CNPJ', label: 'Comprador (CNPJ)' }, { value: 'UF', label: 'UF' }, { value: 'CATEGORIA', label: 'Categoria' },
];
const GRAVADAS = [{ value: '1001', label: '1001 · Hospital Santa Clara (v1 e v2, pedido)' }, { value: '1002', label: '1002' }, { value: '1003', label: '1003 · nutrição, 7 itens' }];

function mensagem(e: unknown, padrao: string) {
  return e instanceof ErroMotor ? `${e.regra ? e.regra + ': ' : ''}${e.message}` : padrao;
}

export default function ConfiguracoesPage() {
  const [aviso, setAviso] = useState<{ tone: 'error' | 'success'; texto: string } | null>(null);
  const avisar = (tone: 'error' | 'success', texto: string) => setAviso({ tone, texto });

  return (
    <>
      <PageHeader module="Gestão" title="Configurações" description="O que o motor usa para filtrar, casar, precificar e operar. Toda mudança fica no histórico." />
      {aviso ? <Alert tone={aviso.tone} className="mb-4">{aviso.texto}</Alert> : null}
      <Tabs defaultValue="exclusoes">
        <TabsList>
          <TabsTrigger value="exclusoes">Lista de exclusão</TabsTrigger>
          <TabsTrigger value="chaves">Parâmetros</TabsTrigger>
          <TabsTrigger value="pisos">Pisos de preço</TabsTrigger>
          <TabsTrigger value="governo">Tabela de governo</TabsTrigger>
          <TabsTrigger value="erros">Fila de erros</TabsTrigger>
          <TabsTrigger value="simulador">Simulador</TabsTrigger>
        </TabsList>
        <TabsContent value="exclusoes"><Exclusoes avisar={avisar} /></TabsContent>
        <TabsContent value="chaves"><Chaves avisar={avisar} /></TabsContent>
        <TabsContent value="pisos"><Pisos avisar={avisar} /></TabsContent>
        <TabsContent value="governo"><TabelaGoverno avisar={avisar} /></TabsContent>
        <TabsContent value="erros"><FilaDeErros avisar={avisar} /></TabsContent>
        <TabsContent value="simulador"><Simulador avisar={avisar} /></TabsContent>
      </Tabs>
    </>
  );
}

type Avisar = (tone: 'error' | 'success', texto: string) => void;

function Exclusoes({ avisar }: { avisar: Avisar }) {
  const [lista, setLista] = useState<Exclusao[] | null>(null);
  const [tipo, setTipo] = useState('TERMO');
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const carregar = useCallback(() => { motor<Exclusao[]>('GET', 'exclusoes').then(setLista).catch((e) => avisar('error', mensagem(e, 'Falha ao carregar a lista.'))); }, [avisar]);
  useEffect(carregar, [carregar]);

  async function incluir() {
    try {
      await motor('POST', 'exclusoes', { corpo: { tipo, valor: valor.trim(), motivo: motivo.trim() || null } });
      setValor(''); setMotivo(''); avisar('success', 'Exclusão incluída: a próxima captação já filtra.'); carregar();
    } catch (e) { avisar('error', mensagem(e, 'Falha ao incluir.')); }
  }
  async function encerrar(id: number) {
    try { await motor('DELETE', `exclusoes/${id}`); avisar('success', 'Exclusão encerrada; fica no histórico.'); carregar(); } catch (e) { avisar('error', mensagem(e, 'Falha ao encerrar.')); }
  }

  return (
    <Pilha>
      <Panel className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); incluir(); }} className="grid gap-3 sm:grid-cols-[12rem_1fr_1fr_auto] sm:items-end">
          <Field label="Tipo"><SelectMenu value={tipo} onChange={setTipo} options={TIPOS_EXCLUSAO} label="Tipo de exclusão" /></Field>
          <LabelledField label="Valor" obrigatorio hint={tipo === 'TERMO' ? 'Palavra inteira, sem acento e caixa (RN-021).' : undefined}><Input value={valor} onChange={(e) => setValor(e.target.value)} /></LabelledField>
          <LabelledField label="Motivo"><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} /></LabelledField>
          <Button type="submit" variant="primary" disabled={!valor.trim()}>Incluir</Button>
        </form>
      </Panel>
      <Panel>
        <PanelHeader title="Vigentes" hint="Comprador, UF ou categoria excluem a cotação; termo declina o item (RN-021)." />
        {lista && lista.length === 0 ? <EmptyState title="Nenhuma exclusão vigente" hint="Toda cotação captada segue para a IA." /> : (
          <Table>
            <thead><tr><Th>Tipo</Th><Th>Valor</Th><Th>Motivo</Th><Th>Desde</Th><Th /></tr></thead>
            <tbody>
              {(lista ?? []).map((x) => (
                <Tr key={x.id}>
                  <Td>{TIPOS_EXCLUSAO.find((t) => t.value === x.tipo)?.label ?? x.tipo}</Td>
                  <Td>{x.valor}</Td>
                  <Td>{x.motivo ?? <Dash />}</Td>
                  <Td>{fmtInstante(x.vigenteDesde)} · {x.autor}</Td>
                  <Td numeric><TextLink onClick={() => encerrar(x.id)}>Encerrar</TextLink></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </Pilha>
  );
}

function Chaves({ avisar }: { avisar: Avisar }) {
  const [lista, setLista] = useState<Configuracao[] | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const carregar = useCallback(() => {
    motor<Configuracao[]>('GET', 'configuracoes').then((l) => { setLista(l); setValores(Object.fromEntries(l.map((c) => [c.chave, c.valor]))); })
      .catch((e) => avisar('error', mensagem(e, 'Falha ao carregar os parâmetros.')));
  }, [avisar]);
  useEffect(carregar, [carregar]);

  async function salvar(c: Configuracao) {
    if (valores[c.chave] === c.valor) return;
    try { await motor('PUT', 'configuracoes', { corpo: { chave: c.chave, valor: valores[c.chave] } }); avisar('success', `${c.chave} salvo como versão nova.`); carregar(); }
    catch (e) { avisar('error', mensagem(e, 'Falha ao salvar.')); setValores((v) => ({ ...v, [c.chave]: c.valor })); }
  }

  const secoes = Array.from(new Set(SECOES.map(([, s]) => s)));
  const secaoDe = (chave: string) => SECOES.find(([p]) => chave.startsWith(p + '.'))?.[1] ?? 'Operação';

  return (
    <Pilha>
      {secoes.map((s) => {
        const chaves = (lista ?? []).filter((c) => secaoDe(c.chave) === s);
        if (!chaves.length) return null;
        return (
          <Panel key={s}>
            <PanelHeader title={s} hint="Salva ao sair do campo; o valor anterior fica no histórico." />
            <Table>
              <thead><tr><Th>Chave</Th><Th>Valor</Th><Th>Descrição</Th><Th>Versão</Th></tr></thead>
              <tbody>
                {chaves.map((c) => (
                  <Tr key={c.chave}>
                    <Td><Code>{c.chave}</Code></Td>
                    <Td><Input value={valores[c.chave] ?? ''} onChange={(e) => setValores((v) => ({ ...v, [c.chave]: e.target.value }))} onBlur={() => salvar(c)} inputMode={c.tipo === 'TEXTO' ? 'text' : 'decimal'} aria-label={c.chave} /></Td>
                    <Td>{c.descricao}<span className="block text-[12px] text-ink-secondary">padrão {c.inicial}</span></Td>
                    <Td>v{c.versao} · {c.autor}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Panel>
        );
      })}
    </Pilha>
  );
}

function Pisos({ avisar }: { avisar: Avisar }) {
  const [lista, setLista] = useState<Piso[] | null>(null);
  const [codProd, setCodProd] = useState('');
  const [preco, setPreco] = useState('');
  const carregar = useCallback(() => { motor<Piso[]>('GET', 'pisos').then(setLista).catch((e) => avisar('error', mensagem(e, 'Falha ao carregar os pisos.'))); }, [avisar]);
  useEffect(carregar, [carregar]);

  async function definir() {
    try {
      await motor('POST', 'pisos', { corpo: { codProd: Number(codProd), precoMinimo: Number(preco.replace(',', '.')) } });
      setCodProd(''); setPreco(''); avisar('success', 'Piso definido (RN-009).'); carregar();
    } catch (e) { avisar('error', mensagem(e, 'Falha ao definir o piso.')); }
  }
  async function remover(id: number) {
    try { await motor('DELETE', `pisos/${id}`); carregar(); } catch (e) { avisar('error', mensagem(e, 'Falha ao remover.')); }
  }

  return (
    <Pilha>
      <Panel className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); definir(); }} className="grid gap-3 sm:grid-cols-[12rem_12rem_auto] sm:items-end">
          <LabelledField label="Código do produto" obrigatorio><Input value={codProd} onChange={(e) => setCodProd(e.target.value)} inputMode="numeric" /></LabelledField>
          <LabelledField label="Preço mínimo" obrigatorio><Input value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" /></LabelledField>
          <Button type="submit" variant="primary" disabled={!codProd || !preco}>Definir</Button>
        </form>
      </Panel>
      <Panel>
        <PanelHeader title="Pisos" hint="A aprovação recusa preço abaixo do piso vigente (RN-009)." />
        {lista && lista.length === 0 ? <EmptyState title="Nenhum piso definido" /> : (
          <Table>
            <thead><tr><Th>Produto</Th><Th numeric>Preço mínimo</Th><Th>Vigência</Th><Th /></tr></thead>
            <tbody>
              {(lista ?? []).map((p) => (
                <Tr key={p.id}>
                  <Td><Code>{p.codProd}</Code></Td>
                  <Td numeric>{moeda(p.precoMinimo)}</Td>
                  <Td>{fmtInstante(p.vigenciaInicio)} · {p.autor}</Td>
                  <Td numeric><TextLink onClick={() => remover(p.id)}>Remover</TextLink></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </Pilha>
  );
}

function lerBase64(arquivo: File): Promise<string> {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result).split(',')[1] ?? '');
    leitor.onerror = () => falha(leitor.error);
    leitor.readAsDataURL(arquivo);
  });
}

/** Spec 007 RNF-004: tabela CMED (PMVG por alíquota) carregada pelo admin com a data de referência; desatualizada passa o limite. */
function TabelaGoverno({ avisar }: { avisar: Avisar }) {
  const [sit, setSit] = useState<SituacaoTabelaGoverno | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [referencia, setReferencia] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const carregar = useCallback(() => { motor<SituacaoTabelaGoverno>('GET', 'admin/governo/tabela').then(setSit).catch((e) => avisar('error', mensagem(e, 'Falha ao consultar a tabela.'))); }, [avisar]);
  useEffect(carregar, [carregar]);

  async function enviar() {
    if (!arquivo || !referencia) return;
    setOcupado(true);
    try {
      const r = await motor<SituacaoTabelaGoverno>('POST', 'admin/governo/tabela', { corpo: { arquivoNome: arquivo.name, arquivoBase64: await lerBase64(arquivo), referencia } });
      setArquivo(null); setReferencia(''); setSit(r); avisar('success', `Tabela de ${fmtData(r.referencia)} carregada: ${r.linhas} apresentações com PMVG.`);
    } catch (e) { avisar('error', mensagem(e, 'Falha ao carregar a tabela.')); }
    finally { setOcupado(false); }
  }

  async function sincronizar() {
    setOcupado(true);
    try { await motor('POST', 'admin/governo/tabela/sincronizar'); avisar('success', 'Cópia da lista CMED do Precificação pedida; a referência muda quando o trabalho terminar.'); }
    catch (e) { avisar('error', mensagem(e, 'Falha ao pedir a sincronização.')); }
    finally { setOcupado(false); }
  }

  const doMitra = sit?.fonte === 'mitra';
  return (
    <Pilha>
      <Panel>
        <PanelHeader title="Situação" hint="O teto de venda ao governo vem do PMVG desta tabela, na alíquota de ICMS da UF do órgão.">
          {doMitra ? <Button variant="primary" onClick={sincronizar} disabled={ocupado}>Sincronizar agora</Button> : null}
        </PanelHeader>
        <div className="grid gap-3 p-4 sm:grid-cols-4">
          <Field label="Fonte">{sit ? (doMitra ? 'Precificação (lista CMED em vigor, copiada todo dia)' : 'arquivo carregado pelo admin') : <Dash />}</Field>
          <Field label="Referência">{sit?.referencia ? fmtData(sit.referencia) : <Dash />}</Field>
          <Field label="Apresentações">{sit ? sit.linhas : <Dash />}</Field>
          <Field label="Idade">{sit ? <Status tone={sit.desatualizada ? 'alert' : sit.referencia ? 'live' : 'off'}>{sit.desatualizada ? `desatualizada (mais de ${sit.idadeMaximaDias} dias)` : sit.referencia ? 'em dia' : 'sem tabela'}</Status> : <Dash />}</Field>
        </div>
      </Panel>
      {doMitra ? null : <Panel className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <LabelledField label="Arquivo da CMED (CSV)" obrigatorio hint="Lista de preços publicada pela Anvisa/CMED; as colunas PMVG são achadas pelo nome."><Input type="file" accept=".csv,.txt" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} /></LabelledField>
          <LabelledField label="Data de referência" obrigatorio><Input type="date" value={referencia} onChange={(e) => setReferencia(e.target.value)} /></LabelledField>
          <Button type="submit" variant="primary" disabled={ocupado || !arquivo || !referencia}>Carregar</Button>
        </form>
      </Panel>}
    </Pilha>
  );
}

function FilaDeErros({ avisar }: { avisar: Avisar }) {
  const [lista, setLista] = useState<Trabalho[] | null>(null);
  const carregar = useCallback(() => { motor<Trabalho[]>('GET', 'trabalhos', { consulta: { status: 'ERRO' } }).then(setLista).catch((e) => avisar('error', mensagem(e, 'Falha ao carregar a fila.'))); }, [avisar]);
  useEffect(carregar, [carregar]);

  async function reprocessar(id: number) {
    try { await motor('POST', `trabalhos/${id}/reprocessar`); avisar('success', 'Trabalho de volta à fila.'); carregar(); } catch (e) { avisar('error', mensagem(e, 'Falha ao reprocessar.')); }
  }

  return (
    <Panel>
      <PanelHeader title="Fila de erros" hint="Trabalhos que esgotaram as tentativas (RN-019). Reprocessar com um clique (RF-013)." />
      {lista && lista.length === 0 ? <EmptyState title="Nenhum erro pendente" /> : (
        <Table>
          <thead><tr><Th>Trabalho</Th><Th>Referência</Th><Th>Erro</Th><Th>Última falha</Th><Th /></tr></thead>
          <tbody>
            {(lista ?? []).map((t) => (
              <Tr key={t.id}>
                <Td><Status tone="alert">{t.tipo}</Status><span className="block text-[12px] text-ink-secondary">{t.tentativas} tentativas</span></Td>
                <Td><Code>{t.referencia ?? '—'}</Code></Td>
                <Td>{t.erro ?? <Dash />}</Td>
                <Td>{fmtInstante(t.fim)}</Td>
                <Td numeric><Button size="sm" onClick={() => reprocessar(t.id)}>Reprocessar</Button></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

function Simulador({ avisar }: { avisar: Avisar }) {
  const [id, setId] = useState('1003');
  const [acao, setAcao] = useState('publicar');
  const [versao, setVersao] = useState('2');
  const [perda, setPerda] = useState('preço acima do concorrente');

  async function cenario() {
    const corpo: Record<string, unknown> = { id };
    if (acao === 'versao') corpo.versao = Number(versao);
    if (acao === 'cancelar') corpo.cancelar = true;
    if (acao === 'pedido') corpo.pedido = true;
    if (acao === 'perda') corpo.perda = perda;
    try {
      const r = await motor<{ efeito: string; trabalho: string }>('POST', 'simulador/oportunidades', { corpo });
      avisar('success', `Cotação ${id}: ${r.efeito}; trabalho ${r.trabalho} na fila.`);
    } catch (e) { avisar('error', mensagem(e, 'Simulador indisponível (só em modo gravado).')); }
  }
  async function falha(tipo: string) {
    try { await motor('POST', 'simulador/falhas', { corpo: { tipo, vezes: 1 } }); avisar('success', `Falha ${tipo} programada.`); }
    catch (e) { avisar('error', mensagem(e, 'Simulador indisponível (só em modo gravado).')); }
  }

  return (
    <Pilha>
      <Panel className="p-4">
        <PanelHeader title="Cotações gravadas" hint="Só existe em homologação, com a Bionexo gravada (RF-017)." />
        <form onSubmit={(e) => { e.preventDefault(); cenario(); }} className="grid gap-3 pt-3 sm:grid-cols-[1fr_14rem_10rem_auto] sm:items-end">
          <Field label="Cotação"><SelectMenu value={id} onChange={setId} options={GRAVADAS} label="Cotação gravada" /></Field>
          <Field label="O que acontece">
            <SelectMenu value={acao} onChange={setAcao} label="Cenário" options={[
              { value: 'publicar', label: 'Publicar (captar)' }, { value: 'versao', label: 'Nova versão' }, { value: 'cancelar', label: 'Comprador cancela' },
              { value: 'pedido', label: 'Pedido emitido (ganha)' }, { value: 'perda', label: 'Perdida' },
            ]} />
          </Field>
          {acao === 'versao' ? <LabelledField label="Versão"><Input value={versao} onChange={(e) => setVersao(e.target.value)} inputMode="numeric" /></LabelledField>
            : acao === 'perda' ? <LabelledField label="Motivo"><Input value={perda} onChange={(e) => setPerda(e.target.value)} /></LabelledField> : <span />}
          <Button type="submit" variant="primary">Executar</Button>
        </form>
      </Panel>
      <Panel className="p-4">
        <PanelHeader title="Falhas" hint="Para treinar a fila de erros e o reenvio (C-008, C-013)." />
        <div className="flex flex-wrap gap-2 pt-3">
          <Button onClick={() => falha('ENVIO')}>Próximo envio falha</Button>
          <Button onClick={() => falha('TIMEOUT')}>Portal fora do ar</Button>
          <Button onClick={() => falha('CATALOGO')}>Catálogo falha uma vez</Button>
          <Button variant="primary" onClick={() => falha('RESTABELECER')}>Restabelecer</Button>
        </div>
      </Panel>
    </Pilha>
  );
}
