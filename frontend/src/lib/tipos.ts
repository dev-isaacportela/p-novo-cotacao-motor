// Formas das respostas do motor (plan §API REST). Espelham os records dos controllers Java.

export type StatusOportunidade =
  | 'NOVA' | 'EM_FUNIL' | 'NAO_PARTICIPAR' | 'EM_REVISAO' | 'APROVADA' | 'ENVIADA' | 'GANHA' | 'PERDIDA' | 'EXPIRADA' | 'CANCELADA';
export type EtapaFunil = 'BRUTA' | 'FILTRADA' | 'PROCESSADA' | 'CASADA';
export type SituacaoItem = 'ANALISANDO' | 'SUGERIDO' | 'CANDIDATOS' | 'SEM_CORRESPONDENCIA' | 'CONFIRMADO' | 'DECLINADO';

export interface Resumo {
  id: number;
  portal: string;
  idExterno: string;
  compradorNome: string | null;
  compradorCnpj: string | null;
  compradorUf: string | null;
  prazoResposta: string | null;
  status: StatusOportunidade;
  etapaFunil: EtapaFunil;
  desfechoFunil: 'PARTICIPAR' | 'NAO_PARTICIPAR' | null;
  motivoDesfecho: string | null;
  totalItens: number;
  itensDeclinados: number;
  marcas: string[];
  versao: number;
  criadoEm: string;
}

export interface Fila {
  pagina: number;
  tamanho: number;
  total: number;
  contadores: Record<StatusOportunidade, number>;
  itens: Resumo[];
}

export interface Candidato {
  codProd: number;
  nome: string;
  marca: string | null;
  unidade: string | null;
  embalagem: string | null;
  status: string | null;
  coverage: number;
  matchedTerms: { term: string; weight: number }[];
  missingTerms: { term: string; weight: number }[];
}

export interface Evidencia {
  termCount?: number;
  knownTermCount?: number;
  unknownTerms?: string[];
  candidatos?: Candidato[];
  cobertura?: number;
  confianca?: number;
  semIa?: boolean;
  atributosConferidos?: string[];
  divergencias?: string[];
  impedimentos?: string[];
}

export interface Linha {
  codProd: number | null;
  precoSugerido: number | null;
  precoFinal: number | null;
  justificativa: string | null;
  marca: string | null;
  fabricante: string | null;
  embalagem: string | null;
  registroAnvisa: string | null;
  prazoEntregaDias: number | null;
  observacao: string | null;
  declinado: boolean;
}

export interface ItemDetalhe {
  id: number;
  idExternoItem: string;
  codigoComprador: string | null;
  descricao: string;
  unidade: string | null;
  quantidade: number | null;
  entrega: string | null;
  situacao: SituacaoItem;
  motivoDeclinio: string | null;
  marcas: string[];
  atributosIa: Record<string, unknown> | null;
  vinculo: { codProd: number | null; confianca: number | null; origem: string; evidencia: Evidencia | null } | null;
  proposta: Linha | null;
}

export interface Detalhe {
  cabecalho: Resumo;
  tipo: string;
  condicoes: string | null;
  iaModelo: string | null;
  iaCusto: number | null;
  iaEm: string | null;
  proposta: {
    id: number;
    validadeHoras: number | null;
    condicaoPagamento: string | null;
    tipoFrete: string | null;
    aprovadoPor: string | null;
    aprovadoEm: string | null;
    protocoloPortal: string | null;
    enviadoEm: string | null;
    ultimoErro: string | null;
  } | null;
  itens: ItemDetalhe[];
}

export interface Edicao {
  versao: number;
  codProd?: number;
  situacao?: 'CONFIRMADO' | 'DECLINADO' | 'ANALISANDO';
  motivo?: string;
  precoFinal?: number;
  justificativa?: string;
  marca?: string;
  fabricante?: string;
  embalagem?: string;
  registroAnvisa?: string;
  prazoEntregaDias?: number;
  observacao?: string;
  atributosIa?: Record<string, unknown>;
  foraDoEscopo?: boolean;
}

export interface Evento {
  id: number;
  entidade: string;
  entidadeId: number;
  acao: string;
  autor: string;
  origem: 'PORTAL' | 'USUARIO' | 'MOTOR';
  regra: string | null;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  em: string;
}

export interface ProdutoResumo {
  codProd: number;
  nome: string;
  marca: string | null;
  unidade: string | null;
  embalagem: string | null;
  status: string | null;
  score: number;
}

export interface PortalResumo {
  portal: string;
  captadas: number;
  participar: number;
  naoParticiparPorEtapa: Record<EtapaFunil, number>;
  naoParticipar: number;
  emRevisao: number;
  enviadas: number;
  ganhas: number;
  perdidas: number;
  expiradas: number;
  canceladas: number;
  erros: number;
  processadasPorIa: number;
  custoIa: number;
  medianaCaptacaoEnvioSegundos: number | null;
}

export interface Lacunas {
  termos: { termo: string; frequencia: number }[];
  semCorrespondencia: { oportunidadeId: number; portal: string; idExterno: string; itemId: number; idExternoItem: string; descricao: string }[];
}

export interface Alerta {
  id: number;
  usuarioId: number | null;
  tipo: string;
  oportunidadeId: number | null;
  lidoEm: string | null;
  criadoEm: string;
}

export interface Configuracao {
  chave: string;
  valor: string;
  versao: number;
  autor: string;
  vigenteDesde: string;
  tipo: 'TEXTO' | 'INTEIRO' | 'DECIMAL';
  inicial: string;
  descricao: string;
}

export interface Exclusao {
  id: number;
  tipo: 'TERMO' | 'CATEGORIA' | 'COMPRADOR_CNPJ' | 'UF';
  valor: string;
  motivo: string | null;
  autor: string;
  vigenteDesde: string;
  vigenteAte: string | null;
}

export interface Piso {
  id: number;
  codProd: number;
  precoMinimo: number;
  autor: string;
  vigenciaInicio: string;
}

export interface Trabalho {
  id: number;
  tipo: string;
  referencia: string | null;
  status: 'PENDENTE' | 'EXECUTANDO' | 'OK' | 'ERRO';
  tentativas: number;
  proximaEm: string;
  erro: string | null;
  fim: string | null;
}

export const ROTULO_STATUS: Record<StatusOportunidade, string> = {
  NOVA: 'Nova',
  EM_FUNIL: 'No funil',
  NAO_PARTICIPAR: 'Não participar',
  EM_REVISAO: 'Em revisão',
  APROVADA: 'Aprovada',
  ENVIADA: 'Enviada',
  GANHA: 'Ganha',
  PERDIDA: 'Perdida',
  EXPIRADA: 'Expirada',
  CANCELADA: 'Cancelada',
};

export const TOM_STATUS: Record<StatusOportunidade, 'live' | 'off' | 'attention' | 'alert'> = {
  NOVA: 'off',
  EM_FUNIL: 'off',
  NAO_PARTICIPAR: 'off',
  EM_REVISAO: 'attention',
  APROVADA: 'live',
  ENVIADA: 'live',
  GANHA: 'live',
  PERDIDA: 'off',
  EXPIRADA: 'alert',
  CANCELADA: 'off',
};

export const ROTULO_SITUACAO: Record<SituacaoItem, string> = {
  ANALISANDO: 'Analisando',
  SUGERIDO: 'Sugerido',
  CANDIDATOS: 'Candidatos',
  SEM_CORRESPONDENCIA: 'Sem correspondência',
  CONFIRMADO: 'Confirmado',
  DECLINADO: 'Declinado',
};

export const ROTULO_ETAPA: Record<EtapaFunil, string> = {
  BRUTA: 'bruta',
  FILTRADA: 'filtrada',
  PROCESSADA: 'processada pela IA',
  CASADA: 'casada',
};
