
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SystemAuthProvider, useSystemAuth } from '@/context/SystemAuthContext';
import { supabase } from '@/lib/supabase';
import ChangePasswordModal from '@/components/eduguard/ChangePasswordModal';

const ShieldIcon = () => (
  <svg className="w-8 h-8 text-[#2ecc71]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const AdminDashboardContent: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isLoading, requiresPasswordChange, updateUser } = useSystemAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'users' | 'settings' | 'reports'>('overview');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalLogins: 0, totalScans: 0, totalViews: 0 });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');

  // User management
  const [parentUsers, setParentUsers] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userAction, setUserAction] = useState('');

  // System settings
  const [smsGlobalEnabled, setSmsGlobalEnabled] = useState(false);
  const [emailGlobalEnabled, setEmailGlobalEnabled] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  // Reports
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/sistema/login');
    if (!isLoading && user && user.role !== 'super_admin') navigate('/sistema/escola');
  }, [isAuthenticated, isLoading, user, navigate]);

  useEffect(() => { if (user) { loadAuditLogs(); loadAttendanceLogs(); } }, [dateFilter, user]);
  useEffect(() => { if (activeTab === 'users') loadUsers(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'settings') loadSettings(); }, [activeTab]);

  const getDateRange = () => {
    const now = new Date();
    let dateFrom = new Date();
    switch (dateFilter) { case 'today': dateFrom.setHours(0,0,0,0); break; case 'week': dateFrom.setDate(now.getDate()-7); break; case 'month': dateFrom.setMonth(now.getMonth()-1); break; }
    return { dateFrom: dateFrom.toISOString(), dateTo: now.toISOString() };
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const { dateFrom, dateTo } = getDateRange();
      const { data } = await supabase.functions.invoke('eduguard-data', {
        body: { action: 'get_audit_logs', user_id: user?.id, user_type: 'system_user', date_from: dateFrom, date_to: dateTo, operator_name: user?.name }
      });
      if (data?.success) {
        setAuditLogs(data.data || []);
        const logs = data.data || [];
        setStats({
          totalLogins: logs.filter((l: any) => l.action === 'LOGIN').length,
          totalScans: logs.filter((l: any) => l.action === 'SCAN_QR').length,
          totalViews: logs.filter((l: any) => !['LOGIN', 'SCAN_QR'].includes(l.action)).length
        });
      }
    } catch (err) {}
    setLoading(false);
  };

  const loadAttendanceLogs = async () => {
    try {
      const { dateFrom, dateTo } = getDateRange();
      const { data } = await supabase.functions.invoke('eduguard-data', {
        body: { action: 'get_attendance', user_id: user?.id, user_type: 'system_user', date_from: dateFrom.split('T')[0], date_to: dateTo.split('T')[0] }
      });
      if (data?.success) setAttendanceLogs(data.data || []);
    } catch (err) {}
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const [pr, sr] = await Promise.all([
        supabase.functions.invoke('eduguard-auth', { body: { action: 'get_all_users', target_type: 'parents' } }),
        supabase.functions.invoke('eduguard-auth', { body: { action: 'get_all_users', target_type: 'system_users' } })
      ]);
      if (pr.data?.success) setParentUsers(pr.data.data || []);
      if (sr.data?.success) setSystemUsers(sr.data.data || []);
    } catch (err) {}
    setUsersLoading(false);
  };

  const loadSettings = async () => {
    try {
      const { data } = await supabase.functions.invoke('eduguard-auth', { body: { action: 'get_system_settings' } });
      if (data?.success) {
        setSmsGlobalEnabled(data.settings.sms_global_enabled === true || data.settings.sms_global_enabled === 'true');
        setEmailGlobalEnabled(data.settings.email_global_enabled !== false && data.settings.email_global_enabled !== 'false');
      }
    } catch (err) {}
  };

  const toggleUserStatus = async (targetId: string, targetType: string, currentActive: boolean) => {
    setUserAction(targetId);
    try {
      const { data } = await supabase.functions.invoke('eduguard-auth', {
        body: { action: 'manage_user', target_user_id: targetId, target_user_type: targetType, new_status: currentActive ? 'inactive' : 'active', operator_id: user?.id, operator_name: user?.name }
      });
      if (data?.success) loadUsers();
    } catch (err) {}
    setUserAction('');
  };

  const saveSetting = async (key: string, value: any) => {
    setSettingsLoading(true);
    setSettingsMessage('');
    try {
      const { data } = await supabase.functions.invoke('eduguard-auth', {
        body: { action: 'update_system_setting', setting_key: key, setting_value: value, operator_id: user?.id, operator_name: user?.name }
      });
      if (data?.success) {
        setSettingsMessage('Definição actualizada com sucesso!');
        if (key === 'sms_global_enabled') setSmsGlobalEnabled(value);
        if (key === 'email_global_enabled') setEmailGlobalEnabled(value);
      }
    } catch (err) {
      setSettingsMessage('Erro ao actualizar');
    }
    setSettingsLoading(false);
    setTimeout(() => setSettingsMessage(''), 3000);
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const { data } = await supabase.functions.invoke('eduguard-data', {
        body: { action: 'get_report_data', school_id: 'SCH-001', report_type: reportType, report_date: reportDate, user_id: user?.id, user_type: 'system_user' }
      });
      if (data?.success) setReportData(data.report);
      else setReportData({ type: reportType, date_from: reportDate, date_to: reportDate, total_students: 0, total_entries: 0, total_exits: 0, late_arrivals: [], early_departures: [], absent_students: [], daily_breakdown: [], all_logs: [] });
    } catch (err) {
      setReportData({ type: reportType, date_from: reportDate, date_to: reportDate, total_students: 0, total_entries: 0, total_exits: 0, late_arrivals: [], early_departures: [], absent_students: [], daily_breakdown: [], all_logs: [] });
    }
    setGeneratingReport(false);
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'LOGIN': 'Login', 'SCAN_QR': 'Leitura QR', 'CHANGE_PASSWORD': 'Alterou Password',
      'UPDATE_PROFILE': 'Actualizou Perfil', 'ACTIVATE_USER': 'Activou Utilizador',
      'DEACTIVATE_USER': 'Desactivou Utilizador', 'UPDATE_SETTING': 'Alterou Definição',
      'GET_ATTENDANCE': 'Consulta Presenças', 'GET_STUDENT_STATUS': 'Consulta Estado',
      'GET_AUDIT_LOGS': 'Consulta Auditoria', 'GET_NOTIFICATIONS': 'Consulta Notificações',
      'GET_DASHBOARD_STATS': 'Dashboard', 'GET_ALL_STUDENTS': 'Lista Alunos',
      'GET_LIVE_DASHBOARD': 'Dashboard ao Vivo', 'GET_REPORT_DATA': 'Gerar Relatório',
      'UPDATE_NOTIFICATION_SETTINGS': 'Alterou Notificações'
    };
    return labels[action] || action;
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#0b1d2a] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2ecc71] border-t-transparent"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1d2a] via-[#0f2a3d] to-[#0b1d2a]">
      <ChangePasswordModal isOpen={requiresPasswordChange} onSuccess={() => updateUser({ password_changed: true })} isMandatory={true} />

      <header className="bg-[#0b1d2a]/80 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><ShieldIcon /><span className="text-xl font-bold text-white">EDU<span className="text-[#2ecc71]">•</span>GUARD360</span></Link>
          <div className="flex items-center gap-4">
            <Link to="/sistema/scanner" className="px-3 py-1.5 bg-[#2ecc71] text-white rounded-lg text-sm hover:bg-[#27ae60] transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              Scanner
            </Link>
            <span className="text-gray-300 text-sm hidden sm:block">{user?.name} (Admin)</span>
            <button onClick={logout} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Painel de Administração</h1>
            <p className="text-gray-400">Auditoria, gestão de utilizadores e definições do sistema</p>
          </div>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2ecc71]">
            <option value="today">Hoje</option><option value="week">Última Semana</option><option value="month">Último Mês</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Logins', value: stats.totalLogins, color: '#3498db' },
            { label: 'Leituras QR', value: stats.totalScans, color: '#2ecc71' },
            { label: 'Consultas', value: stats.totalViews, color: '#9b59b6' },
            { label: 'Movimentos', value: attendanceLogs.length, color: '#f39c12' },
          ].map((s, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <p className="text-gray-400 text-xs">{s.label}</p>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Visão Geral' },
            { id: 'audit', label: 'Auditoria' },
            { id: 'users', label: 'Utilizadores' },
            { id: 'settings', label: 'Definições' },
            { id: 'reports', label: 'Relatórios' }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-[#2ecc71] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading && activeTab === 'overview' ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2ecc71] border-t-transparent"></div></div>
        ) : (
          <>
            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Actividade Recente</h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {auditLogs.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">Nenhuma actividade</p>
                    ) : auditLogs.slice(0, 15).map((log) => (
                      <div key={log.log_id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{log.operator_name || log.user_id}</p>
                          <p className="text-gray-400 text-xs">{getActionLabel(log.action)}</p>
                        </div>
                        <span className="text-gray-500 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Últimos Movimentos</h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {attendanceLogs.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">Nenhum registo</p>
                    ) : attendanceLogs.slice(0, 15).map((log) => (
                      <div key={log.log_id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${log.movement_type === 'ENTRADA' ? 'bg-[#2ecc71]' : 'bg-orange-500'}`}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={log.movement_type === 'ENTRADA' ? 'M11 16l-4-4m0 0l4-4m-4 4h14' : 'M17 16l4-4m0 0l-4-4m4 4H7'} /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{log.students?.first_name} {log.students?.last_name}</p>
                          <p className="text-gray-400 text-xs">{log.movement_type}</p>
                        </div>
                        <span className="text-gray-500 text-xs">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Audit */}
            {activeTab === 'audit' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5"><tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Data/Hora</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Operador</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Acção</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Recurso</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/10">
                      {auditLogs.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum log</td></tr>
                      ) : auditLogs.map((log) => (
                        <tr key={log.log_id} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-white text-sm">{new Date(log.created_at).toLocaleString('pt-MZ')}</td>
                          <td className="px-4 py-3 text-white text-sm font-medium">{log.operator_name || log.user_id}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${log.user_type === 'parent' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{log.user_type === 'parent' ? 'Pai' : 'Sistema'}</span></td>
                          <td className="px-4 py-3 text-gray-300 text-sm">{getActionLabel(log.action)}</td>
                          <td className="px-4 py-3 text-gray-400 text-sm font-mono text-xs">{log.resource || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Users */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                {usersLoading ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2ecc71] border-t-transparent"></div></div>
                ) : (
                  <>
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
                      <div className="px-6 py-4 border-b border-white/10"><h3 className="text-white font-semibold">Pais / Encarregados ({parentUsers.length})</h3></div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5"><tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Nome</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Telefone</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Notif.</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Estado</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Acção</th>
                          </tr></thead>
                          <tbody className="divide-y divide-white/10">
                            {parentUsers.map((p) => (
                              <tr key={p.parent_id} className="hover:bg-white/5">
                                <td className="px-4 py-3 text-white text-sm">{p.first_name} {p.last_name}</td>
                                <td className="px-4 py-3 text-gray-300 text-sm">{p.email}</td>
                                <td className="px-4 py-3 text-gray-300 text-sm">{p.phone || '-'}</td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1">
                                    {p.email_enabled !== false && <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">Email</span>}
                                    {p.sms_enabled && <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">SMS</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${p.is_active !== false ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : 'bg-red-500/20 text-red-400'}`}>{p.is_active !== false ? 'Activo' : 'Inactivo'}</span></td>
                                <td className="px-4 py-3">
                                  <button onClick={() => toggleUserStatus(p.parent_id, 'parent', p.is_active !== false)} disabled={userAction === p.parent_id}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${p.is_active !== false ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-[#2ecc71]/20 text-[#2ecc71] hover:bg-[#2ecc71]/30'}`}>
                                    {userAction === p.parent_id ? '...' : p.is_active !== false ? 'Desactivar' : 'Activar'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
                      <div className="px-6 py-4 border-b border-white/10"><h3 className="text-white font-semibold">Funcionários ({systemUsers.length})</h3></div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5"><tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Nome</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Função</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Password</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Estado</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Acção</th>
                          </tr></thead>
                          <tbody className="divide-y divide-white/10">
                            {systemUsers.map((u) => (
                              <tr key={u.user_id} className="hover:bg-white/5">
                                <td className="px-4 py-3 text-white text-sm">{u.first_name} {u.last_name}</td>
                                <td className="px-4 py-3 text-gray-300 text-sm">{u.email}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${u.role === 'super_admin' ? 'bg-red-500/20 text-red-400' : u.role === 'security' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{u.role === 'super_admin' ? 'Admin' : u.role === 'security' ? 'Segurança' : 'Gestor'}</span></td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${u.password_changed ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : 'bg-yellow-500/20 text-yellow-400'}`}>{u.password_changed ? 'Alterada' : 'Inicial'}</span></td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${u.status === 'active' ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : 'bg-red-500/20 text-red-400'}`}>{u.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                                <td className="px-4 py-3">
                                  {u.role !== 'super_admin' && (
                                    <button onClick={() => toggleUserStatus(u.user_id, 'system_user', u.status === 'active')} disabled={userAction === u.user_id}
                                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${u.status === 'active' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-[#2ecc71]/20 text-[#2ecc71] hover:bg-[#2ecc71]/30'}`}>
                                      {userAction === u.user_id ? '...' : u.status === 'active' ? 'Desactivar' : 'Activar'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Settings */}
            {activeTab === 'settings' && (
              <div className="max-w-2xl space-y-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#2ecc71]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
                    Definições Globais de Notificação
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">Controle os canais de notificação disponíveis para todos os pais e encarregados de educação.</p>

                  <div className="space-y-4">
                    {/* Email Global */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">Notificações por Email</p>
                          <p className="text-gray-400 text-sm">Canal padrão de notificação</p>
                        </div>
                      </div>
                      <button onClick={() => saveSetting('email_global_enabled', !emailGlobalEnabled)} disabled={settingsLoading}
                        className={`relative w-14 h-7 rounded-full transition-colors ${emailGlobalEnabled ? 'bg-[#2ecc71]' : 'bg-gray-600'}`}>
                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${emailGlobalEnabled ? 'translate-x-7' : 'translate-x-0.5'}`}></div>
                      </button>
                    </div>

                    {/* SMS Global */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">Notificações por SMS</p>
                          <p className="text-gray-400 text-sm">Requer gateway SMS configurado</p>
                          <p className="text-yellow-400/70 text-xs mt-1">Ao activar, os pais que tiverem SMS activo receberão mensagens</p>
                        </div>
                      </div>
                      <button onClick={() => saveSetting('sms_global_enabled', !smsGlobalEnabled)} disabled={settingsLoading}
                        className={`relative w-14 h-7 rounded-full transition-colors ${smsGlobalEnabled ? 'bg-[#2ecc71]' : 'bg-gray-600'}`}>
                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${smsGlobalEnabled ? 'translate-x-7' : 'translate-x-0.5'}`}></div>
                      </button>
                    </div>

                    {settingsMessage && (
                      <div className={`px-4 py-3 rounded-lg text-sm ${settingsMessage.includes('sucesso') ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : 'bg-red-500/20 text-red-400'}`}>
                        {settingsMessage}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Informação do Sistema</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-white/10"><span className="text-gray-400">Versão</span><span className="text-white">EDU•GUARD360 v2.0</span></div>
                    <div className="flex justify-between py-2 border-b border-white/10"><span className="text-gray-400">Email Gateway</span><span className={emailGlobalEnabled ? 'text-[#2ecc71]' : 'text-red-400'}>{emailGlobalEnabled ? 'Activo' : 'Inactivo'}</span></div>
                    <div className="flex justify-between py-2 border-b border-white/10"><span className="text-gray-400">SMS Gateway</span><span className={smsGlobalEnabled ? 'text-[#2ecc71]' : 'text-gray-400'}>{smsGlobalEnabled ? 'Activo' : 'Inactivo'}</span></div>
                    <div className="flex justify-between py-2"><span className="text-gray-400">Administrador</span><span className="text-white">{user?.name}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Reports */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Gerar Relatório</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div><label className="block text-sm text-gray-300 mb-2">Tipo</label><select value={reportType} onChange={(e) => setReportType(e.target.value as any)} className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2ecc71]"><option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></div>
                    <div><label className="block text-sm text-gray-300 mb-2">Data</label><input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2ecc71]" /></div>
                    <div className="flex items-end"><button onClick={generateReport} disabled={generatingReport} className="w-full py-2.5 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-semibold rounded-lg transition-colors disabled:opacity-50">{generatingReport ? 'A gerar...' : 'Gerar'}</button></div>
                  </div>
                </div>
                {reportData && (
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Resultado</h3>
                      <button onClick={() => { /* same PDF export */ }} className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors text-sm">Exportar PDF</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white/5 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-white">{reportData.total_students}</p><p className="text-gray-400 text-xs">Total</p></div>
                      <div className="bg-white/5 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-[#2ecc71]">{reportData.total_entries}</p><p className="text-gray-400 text-xs">Entradas</p></div>
                      <div className="bg-white/5 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-orange-400">{reportData.total_exits}</p><p className="text-gray-400 text-xs">Saídas</p></div>
                      <div className="bg-white/5 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-red-400">{reportData.absent_students?.length || 0}</p><p className="text-gray-400 text-xs">Ausentes</p></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

const AdminDashboard: React.FC = () => (
  <SystemAuthProvider><AdminDashboardContent /></SystemAuthProvider>
);

export default AdminDashboard;
