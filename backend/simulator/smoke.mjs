// Suite de testes do backend Mitra — front do Motor de Cotações.
//
// Roda as server functions de verdade (SQL literal e corpo JAVASCRIPT literal
// de add-001-motor.mjs) em banco descartavel. O motor Java e substituido por
// um servidor HTTP minimo que devolve os cabecalhos recebidos: o que se prova
// aqui e que o gateway identifica o usuario pelo :VAR_USER e encaminha com
// token e X-Usuario-*, nunca com identidade vinda do input.
//
// Uso: cd backend && npm run sim:smoke   (ou npm test, que roda check + smoke)

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { SEED, FRONTEND_MAP, MAP_NAMES, MAP_IDS } from './config.mjs';
import { seedDatabase } from './seed.mjs';
import { registerMysqlFunctions } from './mysql-dialect.mjs';
import { loadDefinitions, createRunner } from './runtime.mjs';

const DB = join(tmpdir(), `mitra-${SEED}-smoke.db`);
rmSync(DB, { force: true });
seedDatabase(DB, { reset: true });

const db = new DatabaseSync(DB);
registerMysqlFunctions(db);
const { byName } = await loadDefinitions();

// O gateway chama cotUsuarioSessao por ID (como na plataforma): o id vem do
// mapa do frontend, igual ao server.mjs.
const mapa = readFileSync(FRONTEND_MAP, 'utf8');
const bloco = (marcador) => {
  const inicio = mapa.indexOf(`export const ${marcador} = {`);
  const trecho = mapa.slice(inicio, mapa.indexOf('}', inicio));
  return Object.fromEntries([...trecho.matchAll(/(\w+): '([^']+)'/g)].map((m) => [m[1], m[2]]));
};
const nomes = bloco(MAP_NAMES);
const byId = new Map(Object.entries(bloco(MAP_IDS)).map(([chave, id]) => [Number(id), byName.get(nomes[chave])]));
const execute = createRunner(db, { resolveById: (id) => byId.get(id) ?? null });

// INT_USER ids do seed (ordem de USUARIOS em seed.mjs).
const ADMIN = 1;
const REVISORA = 2;
const VISITANTE = 3;
const chamar = (nome, input, userId = ADMIN) => {
  const definicao = byName.get(nome);
  assert.ok(definicao, `server function ${nome} nao existe em PUBLISH_ORDER`);
  return execute(definicao, input, userId);
};
const linhas = async (nome, input, userId = ADMIN) => (await chamar(nome, input, userId)).rows;

// Motor de mentira: ecoa metodo, rota, cabecalhos e corpo.
const recebidas = [];
const motor = createServer((req, res) => {
  let corpo = '';
  req.on('data', (parte) => { corpo += parte; });
  req.on('end', () => {
    recebidas.push({ metodo: req.method, rota: req.url, cabecalhos: req.headers, corpo });
    res.writeHead(req.url.startsWith('/api/erro') ? 422 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ eco: true, rota: req.url }));
  });
});
await new Promise((ok) => motor.listen(0, '127.0.0.1', ok));
const motorUrl = `http://127.0.0.1:${motor.address().port}`;
db.prepare("UPDATE COT_PARAMETRO SET VALOR = ? WHERE CHAVE = 'MOTOR_URL'").run(motorUrl);

let feitos = 0;
const teste = async (titulo, fn) => {
  try {
    await fn();
  } catch (erro) {
    console.log(`  FALHOU  ${titulo}\n          ${erro.message}`);
    motor.close();
    db.close();
    process.exit(1);
  }
  feitos += 1;
  console.log(`  ok  ${titulo}`);
};

await teste('sessao: :VAR_USER identifica quem chama, nunca o input', async () => {
  const [sessao] = await linhas('cotUsuarioSessao', { email: 'invasor@benenutri.local' });
  assert.equal(sessao.EMAIL, 'ti@benenutri.com');
  assert.equal(sessao.PERFIL, 'admin');
});

await teste('sessao: usuario da plataforma sem COT_USUARIO recebe zero linhas (guarda recusa)', async () => {
  assert.equal((await linhas('cotUsuarioSessao', {}, VISITANTE)).length, 0);
});

await teste('gateway: encaminha ao motor com token e X-Usuario-* do :VAR_USER', async () => {
  const saida = await chamar('cotMotorChamar', { metodo: 'GET', rota: '/api/oportunidades?status=EM_REVISAO', email: 'invasor@x' }, REVISORA);
  assert.equal(saida.ok, true);
  assert.equal(saida.status, 200);
  assert.equal(saida.corpo.rota, '/api/oportunidades?status=EM_REVISAO');
  const ultima = recebidas.at(-1);
  assert.equal(ultima.metodo, 'GET');
  assert.equal(ultima.cabecalhos.authorization, 'Bearer dev-token');
  assert.equal(ultima.cabecalhos['x-usuario-email'], 'revisora@benenutri.local');
  assert.equal(ultima.cabecalhos['x-usuario-perfil'], 'revisor');
});

await teste('gateway: POST leva o corpo em JSON e devolve o status do motor', async () => {
  const saida = await chamar('cotMotorChamar', { metodo: 'POST', rota: '/api/oportunidades/7/aprovar', corpo: { versao: 5 } });
  assert.equal(saida.ok, true);
  assert.deepEqual(JSON.parse(recebidas.at(-1).corpo), { versao: 5 });
  const erro = await chamar('cotMotorChamar', { metodo: 'POST', rota: '/api/erro', corpo: {} });
  assert.equal(erro.ok, false);
  assert.equal(erro.status, 422);
});

await teste('gateway: usuario sem acesso e rota fora de /api/ sao recusados antes de chamar o motor', async () => {
  const antes = recebidas.length;
  const semAcesso = await chamar('cotMotorChamar', { metodo: 'GET', rota: '/api/painel' }, VISITANTE);
  assert.equal(semAcesso.ok, false);
  assert.equal(semAcesso.status, 403);
  const rotaRuim = await chamar('cotMotorChamar', { metodo: 'GET', rota: 'http://outro.host/api/x' });
  assert.equal(rotaRuim.ok, false);
  assert.equal(rotaRuim.status, 400);
  assert.equal(recebidas.length, antes);
});

await teste('gateway: motor nao configurado e recusado com 503', async () => {
  db.prepare("UPDATE COT_PARAMETRO SET VALOR = '' WHERE CHAVE = 'MOTOR_URL'").run();
  const saida = await chamar('cotMotorChamar', { metodo: 'GET', rota: '/api/painel' });
  assert.equal(saida.status, 503);
  db.prepare("UPDATE COT_PARAMETRO SET VALOR = ? WHERE CHAVE = 'MOTOR_URL'").run(motorUrl);
});

console.log(`\n  ${feitos} verificacoes passaram.`);
motor.close();
db.close();
