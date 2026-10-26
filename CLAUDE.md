# Project: p-novo-cotacao-motor — Front do Motor de Cotações

App que roda dentro da plataforma **Mitra**: React 19 + TypeScript + Vite 7 +
Tailwind 4 no frontend; backend Mitra mínimo (tabelas `COT_USUARIO`,
`COT_PARAMETRO` e duas Server Functions). O **motor de verdade** é o serviço
Java em `PROJETOS/BENENUTRI/cotacao-motor` (specs em `cotacao-motor/specs/`);
este projeto só desenha telas e encaminha chamadas pela SF gateway.

## Leia antes de escrever a primeira linha

1. `docs/constitution.md` — o processo.
2. `docs/design.md` — o sistema visual. É normativo.
3. A spec: `../../BENENUTRI/cotacao-motor/specs/001-nucleo-bionexo/{spec,plan,tasks}.md`.

## Estrutura

```
frontend/                 React. Build SEMPRE daqui: cd frontend && npm run build
  src/lib/mitra-auth.ts     sessão e init do SDK (modo local x Mitra real)
  src/lib/mitra-api.ts      transporte único: linhas()/acao() sobre executeServerFunctionMitra
  src/lib/motor.ts          cliente do motor Java via SF gateway (montarRota é regra pura testada)
  src/lib/server-functions.ts  contrato NOMES + IDS das Server Functions
  tests/*.test.mjs          node --test, um por regra de tela da spec
backend/                  scripts de provisionamento via mitra-sdk (.env vazio localmente)
  setup-backend.mjs         COT_USUARIO, COT_PARAMETRO
  add-001-motor.mjs         cotUsuarioSessao (SQL) e cotMotorChamar (JS gateway, __IDS__ injetado)
  simulator/                Mitra local em SQLite; smoke.mjs sobe um motor de mentira (node:http)
  migrations/               GERADO PELO SISTEMA — não toque
```

## Como rodar

```bash
cd backend && npm test            # sim:check + sim:smoke
cd frontend && npm test           # node --test
cd backend && npm run sim         # simulador em http://localhost:3112
cd frontend && npm run dev        # app (sem VITE_MITRA_AUTH_URL entra no simulador)
cd frontend && npm run build      # obrigatório antes de subir
```

## Regras que quebram produção se ignoradas

1. **Não existe staging.** Com `VITE_MITRA_AUTH_URL` preenchido, toda Server
   Function chamada do `localhost` bate em produção. Localmente, simulador.
2. **Nunca execute `setup-backend.mjs`, `add-*.mjs` ou qualquer escrita do
   `mitra-sdk` da máquina local** sem decisão explícita do usuário: aplica em
   produção sem migration.
3. **Não crie, edite nem `git add` em `backend/migrations/`.** Gerado pelo sistema.
4. **`.env` nunca é commitado.** Token no frontend é falha de segurança.
5. **Dado de negócio não mora aqui.** Oportunidade, item, proposta, pedido
   ficam no PostgreSQL do motor; tela nova chama `motor()` (`src/lib/motor.ts`),
   nunca cria tabela Mitra para isso.
6. **Identidade nunca vem do input.** O gateway resolve o usuário pelo
   `:VAR_USER` (cotUsuarioSessao por id) e manda `X-Usuario-*` ao motor.
7. **Alteração mínima; commit sem assinatura de agente; sem teste não está pronto.**

## Como o frontend fala com o backend

- `mitra-interactions-sdk` no front; nunca `mitra-sdk` nem `fetch` direto ao motor.
- Usuário final é business: só Server Function, via `linhas()`/`acao()`; o
  motor via `motor('GET', 'painel')`.
- Erro de regra do motor chega como `ErroMotor { status, regra, itens }`
  (`422` regra, `409` conflito de versão).
- Nome novo de Server Function entra em `add-NNN-*.mjs` **e** em
  `SERVER_FUNCTION_NAMES`; id local em `SERVER_FUNCTIONS` até o
  `sync:function-map` trazer o real. `add-001-motor.mjs` lê esse mapa para
  injetar o id de `cotUsuarioSessao` no gateway.

## Como subir para o Mitra

1. `npm test` verde em `backend/` e `frontend/`; `npm run build` limpo.
2. `git fetch origin && git merge origin/main --no-edit`; leia o diff.
3. Um commit `tipo: descrição` + `git push origin main`.
4. No chat do projeto no Mitra: *"sincronize com a main e rode
   `cd backend && node setup-backend.mjs && node add-001-motor.mjs && node sync-server-function-map.mjs`,
   depois build e share"*.
5. `git pull` para receber migrations e o mapa de ids. Preencha `COT_PARAMETRO`
   (`MOTOR_URL`, `MOTOR_TOKEN`) e `COT_USUARIO` pela plataforma.

## Armadilhas de build

- `verbatimModuleSyntax`: nunca importe `interface`/`type` de outro arquivo.
- `npm run build` roda `tsc -b`: erro de tipo derruba o build.
- `base: './'` no `vite.config.ts`. Não mexa.
