// Formas das respostas do motor para licitações (spec 006, plan §API REST). Espelham os records e entidades Java.

export interface LicitacaoResumo {
  id: number;
  portal: string;
  tipo: string;
  numero: string | null;
  orgao: string | null;
  cnpj: string | null;
  uf: string | null;
  municipio: string | null;
  modalidade: string | null;
  objeto: string | null;
  valorEstimado: number | null;
  publicadoEm: string | null;
  sessaoEm: string | null;
  fontes: string[];
  status: string;
  etapa: string | null;
  camadaSaida: string | null;
  motivoDesfecho: string | null;
  decisao: 'PARTICIPAR' | 'NAO_PARTICIPAR' | null;
  estrategico: boolean;
  marcas: string[];
  prioridade: string | null;
  aderencia: number | null;
  resumoIa: string | null;
}

export interface LicitacaoLista {
  pagina: number;
  tamanho: number;
  total: number;
  itens: LicitacaoResumo[];
}

export interface PreLeitura {
  porte: Record<string, unknown> | null;
  prioridade: string | null;
  aderencia: number | null;
  infoSuficiente: boolean | null;
  resumo: string | null;
  motivo: string | null;
  modelo: string | null;
  custo: number | null;
  em: string | null;
}

/** Um achado da leitura completa; `pagina` nula ⇒ `aConferir` (RN-008). */
export interface Achado {
  descricao?: string | null;
  pagina?: number | null;
  aConferir?: boolean;
  quantidade?: string | null;
  unidade?: string | null;
  exigenciasTecnicas?: string | null;
  tipoDocumento?: string | null;
  tipo?: string | null;
  data?: string | null;
  trecho?: string | null;
  fundamento?: string | null;
}

export interface Leitura {
  itens?: Achado[];
  documentos?: Achado[];
  amostras?: Achado[];
  prazos?: Achado[];
  riscos?: Achado[];
  criterioJulgamento?: { texto?: string; pagina?: number | null } | null;
  modoDisputa?: { texto?: string; pagina?: number | null } | null;
}

export interface Edital {
  arquivos: { nome: string; tipo: string | null; caminho: string; paginaInicial: number; paginas: number }[];
  texto: string | null;
  leitura: Leitura | null;
  modelo: string | null;
  promptVersao: string | null;
  custo: number | null;
  lidoEm: string | null;
}

export interface Exigencia {
  id: number;
  descricao: string;
  tipoDocumento: string | null;
  pagina: number | null;
  documentoId: number | null;
  status: 'ATENDIDO' | 'AUSENTE' | 'INADEQUADO';
  detalhe: string | null;
  justificativa: string | null;
  justificadoPor: string | null;
}

export interface PontoEstrategia {
  id: number;
  tipo: 'ESCLARECIMENTO' | 'IMPUGNACAO';
  trecho: string | null;
  pagina: number | null;
  fundamento: string | null;
  prazo: string | null;
  estado: 'SUGERIDO' | 'APROVADO' | 'ENVIADO_PELA_PESSOA' | 'DESCARTADO' | 'FORA_DO_PRAZO';
  aprovadoPor: string | null;
}

export interface EventoCalendario {
  id: number;
  tipo: string;
  data: string;
  origem: 'EDITAL' | 'PADRAO';
  alertadoEm: string | null;
}

export interface LicitacaoDetalhe {
  cabecalho: LicitacaoResumo;
  itens: { id: number; descricao: string; unidade: string; quantidade: string }[];
  preLeitura: PreLeitura | null;
  decisaoPor: string | null;
  decisaoEm: string | null;
  decisaoMotivo: string | null;
  edital: Edital | null;
  exigencias: Exigencia[];
  estrategia: PontoEstrategia[];
  calendario: EventoCalendario[];
  iaModelo: string | null;
  iaCusto: number | null;
}

export interface Documento {
  id: number;
  tipo: string;
  emissor: string | null;
  numero: string | null;
  validade: string | null;
  arquivo: string | null;
  situacao: 'VALIDO' | 'VENCE_EM_BREVE' | 'VENCIDO';
  autor: string;
}

export interface FunilConfig {
  portfolio: number[];
  palavrasAdicionais: string[];
  exclusoes: string[];
  cnaes: string[];
  ufs: string[];
  raioKm: number | null;
  valorMinimo: number | null;
  modalidades: string[];
  frequencia: string | null;
  capacidadeSemanal: number | null;
  periodoComparacaoDias: number | null;
}

export interface FunilVersaoResumo {
  versao: number;
  estado: 'RASCUNHO' | 'ATIVA' | 'APOSENTADA';
  dono: string | null;
  autor: string;
  ativadoEm: string | null;
  comparada: boolean;
  criadoEm: string;
}

export interface Comparacao {
  versaoBase: number | null;
  periodoDias: number;
  total: number;
  porVersao: Record<string, { descartadas: number; seguem: number }>;
  mudamDeLado: { id: number; portal: string; numero: string | null; orgao: string | null; objeto: string | null; vigente: string; nova: string }[];
  em: string;
}

export interface FunilVersaoDetalhe {
  resumo: FunilVersaoResumo;
  config: FunilConfig;
  comparacao: Comparacao | null;
  palavras: { termo: string; origem: 'PORTFOLIO' | 'ADICIONAL' }[];
}

export interface MetricasLicitacoes {
  captadas: number;
  porFonte: Record<string, number>;
  porCamada: Record<string, number>;
  motivosDeRegra: Record<string, number>;
  porStatus: Record<string, number>;
  perdidasPorNaoCaptacao: number;
  perdidasPorFonte: Record<string, number>;
  horasAteDecisao: number | null;
}

export interface PerdaCaptacao {
  id: number;
  orgao: string;
  numero: string | null;
  objeto: string | null;
  fonteVista: string;
  motivoProvavel: string | null;
  registradoPor: string;
  criadoEm: string;
}
