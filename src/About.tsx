
import React, { useState, useEffect, useCallback } from 'react';
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

const SchoolDashboardContent: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isLoading, requiresPasswordChange, updateUser } = useSystemAuth();
  const [activeTab, setActiveTab] = useState<'live' | 'students' | 'attendance' | 'users' | 'reports'>('live');
  const [stats, setStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [studentsInSchool, setStudentsInSchool] = useState<any[]>([]);
  const [lateArrivals, setLateArrivals] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // User management
  const [parentUsers, setParentUsers] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userAction, setUserAction] = useState('');

  // Reports
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const demoStudents = [
    { student_id: 'STU-2025-001', first_name: 'Ana', last_name: 'Machel', grade: '5ª Classe', class_name: 'Turma A', status: 'active', qr_token: 'QR-TOKEN-001-SECURE' },
    { student_id: 'STU-2025-002', first_name: 'João', last_name: 'Mondlane', grade: '6ª Classe', class_name: 'Turma B', status: 'active', qr_token: 'QR-TOKEN-002-SECURE' },
    { student_id: 'STU-2025-003', first_name: 'Maria', last_name: 'Chissano', grade: '7ª Classe', class_name: 'Turma A', status: 'active', qr_token: 'QR-TOKEN-003-SECURE' },
    { student_id: 'STU-2025-004', first_name: 'Pedro', last_name: 'Guebuza', grade: '8ª Classe', class_name: 'Turma B', status: 'active', qr_token: 'QR-TOKEN-004-SECURE' },
    { student_id: 'STU-2025-005', first_name: 'Sofia', last_name: 'Nyusi', grade: '5ª Classe', class_name: 'Turma B', status: 'active', qr_token: 'QR-TOKEN-005-SECURE' },
  ];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/sistema/login');
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (user) { loadLiveDashboard(); loadStudents(); }
  }, [user]);

  useEffect(() => {
    if (user) loadAttendanceLogs();
  }, [dateFilter, user]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!autoRefresh || activeTab !== 'live') return;
    const interval = setInterval(() => { loadLiveDashboard(); }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, user]);

  const loadLiveDashboard = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('eduguard-data', {
        body: { action: 'get_live_dashboard', school_id: user?.school_id, user_id: user?.id, user_type: 'system_user', operator_name: user?.name }
      });
      if (data?.success) {
        setStats(data.stats);
        setRecentLogs(data.recent_logs || []);
        setStudentsInSchool(data.students_in_school || []);
        setLateArrivals(data.late_arrivals || []);
        setLastRefresh(new Date());
      } else {
        setStats({ today_entries: 0, today_exits: 0, total_students: demoStudents.length, students_in_school: 0, not_arrived: demoStudents.length });
      }
    } catch (err) {
      setStats({ today_entries: 0, today_exits: 0, total_students: demoStudents.length, students_in_school: 0, not_arrived: demoStudents.length });
    }
    setLoading(false);
  }, [user]);

  const loadStudents = async () => {
    try {
      const { data } = await supabase.functions.invoke('eduguard-data', {
        body: { action: 'get_all_students', school_id: user?.school_id, user_id: user?.id, user_type: 'system_user' }
      });
      if (data?.success && data.data?.length > 0) setStudents(data.data);
      else setStudents(demoStudents);
    } catch (err) { setStudents(demoStudents); }
  };

  const loadAttendanceLogs = async () => {
    try {
      const { data } = await supabase.functions.invoke('eduguard-data', {
        body: { action: 'get_attendance', school_id: user?.school_id, date_from: dateFilter, date_to: dateFilter, user_id: user?.id, user_type: 'system_user' }
      });
      if (data?.success) setAttendanceLogs(data.data || []);
    } catch (err) {}
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const [parentsRes, sysRes] = await Promise.all([
        supabase.functions.invoke('eduguard-auth', { body: { action: 'get_all_users', target_type: 'parents' } }),
        supabase.functions.invoke('eduguard-auth', { body: { action: 'get_all_users', target_type: 'system_users' } })
      ]);
      if (parentsRes.data?.success) setParentUsers(parentsRes.data.data || []);
      if (sysRes.data?.success) setSystemUsers(sysRes.data.data || []);
    } catch (err) {}
    setUsersLoading(false);
  };

  useEffect(() => { if (activeTab === 'users') loadUsers(); }, [activeTab]);

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

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const { data } = await supabase.functions.invoke('eduguard-data', {
        body: { action: 'get_report_data', school_id: user?.school_id, report_type: reportType, report_date: reportDate, user_id: user?.id, user_type: 'system_user' }
      });
      if (data?.success) setReportData(data.report);
      else setReportData({ type: reportType, date_from: reportDate, date_to: reportDate, total_students: 0, total_entries: 0, total_exits: 0, late_arrivals: [], early_departures: [], absent_students: demoStudents, daily_breakdown: [], all_logs: [] });
    } catch (err) {
      setReportData({ type: reportType, date_from: reportDate, date_to: reportDate, total_students: 0, total_entries: 0, total_exits: 0, late_arrivals: [], early_departures: [], absent_students: demoStudents, daily_breakdown: [], all_logs: [] });
    }
    setGeneratingReport(false);
  };

  const exportReportPDF = () => {
    if (!reportData) return;
    const typeLabel = reportType === 'daily' ? 'Diário' : reportType === 'weekly' ? 'Semanal' : 'Mensal';
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório ${typeLabel}</title><style>body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:40px;color:#333}.header{text-align:center;margin-bottom:30px;border-bottom:3px solid #2ecc71;padding-bottom:20px}.header h1{color:#0b1d2a;margin:0;font-size:28px}.header .subtitle{color:#2ecc71;font-size:14px;font-weight:bold;letter-spacing:2px;margin-top:5px}.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin:25px 0}.stat-card{background:#f8f9fa;border-radius:10px;padding:15px;text-align:center;border:1px solid #e9ecef}.stat-card .number{font-size:32px;font-weight:bold;color:#0b1d2a}.stat-card .label{font-size:12px;color:#666;margin-top:5px}.section{margin:25px 0}.section h2{color:#0b1d2a;font-size:18px;border-bottom:2px solid #2ecc71;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:10px}th{background:#0b1d2a;color:white;padding:10px 12px;text-align:left;font-size:12px}td{padding:8px 12px;border-bottom:1px solid #e9ecef;font-size:13px}tr:nth-child(even){background:#f8f9fa}.footer{margin-top:40px;text-align:center;color:#999;font-size:11px;border-top:1px solid #e9ecef;padding-top:15px}@media print{body{padding:20px}}</style></head><body><div class="header"><div class="subtitle">EDU&bull;GUARD360</div><h1>Relatório ${typeLabel}</h1><div style="color:#666;margin-top:10px">Colégio Internacional de Maputo</div><div style="color:#999;font-size:13px;margin-top:5px">${reportData.date_from} a ${reportData.date_to}</div></div><div class="stats-grid"><div class="stat-card"><div class="number">${reportData.total_students}</div><div class="label">Total Alunos</div></div><div class="stat-card"><div class="number">${reportData.total_entries}</div><div class="label">Entradas</div></div><div class="stat-card"><div class="number">${reportData.total_exits}</div><div class="label">Saídas</div></div><div class="stat-card"><div class="number">${reportData.absent_students?.length||0}</div><div class="label">Ausentes</div></div></div>${reportData.absent_students?.length>0?`<div class="section"><h2>Alunos Ausentes</h2><table><thead><tr><th>Nome</th><th>Classe</th><th>Turma</th></tr></thead><tbody>${reportData.absent_students.map((s:any)=>`<tr><td>${s.first_name} ${s.last_name}</td><td>${s.grade}</td><td>${s.class_name}</td></tr>`).join('')}</tbody></table></div>`:''}<div class="footer"><p>Gerado por EDU&bull;GUARD360 - ${user?.name}</p><p>${new Date().toLocaleString('pt-MZ')}</p></div></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(htmlContent); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#0b1d2a] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2ecc71] border-t-transparent"></div></div>;
  }

  const tabItems = [
    { id: 'live', label: 'Dashboard ao Vivo', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'students', label: 'Alunos', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'attendance', label: 'Presenças', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'users', label: 'Utilizadores', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'reports', label: 'Relatórios', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1d2a] via-[#0f2a3d] to-[#0b1d2a]">
      <ChangePasswordModal isOpen={requiresPasswordChange} onSuccess={() => updateUser({ password_changed: true })} isMandatory={true} />

      <header className="bg-[#0b1d2a]/80 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><ShieldIcon /><span className="text-xl font-bold text-white">EDU<span className="text-[#2ecc71]">•</span>GUARD360</span></Link>
          <div className="flex items-center gap-4">
            <Link to="/sistema/scanner" className="px-3 py-1.5 bg-[#2ecc71] text-white rounded-lg text-sm hover:bg-[#27ae60] transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              Scanner QR
            </Link>
            <span className="text-gray-300 text-sm hidden sm:block">{user?.name}</span>
            <button onClick={logout} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Gestão Escolar</h1>
            <p className="text-gray-400">Colégio Internacional de Maputo | Operador: <strong className="text-white">{user?.name}</strong></p>
          </div>
          {activeTab === 'live' && (
            <div className="flex items-center gap-3">
              <button onClick={() => setAutoRefresh(!autoRefresh)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${autoRefresh ? 'bg-[#2ecc71]/20 text-[#2ecc71] border border-[#2ecc71]/30' : 'bg-white/10 text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-[#2ecc71] animate-pulse' : 'bg-gray-500'}`}></div>
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </button>
              <button onClick={loadLiveDashboard} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">Actualizar</button>
              <span className="text-gray-500 text-xs">{lastRefresh.toLocaleTimeString('pt-MZ')}</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Entradas Hoje', value: stats?.today_entries || 0, color: '#2ecc71', icon: 'M11 16l-4-4m0 0l4-4m-4 4h14' },
            { label: 'Saídas Hoje', value: stats?.today_exits || 0, color: '#f39c12', icon: 'M17 16l4-4m0 0l-4-4m4 4H7' },
            { label: 'Na Escola', value: stats?.students_in_school || 0, color: '#3498db', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
            { label: 'Não Chegaram', value: stats?.not_arrived || 0, color: '#e74c3c', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Total Alunos', value: stats?.total_students || 0, color: '#9b59b6', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.color + '33' }}>
                  <svg className="w-5 h-5" style={{ color: stat.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} /></svg>
                </div>
                <div><p className="text-gray-400 text-xs">{stat.label}</p><p className="text-2xl font-bold text-white">{stat.value}</p></div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabItems.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-[#2ecc71] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Dashboard */}
        {activeTab === 'live' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-[#2ecc71] rounded-full animate-pulse"></div>
                Movimentos Recentes
              </h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recentLogs.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Nenhum movimento registado hoje.</p>
                ) : recentLogs.map((log: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.movement_type === 'ENTRADA' ? 'bg-[#2ecc71]' : 'bg-orange-500'}`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={log.movement_type === 'ENTRADA' ? 'M11 16l-4-4m0 0l4-4m-4 4h14' : 'M17 16l4-4m0 0l-4-4m4 4H7'} /></svg>
                    </div>
                    <div className="flex-1"><p className="text-white font-medium">{log.students?.first_name} {log.students?.last_name}</p><p className="text-gray-400 text-sm">{log.students?.grade}</p></div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${log.movement_type === 'ENTRADA' ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : 'bg-orange-500/20 text-orange-400'}`}>{log.movement_type}</span>
                      <p className="text-gray-500 text-sm mt-1">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Alunos na Escola ({studentsInSchool.length})</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {studentsInSchool.length === 0 ? (
                    <p className="text-gray-400 text-sm">Nenhum aluno na escola</p>
                  ) : studentsInSchool.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                      <div><p className="text-white text-sm">{s.first_name} {s.last_name}</p><p className="text-gray-500 text-xs">{s.grade}</p></div>
                      <span className="text-[#2ecc71] text-xs">Entrada: {s.last_entry_time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {lateArrivals.length > 0 && (
                <div className="bg-yellow-500/10 backdrop-blur-lg rounded-2xl p-6 border border-yellow-500/20">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-4">Chegadas Tardias ({lateArrivals.length})</h3>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    {lateArrivals.map((a: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                        <p className="text-white text-sm">{a.student?.first_name} {a.student?.last_name}</p>
                        <span className="text-yellow-400 text-xs font-mono">{a.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5"><tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Classe</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Turma</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">QR Token</th>
                </tr></thead>
                <tbody className="divide-y divide-white/10">
                  {students.map((s) => (
                    <tr key={s.student_id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-gray-400 text-sm font-mono">{s.student_id}</td>
                      <td className="px-4 py-3 text-white text-sm font-medium">{s.first_name} {s.last_name}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{s.grade}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{s.class_name}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">{s.qr_token || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <label className="text-gray-300 text-sm">Data:</label>
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2ecc71]" />
              <button onClick={loadAttendanceLogs} className="px-4 py-2 bg-[#2ecc71] hover:bg-[#27ae60] text-white rounded-lg transition-colors text-sm">Actualizar</button>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5"><tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Hora</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Aluno</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Classe</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Movimento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Local</th>
                  </tr></thead>
                  <tbody className="divide-y divide-white/10">
                    {attendanceLogs.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum registo para esta data</td></tr>
                    ) : attendanceLogs.map((log) => (
                      <tr key={log.log_id} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-white text-sm font-mono">{log.time}</td>
                        <td className="px-4 py-3 text-white text-sm">{log.students?.first_name} {log.students?.last_name}</td>
                        <td className="px-4 py-3 text-gray-300 text-sm">{log.students?.grade}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${log.movement_type === 'ENTRADA' ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : 'bg-orange-500/20 text-orange-400'}`}>{log.movement_type}</span></td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{log.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Management Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {usersLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2ecc71] border-t-transparent"></div></div>
            ) : (
              <>
                {/* Parents */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10"><h3 className="text-white font-semibold">Pais / Encarregados ({parentUsers.length})</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5"><tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Nome</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Telefone</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Educandos</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Password</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Acção</th>
                      </tr></thead>
                      <tbody className="divide-y divide-white/10">
                        {parentUsers.map((p) => (
                          <tr key={p.parent_id} className="hover:bg-white/5">
                            <td className="px-4 py-3 text-white text-sm">{p.first_name} {p.last_name}</td>
                            <td className="px-4 py-3 text-gray-300 text-sm">{p.email}</td>
                            <td className="px-4 py-3 text-gray-300 text-sm">{p.phone || '-'}</td>
                            <td className="px-4 py-3 text-gray-300 text-sm text-center">{p.student_count || 0}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${p.password_changed ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : 'bg-yellow-500/20 text-yellow-400'}`}>{p.password_changed ? 'Alterada' : 'Inicial'}</span></td>
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

                {/* System Users */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10"><h3 className="text-white font-semibold">Funcionários do Sistema ({systemUsers.length})</h3></div>
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
                        {systemUsers.filter(u => u.role !== 'super_admin').map((u) => (
                          <tr key={u.user_id} className="hover:bg-white/5">
                            <td className="px-4 py-3 text-white text-sm">{u.first_name} {u.last_name}</td>
                            <td className="px-4 py-3 text-gray-300 text-sm">{u.email}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${u.role === 'security' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{u.role === 'security' ? 'Segurança' : u.role === 'school_admin' ? 'Gestor Escola' : u.role}</span></td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${u.password_changed ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : 'bg-yellow-500/20 text-yellow-400'}`}>{u.password_changed ? 'Alterada' : 'Inicial'}</span></td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${u.status === 'active' ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : 'bg-red-500/20 text-red-400'}`}>{u.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleUserStatus(u.user_id, 'system_user', u.status === 'active')} disabled={userAction === u.user_id}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${u.status === 'active' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-[#2ecc71]/20 text-[#2ecc71] hover:bg-[#2ecc71]/30'}`}>
                                {userAction === u.user_id ? '...' : u.status === 'active' ? 'Desactivar' : 'Activar'}
                              </button>
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

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Gerar Relatório</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div><label className="block text-sm text-gray-300 mb-2">Tipo</label><select value={reportType} onChange={(e) => setReportType(e.target.value as any)} className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2ecc71]"><option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></div>
                <div><label className="block text-sm text-gray-300 mb-2">Data</label><input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2ecc71]" /></div>
                <div className="flex items-end gap-2">
                  <button onClick={generateReport} disabled={generatingReport} className="flex-1 py-2.5 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-semibold rounded-lg transition-colors disabled:opacity-50">{generatingReport ? 'A gerar...' : 'Gerar'}</button>
                </div>
              </div>
            </div>
            {reportData && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Resultado</h3>
                  <button onClick={exportReportPDF} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Exportar PDF
                  </button>
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
      </main>
    </div>
  );
};

const SchoolDashboard: React.FC = () => (
  <SystemAuthProvider><SchoolDashboardContent /></SystemAuthProvider>
);

export default SchoolDashboard;
