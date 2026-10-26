// Dados simulados — front do Motor de Cotações.
//
// O schema sai de setup-backend.mjs via schema.mjs. Aqui so o DADO: usuarios
// da plataforma, o perfil de negocio de cada um e os parametros do gateway.
// O dado de negocio (oportunidades, itens...) vive no motor Java, nao aqui.

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { createSchema } from './schema.mjs';

export const iso = (data) => data.toISOString().slice(0, 19);

// Usuarios da plataforma (INT_USER). Logins do simulador e do mitra-hub.
export const USUARIOS = [
  { nome: 'TI Benenutri', email: 'ti@benenutri.com', accessLevel: 'ADMIN', perfil: 'admin' },
  { nome: 'Revisora Comercial', email: 'revisora@benenutri.local', accessLevel: 'MEMBER', perfil: 'revisor' },
  // Autentica na plataforma, mas NAO tem COT_USUARIO: a guarda de sessao recusa.
  { nome: 'Visitante Sem Acesso', email: 'visitante@benenutri.local', accessLevel: 'MEMBER', perfil: null },
];

// URL do motor Java em desenvolvimento (backend do cotacao-motor). O token e
// o mesmo MOTOR_TOKEN que o motor espera em dev.
export const PARAMETROS = {
  MOTOR_URL: 'http://localhost:8080',
  MOTOR_TOKEN: 'dev-token',
};

export function seedDatabase(dbPath, { reset = false } = {}) {
  if (reset) {
    for (const sufixo of ['', '-wal', '-shm']) rmSync(`${dbPath}${sufixo}`, { force: true });
  }
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON');
  createSchema(db);

  const agora = iso(new Date());
  const counts = {};

  const inserirUsuario = db.prepare('INSERT INTO INT_USER (DESCR, NOME, ACCESS_LEVEL, ATIVO) VALUES (?, ?, ?, 1)');
  const inserirCotUsuario = db.prepare('INSERT INTO COT_USUARIO (EMAIL, NOME, PERFIL, ATIVO, CRIADO_EM, ATUALIZADO_EM) VALUES (?, ?, ?, 1, ?, ?)');
  for (const usuario of USUARIOS) {
    inserirUsuario.run(usuario.email, usuario.nome, usuario.accessLevel);
    if (usuario.perfil) inserirCotUsuario.run(usuario.email, usuario.nome, usuario.perfil, agora, agora);
  }
  counts.INT_USER = USUARIOS.length;
  counts.COT_USUARIO = USUARIOS.filter((u) => u.perfil).length;

  const inserirParametro = db.prepare('INSERT INTO COT_PARAMETRO (CHAVE, VALOR, ATUALIZADO_EM) VALUES (?, ?, ?)');
  for (const [chave, valor] of Object.entries(PARAMETROS)) inserirParametro.run(chave, valor, agora);
  counts.COT_PARAMETRO = Object.keys(PARAMETROS).length;

  db.close();
  return counts;
}
