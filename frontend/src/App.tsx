import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { clearSession, initMitra } from '@/lib/mitra-auth';
import { linhas } from '@/lib/mitra-api';
import AdminLayout from '@/components/AdminLayout';
import { Alert, Button, Card } from '@/components/page';
import LoginPage from '@/pages/LoginPage';
import FilaPage from '@/pages/FilaPage';
import RevisaoPage from '@/pages/RevisaoPage';
import HistoricoPage from '@/pages/HistoricoPage';
import PainelPage from '@/pages/PainelPage';
import LacunasPage from '@/pages/LacunasPage';
import ConfiguracoesPage from '@/pages/ConfiguracoesPage';
import TriagemPage from '@/pages/licitacoes/TriagemPage';
import AnalisePage from '@/pages/licitacoes/AnalisePage';
import FunilPage from '@/pages/licitacoes/FunilPage';
import CofrePage from '@/pages/licitacoes/CofrePage';
import PropostaPage from '@/pages/licitacoes/PropostaPage';
import AtasPage from '@/pages/licitacoes/AtasPage';

/**
 * Guarda de sessão (spec 002): autenticar na Mitra não basta — o e-mail precisa
 * ter COT_USUARIO ativo. Zero linhas em cotUsuarioSessao é recusa, com a saída à mão.
 */
function Autenticado() {
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'recusado' | 'erro'>('carregando');
  const [usuario, setUsuario] = useState<{ ID: number; NOME: string; EMAIL: string; PERFIL: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    linhas('usuarioSessao')
      .then((rows) => {
        if (!vivo) return;
        const u = rows[0];
        if (u?.ID) {
          setUsuario({ ID: Number(u.ID), NOME: String(u.NOME ?? ''), EMAIL: String(u.EMAIL ?? ''), PERFIL: String(u.PERFIL ?? '') });
          setEstado('ok');
        } else {
          setEstado('recusado');
        }
      })
      .catch(() => vivo && setEstado('erro'));
    return () => {
      vivo = false;
    };
  }, []);

  function sair() {
    clearSession();
    window.location.replace('.');
  }

  if (estado === 'carregando') {
    return <p className="p-8 text-center text-[13px] text-ink-secondary">Verificando acesso...</p>;
  }

  if (estado !== 'ok' || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ground p-4">
        <Card className="w-full max-w-md p-8">
          <h1 className="font-title mb-3 text-xl font-bold text-ink">Acesso não liberado</h1>
          <Alert tone={estado === 'erro' ? 'error' : 'warn'}>
            {estado === 'erro'
              ? 'Não foi possível verificar seu acesso. Tente novamente em instantes.'
              : 'Sua conta autenticou, mas não há usuário ativo cadastrado no motor de cotações para este e-mail. Procure a TI.'}
          </Alert>
          <div className="mt-4 flex justify-end">
            <Button onClick={sair}>Sair e entrar com outra conta</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AdminLayout usuario={usuario} />}>
        <Route index element={<Navigate to="/fila" replace />} />
        <Route path="fila" element={<FilaPage />} />
        <Route path="oportunidades/:id" element={<RevisaoPage />} />
        <Route path="oportunidades/:id/historico" element={<HistoricoPage />} />
        <Route path="painel" element={<PainelPage />} />
        <Route path="relatorios/lacunas" element={<LacunasPage />} />
        {usuario.PERFIL === 'admin' ? <Route path="configuracoes" element={<ConfiguracoesPage />} /> : null}
        <Route path="licitacoes" element={<TriagemPage />} />
        {usuario.PERFIL === 'admin' ? <Route path="licitacoes/funil" element={<FunilPage />} /> : null}
        {usuario.PERFIL === 'admin' ? <Route path="licitacoes/cofre" element={<CofrePage />} /> : null}
        <Route path="licitacoes/atas" element={<AtasPage />} />
        <Route path="licitacoes/:id" element={<AnalisePage />} />
        <Route path="licitacoes/:id/proposta" element={<PropostaPage />} />
        <Route path="*" element={<Navigate to="/fila" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  const [configured, setConfigured] = useState(initMitra);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={() => setConfigured(initMitra())} />} />
      <Route path="/*" element={configured ? <Autenticado /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
