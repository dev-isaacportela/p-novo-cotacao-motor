// Captação avulsa (D-010 do motor): a licitação só entra quando alguém pede, pelo "Id contratação PNCP" da página do edital.
import { useState } from 'react';
import { motor, ErroMotor } from '@/lib/motor';
import {
  Alert, Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, LabelledField, Pilha,
} from '@/components/page';

export interface Captada { resultado: string; itens: number; id?: number }

export function DialogoCaptar({ aberto, onFechar, onCaptada }: { aberto: boolean; onFechar: () => void; onCaptada: (c: Captada) => void }) {
  const [idExterno, setIdExterno] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function captar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setErro('');
    try {
      onCaptada(await motor<Captada>('POST', 'admin/licitacoes/captar', { corpo: { portal: 'pncp', idExterno: idExterno.trim() } }));
      setIdExterno('');
    } catch (e) {
      setErro(e instanceof ErroMotor ? e.message : 'Falha ao captar a licitação.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && onFechar()}>
      <DialogContent>
        <form onSubmit={captar}>
          <DialogHeader>
            <DialogTitle>Captar licitação do PNCP</DialogTitle>
            <DialogDescription>Traz uma licitação só, com os itens, e passa pelo funil e pela pré-leitura da IA.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Pilha>
              {erro ? <Alert tone="error">{erro}</Alert> : null}
              <LabelledField label="Id contratação PNCP" obrigatorio hint="Está na página do edital no PNCP, como 17217985000104-1-000077/2026.">
                <Input value={idExterno} onChange={(e) => setIdExterno(e.target.value)} autoFocus />
              </LabelledField>
            </Pilha>
          </DialogBody>
          <DialogFooter>
            <Button type="button" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={ocupado || !idExterno.trim()}>Captar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
