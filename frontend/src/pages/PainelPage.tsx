// Painel por portal (RF-014, T-055): contadores por etapa do funil, custo de IA e mediana captação→envio.
import { useCallback, useEffect, useState } from 'react';
import { motor, ErroMotor } from '@/lib/motor';
import { duracao } from '@/lib/prazo';
import { numero } from '@/lib/formato';
import type { PortalResumo } from '@/lib/tipos';
import { Alert, Button, Dash, EmptyState, GradeKpi, Kpi, LabelledField, Input, PageHeader, Panel, PanelHeader, Pilha, Table, Td, Th, Tr } from '@/components/page';

export default function PainelPage() {
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [lista, setLista] = useState<PortalResumo[] | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    motor<PortalResumo[]>('GET', 'painel', { consulta: { de: de ? `${de}T00:00:00Z` : '', ate: ate ? `${ate}T23:59:59Z` : '' } })
      .then((l) => { setLista(l); setErro(''); })
      .catch((e: unknown) => setErro(e instanceof ErroMotor ? e.message : 'Não foi possível carregar o painel.'));
  }, [de, ate]);

  useEffect(carregar, [carregar]);

  const total = (campo: keyof PortalResumo) => (lista ?? []).reduce((s, p) => s + Number(p[campo] ?? 0), 0);

  return (
    <>
      <PageHeader module="Cotações" title="Painel" description="Por portal, no período de captação."
        actions={
          <>
            <LabelledField label="De"><Input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></LabelledField>
            <LabelledField label="Até"><Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></LabelledField>
            <Button onClick={carregar}>Atualizar</Button>
          </>
        } />
      {erro ? <Alert tone="error" className="mb-4">{erro}</Alert> : null}
      <Pilha>
        <GradeKpi>
          <Kpi rotulo="Captadas" valor={lista ? total('captadas') : <Dash />} />
          <Kpi rotulo="Enviadas" valor={lista ? total('enviadas') : <Dash />} hint={lista ? `${total('ganhas')} ganhas · ${total('perdidas')} perdidas` : undefined} />
          <Kpi rotulo="Em revisão" valor={lista ? total('emRevisao') : <Dash />} hint={lista ? `${total('naoParticipar')} não participar · ${total('erros')} erros` : undefined} />
          <Kpi rotulo="Custo de IA" valor={lista ? `US$ ${numero(total('custoIa'), 2)}` : <Dash />} hint={lista ? `${total('processadasPorIa')} cotações processadas` : undefined} />
        </GradeKpi>
        <Panel>
          <PanelHeader title="Por portal" hint="Não participar aberto por etapa do funil; mediana entre captação e envio." />
          {lista && lista.length === 0 ? <EmptyState title="Nada captado no período" /> : (
            <Table>
              <thead>
                <tr>
                  <Th>Portal</Th><Th numeric>Captadas</Th><Th numeric>Filtradas</Th><Th numeric>Sem casamento</Th><Th numeric>Participar</Th>
                  <Th numeric>Em revisão</Th><Th numeric>Enviadas</Th><Th numeric>Ganhas</Th><Th numeric>Perdidas</Th><Th numeric>Expiradas</Th><Th numeric>Erros</Th><Th numeric>IA (US$)</Th><Th numeric>Mediana</Th>
                </tr>
              </thead>
              <tbody>
                {(lista ?? []).map((p) => (
                  <Tr key={p.portal}>
                    <Td>{p.portal}</Td>
                    <Td numeric>{p.captadas}</Td>
                    <Td numeric>{p.naoParticiparPorEtapa.FILTRADA}</Td>
                    <Td numeric>{p.naoParticiparPorEtapa.CASADA}</Td>
                    <Td numeric>{p.participar}</Td>
                    <Td numeric>{p.emRevisao}</Td>
                    <Td numeric>{p.enviadas}</Td>
                    <Td numeric>{p.ganhas}</Td>
                    <Td numeric>{p.perdidas}</Td>
                    <Td numeric>{p.expiradas}</Td>
                    <Td numeric>{p.erros}</Td>
                    <Td numeric>{numero(p.custoIa, 4)}</Td>
                    <Td numeric>{p.medianaCaptacaoEnvioSegundos != null ? duracao(p.medianaCaptacaoEnvioSegundos * 1000) : <Dash />}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </Pilha>
    </>
  );
}
