import {
  Accessibility,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  History,
  LayoutDashboard,
  Lock,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Users,
  XCircle
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, ApiError, clearToken, downloadUrl, getToken, setToken } from './api';
import { Agenda, Bootstrap, History as HistoryItem, Notification, PendingIssue, Role, Unit, User } from './types';

type Page = 'dashboard' | 'agendas' | 'nova-agenda' | 'detalhes' | 'cadastros' | 'relatorios' | 'auditoria' | 'parametros';
type Notice = { type: 'success' | 'error' | 'info'; text: string };
type AgendaDetails = { agenda: Agenda; pendencias: PendingIssue[]; historico: HistoryItem[] };

const statusLabels: Record<string, string> = {
  Recebida: 'Recebida',
  Validada: 'Validada',
  ComPendencia: 'Com pendência',
  Devolvida: 'Devolvida',
  Corrigida: 'Corrigida',
  Aprovada: 'Aprovada',
  EmEdicao: 'Em edição'
};

const statusClass: Record<string, string> = {
  Recebida: 'tag tag-blue',
  Validada: 'tag tag-green',
  ComPendencia: 'tag tag-orange',
  Devolvida: 'tag tag-red',
  Corrigida: 'tag tag-teal',
  Aprovada: 'tag tag-emerald',
  EmEdicao: 'tag tag-slate'
};

const roleHome: Partial<Record<Role, Page>> = {
  'Unidade Executante': 'agendas',
  'Apoiador da Regulação': 'agendas',
  'Gestor da Regulação': 'dashboard',
  'Gestor/GERES': 'relatorios'
};

const emptyAgendaForm = {
  mesCompetencia: '2026-06',
  observacoes: '',
  unidadeId: '',
  data: '2026-06-18',
  horarioAtendimento: '08:00',
  quantidadeDeVagas: 10
};

function roleCan(user: User | null, roles: Role[]) {
  return !!user && roles.includes(user.perfil);
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function getUnitName(agenda: Agenda) {
  return typeof agenda.unidadeId === 'string' ? agenda.unidadeId : agenda.unidadeId?.nomeDaUnidade || 'Unidade não informada';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [notice, setNotice] = useState<Notice>({ type: 'info', text: 'Informe suas credenciais para acessar o AgendaOrg.' });
  const [loading, setLoading] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [selectedAgendaId, setSelectedAgendaId] = useState<string>('');
  const [details, setDetails] = useState<AgendaDetails | null>(null);
  const [bootstrap, setBootstrap] = useState<Bootstrap>({ roles: [], unidades: [], itens: [], profissionais: [] });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [login, setLogin] = useState({ login: 'admin', senha: 'agendaorg123' });

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(fontScale));
    document.documentElement.classList.toggle('alto-contraste', highContrast);
  }, [fontScale, highContrast]);

  useEffect(() => {
    if (!getToken()) return;
    api<{ user: User }>('/me')
      .then((response) => {
        setUser(response.user);
        setPage(roleHome[response.user.perfil] || 'dashboard');
        return hydrate();
      })
      .catch(() => clearToken());
  }, []);

  async function hydrate() {
    const [boot, agendaList, painel, alerts] = await Promise.all([
      api<Bootstrap>('/bootstrap'),
      api<Agenda[]>('/agendas'),
      api('/painel'),
      api<Notification[]>('/notificacoes')
    ]);
    setBootstrap(boot);
    setAgendas(agendaList);
    setDashboard(painel);
    setNotifications(alerts);
  }

  async function run<T>(action: () => Promise<T>, success?: string) {
    setLoading(true);
    try {
      const result = await action();
      if (success) setNotice({ type: 'success', text: success });
      return result;
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof ApiError ? error.message : 'Não foi possível concluir a operação.' });
    } finally {
      setLoading(false);
    }
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const response = await api<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(login)
      });
      setToken(response.token);
      setUser(response.user);
      setPage(roleHome[response.user.perfil] || 'dashboard');
      await hydrate();
      setNotice({ type: 'success', text: `Bem-vindo(a), ${response.user.nomeCompleto}.` });
    });
  }

  function logout() {
    clearToken();
    setUser(null);
    setDetails(null);
    setNotice({ type: 'info', text: 'Sessão encerrada com segurança.' });
  }

  async function refreshAgendas() {
    const agendaList = await api<Agenda[]>('/agendas');
    setAgendas(agendaList);
  }

  async function openDetails(id: string) {
    setSelectedAgendaId(id);
    const response = await api<AgendaDetails>(`/agendas/${id}`);
    setDetails(response);
    setPage('detalhes');
  }

  const unread = notifications.filter((item) => !item.indicativoLida).length;
  const chartData = useMemo(
    () => Object.entries(dashboard?.porEstado || {}).map(([name, value]) => ({ name: statusLabels[name] || name, value })),
    [dashboard]
  );

  if (!user) {
    return (
      <main className="login-shell" id="conteudo">
        <section className="login-panel" aria-labelledby="login-title">
          <div className="brand-mark">SES-PE</div>
          <h1 id="login-title">AgendaOrg</h1>
          <p>Sistema de apoio à padronização e validação de agendas ambulatoriais.</p>
          <form onSubmit={submitLogin} className="stack">
            <label>
              Login
              <input value={login.login} onChange={(event) => setLogin({ ...login, login: event.target.value })} autoComplete="username" />
            </label>
            <label>
              Senha
              <input value={login.senha} onChange={(event) => setLogin({ ...login, senha: event.target.value })} type="password" autoComplete="current-password" />
            </label>
            <button className="primary" disabled={loading}>
              <Lock size={18} aria-hidden />
              Entrar
            </button>
          </form>
          <p className="hint">Demonstração: admin, unidade, apoiador, gestor ou geres. Senha: agendaorg123.</p>
          <LiveNotice notice={notice} />
        </section>
      </main>
    );
  }

  const navigation = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard, visible: true },
    { id: 'agendas', label: 'Agendas', icon: CalendarCheck, visible: true },
    { id: 'nova-agenda', label: 'Registrar', icon: ClipboardList, visible: roleCan(user, ['Unidade Executante', 'Administrador', 'Equipe Administrativa']) },
    { id: 'cadastros', label: 'Cadastros', icon: Users, visible: roleCan(user, ['Administrador', 'Administrador do Sistema', 'Equipe Administrativa']) },
    { id: 'relatorios', label: 'Relatórios', icon: FileText, visible: true },
    { id: 'auditoria', label: 'Auditoria', icon: ShieldCheck, visible: roleCan(user, ['Administrador', 'Administrador do Sistema']) },
    { id: 'parametros', label: 'Parâmetros', icon: Settings, visible: roleCan(user, ['Administrador', 'Administrador do Sistema']) }
  ] as const;

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="brand-row">
          <div className="brand-mark small">PE</div>
          <div>
            <strong>AgendaOrg</strong>
            <span>SES Pernambuco</span>
          </div>
        </div>
        <nav>
          {navigation
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} className={page === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setPage(item.id as Page)}>
                  <Icon size={18} aria-hidden />
                  {item.label}
                </button>
              );
            })}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Secretaria Estadual de Saúde de Pernambuco</p>
            <h1>{pageTitle(page)}</h1>
          </div>
          <div className="toolbar" aria-label="Ações globais">
            <button title="Diminuir fonte" onClick={() => setFontScale(Math.max(0.92, fontScale - 0.06))}>A-</button>
            <button title="Aumentar fonte" onClick={() => setFontScale(Math.min(1.18, fontScale + 0.06))}>A+</button>
            <button title="Alto contraste" onClick={() => setHighContrast(!highContrast)}>
              <Accessibility size={18} aria-hidden />
            </button>
            <button title="Notificações" onClick={() => setPage('dashboard')}>
              <Bell size={18} aria-hidden />
              {unread > 0 && <span className="badge">{unread}</span>}
            </button>
            <button title="Sair" onClick={logout}>
              <LogOut size={18} aria-hidden />
            </button>
          </div>
        </header>

        <main id="conteudo" className="content" tabIndex={-1}>
          <LiveNotice notice={notice} />
          {loading && <div className="loading">Processando...</div>}
          {page === 'dashboard' && <Dashboard dashboard={dashboard} chartData={chartData} notifications={notifications} setNotifications={setNotifications} />}
          {page === 'agendas' && <AgendaList agendas={agendas} openDetails={(id) => run(() => openDetails(id))} refresh={() => run(refreshAgendas, 'Lista de agendas atualizada.')} />}
          {page === 'nova-agenda' && <AgendaForm bootstrap={bootstrap} onCreated={() => run(async () => { await refreshAgendas(); setPage('agendas'); }, 'Agenda registrada e recebida para validação.')} />}
          {page === 'detalhes' && details && <AgendaDetailsView details={details} user={user} reload={() => run(() => openDetails(selectedAgendaId))} refreshAgendas={refreshAgendas} />}
          {page === 'cadastros' && <RegistrationCenter bootstrap={bootstrap} reload={() => run(hydrate, 'Cadastros atualizados.')} />}
          {page === 'relatorios' && <Reports />}
          {page === 'auditoria' && <Audit />}
          {page === 'parametros' && <Parameters />}
        </main>
      </div>
    </div>
  );
}

function LiveNotice({ notice }: { notice: Notice }) {
  return (
    <div className={`notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'} aria-live="polite">
      {notice.text}
    </div>
  );
}

function pageTitle(page: Page) {
  const titles: Record<Page, string> = {
    dashboard: 'Painel gerencial',
    agendas: 'Consulta de agendas',
    'nova-agenda': 'Registrar agenda',
    detalhes: 'Detalhes da agenda',
    cadastros: 'Cadastros de base',
    relatorios: 'Relatórios',
    auditoria: 'Auditoria',
    parametros: 'Parâmetros'
  };
  return titles[page];
}

function Dashboard({ dashboard, chartData, notifications, setNotifications }: { dashboard: any; chartData: any[]; notifications: Notification[]; setNotifications: (items: Notification[]) => void }) {
  async function markRead(id: string) {
    const updated = await api<Notification>(`/notificacoes/${id}/lida`, { method: 'PATCH' });
    setNotifications(notifications.map((item) => (item._id === id ? updated : item)));
  }

  return (
    <section className="grid-dashboard">
      <Metric label="Agendas" value={dashboard?.totalAgendas || 0} />
      <Metric label="Unidades ativas" value={dashboard?.unidadesAtivas || 0} />
      <Metric label="Pendências ativas" value={dashboard?.pendenciasAtivas || 0} />
      <Metric label="Vagas ofertadas" value={dashboard?.vagasOfertadas || 0} />
      <section className="panel wide" aria-labelledby="chart-title">
        <h2 id="chart-title">Agendas por situação</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#007f5f" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
      <section className="panel" aria-labelledby="alert-title">
        <h2 id="alert-title">Notificações internas</h2>
        <div className="stack">
          {notifications.length === 0 && <p className="muted">Nenhuma notificação recebida.</p>}
          {notifications.slice(0, 6).map((item) => (
            <article className={item.indicativoLida ? 'notification read' : 'notification'} key={item._id}>
              <p>{item.textoDaMensagem}</p>
              <span>{formatDate(item.createdAt)}</span>
              {!item.indicativoLida && <button onClick={() => markRead(item._id)}>Marcar como lida</button>}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <section className="metric" aria-label={label}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function AgendaList({ agendas, openDetails, refresh }: { agendas: Agenda[]; openDetails: (id: string) => void; refresh: () => void }) {
  const [query, setQuery] = useState('');
  const filtered = agendas.filter((agenda) => `${getUnitName(agenda)} ${agenda.estadoAtual} ${agenda.mesCompetencia}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>Agendas ambulatoriais</h2>
          <p className="muted">Recebimento, validação, correção e acompanhamento por competência.</p>
        </div>
        <button onClick={refresh}>
          <Search size={18} aria-hidden />
          Atualizar
        </button>
      </div>
      <label className="search-field">
        Buscar agenda
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Unidade, situação ou competência" />
      </label>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Unidade</th>
              <th>Competência</th>
              <th>Situação</th>
              <th>Vagas</th>
              <th>Atualização</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((agenda) => (
              <tr key={agenda._id}>
                <td>{getUnitName(agenda)}</td>
                <td>{agenda.mesCompetencia}</td>
                <td><span className={statusClass[agenda.estadoAtual]}>{statusLabels[agenda.estadoAtual]}</span></td>
                <td>{agenda.ofertas.reduce((sum, oferta) => sum + oferta.quantidadeDeVagas, 0)}</td>
                <td>{formatDate(agenda.updatedAt)}</td>
                <td><button onClick={() => openDetails(agenda._id)}>Abrir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AgendaForm({ bootstrap, onCreated }: { bootstrap: Bootstrap; onCreated: () => void }) {
  const [form, setForm] = useState(emptyAgendaForm);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api('/agendas', {
      method: 'POST',
      body: JSON.stringify({
        unidadeId: form.unidadeId || undefined,
        mesCompetencia: form.mesCompetencia,
        observacoes: form.observacoes,
        ofertas: [
          {
            data: form.data,
            horarioAtendimento: form.horarioAtendimento,
            quantidadeDeVagas: Number(form.quantidadeDeVagas),
            itemAgendamentoId: bootstrap.itens[0]?._id,
            profissionalId: bootstrap.profissionais[0]?._id
          }
        ]
      })
    });
    onCreated();
  }

  return (
    <section className="panel narrow">
      <h2>Registrar nova agenda</h2>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Unidade executante
          <select value={form.unidadeId} onChange={(event) => setForm({ ...form, unidadeId: event.target.value })}>
            <option value="">Minha unidade / padrão do perfil</option>
            {bootstrap.unidades.map((unit) => <option key={unit._id} value={unit._id}>{unit.nomeDaUnidade}</option>)}
          </select>
        </label>
        <label>
          Competência
          <input type="month" value={form.mesCompetencia} onChange={(event) => setForm({ ...form, mesCompetencia: event.target.value })} required />
        </label>
        <label>
          Data da oferta
          <input type="date" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} required />
        </label>
        <label>
          Horário
          <input type="time" value={form.horarioAtendimento} onChange={(event) => setForm({ ...form, horarioAtendimento: event.target.value })} required />
        </label>
        <label>
          Quantidade de vagas
          <input type="number" min={1} value={form.quantidadeDeVagas} onChange={(event) => setForm({ ...form, quantidadeDeVagas: Number(event.target.value) })} required />
        </label>
        <label className="span-2">
          Observações
          <textarea value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} rows={4} />
        </label>
        <button className="primary span-2">
          <CheckCircle2 size={18} aria-hidden />
          Submeter agenda
        </button>
      </form>
    </section>
  );
}

function AgendaDetailsView({ details, user, reload, refreshAgendas }: { details: AgendaDetails; user: User; reload: () => void; refreshAgendas: () => Promise<void> }) {
  const [erros, setErros] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const agenda = details.agenda;
  const token = localStorage.getItem('agendaorg:token');

  async function action(path: string, body?: object) {
    await api(`/agendas/${agenda._id}/${path}`, { method: 'POST', body: JSON.stringify(body || {}) });
    await reload();
    await refreshAgendas();
  }

  async function uploadDocument(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    const body = new FormData();
    body.append('agendaId', agenda._id);
    body.append('arquivo', file);
    await api('/documentos', { method: 'POST', body });
    setFile(null);
    await reload();
  }

  return (
    <section className="details-layout">
      <article className="panel">
        <div className="section-head">
          <div>
            <h2>{getUnitName(agenda)}</h2>
            <p className="muted">Competência {agenda.mesCompetencia}</p>
          </div>
          <span className={statusClass[agenda.estadoAtual]}>{statusLabels[agenda.estadoAtual]}</span>
        </div>
        <div className="action-row">
          {roleCan(user, ['Apoiador da Regulação', 'Administrador', 'Gestor da Regulação']) && (
            <>
              <button onClick={() => action('validar', { erros: [] })}>Validar</button>
              <button onClick={() => action('validar', { erros: erros.split('\n').filter(Boolean) })}>Apontar pendências</button>
              <button onClick={() => action('devolver', { justificativa })}>Devolver</button>
            </>
          )}
          {roleCan(user, ['Unidade Executante', 'Administrador']) && <button onClick={() => action('corrigir', { correcoes: ['Correções registradas'], observacoes: justificativa })}>Corrigir pendências</button>}
          {roleCan(user, ['Gestor da Regulação', 'Administrador']) && (
            <>
              <button onClick={() => action('aprovar')}>Aprovar</button>
              <button onClick={() => action('reabrir', { motivo: justificativa || 'Reabertura solicitada para ajuste operacional' })}>Reabrir</button>
            </>
          )}
          <a className="button-like" href={`${downloadUrl(`/export/agendas/${agenda._id}?format=pdf`)}&token=${token || ''}`} target="_blank" rel="noreferrer">
            <Download size={18} aria-hidden />
            PDF
          </a>
          <a className="button-like" href={`${downloadUrl(`/export/agendas/${agenda._id}?format=excel`)}&token=${token || ''}`} target="_blank" rel="noreferrer">
            Excel
          </a>
        </div>
        <label>
          Pendências ou justificativa
          <textarea value={erros || justificativa} onChange={(event) => { setErros(event.target.value); setJustificativa(event.target.value); }} rows={4} placeholder="Uma pendência por linha ou justificativa da operação" />
        </label>
        <form className="upload" onSubmit={uploadDocument}>
          <label>
            Documento original
            <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>
          <button>Anexar</button>
        </form>
        <h3>Ofertas de vagas</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Horário</th><th>Vagas</th><th>Situação</th></tr></thead>
            <tbody>{agenda.ofertas.map((oferta) => <tr key={oferta._id || `${oferta.data}-${oferta.horarioAtendimento}`}><td>{oferta.data}</td><td>{oferta.horarioAtendimento}</td><td>{oferta.quantidadeDeVagas}</td><td>{oferta.indicativoAtiva === false ? 'Bloqueada' : 'Ativa'}</td></tr>)}</tbody>
          </table>
        </div>
      </article>
      <aside className="side-stack">
        <section className="panel">
          <h2>Pendências</h2>
          {details.pendencias.length === 0 && <p className="muted">Nenhuma pendência ativa.</p>}
          {details.pendencias.map((item) => <p key={item._id} className={item.resolvida ? 'resolved' : 'pending'}>{item.descricaoDoErro}</p>)}
        </section>
        <section className="panel">
          <h2>Linha do tempo</h2>
          {details.historico.map((item) => <p key={item._id} className="timeline"><History size={16} aria-hidden />{item.descricaoDaAcao}<span>{formatDate(item.createdAt)}</span></p>)}
        </section>
      </aside>
    </section>
  );
}

function RegistrationCenter({ bootstrap, reload }: { bootstrap: Bootstrap; reload: () => void }) {
  const [unit, setUnit] = useState({ nomeDaUnidade: '', codigoUnidadeSaude: '', geres: 'I GERES', municipio: 'Recife' });
  const [item, setItem] = useState({ nomeDoItem: '', codigoOcupacaoProfissional: '' });
  const [prof, setProf] = useState({ nomeCompleto: '', siglaConselho: 'CRM', numeroConselho: '', codigoUnidadeSaude: '' });

  async function submit(path: string, body: object) {
    await api(path, { method: 'POST', body: JSON.stringify(body) });
    reload();
  }

  return (
    <section className="registration-grid">
      <FormPanel title="Unidade executante" onSubmit={() => submit('/unidades', unit)}>
        <input aria-label="Nome da unidade" placeholder="Nome da unidade" value={unit.nomeDaUnidade} onChange={(e) => setUnit({ ...unit, nomeDaUnidade: e.target.value })} />
        <input aria-label="Código CNES" placeholder="Código CNES" value={unit.codigoUnidadeSaude} onChange={(e) => setUnit({ ...unit, codigoUnidadeSaude: e.target.value })} />
        <input aria-label="GERES" placeholder="GERES" value={unit.geres} onChange={(e) => setUnit({ ...unit, geres: e.target.value })} />
        <input aria-label="Município" placeholder="Município" value={unit.municipio} onChange={(e) => setUnit({ ...unit, municipio: e.target.value })} />
      </FormPanel>
      <FormPanel title="Profissional" onSubmit={() => submit('/profissionais', prof)}>
        <input aria-label="Nome do profissional" placeholder="Nome completo" value={prof.nomeCompleto} onChange={(e) => setProf({ ...prof, nomeCompleto: e.target.value })} />
        <input aria-label="Sigla do conselho" placeholder="Conselho" value={prof.siglaConselho} onChange={(e) => setProf({ ...prof, siglaConselho: e.target.value })} />
        <input aria-label="Número do conselho" placeholder="Número" value={prof.numeroConselho} onChange={(e) => setProf({ ...prof, numeroConselho: e.target.value })} />
        <input aria-label="Código da unidade" placeholder="Código da unidade" value={prof.codigoUnidadeSaude} onChange={(e) => setProf({ ...prof, codigoUnidadeSaude: e.target.value })} />
      </FormPanel>
      <FormPanel title="Item de agendamento" onSubmit={() => submit('/itens', item)}>
        <input aria-label="Nome do item" placeholder="Nome do item" value={item.nomeDoItem} onChange={(e) => setItem({ ...item, nomeDoItem: e.target.value })} />
        <input aria-label="Código ocupacional" placeholder="Código ocupacional" value={item.codigoOcupacaoProfissional} onChange={(e) => setItem({ ...item, codigoOcupacaoProfissional: e.target.value })} />
      </FormPanel>
      <section className="panel">
        <h2>Unidades cadastradas</h2>
        {bootstrap.unidades.map((u: Unit) => <p key={u._id} className="list-row">{u.nomeDaUnidade}<span>{u.codigoUnidadeSaude}</span></p>)}
      </section>
    </section>
  );
}

function FormPanel({ title, children, onSubmit }: { title: string; children: React.ReactNode; onSubmit: () => void }) {
  return (
    <form className="panel stack" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <h2>{title}</h2>
      {children}
      <button className="primary">Salvar</button>
    </form>
  );
}

function Reports() {
  const [month, setMonth] = useState('2026-06');
  const [report, setReport] = useState<any>(null);
  async function load(path = '/relatorios/gerais') {
    setReport(await api(`${path}?mesCompetencia=${month}`));
  }
  return (
    <section className="panel">
      <div className="section-head">
        <div><h2>Relatórios consolidados</h2><p className="muted">Dados de agendas, bloqueios e vagas não ofertadas.</p></div>
        <label>Competência<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
      </div>
      <div className="action-row">
        <button onClick={() => load('/relatorios/gerais')}>Gerar relatório geral</button>
        <button onClick={() => load('/relatorios/bloqueios')}>Vagas bloqueadas</button>
      </div>
      {report && <pre className="report">{JSON.stringify(report, null, 2)}</pre>}
    </section>
  );
}

function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { api<any[]>('/auditoria').then(setLogs).catch(() => setLogs([])); }, []);
  return (
    <section className="panel">
      <h2>Auditoria de ações do sistema</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Ação</th><th>Perfil</th><th>Recurso</th><th>Data</th></tr></thead>
          <tbody>{logs.map((log) => <tr key={log._id}><td>{log.descricaoDaAcao}</td><td>{log.perfil}</td><td>{log.recurso}</td><td>{formatDate(log.createdAt)}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function Parameters() {
  const [params, setParams] = useState<any[]>([]);
  useEffect(() => { api<any[]>('/parametros').then(setParams).catch(() => setParams([])); }, []);
  async function save() {
    const updated = await api<any[]>('/parametros', { method: 'PUT', body: JSON.stringify(params) });
    setParams(updated);
  }
  return (
    <section className="panel">
      <div className="section-head">
        <div><h2>Parâmetros de validação</h2><p className="muted">Regras globais usadas nos fluxos de validação.</p></div>
        <button onClick={save}>Salvar alterações</button>
      </div>
      <div className="stack">
        {params.map((param, index) => (
          <label key={param._id || param.chaveDeIdentificacaoDaRegra}>
            {param.descricao || param.chaveDeIdentificacaoDaRegra}
            <input value={String(param.valorLimiteDefinido)} onChange={(e) => setParams(params.map((p, i) => (i === index ? { ...p, valorLimiteDefinido: e.target.value } : p)))} />
          </label>
        ))}
      </div>
    </section>
  );
}
