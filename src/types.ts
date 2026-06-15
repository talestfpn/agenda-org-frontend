export type Role =
  | 'Administrador'
  | 'Administrador do Sistema'
  | 'Equipe Administrativa'
  | 'Unidade Executante'
  | 'Apoiador da Regulação'
  | 'Gestor da Regulação'
  | 'Gestor/GERES'
  | 'Usuário Autenticado';

export type AgendaState = 'Recebida' | 'Validada' | 'ComPendencia' | 'Devolvida' | 'Corrigida' | 'Aprovada' | 'EmEdicao';

export type User = {
  id: string;
  _id?: string;
  nomeCompleto: string;
  login: string;
  email: string;
  perfil: Role;
  unidadeId?: string;
  situacaoAtiva?: boolean;
};

export type Unit = {
  _id: string;
  nomeDaUnidade: string;
  codigoUnidadeSaude: string;
  geres: string;
  municipio: string;
  situacaoAtiva: boolean;
};

export type Professional = {
  _id: string;
  nomeCompleto: string;
  siglaConselho: string;
  numeroConselho: string;
  codigoUnidadeSaude: string;
  situacaoAtiva: boolean;
};

export type SchedulingItem = {
  _id: string;
  nomeDoItem: string;
  codigoOcupacaoProfissional: string;
  situacaoAtiva: boolean;
};

export type Vacancy = {
  _id?: string;
  data: string;
  horarioAtendimento: string;
  quantidadeDeVagas: number;
  itemAgendamentoId?: string;
  profissionalId?: string;
  indicativoAtiva?: boolean;
  justificativaDoBloqueio?: string;
};

export type Agenda = {
  _id: string;
  unidadeId: Unit | string;
  identificadorDaUnidade?: number;
  mesCompetencia: string;
  estadoAtual: AgendaState;
  observacoes?: string;
  ofertas: Vacancy[];
  createdAt: string;
  updatedAt: string;
};

export type PendingIssue = {
  _id: string;
  descricaoDoErro: string;
  resolvida: boolean;
  createdAt: string;
};

export type History = {
  _id: string;
  descricaoDaAcao: string;
  perfil?: string;
  createdAt: string;
};

export type Notification = {
  _id: string;
  textoDaMensagem: string;
  indicativoLida: boolean;
  createdAt: string;
};

export type Bootstrap = {
  roles: Role[];
  unidades: Unit[];
  itens: SchedulingItem[];
  profissionais: Professional[];
};
