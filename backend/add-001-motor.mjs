// Server functions — front do Motor de Cotações (spec 001 do cotacao-motor).
//
// NAO EXECUTE ESTE ARQUIVO DA MAQUINA LOCAL sem decisao explicita do usuario
// (a plataforma so gera migration quando o script roda no sandbox).
// Uso (no sandbox): cd backend && node add-001-motor.mjs
//
// Duas funcoes:
//  - cotUsuarioSessao (SQL): quem esta chamando, pelo :VAR_USER, casado com
//    COT_USUARIO por e-mail. Zero linhas = sem acesso.
//  - cotMotorChamar (JAVASCRIPT): o gateway. O front nunca fala com o motor
//    Java direto; manda { metodo, rota, corpo } para esta SF, que resolve a
//    identidade (chamando cotUsuarioSessao por id), le MOTOR_URL/MOTOR_TOKEN
//    em COT_PARAMETRO e encaminha com os cabecalhos X-Usuario-*.
//
// O id de cotUsuarioSessao so existe depois de publicar: o corpo do gateway
// carrega o marcador __IDS__, trocado pelo mapa real no upsert (publica a SQL
// primeiro) e, no simulador, pelo id que o frontend usa (server-functions.ts).

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  configureSdkMitra,
  listServerFunctionsMitra,
  createServerFunctionMitra,
  updateServerFunctionMitra,
} from 'mitra-sdk';

configureSdkMitra({
  baseURL: process.env.MITRA_BASE_URL,
  token: process.env.MITRA_TOKEN,
  integrationURL: process.env.MITRA_BASE_URL_INTEGRATIONS,
});

const projectId = Number(process.env.MITRA_PROJECT_ID);
const HERE = dirname(fileURLToPath(import.meta.url));

function source(fn) {
  const text = fn.toString();
  return text.slice(text.indexOf('{') + 1, text.lastIndexOf('}')).trim();
}

export const MARCADOR_IDS = '__IDS__';
export const injetarIds = (code, mapa) => String(code).split(MARCADOR_IDS).join(JSON.stringify(mapa));

/** Id local de uma SF pelo nome, lido do mapa do frontend (o simulador responde por ele). */
function idLocal(nomeSf) {
  const fonte = readFileSync(join(HERE, '..', 'frontend', 'src', 'lib', 'server-functions.ts'), 'utf8');
  const chave = fonte.match(new RegExp(`(\\w+): '${nomeSf}'`))?.[1];
  const id = chave && fonte.match(new RegExp(`${chave}: '(\\d+)'`))?.[1];
  if (!id) throw new Error(`${nomeSf} sem id em frontend/src/lib/server-functions.ts`);
  return Number(id);
}

/* ─────────────── corpo do gateway ─────────────── */

const GATEWAY = source(async function corpo() {
  const { executeServerFunctionMitra, runQueryMitra } = require('mitra-sdk');
  const projectId = Number(process.env.MITRA_PROJECT_ID);
  const IDS = __IDS__;

  const linhas = (resposta) => {
    let saida = resposta?.result ?? resposta;
    if (typeof saida === 'string') { try { saida = JSON.parse(saida); } catch { return []; } }
    if (saida?.output) saida = saida.output;
    if (typeof saida === 'string') { try { saida = JSON.parse(saida); } catch { return []; } }
    if (Array.isArray(saida)) return saida;
    return saida?.rows ?? saida?.result?.rows ?? saida?.result ?? [];
  };

  // Identidade: nunca do input. Vem do :VAR_USER da SF SQL chamada por id.
  const [usuario] = linhas(await executeServerFunctionMitra({ projectId, serverFunctionId: IDS.usuarioSessao, input: {} }));
  if (!usuario?.EMAIL) return { ok: false, status: 403, error: 'Usuário sem acesso ao motor de cotações.' };

  const parametros = linhas(await runQueryMitra({ projectId, sql: "SELECT CHAVE, VALOR FROM COT_PARAMETRO WHERE CHAVE IN ('MOTOR_URL', 'MOTOR_TOKEN')" }));
  const parametro = (chave) => String(parametros.find((p) => p.CHAVE === chave)?.VALOR ?? '').trim();
  const base = parametro('MOTOR_URL').replace(/\/+$/, '');
  const token = parametro('MOTOR_TOKEN');
  if (!base || !token) return { ok: false, status: 503, error: 'Motor não configurado (MOTOR_URL e MOTOR_TOKEN em COT_PARAMETRO).' };

  const metodo = String(event.metodo || 'GET').toUpperCase();
  const rota = String(event.rota || '');
  if (!/^\/api\/[\w\-./?=&%+,:]*$/.test(rota)) return { ok: false, status: 400, error: 'Rota inválida.' };
  const semCorpo = metodo === 'GET' || metodo === 'DELETE';

  const resposta = await fetch(base + rota, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Usuario-Email': String(usuario.EMAIL),
      'X-Usuario-Nome': String(usuario.NOME ?? ''),
      'X-Usuario-Perfil': String(usuario.PERFIL ?? ''),
    },
    body: semCorpo ? undefined : JSON.stringify(event.corpo ?? {}),
  });
  const texto = await resposta.text();
  let corpo;
  try { corpo = JSON.parse(texto); } catch { corpo = texto; }
  return { ok: resposta.ok, status: resposta.status, corpo };
});

/* ─────────────── definicoes ─────────────── */

export const definitions = [
  {
    name: 'cotUsuarioSessao',
    type: 'SQL',
    description: 'Usuario da sessao (:VAR_USER) casado com COT_USUARIO por e-mail. Zero linhas = sem acesso. Sem parametros.',
    code: `SELECT U.ID, U.NOME, U.EMAIL, U.PERFIL
FROM COT_USUARIO U
WHERE U.ATIVO = 1
  AND U.EMAIL = (SELECT IU.DESCR FROM INT_USER IU WHERE IU.ID = :VAR_USER)
LIMIT 1`,
  },
  {
    name: 'cotMotorChamar',
    type: 'JAVASCRIPT',
    description: 'Gateway para a API REST do motor Java. Params: metodo (GET|POST|PATCH|DELETE), rota (/api/...), corpo (objeto). Devolve { ok, status, corpo }.',
    // Ids locais para o simulador; o upsert reinjeta os reais antes de publicar.
    code: injetarIds(GATEWAY, { usuarioSessao: idLocal('cotUsuarioSessao') }),
    idsDe: { usuarioSessao: 'cotUsuarioSessao' },
    codeComMarcador: GATEWAY,
  },
];

/* ─────────────── publicacao ─────────────── */

function isEntrypoint() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

function functionId(item) {
  return item?.id ?? item?.serverFunctionId ?? item?.result?.serverFunctionId ?? item?.result?.id;
}

export async function upsert() {
  const lista = await listServerFunctionsMitra({ projectId });
  const porNome = new Map((lista?.result ?? []).map((fn) => [fn.name, fn]));
  const ids = {};

  // A ordem de `definitions` garante que as SQL chamadas por id ja tem id real
  // quando a JS e publicada.
  for (const definition of definitions) {
    const code = definition.idsDe
      ? injetarIds(definition.codeComMarcador, Object.fromEntries(
          Object.entries(definition.idsDe).map(([chave, nome]) => {
            if (!ids[nome]) throw new Error(`${definition.name} depende de ${nome}, que ainda nao tem id`);
            return [chave, ids[nome]];
          }),
        ))
      : definition.code;
    const existente = porNome.get(definition.name);
    if (existente) {
      const id = functionId(existente);
      await updateServerFunctionMitra({ projectId, serverFunctionId: id, code, description: definition.description });
      console.log(`  atualizada  ${definition.name} (${id})`);
      ids[definition.name] = id;
      continue;
    }
    const criada = await createServerFunctionMitra({
      projectId, name: definition.name, type: definition.type, code, description: definition.description,
    });
    const id = functionId(criada);
    console.log(`  criada      ${definition.name} (${id})`);
    ids[definition.name] = id;
  }
  return ids;
}

if (isEntrypoint()) {
  if (!projectId) throw new Error('MITRA_PROJECT_ID ausente no .env');
  console.log(`Publicando ${definitions.length} server functions (spec 001)...`);
  const ids = await upsert();
  console.log('');
  console.log('Pronto. Rode `npm run sync:function-map` para levar os ids ao frontend.');
  console.log(`Funcoes: ${Object.keys(ids).length}`);
}
