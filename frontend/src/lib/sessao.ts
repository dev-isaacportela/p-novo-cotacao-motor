// Sessão do sistema: usuário resolvido por cotUsuarioSessao.
// Vive fora do AdminLayout para o fast refresh funcionar (só componente lá).
import { createContext, useContext } from 'react';

export const SessaoContext = createContext<{
  ID: number;
  NOME: string;
  EMAIL: string;
  PERFIL: string;
} | null>(null);

export function useSessao() {
  const sessao = useContext(SessaoContext);
  if (!sessao) throw new Error('useSessao fora do AdminLayout.');
  return sessao;
}
