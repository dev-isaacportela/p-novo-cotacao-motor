// Histórico da cotação (RF-012, T-055): linha do tempo de eventos e o snapshot do que foi enviado.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motor, ErroMotor } from '@/lib/motor';
import { fmtInstante } from '@/lib/formato';
import type { Detalhe, Evento } from '@/lib/tipos';
import { Alert, Button, Code, LinhaDoTempo, Momento, PageHeader, Panel, PanelHeader, Pilha, Rebaixado } from '@/components/page';

const ORIGEM: Record<Evento['origem'], string> = { PORTAL: 'portal', USUARIO: 'revisor', MOTOR: 'motor' };

function descrever(e: Evento): string {
  const campos = Object.entries(e.depois ?? {})
    .filter(([k]) => !['status'].includes(k))
    .map(([k, v]) => `${k}: ${e.antes && k in e.antes ? `${String(e.antes[k])} → ` : ''}${Array.isArray(v) ? v.join(', ') : String(v)}`);
  return campos.join(' · ');
}

export default function HistoricoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([motor<Evento[]>('GET', `oportunidades/${id}/eventos`), motor<Detalhe>('GET', `oportunidades/${id}`)])
      .then(([ev, d]) => { setEventos(ev); setDetalhe(d); })
      .catch((e: unknown) => setErro(e instanceof ErroMotor ? e.message : 'Não foi possível carregar o histórico.'));
  }, [id]);

  return (
    <>
      <PageHeader module="Cotações" title={detalhe ? `Histórico · ${detalhe.cabecalho.idExterno}` : 'Histórico'} description="Toda mudança de estado e toda edição, em ordem (RN-018)."
        actions={<Button onClick={() => navigate(`/oportunidades/${id}`)}>Voltar à revisão</Button>} />
      {erro ? <Alert tone="error">{erro}</Alert> : null}
      <Pilha>
        <Panel className="p-4">
          {eventos ? (
            <LinhaDoTempo>
              {eventos.map((e) => (
                <Momento key={e.id} quando={<>{fmtInstante(e.em)} · {ORIGEM[e.origem]} {e.autor} {e.regra ? <Code>{e.regra}</Code> : null}</>}
                  titulo={<>{e.acao === 'STATUS' ? `${String(e.antes?.status ?? 'início')} → ${String(e.depois?.status ?? '')}` : e.acao}{e.entidade !== 'oportunidade' ? ` (${e.entidade} ${e.entidadeId})` : ''}</>}>
                  {descrever(e)}
                </Momento>
              ))}
            </LinhaDoTempo>
          ) : null}
        </Panel>
        {detalhe?.proposta?.enviadoEm ? (
          <Panel>
            <PanelHeader title="Enviado ao portal" hint={`Protocolo ${detalhe.proposta.protocoloPortal} · ${fmtInstante(detalhe.proposta.enviadoEm)} · aprovado por ${detalhe.proposta.aprovadoPor}`} />
            <div className="p-4">
              <Rebaixado>
                {detalhe.itens.filter((i) => i.proposta && !i.proposta.declinado).map((i) => (
                  <p key={i.id}><Code>{i.idExternoItem}</Code> produto {i.proposta?.codProd} · preço {i.proposta?.precoFinal ?? i.proposta?.precoSugerido}</p>
                ))}
              </Rebaixado>
            </div>
          </Panel>
        ) : null}
      </Pilha>
    </>
  );
}
