# p-novo-cotacao-motor — Front do Motor de Cotações (Mitra)

Interface do **Motor universal de cotações e licitações** da Benenutri,
hospedada na plataforma Mitra. O motor em si (captação, funil, preço,
envio) é o serviço Java em `PROJETOS/BENENUTRI/cotacao-motor`; este projeto
é só a tela e a ponte até ele.

- **Specs:** vivem no repositório do motor, em `cotacao-motor/specs/`
  (spec 000 arquitetura, 001 núcleo + Bionexo, 002 usuários). Este projeto
  implementa as telas da spec 001 e a guarda de sessão da spec 002.
- **Como o front fala com o motor:** nunca direto. Toda chamada passa pela
  Server Function `cotMotorChamar` (gateway), que identifica o usuário pelo
  `:VAR_USER`, lê `MOTOR_URL` e `MOTOR_TOKEN` em `COT_PARAMETRO` e encaminha
  à API REST do motor com os cabeçalhos `X-Usuario-*`. No front, `src/lib/motor.ts`.
- **Usuários:** login é o do Mitra; o perfil de negócio (`revisor` | `admin`)
  está em `COT_USUARIO`, casado por e-mail. Sem linha ativa, a tela recusa.

## Como rodar

```bash
cd backend && npm install && npm test     # sim:check + sim:smoke (gateway testado contra um motor de mentira)
cd frontend && npm install && npm test    # node --test sobre src/lib/
cd backend && npm run sim                 # simulador em http://localhost:3112
cd frontend && npm run dev                # app em http://localhost:5182
```

Logins do simulador (senha `mitra123`): `ti@benenutri.com` (admin),
`revisora@benenutri.local` (revisor), `visitante@benenutri.local` (sem acesso).
Para ver dados reais na fila, suba o motor Java (`cotacao-motor/backend`,
porta 8080, `MOTOR_TOKEN=dev-token`): o seed do simulador aponta para ele.

## Publicar

Fluxo E da skill `mitra-escopo`: `npm test` verde nos dois lados, commit em
`main`, e no sandbox do Mitra: `node setup-backend.mjs && node add-001-motor.mjs
&& node sync-server-function-map.mjs`, build, share. Depois, preencher
`MOTOR_URL` e `MOTOR_TOKEN` em `COT_PARAMETRO` e os usuários em `COT_USUARIO`
pela plataforma (nunca neste repositório). O id `p-NNNNN` chega quando o
projeto for criado na plataforma; renomeie a pasta então.
