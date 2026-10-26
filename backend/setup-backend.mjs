// Schema do projeto — front do Motor de Cotações (spec 001 do cotacao-motor).
//
// NAO EXECUTE ESTE ARQUIVO DA MAQUINA LOCAL sem decisao explicita do usuario.
// O mitra-sdk e um cliente HTTP puro e nao gera migration; quem materializa a
// migration e a plataforma, ao fim de um turno no sandbox. Rodar daqui aplica
// o DDL em producao sem migration, e a historia diverge do schema.
//
// Uso (no sandbox): cd backend && node setup-backend.mjs
//
// O dado de negocio (oportunidades, itens, propostas...) NAO mora aqui: vive
// no PostgreSQL do motor Java. Este projeto Mitra guarda so o que o front
// precisa da plataforma: quem e o usuario (perfil de negocio) e onde esta o
// motor (parametros lidos pela SF gateway).
//
// Todo CREATE e "IF NOT EXISTS" e todo seed e guardado por SELECT. O
// simulador local le os DDLs deste arquivo — um `await ddl(...)` por tabela.

import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { configureSdkMitra, runDdlMitra, runDmlMitra, runQueryMitra } from 'mitra-sdk';

configureSdkMitra({
  baseURL: process.env.MITRA_BASE_URL,
  token: process.env.MITRA_TOKEN,
  integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS,
});

const projectId = Number(process.env.MITRA_PROJECT_ID);
const agora = () => new Date().toISOString().slice(0, 19);

function esc(valor, max = 500) {
  return String(valor ?? '').trim().slice(0, max).replace(/\\/g, '\\\\').replace(/'/g, "''");
}

function linhas(resposta) {
  let saida = resposta?.result ?? resposta;
  if (typeof saida === 'string') { try { saida = JSON.parse(saida); } catch { return []; } }
  if (saida?.output) saida = saida.output;
  if (typeof saida === 'string') { try { saida = JSON.parse(saida); } catch { return []; } }
  return saida?.rows ?? saida?.result?.rows ?? saida?.result ?? [];
}

const ddl = (sql) => runDdlMitra({ projectId, sql });
const dml = (sql) => runDmlMitra({ projectId, sql });
const query = async (sql) => linhas(await runQueryMitra({ projectId, sql }));

/* ─────────────── tabelas ─────────────── */

async function criarTabelas() {
  // Perfil de negocio, casado com INT_USER por e-mail (plataforma-mitra.md §6).
  // PERFIL: 'revisor' | 'admin' (spec 002 do cotacao-motor).
  await ddl(`CREATE TABLE IF NOT EXISTS COT_USUARIO (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    EMAIL VARCHAR(180) NOT NULL,
    NOME VARCHAR(180) NOT NULL,
    PERFIL VARCHAR(20) NOT NULL DEFAULT 'revisor',
    ATIVO BOOLEAN DEFAULT TRUE,
    CRIADO_EM VARCHAR(19),
    ATUALIZADO_EM VARCHAR(19),
    UNIQUE KEY UK_COT_USUARIO_EMAIL (EMAIL)
  );`);

  // Parametros lidos pela SF gateway (cotMotorChamar): MOTOR_URL e MOTOR_TOKEN.
  // Em tabela porque a SF JAVASCRIPT nao tem variavel de ambiente propria.
  await ddl(`CREATE TABLE IF NOT EXISTS COT_PARAMETRO (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    CHAVE VARCHAR(60) NOT NULL,
    VALOR VARCHAR(500) NOT NULL DEFAULT '',
    ATUALIZADO_EM VARCHAR(19),
    UNIQUE KEY UK_COT_PARAMETRO_CHAVE (CHAVE)
  );`);
}

/* ─────────────── dados iniciais ─────────────── */

// Chaves criadas vazias: o valor real e preenchido na plataforma (nunca aqui).
const PARAMETROS_INICIAIS = ['MOTOR_URL', 'MOTOR_TOKEN'];

async function semear() {
  for (const chave of PARAMETROS_INICIAIS) {
    const existe = await query(`SELECT ID FROM COT_PARAMETRO WHERE CHAVE = '${esc(chave)}' LIMIT 1`);
    if (existe.length) continue;
    await dml(`INSERT INTO COT_PARAMETRO (CHAVE, VALOR, ATUALIZADO_EM) VALUES ('${esc(chave)}', '', '${agora()}')`);
  }
}

/* ─────────────── entrypoint ─────────────── */

function isEntrypoint() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

async function main() {
  if (!projectId) throw new Error('MITRA_PROJECT_ID ausente no .env');
  console.log(`Setup do backend no projeto ${projectId}...`);
  await criarTabelas();
  console.log('  tabelas ok');
  await semear();
  console.log('  dados iniciais ok');
  console.log('Pronto.');
}

if (isEntrypoint()) {
  main().catch((erro) => { console.error(erro); process.exit(1); });
}
