# Simulador local do Mitra — p-novo-cotacao-motor (Front do Motor de Cotações)

Ambiente de teste **deste projeto**, com banco SQLite próprio. Roda sem
dependências externas (`node:sqlite` do Node 22+). Só `simulator/data/` fica
fora do git.

**Não existe handler reimplementado aqui.** O simulador carrega as
`definitions` de `backend/add-001-motor.mjs` e executa o SQL e o JavaScript
literais que vão para o Mitra. O schema sai de `setup-backend.mjs`.

## Uso

```bash
cd backend && npm test            # sim:check + sim:smoke
cd backend && npm run sim:smoke   # SFs reais + assert; sobe um motor de mentira (node:http) para o gateway
cd backend && npm run sim:seed    # regera o banco
cd backend && npm run sim         # servidor em http://localhost:3112
```

Com o simulador no ar, `cd frontend && npm run dev`. O seed aponta
`MOTOR_URL` para `http://localhost:8080` (motor Java do `cotacao-motor` em
dev, `MOTOR_TOKEN=dev-token`); sem o motor no ar, a fila mostra o aviso de
conexão e o resto da tela funciona.

## Logins (senha única: `mitra123`)

| E-mail | Nível | Perfil no motor |
|---|---|---|
| `ti@benenutri.com` | ADMIN | admin |
| `revisora@benenutri.local` | MEMBER | revisor |
| `visitante@benenutri.local` | MEMBER | nenhum (a tela recusa) |

## Endpoints

| Rota | Uso |
|---|---|
| `POST /auth/login` | login local |
| `GET /auth/users` | usuários (mitra-hub) |
| `POST /interactions/executeServerFunction` | `executeServerFunctionMitra` |
| `GET /health` | status, contagens, ids sem definição e erros |
