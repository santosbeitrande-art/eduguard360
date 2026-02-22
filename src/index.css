
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

const ParentDashboardContent: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isLoading, updateUser, requiresPasswordChange } = useSystemAuth();
  const [activeTab, setActiveTab] = useState<'status' | 'history' | 'notifications' | 'settings'>('status');
  const [studentStatuses, setStudentStatuses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  
  // Notification settings
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  
  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/sistema/login');
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileEmail(user.email || '');
      setEmailEnabled(user.email_enabled !== false);
      setSmsEnabled(user.sms_enabled || false);
      setSmsPhone(user.sms_phone || user.phone || '');
      if (user.students && user.students.length > 0) {
        loadStudentStatuses();
        loadNotifications();
        setSelectedStudent(user.students[0].id);
      }
    }
  }, [user]);

  useEffect(() => {
    if (selectedStudent) loadAttendanceHistory(selectedStudent);
  }, [selectedStudent]);

  const loadStudentStatuses = async () => {
    if (!user?.students) return;
    setLoading(true);
    const statuses: any[] = [];
    for (const student of user.students) {
      try {
        const { data } = await supabase.functions.invoke('eduguard-data', {
          body: { action: 'get_student_status', student_id: student.id, user_id: user.id, user_type: 'parent' }
        });
        if (data?.success) { statuses.push(data); }
        else { statuses.push({ student: { id: student.id, name: student.name, grade: student.grade, class: student.class }, status: 'not_arrived', today_logs: [], last_movement: null }); }
      } catch (err) {
        statuses.push({ student: { id: student.id, name: student.name, grade: student.grade, class: student.class }, status: 'not_arrived', today_logs: [], last_movement: null });
      }
    }
    setStudentStatuses(statuses);
    setLoading(false);
  };

  const loadNotifications = async () => {
    try {
      const { data } = await supabase.functions.invoke('eduguard-data', {
        body: { action: 'get_notifications', user_id: user?.id, user_type: 'parent' }
      });
      if (data?.success) setNotifications(data.data || []);
    } catch (err) {}
  };

  const loadAttendanceHistory = async (studentId: string) => {
    try {
      const { data } = await supabase.functions.invoke('eduguard-data', {
        body: { action: 'get_attendance', student_id: studentId, user_id: user?.id, user_type: 'parent' }
      });
      if (data?.success) setAttendanceHistory(data.data || []);
    } catch (err) {}
  };

  const saveProfile = async () => {
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      const nameParts = profileName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const { data } = await supabase.functions.invoke('eduguard-auth', {
        body: { action: 'update_profile', user_id: user?.id, user_type: 'parent', first_name: firstName, last_name: lastName, phone: profilePhone, email: profileEmail }
      });
      if (data?.success) {
        updateUser({ name: profileName, phone: profilePhone, email: profileEmail });
        setSettingsMessage('Perfil actualizado com sucesso!');
        setEditingProfile(false);
      } else {
        setSettingsMessage(data?.error || 'Erro ao actualizar');
      }
    } catch (err) {
      updateUser({ name: profileName, phone: profilePhone, email: profileEmail });
      setSettingsMessage('Perfil guardado localmente');
      setEditingProfile(false);
    }
    setSavingSettings(false);
    setTimeout(() => setSettingsMessage(''), 4000);
  };

  const saveNotificationSettings = async () => {
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      const { data } = await supabase.functions.invoke('eduguard-auth', {
        body: { action: 'update_notification_settings', user_id: user?.id, sms_enabled: smsEnabled, sms_phone: smsPhone, email_enabled: emailEnabled, phone: profilePhone }
      });
      if (data?.success) {
        updateUser({ sms_enabled: smsEnabled, sms_phone: smsPhone, email_enabled: emailEnabled });
        setSettingsMessage('Definições de notificação actualizadas!');
      } else {
        setSettingsMessage(data?.error || 'Erro ao actualizar');
      }
    } catch (err) {
      updateUser({ sms_enabled: smsEnabled, sms_phone: smsPhone, email_enabled: emailEnabled });
      setSettingsMessage('Definições guardadas localmente');
    }
    setSavingSettings(false);
    setTimeout(() => setSettingsMessage(''), 4000);
  };

  const getStatusColor = (status: string) => {
    switch (status) { case 'in_school': return 'bg-[#2ecc71]'; case 'left_school': return 'bg-orange-500'; default: return 'bg-gray-500'; }
  };
  const getStatusText = (status: string) => {
    switch (status) { case 'in_school': return 'Na Escola'; case 'left_school': return 'Saiu da Escola'; default: return 'Não Chegou'; }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#0b1d2a] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2ecc71] border-t-transparent"></div></div>;
  }

  const tabs = [
    { id: 'status', label: 'Estado Actual', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'history', label: 'Histórico', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'notifications', label: 'Notificações', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'settings', label: 'Definições', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1d2a] via-[#0f2a3d] to-[#0b1d2a]">
      <ChangePasswordModal isOpen={requiresPasswordChange} onSuccess={() => updateUser({ password_changed: true })} isMandatory={true} />
      {showPasswordModal && !requiresPasswordChange && (
        <ChangePasswordModal isOpen={true} onSuccess={() => setShowPasswordModal(false)} isMandatory={false} />
      )}

      <header className="bg-[#0b1d2a]/80 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><ShieldIcon /><span className="text-xl font-bold text-white">EDU<span className="text-[#2ecc71]">•</span>GUARD360</span></Link>
          <div className="flex items-center gap-4">
            <span className="text-gray-300 text-sm hidden sm:block">{user?.name}</span>
            <button onClick={logout} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Área dos Pais</h1>
        <p className="text-gray-400 mb-8">Acompanhe a situação dos seus educandos</p>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-[#2ecc71] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
              {tab.label}
              {tab.id === 'notifications' && notifications.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{notifications.length > 9 ? '9+' : notifications.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Status Tab */}
        {activeTab === 'status' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2ecc71] border-t-transparent"></div></div>
            ) : studentStatuses.length === 0 ? (
              <div className="col-span-full text-center py-12"><p className="text-gray-400">Nenhum educando encontrado</p></div>
            ) : (
              studentStatuses.map((status) => (
                <div key={status.student.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <div className="flex items-start justify-between mb-4">
                    <div><h3 className="text-xl font-semibold text-white">{status.student.name}</h3><p className="text-gray-400 text-sm">{status.student.grade} - {status.student.class}</p></div>
                    <div className={`w-4 h-4 rounded-full ${getStatusColor(status.status)} ${status.status === 'in_school' ? 'animate-pulse' : ''}`}></div>
                  </div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    status.status === 'in_school' ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : status.status === 'left_school' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>{getStatusText(status.status)}</div>
                  {status.last_movement && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-gray-400 text-sm">Último movimento:</p>
                      <p className="text-white">{status.last_movement.type === 'ENTRADA' ? 'Entrada' : 'Saída'} às {status.last_movement.time}</p>
                    </div>
                  )}
                  {status.today_logs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-gray-400 text-sm mb-2">Movimentos de hoje:</p>
                      <div className="space-y-2">
                        {status.today_logs.map((log: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className={`w-2 h-2 rounded-full ${log.movement_type === 'ENTRADA' ? 'bg-[#2ecc71]' : 'bg-orange-500'}`}></span>
                            <span className="text-gray-300">{log.movement_type}</span>
                            <span className="text-gray-500">{log.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {user?.students && user.students.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {user.students.map((student) => (
                  <button key={student.id} onClick={() => setSelectedStudent(student.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedStudent === student.id ? 'bg-[#2ecc71] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                    {student.name}
                  </button>
                ))}
              </div>
            )}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5"><tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Data</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Hora</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Movimento</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Local</th>
                  </tr></thead>
                  <tbody className="divide-y divide-white/10">
                    {attendanceHistory.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Nenhum registo encontrado</td></tr>
                    ) : attendanceHistory.map((log) => (
                      <tr key={log.log_id} className="hover:bg-white/5">
                        <td className="px-6 py-4 text-white">{log.date}</td>
                        <td className="px-6 py-4 text-white">{log.time}</td>
                        <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-medium ${log.movement_type === 'ENTRADA' ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : 'bg-orange-500/20 text-orange-400'}`}>{log.movement_type}</span></td>
                        <td className="px-6 py-4 text-gray-400">{log.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center">
                <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <p className="text-gray-400">Nenhuma notificação</p>
              </div>
            ) : notifications.map((notif) => (
              <div key={notif.notification_id} className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.type === 'ENTRADA' ? 'bg-[#2ecc71]' : 'bg-orange-500'}`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={notif.type === 'ENTRADA' ? 'M11 16l-4-4m0 0l4-4m-4 4h14' : 'M17 16l4-4m0 0l-4-4m4 4H7'} />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-white font-medium">{notif.title}</h4>
                      {notif.channel === 'sms' && <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">SMS</span>}
                      {notif.channel === 'email' && <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">Email</span>}
                      {notif.channel === 'push' && <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">App</span>}
                    </div>
                    <p className="text-gray-300 mt-1">{notif.message}</p>
                    <p className="text-gray-500 text-sm mt-2">{new Date(notif.created_at).toLocaleString('pt-MZ')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            {/* Profile */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#2ecc71]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Perfil
                </h3>
                {!editingProfile && (
                  <button onClick={() => setEditingProfile(true)} className="text-[#2ecc71] text-sm hover:underline">Editar</button>
                )}
              </div>
              
              {editingProfile ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Nome completo</label>
                    <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2ecc71]" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Email</label>
                    <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2ecc71]" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Telefone</label>
                    <input type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="+258 84 XXX XXXX"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2ecc71]" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={saveProfile} disabled={savingSettings} className="flex-1 py-3 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
                      {savingSettings ? 'A guardar...' : 'Guardar'}
                    </button>
                    <button onClick={() => setEditingProfile(false)} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-white/10"><span className="text-gray-400">Nome</span><span className="text-white">{user?.name}</span></div>
                  <div className="flex items-center justify-between py-2 border-b border-white/10"><span className="text-gray-400">Email</span><span className="text-white">{user?.email}</span></div>
                  <div className="flex items-center justify-between py-2 border-b border-white/10"><span className="text-gray-400">Telefone</span><span className="text-white">{user?.phone || 'Não definido'}</span></div>
                  <div className="flex items-center justify-between py-2"><span className="text-gray-400">Educandos</span><span className="text-white">{user?.students?.length || 0}</span></div>
                </div>
              )}
            </div>

            {/* Notification Settings */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#2ecc71]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                Canais de Notificação
              </h3>
              <p className="text-gray-400 text-sm mb-4">Escolha como deseja receber notificações de entrada e saída dos seus educandos.</p>
              
              <div className="space-y-4">
                {/* In-app - always on */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    </div>
                    <div><p className="text-white font-medium">Notificações na App</p><p className="text-gray-400 text-sm">Sempre activo</p></div>
                  </div>
                  <span className="text-[#2ecc71] text-sm font-medium">Activo</span>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div><p className="text-white font-medium">Email</p><p className="text-gray-400 text-sm">Receber notificações por email</p></div>
                  </div>
                  <button onClick={() => setEmailEnabled(!emailEnabled)}
                    className={`relative w-14 h-7 rounded-full transition-colors ${emailEnabled ? 'bg-[#2ecc71]' : 'bg-gray-600'}`}>
                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${emailEnabled ? 'translate-x-7' : 'translate-x-0.5'}`}></div>
                  </button>
                </div>

                {/* SMS */}
                <div className="p-4 bg-white/5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      </div>
                      <div><p className="text-white font-medium">SMS</p><p className="text-gray-400 text-sm">Requer autorização do administrador</p></div>
                    </div>
                    <button onClick={() => setSmsEnabled(!smsEnabled)}
                      className={`relative w-14 h-7 rounded-full transition-colors ${smsEnabled ? 'bg-[#2ecc71]' : 'bg-gray-600'}`}>
                      <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${smsEnabled ? 'translate-x-7' : 'translate-x-0.5'}`}></div>
                    </button>
                  </div>
                  {smsEnabled && (
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Número para SMS</label>
                      <input type="tel" value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} placeholder="+258 84 XXX XXXX"
                        className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2ecc71]" />
                      <p className="text-yellow-400/80 text-xs mt-1">Nota: O SMS só será enviado quando o administrador activar este serviço globalmente.</p>
                    </div>
                  )}
                </div>

                {settingsMessage && (
                  <div className={`px-4 py-3 rounded-lg text-sm ${settingsMessage.includes('sucesso') || settingsMessage.includes('guardad') ? 'bg-[#2ecc71]/20 text-[#2ecc71] border border-[#2ecc71]/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {settingsMessage}
                  </div>
                )}

                <button onClick={saveNotificationSettings} disabled={savingSettings}
                  className="w-full py-3 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
                  {savingSettings ? 'A guardar...' : 'Guardar Definições de Notificação'}
                </button>
              </div>
            </div>

            {/* Security */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#2ecc71]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Segurança
              </h3>
              <button onClick={() => setShowPasswordModal(true)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors border border-white/20">
                Alterar Palavra-passe
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const ParentDashboard: React.FC = () => (
  <SystemAuthProvider><ParentDashboardContent /></SystemAuthProvider>
);

export default ParentDashboard;
