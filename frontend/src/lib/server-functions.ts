// Mapa das server functions do projeto.
//
// SERVER_FUNCTION_NAMES e escrito a mao e e o contrato com `backend/add-*.mjs`:
// mudou o nome la, muda aqui.
//
// SERVER_FUNCTIONS sao os ids da plataforma. Antes de publicar, os valores
// sao os do simulador local; depois, `cd backend && npm run sync:function-map`
// reescreve este bloco com os ids reais. O simulador resolve pelo NOME.
//
// Formato dos dois blocos e rigido (uma linha `chave: 'valor',` por entrada,
// sem comentario dentro): o sync, o simulador e add-001-motor.mjs fazem parse por texto.

export const SERVER_FUNCTION_NAMES = {
  usuarioSessao: 'cotUsuarioSessao',
  motorChamar: 'cotMotorChamar',
};

export const SERVER_FUNCTIONS = {
  usuarioSessao: '1',
  motorChamar: '2',
};
