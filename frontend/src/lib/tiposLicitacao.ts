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
  propostasPorEstado: Record<string, number>;
  resultadoDoPeriodo: Record<string, number>;
  atasVigentes: number;
  itensDeAtaComSaldo: number;
  tabelaGovernoReferencia: string | null;
  tabelaGovernoDesatualizada: boolean;
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

// ---- Spec 007: proposta de licitação, resultado, atas e empenhos ----

export type Resultado = 'VENCEDOR' | 'PERDEU' | 'DESCLASSIFICADO';
export type OrigemRegistro = 'FONTE' | 'PESSOA';

export interface CandidatoLinha {
  codProd: number;
  nome: string;
  marca: string | null;
  embalagem: string | null;
  status: string | null;
  coverage: number;
}

export interface LinhaProposta {
  itemId: number;
  item: string;
  descricao: string;
  unidade: string | null;
  quantidade: string | number | null;
  situacao: string;
  marcas: string[];
  codProd: number | null;
  marca: string | null;
  fabricante: string | null;
  embalagem: string | null;
  registroAnvisa: string | null;
  precoSugerido: number | null;
  precoFinal: number | null;
  preco: number | null;
  justificativa: string | null;
  tetoGoverno: number | null;
  tetoAliquota: number | null;
  tetoData: string | null;
  justificativaTeto: string | null;
  custo: number | null;
  valorMinimo: number | null;
  memoriaMinimo: string | null;
  declinado: boolean;
  motivoDeclinio: string | null;
  resultado: Resultado | null;
  precoVencedor: number | null;
  resultadoOrigem: OrigemRegistro | null;
  /** Confiança do casamento do item com o catálogo (0..1); null sem casamento. */
  confianca: number | null;
  /** Os 5 primeiros candidatos do casamento, para escolher quando nenhum passou do limiar. */
  candidatos: CandidatoLinha[];
}

export interface PropostaLicitacao {
  oportunidadeId: number;
  status: string;
  numero: string | null;
  orgao: string | null;
  uf: string | null;
  modalidade: string | null;
  sessaoEm: string | null;
  propostaId: number | null;
  aprovadoPor: string | null;
  aprovadoEm: string | null;
  enviadoPor: string | null;
  enviadoEm: string | null;
  protocolo: string | null;
  excecaoPisoJustificativa: string | null;
  excecaoPisoPor: string | null;
  excecaoPisoEm: string | null;
  pacoteVersao: string | null;
  validadeHoras: number | null;
  condicaoPagamento: string | null;
  tipoFrete: string | null;
  pendencias: string[];
  linhas: LinhaProposta[];
}

/** Uma linha a editar (PATCH proposta); só o que vier preenchido muda. */
export interface EdicaoLinha {
  itemId: number;
  codProd?: number | null;
  precoFinal?: number | null;
  justificativa?: string | null;
  valorMinimo?: number | null;
  justificativaTeto?: string | null;
  declinar?: boolean;
  motivo?: string | null;
}

export interface Pacote {
  nome: string;
  base64: string;
  linhas: number;
  documentosComArquivo: number;
  documentosFaltando: number;
}

export interface AtaItem {
  id: number;
  itemId: number | null;
  codProd: number | null;
  descricao: string | null;
  quantidadeRegistrada: number;
  quantidadeEmpenhada: number;
  precoRegistrado: number | null;
  saldo: number;
  saldoPct: number;
  alertadoSaldoEm: string | null;
}

export interface Ata {
  id: number;
  oportunidadeId: number;
  numero: string;
  orgaoCnpj: string | null;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  origem: OrigemRegistro;
  registradoPor: string | null;
  itens: AtaItem[];
}

export interface Empenho {
  id: number;
  ataId: number;
  numero: string;
  data: string | null;
  pedidoId: number | null;
  itens: { ataItemId: number; quantidade: number }[];
  registradoPor: string | null;
  criadoEm: string;
}

export interface AtaResumo { ata: Ata; orgao: string | null; numeroLicitacao: string | null; vigente: boolean }
export interface AtaDetalhe extends AtaResumo { empenhos: Empenho[] }

export interface SituacaoTabelaGoverno {
  referencia: string | null;
  linhas: number;
  desatualizada: boolean;
  /** upload = arquivo CMED pelo admin; mitra = lista em vigor no Precificação, copiada todo dia */
  fonte: 'upload' | 'mitra';
  idadeMaximaDias: number;
}
