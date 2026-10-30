// Proposta da licitação (spec 007 RF-001..RF-008, T-351): linhas com teto do governo e valor mínimo com memória, edição por
// linha (produto, preço, declínio), exceção de piso (admin), aprovação com a lista do que falta, pacote assistido, marcação de
// enviada com protocolo e registro manual do resultado por item.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motor, ErroMotor } from '@/lib/motor';
import { fmtData, fmtInstante, moeda, numero, quantidade } from '@/lib/formato';
import { percentual, ROTULO_MARCA } from '@/lib/cobertura';
import { ROTULO_STATUS_LICITACAO, TOM_STATUS_LICITACAO } from '@/lib/licitacao';
import { avaliarPreco, pendenciasPorItem, ROTULO_AVALIACAO, ROTULO_ORIGEM, ROTULO_RESULTADO, TOM_RESULTADO, tomDaLinha } from '@/lib/licitacaoProposta';
import { useSessao } from '@/lib/sessao';
import type { EdicaoLinha, LinhaProposta, Pacote, PropostaLicitacao, Resultado } from '@/lib/tiposLicitacao';
import {
  Alert, Badge, Button, CabecalhoFixo, CheckRow, Code, Dash, Definicao, Definicoes, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, EmptyState, Input, LabelledField, PageHeader, Panel, PanelHeader, Pilha, RowMeta, RowTitle, SelectMenu, Selos, Status, Table,
  Td, TextLink, Textarea, Th, Tr,
} from '@/components/page';

type Aviso = { tone: 'error' | 'warn' | 'success'; texto: string };
const EM_DISPUTA = ['ENVIADA', 'GANHA', 'PERDIDA'];

function mensagem(e: unknown, padrao: string) {
  return e instanceof ErroMotor ? `${e.regra ? e.regra + ': ' : ''}${e.message}${e.itens?.length ? ` (${e.itens.length} item(ns))` : ''}` : padrao;
}

function baixar(nome: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.click();
  URL.revokeObjectURL(url);
}

export default function PropostaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sessao = useSessao();
  const [p, setP] = useState<PropostaLicitacao | null>(null);
  const [semProposta, setSemProposta] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [montando, setMontando] = useState(false);
  const [editando, setEditando] = useState<LinhaProposta | null>(null);
  const [dialogo, setDialogo] = useState<'excecao' | 'enviada' | 'resultado' | null>(null);

  const carregar = useCallback(() => {
    motor<PropostaLicitacao>('GET', `licitacoes/${id}/proposta`)
      .then((x) => { setP(x); setSemProposta(false); setMontando(false); })
      .catch((e: unknown) => {
        if (e instanceof ErroMotor && e.status === 404) setSemProposta(true);
        else setAviso({ tone: 'error', texto: mensagem(e, 'Não foi possível carregar a proposta.') });
      });
  }, [id]);

  useEffect(carregar, [carregar]);

  // Montar é um trabalho da fila: a tela espera o motor terminar e recarrega sozinha.
  useEffect(() => {
    if (!montando) return;
    const relogio = setInterval(carregar, 2500);
    return () => clearInterval(relogio);
  }, [montando, carregar]);

  async function acao(rota: string, sucesso: string, corpo?: unknown) {
    setOcupado(true);
    try {
      await motor('POST', `licitacoes/${id}/${rota}`, corpo === undefined ? {} : { corpo });
      setAviso({ tone: 'success', texto: sucesso });
      setDialogo(null);
      carregar();
    } catch (e) {
      setAviso({ tone: 'error', texto: mensagem(e, 'Falha ao falar com o motor.') });
    } finally {
      setOcupado(false);
    }
  }

  async function montar() {
    setOcupado(true);
    try { await motor('POST', `licitacoes/${id}/proposta/montar`); setMontando(true); setAviso({ tone: 'success', texto: 'Montando a proposta: casamento, preço, teto e mínimo por item.' }); }
    catch (e) { setAviso({ tone: 'error', texto: mensagem(e, 'Falha ao montar.') }); }
    finally { setOcupado(false); }
  }

  async function pacote() {
    setOcupado(true);
    try {
      const z = await motor<Pacote>('GET', `licitacoes/${id}/proposta/pacote`, { consulta: { formato: 'base64' } });
      baixar(z.nome, z.base64);
      setAviso({ tone: z.documentosFaltando ? 'warn' : 'success', texto: `Pacote gerado: ${z.linhas} linhas, ${z.documentosComArquivo} documentos${z.documentosFaltando ? `, ${z.documentosFaltando} faltando (veja o checklist)` : ''}.` });
      carregar();
    } catch (e) { setAviso({ tone: 'error', texto: mensagem(e, 'Falha ao gerar o pacote.') }); }
    finally { setOcupado(false); }
  }

  async function salvarLinha(e: EdicaoLinha) {
    setOcupado(true);
    try { await motor('PATCH', `licitacoes/${id}/proposta`, { corpo: { linhas: [e] } }); setEditando(null); carregar(); }
    catch (x) { setAviso({ tone: 'error', texto: mensagem(x, 'Falha ao salvar a linha.') }); }
    finally { setOcupado(false); }
  }

  if (semProposta) {
    return (
      <>
        <PageHeader module="Licitações" title="Proposta" actions={<Button onClick={() => navigate(`/licitacoes/${id}`)}>Voltar à análise</Button>} />
        {aviso ? <Alert tone={aviso.tone} className="mb-4">{aviso.texto}</Alert> : null}
        <Panel>
          <EmptyState title={montando ? 'Montando a proposta…' : 'Proposta ainda não montada'}
            hint={montando ? 'O motor casa cada item do edital com o portfólio e calcula preço, teto e mínimo. A tela atualiza sozinha.' : 'A licitação precisa estar pronta para proposta (análise concluída).'}
            action={montando ? null : <Button variant="primary" onClick={montar} disabled={ocupado}>Montar proposta</Button>} />
        </Panel>
      </>
    );
  }
  if (!p) {
    return (
      <>
        <PageHeader module="Licitações" title="Proposta" />
        {aviso ? <Alert tone={aviso.tone}>{aviso.texto}</Alert> : <p className="text-[13px] text-ink-secondary">Carregando...</p>}
      </>
    );
  }

  const admin = sessao.PERFIL === 'admin';
  const erroDialogo = aviso?.tone === 'error' ? aviso.texto : null;
  const porItem = pendenciasPorItem(p.pendencias);
  const emRevisao = p.status === 'EM_REVISAO';
  const aprovada = p.status === 'APROVADA';
  const total = p.linhas.filter((l) => !l.declinado && l.preco != null).reduce((s, l) => s + Number(l.preco) * Number(l.quantidade ?? 0), 0);

  return (
    <>
      <PageHeader module="Licitações" title={`Proposta · ${p.numero ?? p.oportunidadeId} · ${p.orgao ?? ''}`}
        description={<>{p.modalidade?.toLowerCase()} · {p.uf} · sessão {fmtInstante(p.sessaoEm) || '—'}</>}
        actions={<Button onClick={() => navigate(`/licitacoes/${id}`)}>Voltar à análise</Button>} />
      {aviso ? <Alert tone={aviso.tone} className="mb-4">{aviso.texto}</Alert> : null}

      <CabecalhoFixo>
        <Definicoes>
          <Definicao rotulo="Situação"><Status tone={TOM_STATUS_LICITACAO[p.status] ?? 'off'}>{ROTULO_STATUS_LICITACAO[p.status] ?? p.status}</Status></Definicao>
          <Definicao rotulo="Total ofertado">{total ? moeda(total) : null}</Definicao>
          <Definicao rotulo="Aprovação">{p.aprovadoPor ? `${p.aprovadoPor} · ${fmtInstante(p.aprovadoEm)}` : null}</Definicao>
          <Definicao rotulo="Envio">{p.enviadoPor ? `${p.enviadoPor} · ${fmtInstante(p.enviadoEm)} · protocolo ${p.protocolo}` : null}</Definicao>
          <Definicao rotulo="Pacote">{p.pacoteVersao ? `versão de ${fmtInstante(p.pacoteVersao)}` : null}</Definicao>
          <Definicao rotulo="Exceção de piso">{p.excecaoPisoPor ? `${p.excecaoPisoPor} · ${fmtInstante(p.excecaoPisoEm)} · ${p.excecaoPisoJustificativa}` : null}</Definicao>
        </Definicoes>
        <Pilha>
          <Selos>
            {emRevisao ? <Button variant="primary" onClick={() => acao('proposta/aprovar', 'Proposta aprovada e congelada.')} disabled={ocupado || p.pendencias.length > 0}>Aprovar</Button> : null}
            {emRevisao && admin && !p.excecaoPisoPor ? <Button onClick={() => setDialogo('excecao')} disabled={ocupado}>Exceção de piso</Button> : null}
            {aprovada ? <Button variant="primary" onClick={pacote} disabled={ocupado}>Gerar pacote</Button> : null}
            {aprovada ? <Button variant="primary" onClick={() => setDialogo('enviada')} disabled={ocupado}>Marcar como enviada</Button> : null}
            {aprovada ? <Button onClick={() => acao('proposta/reabrir', 'Proposta reaberta para revisão.')} disabled={ocupado}>Reabrir</Button> : null}
            {EM_DISPUTA.includes(p.status) ? <Button variant={p.status === 'ENVIADA' ? 'primary' : 'secondary'} onClick={() => setDialogo('resultado')} disabled={ocupado}>Registrar resultado</Button> : null}
            {p.status === 'GANHA' ? <Button onClick={() => navigate(`/licitacoes/atas?oportunidade=${p.oportunidadeId}`)}>Registrar ata</Button> : null}
          </Selos>
        </Pilha>
      </CabecalhoFixo>

      {p.pendencias.length ? (
        <Alert tone="warn" className="mb-4">
          <span className="font-semibold">Falta para aprovar ({p.pendencias.length}):</span>
          <ul className="mt-1 list-disc pl-5">{p.pendencias.map((x) => <li key={x}>{x}</li>)}</ul>
        </Alert>
      ) : null}

      <Panel>
        <PanelHeader title="Linhas" hint="Uma por item do edital. O teto é o PMVG da tabela do governo na alíquota da UF; o mínimo é custo × (1 + impostos + frete + margem), nunca abaixo do piso." />
        <Table>
          <thead>
            <tr><Th>Item</Th><Th>Produto</Th><Th numeric>Qtd</Th><Th numeric>Preço</Th><Th numeric>Teto</Th><Th numeric>Mínimo</Th><Th>Situação</Th>{emRevisao ? <Th /> : null}</tr>
          </thead>
          <tbody>
            {p.linhas.map((l) => {
              const faltas = porItem[l.item] ?? [];
              const av = l.declinado ? 'OK' : avaliarPreco(l.preco, l.valorMinimo, l.tetoGoverno);
              return (
                <Tr key={l.itemId}>
                  <Td><RowTitle>{l.item}</RowTitle><RowMeta>{l.descricao}</RowMeta></Td>
                  <Td>
                    {l.declinado ? <Status tone="off">declinado{l.motivoDeclinio ? ` · ${l.motivoDeclinio}` : ''}</Status>
                      : l.codProd ? <><RowTitle><Code>{l.codProd}</Code> {l.marca ?? ''}</RowTitle><RowMeta>{[l.fabricante, l.embalagem, l.registroAnvisa ? `Anvisa ${l.registroAnvisa}` : null].filter(Boolean).join(' · ')}</RowMeta></>
                      : l.candidatos.length ? <><RowTitle>{l.candidatos.length} candidatos</RowTitle><RowMeta>melhor <Code>{l.candidatos[0].codProd}</Code> {l.candidatos[0].nome} · {percentual(l.candidatos[0].coverage)}</RowMeta></>
                      : <Dash />}
                    {faltas.length ? <RowMeta><span className="text-attention">{faltas.join(' · ')}</span></RowMeta> : null}
                  </Td>
                  <Td numeric>{quantidade(l.quantidade, l.unidade)}</Td>
                  <Td numeric>
                    {l.preco != null ? moeda(l.preco) : <Dash />}
                    {l.justificativa ? <RowMeta>{l.justificativa}</RowMeta> : null}
                    {av !== 'OK' && av !== 'SEM_PRECO' ? <RowMeta><span className="text-destructive">{ROTULO_AVALIACAO[av]}</span></RowMeta> : null}
                  </Td>
                  <Td numeric>
                    {l.tetoGoverno != null ? moeda(l.tetoGoverno) : <Dash />}
                    {l.tetoGoverno != null ? <RowMeta>ICMS {numero(l.tetoAliquota, 1)} % · {fmtData(l.tetoData)}</RowMeta> : null}
                    {l.justificativaTeto ? <RowMeta>{l.justificativaTeto}</RowMeta> : null}
                  </Td>
                  <Td numeric>
                    {l.valorMinimo != null ? moeda(l.valorMinimo) : <Dash />}
                    {l.memoriaMinimo ? <RowMeta>{l.memoriaMinimo}</RowMeta> : null}
                  </Td>
                  <Td>
                    <Pilha>
                      {l.resultado ? <Status tone={TOM_RESULTADO[l.resultado]}>{ROTULO_RESULTADO[l.resultado]}{l.precoVencedor != null ? ` · ${moeda(l.precoVencedor)}` : ''}{l.resultadoOrigem ? ` (${ROTULO_ORIGEM[l.resultadoOrigem]})` : ''}</Status>
                        : <Status tone={tomDaLinha(l.marcas, l.declinado)}>{l.declinado ? 'declinado' : l.situacao.toLowerCase().replace(/_/g, ' ')}</Status>}
                      <Selos>{l.marcas.filter((m) => m !== 'TETO_APLICADO' || l.tetoGoverno != null).map((m) => <Badge key={m} tone={m === 'INVIAVEL' ? 'alert' : 'attention'}>{ROTULO_MARCA[m] ?? m}</Badge>)}</Selos>
                    </Pilha>
                  </Td>
                  {emRevisao ? <Td><Button size="sm" onClick={() => setEditando(l)} disabled={ocupado}>Editar</Button></Td> : null}
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>

      {editando ? <DialogoLinha linha={editando} erro={erroDialogo} onFechar={() => { setEditando(null); setAviso(null); }} onSalvar={salvarLinha} ocupado={ocupado} /> : null}
      {dialogo === 'excecao' ? <DialogoTexto erro={erroDialogo} titulo="Exceção de piso" descricao="Vale para a proposta inteira: o mínimo pode ficar abaixo do piso cadastrado (RN-006). Fica no histórico com o seu nome." rotulo="Justificativa" onFechar={() => setDialogo(null)} onConfirmar={(t) => acao('proposta/excecao-piso', 'Exceção registrada.', { justificativa: t })} ocupado={ocupado} /> : null}
      {dialogo === 'enviada' ? <DialogoTexto erro={erroDialogo} titulo="Marcar como enviada" descricao="O cadastro no portal é feito pela pessoa (RN-008). Informe o protocolo que o portal devolveu." rotulo="Protocolo" linhas={1} onFechar={() => setDialogo(null)} onConfirmar={(t) => acao('proposta/enviada', 'Proposta marcada como enviada; sessão no calendário.', { protocolo: t })} ocupado={ocupado} /> : null}
      {dialogo === 'resultado' ? <DialogoResultado erro={erroDialogo} linhas={p.linhas} onFechar={() => setDialogo(null)} onConfirmar={(r) => acao('resultado', 'Resultado registrado.', r)} ocupado={ocupado} /> : null}
    </>
  );
}

function DialogoLinha({ linha, erro, onFechar, onSalvar, ocupado }: { linha: LinhaProposta; erro?: string | null; onFechar: () => void; onSalvar: (e: EdicaoLinha) => void; ocupado: boolean }) {
  const [codProd, setCodProd] = useState(linha.codProd ? String(linha.codProd) : '');
  const [preco, setPreco] = useState(linha.precoFinal != null ? String(linha.precoFinal) : '');
  const [justificativa, setJustificativa] = useState(linha.justificativa ?? '');
  const [minimo, setMinimo] = useState(linha.valorMinimo != null && linha.custo == null ? String(linha.valorMinimo) : '');
  const [justificativaTeto, setJustificativaTeto] = useState(linha.justificativaTeto ?? '');
  const [declinar, setDeclinar] = useState(linha.declinado);
  const [motivo, setMotivo] = useState(linha.motivoDeclinio ?? '');
  const n = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : null);
  const av = declinar ? 'OK' : avaliarPreco(preco || linha.preco, minimo ? n(minimo) : linha.valorMinimo, linha.tetoGoverno);
  const trocaProduto = n(codProd) !== linha.codProd;

  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Item {linha.item}</DialogTitle>
          <DialogDescription>{linha.descricao}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <CheckRow marcado={declinar} onToggle={() => setDeclinar((v) => !v)} hint="Sai da proposta com motivo; o item fica na planilha como declinado.">Declinar este item</CheckRow>
            {declinar ? <LabelledField label="Motivo" obrigatorio><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} /></LabelledField> : (
              <>
                <LabelledField label="Código do produto" hint={trocaProduto && codProd ? 'Trocar o produto refaz preço sugerido, teto e mínimo (RF-002).' : 'Vazio mantém o casamento atual.'}>
                  <Input value={codProd} onChange={(e) => setCodProd(e.target.value)} inputMode="numeric" />
                </LabelledField>
                {linha.candidatos.length ? (
                  <Table>
                    <thead><tr><Th>Candidato do casamento</Th><Th numeric>Cobertura</Th><Th /></tr></thead>
                    <tbody>
                      {linha.candidatos.map((c) => (
                        <Tr key={c.codProd}>
                          <Td><RowTitle><Code>{c.codProd}</Code> {c.nome}</RowTitle><RowMeta>{[c.marca, c.embalagem, c.status === 'ACTIVE' ? null : c.status].filter(Boolean).join(' · ')}</RowMeta></Td>
                          <Td numeric>{percentual(c.coverage)}</Td>
                          <Td numeric>{String(c.codProd) === codProd.trim() ? <RowMeta>escolhido</RowMeta> : <TextLink onClick={() => setCodProd(String(c.codProd))}>Usar</TextLink>}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                ) : null}
                <LabelledField label="Preço final" hint={<>sugerido {linha.precoSugerido != null ? moeda(linha.precoSugerido) : '—'}{linha.tetoGoverno != null ? ` · teto ${moeda(linha.tetoGoverno)}` : ''}{linha.valorMinimo != null ? ` · mínimo ${moeda(linha.valorMinimo)}` : ''}{av !== 'OK' && av !== 'SEM_PRECO' ? <span className="text-destructive"> · {ROTULO_AVALIACAO[av]}</span> : null}</>}>
                  <Input value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" />
                </LabelledField>
                <LabelledField label="Justificativa do preço" hint="Obrigatória quando o preço final difere do sugerido, ou quando não há sugerido (RN-008).">
                  <Input value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
                </LabelledField>
                {linha.custo == null ? (
                  <LabelledField label="Valor mínimo informado" hint={`Sem custo cadastrado: ${linha.memoriaMinimo ?? 'informe o mínimo que a área comercial aceita'}.`}>
                    <Input value={minimo} onChange={(e) => setMinimo(e.target.value)} inputMode="decimal" />
                  </LabelledField>
                ) : null}
                {linha.marcas.includes('TETO_A_CONFERIR') ? (
                  <LabelledField label="Teto conferido" obrigatorio hint="Medicamento sem teto na tabela: diga o que conferiu (RN-003).">
                    <Textarea value={justificativaTeto} onChange={(e) => setJustificativaTeto(e.target.value)} rows={2} />
                  </LabelledField>
                ) : null}
              </>
            )}
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" disabled={ocupado || (declinar && !motivo.trim())}
            onClick={() => onSalvar(declinar ? { itemId: linha.itemId, declinar: true, motivo: motivo.trim() }
              : { itemId: linha.itemId, codProd: trocaProduto ? n(codProd) : undefined, precoFinal: n(preco), justificativa: justificativa.trim() || null,
                  valorMinimo: linha.custo == null ? n(minimo) : undefined, justificativaTeto: justificativaTeto.trim() || null })}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoTexto({ titulo, descricao, rotulo, erro, linhas = 3, onFechar, onConfirmar, ocupado }: { titulo: string; descricao: string; rotulo: string; erro?: string | null; linhas?: number; onFechar: () => void; onConfirmar: (t: string) => void; ocupado: boolean }) {
  const [texto, setTexto] = useState('');
  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{titulo}</DialogTitle><DialogDescription>{descricao}</DialogDescription></DialogHeader>
        <DialogBody>
          {erro ? <Alert tone="error" className="mb-3">{erro}</Alert> : null}
          <LabelledField label={rotulo} obrigatorio>
            {linhas === 1 ? <Input value={texto} onChange={(e) => setTexto(e.target.value)} /> : <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={linhas} />}
          </LabelledField>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={() => onConfirmar(texto.trim())} disabled={ocupado || !texto.trim()}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const OPCOES_RESULTADO = [{ value: '', label: '— sem registro —' }, ...Object.entries(ROTULO_RESULTADO).map(([value, label]) => ({ value, label }))];

function DialogoResultado({ linhas, erro, onFechar, onConfirmar, ocupado }: { linhas: LinhaProposta[]; erro?: string | null; onFechar: () => void; onConfirmar: (r: { itemId: number; resultado: Resultado; precoVencedor: number | null }[]) => void; ocupado: boolean }) {
  const ofertadas = linhas.filter((l) => !l.declinado);
  const [res, setRes] = useState<Record<number, { resultado: string; preco: string }>>(Object.fromEntries(ofertadas.map((l) => [l.itemId, { resultado: l.resultado ?? '', preco: l.precoVencedor != null ? String(l.precoVencedor) : '' }])));
  const lista = ofertadas.filter((l) => res[l.itemId]?.resultado).map((l) => ({ itemId: l.itemId, resultado: res[l.itemId].resultado as Resultado, precoVencedor: res[l.itemId].preco.trim() ? Number(res[l.itemId].preco.replace(',', '.')) : null }));
  return (
    <Dialog open onOpenChange={(a) => !a && onFechar()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Resultado por item</DialogTitle><DialogDescription>O registro manual prevalece sobre o que o portal publicar (RN-009). Algum item vencido ⇒ licitação ganha.</DialogDescription></DialogHeader>
        <DialogBody>
          {erro ? <Alert tone="error" className="mb-3">{erro}</Alert> : null}
          <Table>
            <thead><tr><Th>Item</Th><Th numeric>Ofertado</Th><Th>Resultado</Th><Th numeric>Preço vencedor</Th></tr></thead>
            <tbody>
              {ofertadas.map((l) => (
                <Tr key={l.itemId}>
                  <Td><RowTitle>{l.item}</RowTitle><RowMeta>{l.descricao}</RowMeta></Td>
                  <Td numeric>{l.preco != null ? moeda(l.preco) : <Dash />}</Td>
                  <Td><SelectMenu value={res[l.itemId]?.resultado ?? ''} onChange={(v) => setRes((r) => ({ ...r, [l.itemId]: { ...r[l.itemId], resultado: v } }))} options={OPCOES_RESULTADO} label={`Resultado do item ${l.item}`} /></Td>
                  <Td numeric><Input value={res[l.itemId]?.preco ?? ''} onChange={(e) => setRes((r) => ({ ...r, [l.itemId]: { ...r[l.itemId], preco: e.target.value } }))} inputMode="decimal" aria-label={`Preço vencedor do item ${l.item}`} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={() => onConfirmar(lista)} disabled={ocupado || lista.length === 0}>Registrar {lista.length ? `(${lista.length})` : ''}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
