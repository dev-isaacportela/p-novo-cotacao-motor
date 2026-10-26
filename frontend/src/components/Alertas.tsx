// Sino de alertas (RF-009, T-057): não lidos do motor, com "marcar como lido" e atalho para a cotação.
import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motor } from '@/lib/motor';
import { fmtInstante } from '@/lib/formato';
import type { Alerta } from '@/lib/tipos';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button, EmptyState, TextLink } from '@/components/page';

const ROTULO: Record<string, string> = {
  PRAZO: 'Prazo de resposta se aproxima',
  CANCELADA: 'Comprador cancelou a cotação',
  NOVA_VERSAO: 'Comprador alterou a cotação',
  ANVISA_AUSENTE: 'Proposta com item sem registro Anvisa',
};

export function Alertas() {
  const navigate = useNavigate();
  const [lista, setLista] = useState<Alerta[]>([]);
  const [aberto, setAberto] = useState(false);

  const carregar = useCallback(() => {
    motor<Alerta[]>('GET', 'alertas').then(setLista).catch(() => setLista([]));
  }, []);

  useEffect(() => {
    carregar();
    const relogio = setInterval(carregar, 60_000);
    return () => clearInterval(relogio);
  }, [carregar]);

  async function lido(a: Alerta) {
    await motor('POST', `alertas/${a.id}/lido`).catch(() => undefined);
    setLista((l) => l.filter((x) => x.id !== a.id));
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={lista.length ? `${lista.length} alertas não lidos` : 'Alertas'}
          title="Alertas"
          className="relative inline-flex size-8 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-nav-hover hover:text-ink"
        >
          <Bell className="size-4" aria-hidden />
          {lista.length ? (
            <span className="absolute -top-0.5 -right-0.5 rounded-full bg-attention px-1 text-[10px] leading-4 font-bold text-primary-foreground">{lista.length}</span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-rule-row px-4 py-2.5 font-title text-[13px] font-bold text-ink">Alertas</div>
        {lista.length === 0 ? (
          <EmptyState title="Nada pendente" hint="Prazos, cancelamentos e alterações do comprador aparecem aqui." />
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {lista.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 border-b border-rule-row px-4 py-3 text-[13px] last:border-b-0">
                <span className="font-semibold text-ink">{ROTULO[a.tipo] ?? a.tipo}</span>
                <span className="text-[12px] text-ink-secondary">{fmtInstante(a.criadoEm)}</span>
                <span className="flex items-center gap-3">
                  {a.oportunidadeId ? (
                    <TextLink onClick={() => { setAberto(false); navigate(`/oportunidades/${a.oportunidadeId}`); }}>Abrir cotação</TextLink>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => lido(a)}>Marcar como lido</Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
