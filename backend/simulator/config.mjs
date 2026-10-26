// Configuracao do simulador local do Mitra — front do Motor de Cotações.
//
// Este e o UNICO arquivo do simulador que muda de projeto para projeto.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ── identidade ── */

export const PROJECT_LABEL = 'Motor de Cotações — Simulador local';

// Semente do gerador de dados (numero do projeto quando houver; ate la, fixo).
export const SEED = 70001;

/* ── rede ── */

// 3112 / 5182: proximo par livre no mitra-hub (out/2026 ia ate 3111 / 5181).
export const PORT = Number(process.env.SIMULATOR_PORT || 3112);
export const PROJECT_ID = Number(process.env.SIMULATOR_PROJECT_ID || 1);

export const DEFAULT_PASSWORD = process.env.SIMULATOR_PASSWORD || 'mitra123';

/* ── banco ── */

export const DB_PATH = process.env.SIMULATOR_DB_PATH || join(HERE, 'data', 'mitra-sim.db');
export const DDL_SOURCES = [join(HERE, '..', 'setup-backend.mjs')];
export const HEALTH_TABLE = 'INT_USER';

/* ── server functions ── */

export const PUBLISH_ORDER = ['add-001-motor.mjs'];

export const FRONTEND_MAP = join(HERE, '..', '..', 'frontend', 'src', 'lib', 'server-functions.ts');
export const MAP_NAMES = 'SERVER_FUNCTION_NAMES';
export const MAP_IDS = 'SERVER_FUNCTIONS';

// Entrada plausivel para o `sim:check` executar as funcoes SQL de leitura.
export const CHECK_INPUT = {
  busca: '', limite: '20', offset: '0', pagina: '0',
  dataInicio: '', dataFim: '', id: '1', status: '',
};
