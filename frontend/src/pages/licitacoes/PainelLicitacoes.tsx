// Seção Licitações do painel (spec 006 RF-014, T-265): funil por camada em gráfico, fontes, motivos de regra e perdidas por não captação.
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { motor, ErroMotor } from '@/lib/motor';
import { ROTULO_CAMADA, ROTULO_STATUS_LICITACAO } from '@/lib/licitacao';
import type { MetricasLicitacoes } from '@/lib/tiposLicitacao';
import {
  Alert, ChartContainer, ChartTooltip, ChartTooltipContent, corDeSerie, Dash, GradeGraficos, GradeKpi, Kpi, PainelGrafico, Panel, PanelHeader, Pilha, Table, Td, Th, Tr,
  type ChartConfig,
} from '@/components/page';

const CONFIG: ChartConfig = { total: { label: 'Licitações', color: corDeSerie(0) } };

export function PainelLicitacoes({ de, ate }: { de: string; ate: string }) {
  const [m, setM] = useState<MetricasLicitacoes | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    motor<MetricasLicitacoes>('GET', 'painel/licitacoes', { consulta: { de: de ? `${de}T00:00:00Z` : '', ate: ate ? `${ate}T23:59:59Z` : '' } })
      .then((x) => { setM(x); setErro(''); })
      .catch((e: unknown) => setErro(e instanceof ErroMotor ? e.message : 'Não foi possível carregar as métricas de licitações.'));
  }, [de, ate]);

  const soma = (r: Record<string, number> | undefined, chaves: string[]) => chaves.reduce((s, k) => s + (r?.[k] ?? 0), 0);
  const analisadas = soma(m?.porStatus, ['EM_ANALISE', 'PRONTA_PARA_PROPOSTA']);
  const funil = m ? [
    { camada: 'Captadas', total: m.captadas },
    { camada: 'Passaram as regras', total: m.captadas - (m.porCamada.REGRAS ?? 0) },
    { camada: 'Passaram a pré-leitura', total: m.captadas - (m.porCamada.REGRAS ?? 0) - (m.porCamada.PRE_LEITURA ?? 0) },
    { camada: 'Decididas: participar', total: analisadas },
    { camada: 'Prontas para proposta', total: m.porStatus.PRONTA_PARA_PROPOSTA ?? 0 },
  ] : [];

  return (
    <Pilha>
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      <GradeKpi>
        <Kpi rotulo="Captadas" valor={m ? m.captadas : <Dash />} hint={m ? `${Object.keys(m.porFonte).length} fontes` : undefined} />
        <Kpi rotulo="Descartadas por regra" valor={m ? m.porCamada.REGRAS ?? 0 : <Dash />} hint={m ? `${m.porCamada.PRE_LEITURA ?? 0} na pré-leitura · ${m.porCamada.DECISAO ?? 0} na decisão` : undefined} />
        <Kpi rotulo="Em análise" valor={m ? analisadas : <Dash />} hint={m?.horasAteDecisao != null ? `${m.horasAteDecisao} h até a decisão` : undefined} />
        <Kpi rotulo="Perdidas por não captação" valor={m ? m.perdidasPorNaoCaptacao : <Dash />} hint={m ? Object.entries(m.perdidasPorFonte).map(([f, n]) => `${f}: ${n}`).join(' · ') || undefined : undefined} />
      </GradeKpi>
      <GradeGraficos>
        <PainelGrafico titulo="Funil por camada" hint="Quantas seguem a cada camada no período." largura="total">
          <ChartContainer config={CONFIG} className="h-full w-full">
            <BarChart data={funil} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="camada" width={170} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            </BarChart>
          </ChartContainer>
        </PainelGrafico>
      </GradeGraficos>
      <div className="grid gap-4 lg:grid-cols-3">
        <Tabela titulo="Por fonte" linhas={m?.porFonte} />
        <Tabela titulo="Motivos de descarte por regra" linhas={m?.motivosDeRegra} />
        <Tabela titulo="Situação atual" linhas={m ? Object.fromEntries(Object.entries(m.porStatus).map(([k, v]) => [ROTULO_STATUS_LICITACAO[k] ?? ROTULO_CAMADA[k] ?? k, v])) : undefined} />
      </div>
    </Pilha>
  );
}

function Tabela({ titulo, linhas }: { titulo: string; linhas: Record<string, number> | undefined }) {
  const entradas = Object.entries(linhas ?? {});
  return (
    <Panel>
      <PanelHeader title={titulo} />
      {entradas.length === 0 ? <p className="px-4 py-3 text-[13px] text-ink-secondary">Nada no período.</p> : (
        <Table>
          <thead><tr><Th>{titulo}</Th><Th numeric>Licitações</Th></tr></thead>
          <tbody>{entradas.map(([k, v]) => <Tr key={k}><Td>{k}</Td><Td numeric>{v}</Td></Tr>)}</tbody>
        </Table>
      )}
    </Panel>
  );
}
