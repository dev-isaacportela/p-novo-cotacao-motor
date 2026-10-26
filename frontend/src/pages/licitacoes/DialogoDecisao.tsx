// Decisão humana (RF-008, RN-001): participar dispara a leitura completa; não participar exige motivo. Usado na triagem e na análise.
import { useState } from 'react';
import { motor, ErroMotor } from '@/lib/motor';
import type { LicitacaoResumo } from '@/lib/tiposLicitacao';
import {
  Alert, Button, CheckRow, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, LabelledField, Pilha, Textarea,
} from '@/components/page';

export function DialogoDecisao({ licitacao, onFechar, onDecidido }: { licitacao: LicitacaoResumo | null; onFechar: () => void; onDecidido: (status: string) => void }) {
  const [participar, setParticipar] = useState<boolean | null>(null);
  const [motivo, setMotivo] = useState('');
  const [estrategico, setEstrategico] = useState(false);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function confirmar() {
    if (!licitacao || participar === null) return;
    setOcupado(true);
    try {
      const r = await motor<{ status: string }>('POST', `licitacoes/${licitacao.id}/decisao`, { corpo: { participar, motivo: motivo.trim() || null, estrategico } });
      onDecidido(r.status);
    } catch (e) {
      setErro(e instanceof ErroMotor ? `${e.regra ? e.regra + ': ' : ''}${e.message}` : 'Falha ao registrar a decisão.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Dialog open={licitacao !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decidir sobre {licitacao?.numero ?? 'a licitação'}</DialogTitle>
          <DialogDescription>{licitacao?.orgao} · {licitacao?.objeto}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Pilha>
            {erro ? <Alert tone="error">{erro}</Alert> : null}
            <CheckRow marcado={participar === true} onToggle={() => setParticipar(true)} hint="Dispara a leitura completa do edital pela IA.">Participar</CheckRow>
            <CheckRow marcado={participar === false} onToggle={() => setParticipar(false)} hint="Sai pela camada de decisão; dá para resgatar depois.">Não participar</CheckRow>
            <LabelledField label="Motivo" obrigatorio={participar === false} hint={participar === false ? 'Obrigatório ao não participar (RF-008).' : 'Opcional.'}>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} />
            </LabelledField>
            <CheckRow marcado={estrategico} onToggle={() => setEstrategico((v) => !v)} hint="Ignora o piso de valor nas próximas regras.">Estratégica</CheckRow>
          </Pilha>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onFechar}>Cancelar</Button>
          <Button variant="primary" onClick={confirmar} disabled={ocupado || participar === null || (participar === false && !motivo.trim())}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
