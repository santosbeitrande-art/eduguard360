import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Building2, GraduationCap, MapPin, Search, Users, LogOut, PlusCircle, Edit3, Trash2, Mail, Phone, CheckCircle } from "lucide-react";

const STUDENTS_CACHE_KEY = 'eduguard_admin_students_cache';
const SCHOOLS_CACHE_KEY = 'eduguard_admin_schools_cache';

const isPermissionError = (error: any) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '42501' || code === '401' || message.includes('row-level security') || message.includes('permission');
};

const AdminGlobalDashboard = () => {
  const navigate = useNavigate();
  const [escolas, setEscolas] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEscolas: 0,
    totalAlunos: 0,
    totalEntradas: 0
  });
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [schoolForm, setSchoolForm] = useState({ id: '', nome: '', endereco: '', telefone: '', email: '' });
  const [schoolMode, setSchoolMode] = useState<'create' | 'edit'>('create');
  const [studentForm, setStudentForm] = useState({ id: '', nome: '', classe: '', guardianName: '', guardianEmail: '', qrcode_id: '', telefone: '' });
  const [studentMode, setStudentMode] = useState<'create' | 'edit'>('create');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [approvalAction, setApprovalAction] = useState<string | null>(null);

  const readSchoolsCache = (): any[] => {
    try {
      const raw = localStorage.getItem(SCHOOLS_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeSchoolsCache = (nextSchools: any[]) => {
    localStorage.setItem(SCHOOLS_CACHE_KEY, JSON.stringify(nextSchools));
  };

  const readStudentsCache = (): Record<string, any[]> => {
    try {
      const raw = localStorage.getItem(STUDENTS_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  const writeStudentsCache = (cache: Record<string, any[]>) => {
    localStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify(cache));
  };

  const cacheStudentsForSchool = (schoolId: string, schoolStudents: any[]) => {
    const cache = readStudentsCache();
    cache[schoolId] = schoolStudents;
    writeStudentsCache(cache);
  };

  const updateStudentsForSelectedSchool = (updater: (current: any[]) => any[]) => {
    setStudents((currentStudents) => {
      const nextStudents = updater(currentStudents);
      if (selectedSchoolId) {
        cacheStudentsForSchool(selectedSchoolId, nextStudents);
      }
      return nextStudents;
    });
  };

  const getCachedStudentsForSchool = (schoolId: string): any[] => {
    const cache = readStudentsCache();
    return Array.isArray(cache[schoolId]) ? cache[schoolId] : [];
  };

  useEffect(() => {
    // Verificar se o utilizador está autenticado como admin
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      navigate('/sistema');
      return;
    }
    
    try {
      const user = JSON.parse(currentUser);
      if (user.perfil !== 'admin') {
        navigate('/sistema');
        return;
      }
    } catch (e) {
      navigate('/sistema');
      return;
    }

    loadData();
    loadPendingRegistrations();
  }, []);

  useEffect(() => {
    if (selectedSchoolId) {
      loadStudents(selectedSchoolId);
    }
  }, [selectedSchoolId]);

  const loadData = async () => {
    setLoading(true);

    const [{ data: escolasData, error: escolasError }, { data: alunosData, error: alunosError }, { data: entradasData, error: entradasError }, { data: recentEntriesData, error: recentEntriesError }] = await Promise.all([
      supabase.from('escolas').select('*').order('nome'),
      supabase.from('alunos').select('*'),
      supabase.from('entradas').select('*'),
      supabase.from('entradas')
        .select('id, tipo, data, aluno_id')
        .order('data', { ascending: false })
        .limit(12),
    ]);

    if (escolasError || alunosError || entradasError || recentEntriesError) {
      console.error('Erro ao carregar dados do admin:', escolasError || alunosError || entradasError || recentEntriesError);
      setNotification({ type: 'error', message: 'Erro ao carregar informações. Tente novamente.' });
    }

    // Enriquecer dados de entradas recentes com informações de alunos e escolas
    let enrichedRecentEntries: any[] = [];
    if (recentEntriesData && alunosData && escolasData) {
      const alunosMap = new Map(alunosData.map((a: any) => [a.id, a]));
      const escolasMap = new Map(escolasData.map((e: any) => [e.id, e]));
      enrichedRecentEntries = recentEntriesData.map((entry: any) => {
        const aluno = alunosMap.get(entry.aluno_id);
        return {
          ...entry,
          alunos: aluno,
          escola: aluno ? escolasMap.get(aluno.escola_id) : null,
        };
      });
    }

    if (escolasData) {
      setEscolas(escolasData);
      writeSchoolsCache(escolasData);
      if (!selectedSchoolId && escolasData.length) {
        setSelectedSchoolId(escolasData[0].id);
      }
    } else if (escolasError) {
      const cachedSchools = readSchoolsCache();
      if (cachedSchools.length > 0) {
        setEscolas(cachedSchools);
        if (!selectedSchoolId) {
          setSelectedSchoolId(cachedSchools[0].id);
        }
      }
    }

    if (alunosData || entradasData) {
      setStats((currentStats) => ({
        totalEscolas: escolasData?.length ?? currentStats.totalEscolas,
        totalAlunos: alunosData?.length ?? currentStats.totalAlunos,
        totalEntradas: entradasData?.length ?? currentStats.totalEntradas
      }));
    }

    if (recentEntriesData) {
      setRecentEntries(enrichedRecentEntries);
    }

    setLoading(false);
  };

  const loadStudents = async (schoolId: string) => {
    setStudentsLoading(true);
    const { data: alunosData, error: alunosError } = await supabase
      .from('alunos')
      .select('*')
      .eq('escola_id', schoolId)
      .order('nome');

    if (alunosError) {
      console.error('Erro ao carregar alunos:', alunosError);
      setNotification({ type: 'error', message: 'Falha ao buscar alunos da escola.' });
      const cached = getCachedStudentsForSchool(schoolId);
      if (cached.length > 0) {
        setStudents(cached);
      }
      setStudentsLoading(false);
      return;
    }

    const guardianIds = Array.from(new Set((alunosData || []).map((student: any) => student.encarregado_id).filter(Boolean)));
    const { data: guardiansData } = guardianIds.length > 0 ? await supabase.from('utilizadores').select('*').in('id', guardianIds) : { data: [] };
    const guardiansMap = new Map((guardiansData || []).map((g: any) => [g.id, g]));

    const mappedStudents = (alunosData || []).map((student: any) => ({
      ...student,
      guardian: guardiansMap.get(student.encarregado_id)
    }));

    setStudents(mappedStudents);
    cacheStudentsForSchool(schoolId, mappedStudents);
    setStudentsLoading(false);
  };

  const clearNotification = () => setNotification(null);

  const loadPendingRegistrations = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('eduguard_pending_registrations') || '[]');
      setPendingRegistrations(stored);
    } catch (err) {
      console.error('Erro ao carregar registos pendentes:', err);
      setPendingRegistrations([]);
    }
  };

  const handlePendingRegistrationAction = async (registration: any, action: 'approve' | 'reject') => {
    setApprovalAction(registration.id);
    try {
      if (action === 'approve') {
        const { error } = await supabase.from('utilizadores').insert({
          nome: registration.nome,
          email: registration.email,
          perfil: registration.perfil,
          escola_id: registration.escola_id,
          telefone: null,
          senha: null
        });
        if (!error) {
          setNotification({ type: 'success', message: `Registo aprovado para ${registration.nome}.` });
        } else {
          setNotification({ type: 'error', message: 'Não foi possível aprovar o registo na base de dados.' });
        }
      } else {
        setNotification({ type: 'success', message: `Registo rejeitado para ${registration.nome}.` });
      }

      const updated = pendingRegistrations.filter((item) => item.id !== registration.id);
      localStorage.setItem('eduguard_pending_registrations', JSON.stringify(updated));
      setPendingRegistrations(updated);
    } catch (err) {
      console.error('Erro ao processar registo pendente:', err);
      setNotification({ type: 'error', message: 'Ocorreu um erro ao processar o registo.' });
    } finally {
      setApprovalAction(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/sistema');
  };

  const resetSchoolForm = () => {
    setSchoolMode('create');
    setSchoolForm({ id: '', nome: '', endereco: '', telefone: '', email: '' });
  };

  const resetStudentForm = () => {
    setStudentMode('create');
    setStudentForm({ id: '', nome: '', classe: '', guardianName: '', guardianEmail: '', qrcode_id: '', telefone: '' });
  };

  const handleSchoolEdit = (school: any) => {
    setSchoolMode('edit');
    setSchoolForm({
      id: school.id,
      nome: school.nome || '',
      endereco: school.endereco || '',
      telefone: school.telefone || '',
      email: school.email || ''
    });
  };

  const handleStudentEdit = (student: any) => {
    setStudentMode('edit');
    setStudentForm({
      id: student.id,
      nome: student.nome || '',
      classe: student.classe || '',
      guardianName: student.guardian?.nome || '',
      guardianEmail: student.guardian?.email || '',
      qrcode_id: student.qrcode_id || '',
      telefone: student.telefone || '',
    });
  };

  const handleSchoolSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!schoolForm.nome.trim()) {
      setNotification({ type: 'error', message: 'Informe o nome da escola.' });
      return;
    }

    const payload = {
      nome: schoolForm.nome.trim(),
      endereco: schoolForm.endereco.trim() || null,
      telefone: schoolForm.telefone.trim() || null,
      email: schoolForm.email.trim() || null
    };

    try {
      if (schoolMode === 'edit') {
        if (schoolForm.id.startsWith('local-school-')) {
          setEscolas((current) => {
            const next = current.map((school) => (school.id === schoolForm.id ? { ...school, ...payload } : school));
            writeSchoolsCache(next);
            return next;
          });
          setNotification({ type: 'success', message: 'Escola local atualizada com sucesso.' });
        } else {
          const { data: updatedSchools, error } = await supabase
            .from('escolas')
            .update(payload)
            .eq('id', schoolForm.id)
            .select('*');
          if (error) throw error;
          if (updatedSchools && updatedSchools.length > 0) {
            const updated = updatedSchools[0];
            setEscolas((current) => {
              const next = current.map((school) => (school.id === updated.id ? { ...school, ...updated } : school));
              writeSchoolsCache(next);
              return next;
            });
          }
          setNotification({ type: 'success', message: 'Escola atualizada com sucesso.' });
        }
      } else {
        const { data: insertedSchools, error } = await supabase
          .from('escolas')
          .insert(payload)
          .select('*');
        if (error) throw error;
        if (insertedSchools && insertedSchools.length > 0) {
          const inserted = insertedSchools[0];
          setEscolas((current) => {
            const next = [...current.filter((school) => school.id !== inserted.id), inserted].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt'));
            writeSchoolsCache(next);
            return next;
          });
          setSelectedSchoolId(inserted.id);
        }
        setNotification({ type: 'success', message: 'Escola criada com sucesso.' });
      }
      resetSchoolForm();
      await loadData();
    } catch (error) {
      console.error('Erro salvar escola:', error);
      if (isPermissionError(error)) {
        const localSchool = {
          id: `local-school-${Date.now()}`,
          ...payload,
        };
        setEscolas((current) => {
          const next = [...current.filter((school) => school.id !== localSchool.id), localSchool].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt'));
          writeSchoolsCache(next);
          return next;
        });
        setSelectedSchoolId(localSchool.id);
        resetSchoolForm();
        setNotification({ type: 'success', message: 'Escola guardada localmente. Ajuste as permissões no Supabase para sincronizar.' });
        return;
      }
      setNotification({ type: 'error', message: 'Não foi possível salvar a escola.' });
    }
  };

  const handleStudentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSchoolId) {
      if (escolas.length > 0) {
        setSelectedSchoolId(escolas[0].id);
      } else {
        setNotification({ type: 'error', message: 'Selecione uma escola antes de adicionar um aluno.' });
        return;
      }
    }
    if (!studentForm.nome.trim() || !studentForm.guardianName.trim() || !studentForm.guardianEmail.trim()) {
      setNotification({ type: 'error', message: 'Preencha nome do aluno, nome do encarregado e email do encarregado.' });
      return;
    }

    try {
      const activeSchoolId = selectedSchoolId || escolas[0]?.id || null;
      if (!activeSchoolId) {
        setNotification({ type: 'error', message: 'Selecione uma escola antes de adicionar um aluno.' });
        return;
      }

      const guardianEmail = studentForm.guardianEmail.trim().toLowerCase();
      const guardianPayload = {
        nome: studentForm.guardianName.trim(),
        email: guardianEmail,
        telefone: studentForm.telefone.trim() || null,
      };
      let guardianId: string | null = null;
      let localOnlyMode = false;

      try {
        const { data: existingGuardian, error: guardianLookupError } = await supabase
          .from('utilizadores')
          .select('*')
          .eq('email', guardianEmail)
          .maybeSingle();

        if (guardianLookupError) {
          throw guardianLookupError;
        }

        if (existingGuardian) {
          guardianId = existingGuardian.id;
          const { error: updateGuardianError } = await supabase
            .from('utilizadores')
            .update({ nome: guardianPayload.nome, telefone: guardianPayload.telefone })
            .eq('id', guardianId);

          if (updateGuardianError) {
            throw updateGuardianError;
          }
        } else {
          const { data: newParent, error: createGuardianError } = await supabase
            .from('utilizadores')
            .insert({
              ...guardianPayload,
              perfil: 'pai',
              escola_id: activeSchoolId
            })
            .select('id')
            .single();

          if (createGuardianError) {
            throw createGuardianError;
          }

          guardianId = newParent?.id || null;
        }
      } catch (guardianError) {
        if (isPermissionError(guardianError)) {
          localOnlyMode = true;
        } else {
          throw guardianError;
        }
      }

      const qrcodeId = studentForm.qrcode_id?.trim() || `ALUNO-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
      const payload = {
        nome: studentForm.nome.trim(),
        classe: studentForm.classe.trim() || 'Sem turma',
        escola_id: activeSchoolId,
        encarregado_id: guardianId,
        qrcode_id: qrcodeId,
        telefone: studentForm.telefone.trim() || null
      };

      if (studentMode === 'edit' && studentForm.id) {
        if (!studentForm.id.startsWith('local-')) {
          const { error: updateStudentError } = await supabase.from('alunos').update(payload).eq('id', studentForm.id);
          if (updateStudentError) {
            if (!isPermissionError(updateStudentError)) {
              throw updateStudentError;
            }
            localOnlyMode = true;
          }
        } else {
          localOnlyMode = true;
        }

        updateStudentsForSelectedSchool((currentStudents) =>
          currentStudents.map((student) =>
            student.id === studentForm.id
              ? {
                  ...student,
                  ...payload,
                  guardian: { id: guardianId || student.guardian?.id || null, ...guardianPayload },
                }
              : student
          )
        );
        setNotification({ type: 'success', message: localOnlyMode ? 'Aluno atualizado localmente. Ajuste as permissões no Supabase para sincronizar.' : 'Aluno atualizado com sucesso.' });
      } else {
        const { data: insertedStudent, error: insertStudentError } = await supabase
          .from('alunos')
          .insert(payload)
          .select('*')
          .single();

        if (insertStudentError) {
          if (!isPermissionError(insertStudentError)) {
            throw insertStudentError;
          }

          localOnlyMode = true;
          const localStudent = {
            id: `local-${Date.now()}`,
            ...payload,
            guardian: { id: guardianId, ...guardianPayload },
          };

          updateStudentsForSelectedSchool((currentStudents) => [
            localStudent,
            ...currentStudents.filter((student) => student.id !== localStudent.id)
          ].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt')));
        } else if (insertedStudent) {
          updateStudentsForSelectedSchool((currentStudents) => [
            {
              ...insertedStudent,
              guardian: { id: guardianId, ...guardianPayload },
            },
            ...currentStudents.filter((student) => student.id !== insertedStudent.id)
          ].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt')));
        }

        setNotification({ type: 'success', message: localOnlyMode ? 'Aluno guardado localmente. Ajuste as permissões no Supabase para sincronizar.' : 'Aluno criado com sucesso.' });
        setStats((currentStats) => ({
          ...currentStats,
          totalAlunos: currentStats.totalAlunos + 1
        }));
      }

      resetStudentForm();
      if (activeSchoolId) {
        await loadStudents(activeSchoolId);
      }
      await loadData();
    } catch (error) {
      console.error('Erro salvar aluno:', error);
      setNotification({ type: 'error', message: 'Não foi possível salvar o aluno. Verifique os dados, permissões na base de dados e tente novamente.' });
    }
  };

  const handleDeleteSchool = async (schoolId: string) => {
    if (!window.confirm('Tem certeza de que deseja remover esta escola? Isso também pode afetar alunos relacionados.')) return;
    try {
      if (!schoolId.startsWith('local-school-')) {
        const { error } = await supabase.from('escolas').delete().eq('id', schoolId);
        if (error) {
          if (!isPermissionError(error)) {
            throw error;
          }
          setNotification({ type: 'success', message: 'Escola removida localmente. Ajuste as permissões no Supabase para sincronizar.' });
        } else {
          setNotification({ type: 'success', message: 'Escola removida com sucesso.' });
        }
      } else {
        setNotification({ type: 'success', message: 'Escola local removida com sucesso.' });
      }

      setEscolas((current) => {
        const next = current.filter((school) => school.id !== schoolId);
        writeSchoolsCache(next);
        return next;
      });
      if (selectedSchoolId === schoolId) {
        setSelectedSchoolId(null);
        setStudents([]);
      }
      await loadData();
    } catch (error) {
      console.error('Erro remover escola:', error);
      setNotification({ type: 'error', message: 'Falha ao remover escola.' });
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('Tem certeza de que deseja remover este aluno?')) return;
    try {
      if (studentId.startsWith('local-')) {
        setNotification({ type: 'success', message: 'Aluno local removido com sucesso.' });
      } else {
        const { error } = await supabase.from('alunos').delete().eq('id', studentId);
        if (error) {
          if (!isPermissionError(error)) {
            throw error;
          }
          setNotification({ type: 'success', message: 'Aluno removido localmente. Ajuste as permissões no Supabase para sincronizar.' });
        } else {
          setNotification({ type: 'success', message: 'Aluno removido com sucesso.' });
        }
      }

      updateStudentsForSelectedSchool((currentStudents) => currentStudents.filter((student) => student.id !== studentId));
      if (selectedSchoolId) {
        await loadStudents(selectedSchoolId);
      }
      await loadData();
    } catch (error) {
      console.error('Erro remover aluno:', error);
      setNotification({ type: 'error', message: 'Falha ao remover aluno.' });
    }
  };

  const selectedSchool = escolas.find((school) => school.id === selectedSchoolId);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-white bg-[#05121c]">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Global</h1>
            <p className="mt-1 text-gray-400">Gestão de escolas, alunos e contactos de encarregados.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadData} className="btn inline-flex items-center justify-center px-4 py-2 shadow-sm">Atualizar Dados</button>
            <button onClick={() => navigate('/sistema/admin/edumarket')} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm transition-colors">
              <GraduationCap className="w-4 h-4" /> Gerir Cursos
            </button>
            <button onClick={() => navigate('/parent')} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm transition-colors">
              <Users className="w-4 h-4" /> Ver Área Pais
            </button>
            <button onClick={() => navigate('/school')} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm transition-colors">
              <Building2 className="w-4 h-4" /> Ver Escolas
            </button>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-sm transition-colors">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>

        {notification && (
          <div className={`rounded-2xl p-4 border ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-red-500/10 border-red-500/20 text-red-200'}`}>
            <div className="flex items-center gap-3">
              <span className="text-lg">{notification.type === 'success' ? '✅' : '⚠️'}</span>
              <p className="text-sm">{notification.message}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-6">
          <div className="space-y-6">
            <div className="card bg-[#081825] border border-white/10 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">Registos Pendentes</h2>
                  <p className="text-sm text-gray-400">Novos pedidos de acesso por escola aguardam aprovação.</p>
                </div>
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm text-amber-300">{pendingRegistrations.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {pendingRegistrations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-gray-400">Nenhum registo pendente no momento.</div>
                ) : pendingRegistrations.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-white">{entry.nome}</p>
                      <p className="text-sm text-gray-400">{entry.email}</p>
                      <p className="text-xs text-gray-500">{entry.perfil === 'pai' ? 'Encarregado' : 'Diretor'} · {entry.escola_id ? 'Escola associada' : 'Sem escola'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handlePendingRegistrationAction(entry, 'approve')} disabled={approvalAction === entry.id} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{approvalAction === entry.id ? 'A processar...' : 'Aprovar'}</button>
                      <button onClick={() => handlePendingRegistrationAction(entry, 'reject')} disabled={approvalAction === entry.id} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">Rejeitar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6 bg-[#081825] border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-300"><Building2 className="w-6 h-6" /></div>
                  <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Escolas</span>
                </div>
                <p className="text-4xl font-bold text-white">{stats.totalEscolas}</p>
              </div>
              <div className="card p-6 bg-[#081825] border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-300"><GraduationCap className="w-6 h-6" /></div>
                  <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Alunos</span>
                </div>
                <p className="text-4xl font-bold text-white">{stats.totalAlunos}</p>
              </div>
              <div className="card p-6 bg-[#081825] border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300"><MapPin className="w-6 h-6" /></div>
                  <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Movimentos</span>
                </div>
                <p className="text-4xl font-bold text-white">{stats.totalEntradas}</p>
              </div>
            </div>

            <div className="card bg-[#081825] border border-white/10">
              <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Movimentos Recentes</h2>
                  <p className="text-gray-400 text-sm">Histórico de entradas e saídas registadas para análise rápida.</p>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {recentEntries.length === 0 ? (
                  <div className="text-gray-400">Nenhum movimento recente encontrado.</div>
                ) : (
                  <div className="space-y-3">
                    {recentEntries.map((entry) => (
                      <div key={entry.id} className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-white font-semibold">{entry.alunos?.nome || 'Aluno desconhecido'}</p>
                          <p className="text-sm text-gray-400">{entry.alunos?.classe || 'Classe não definida'}</p>
                          <p className="text-xs text-gray-500">{entry.escola?.nome || 'Sem escola associada'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${entry.tipo === 'entrada' ? 'bg-[#2ecc71]/10 text-[#2ecc71]' : 'bg-orange-500/10 text-orange-400'}`}>
                            {entry.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                          <p className="text-gray-400 text-sm mt-2">{entry.data ? new Date(entry.data).toLocaleString('pt-MZ', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem data'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card bg-[#081825] border border-white/10">
              <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Gestão de Escolas</h2>
                  <p className="text-gray-400 text-sm">Adicione, edite ou remova escolas e tenha o seu contacto de email de aviso.</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-300" htmlFor="school-selector">Escola atual</label>
                  <select
                    id="school-selector"
                    value={selectedSchoolId || ''}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                    className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white outline-none"
                  >
                    <option value="">Selecione uma escola</option>
                    {escolas.map((school) => (
                      <option key={school.id} value={school.id}>{school.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <form onSubmit={handleSchoolSubmit} className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Nome da Escola</label>
                    <input type="text" value={schoolForm.nome} onChange={(e) => setSchoolForm({ ...schoolForm, nome: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#03121e] px-4 py-3 text-white outline-none" placeholder="Ex: Escola Central" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">E-mail de Contato</label>
                    <input type="email" value={schoolForm.email} onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#03121e] px-4 py-3 text-white outline-none" placeholder="admin@escola.mz" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Telefone</label>
                    <input type="tel" value={schoolForm.telefone} onChange={(e) => setSchoolForm({ ...schoolForm, telefone: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#03121e] px-4 py-3 text-white outline-none" placeholder="+258 84 XXX XXXX" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Endereço</label>
                    <input type="text" value={schoolForm.endereco} onChange={(e) => setSchoolForm({ ...schoolForm, endereco: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#03121e] px-4 py-3 text-white outline-none" placeholder="Rua da Educação, Maputo" />
                  </div>

                  <div className="md:col-span-2 flex flex-wrap gap-3 items-center">
                    <button type="submit" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2ecc71] hover:bg-[#27ae60] text-black font-semibold transition-colors">
                      <PlusCircle className="w-4 h-4" /> {schoolMode === 'edit' ? 'Atualizar Escola' : 'Adicionar Escola'}
                    </button>
                    {schoolMode === 'edit' && (
                      <button type="button" onClick={resetSchoolForm} className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white transition-colors">
                        Cancelar edição
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            <div className="card bg-[#081825] border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Escolas Registradas</h2>
                  <p className="text-gray-400 text-sm">Clique em uma escola para editar ou visualizar os seus alunos.</p>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {loading ? (
                  <div className="text-gray-400">A carregar escolas...</div>
                ) : escolas.length === 0 ? (
                  <div className="text-gray-400">Nenhuma escola cadastrada.</div>
                ) : (
                  escolas.map((school) => (
                    <div key={school.id} className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{school.nome}</p>
                        <p className="text-sm text-gray-400">{school.email || 'Sem email'} · {school.telefone || 'Sem telefone'}</p>
                        <p className="text-sm text-gray-500">{school.endereco || 'Endereço não definido'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => { setSelectedSchoolId(school.id); handleSchoolEdit(school); }} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-2xl text-sm text-white">
                          <Edit3 className="w-4 h-4" /> Editar
                        </button>
                        <button onClick={() => handleDeleteSchool(school.id)} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-2xl text-sm text-white">
                          <Trash2 className="w-4 h-4" /> Remover
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card bg-[#081825] border border-white/10 p-6">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Alunos da Escola</h2>
                  <p className="text-gray-400 text-sm">Adicione e edite alunos por escola. O email do encarregado será usado para alertas.</p>
                </div>
                <div className="rounded-full bg-white/5 px-3 py-1 text-sm text-gray-300">{selectedSchool?.nome || 'Nenhuma escola selecionada'}</div>
              </div>

              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Nome do Aluno</label>
                    <input type="text" value={studentForm.nome} onChange={(e) => setStudentForm({ ...studentForm, nome: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#03121e] px-4 py-3 text-white outline-none" placeholder="Ex: João Silva" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Classe / Turma</label>
                    <input type="text" value={studentForm.classe} onChange={(e) => setStudentForm({ ...studentForm, classe: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#03121e] px-4 py-3 text-white outline-none" placeholder="5ª Classe - Turma A" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Nome do Encarregado</label>
                    <input type="text" value={studentForm.guardianName} onChange={(e) => setStudentForm({ ...studentForm, guardianName: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#03121e] px-4 py-3 text-white outline-none" placeholder="Ex: Ana Pereira" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Email do Encarregado</label>
                    <input type="email" value={studentForm.guardianEmail} onChange={(e) => setStudentForm({ ...studentForm, guardianEmail: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#03121e] px-4 py-3 text-white outline-none" placeholder="ana@exemplo.mz" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Telefone do Encarregado</label>
                    <input type="tel" value={studentForm.telefone} onChange={(e) => setStudentForm({ ...studentForm, telefone: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#03121e] px-4 py-3 text-white outline-none" placeholder="+258 84 XXX XXXX" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">QR Code ID (opcional)</label>
                    <input type="text" value={studentForm.qrcode_id} onChange={(e) => setStudentForm({ ...studentForm, qrcode_id: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#03121e] px-4 py-3 text-white outline-none" placeholder="Auto-gerado se deixado vazio" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2ecc71] hover:bg-[#27ae60] text-black font-semibold transition-colors">
                    <CheckCircle className="w-4 h-4" /> {studentMode === 'edit' ? 'Atualizar Aluno' : 'Adicionar Aluno'}
                  </button>
                  {studentMode === 'edit' && (
                    <button type="button" onClick={resetStudentForm} className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white transition-colors">Cancelar edição</button>
                  )}
                </div>
              </form>
            </div>

            <div className="card bg-[#081825] border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Alunos Registrados</h2>
                  <p className="text-gray-400 text-sm">Clique num aluno para editar ou remover quando necessário.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-sm text-gray-300">
                  <Mail className="w-4 h-4" /> Email do Encarregado
                </div>
              </div>

              <div className="p-6">
                {studentsLoading ? (
                  <div className="text-gray-400">A carregar alunos...</div>
                ) : students.length === 0 ? (
                  <div className="text-gray-400">Nenhum aluno registado nesta escola.</div>
                ) : (
                  <div className="space-y-4">
                    {students.map((student) => (
                      <div key={student.id} className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">{student.nome}</p>
                          <p className="text-sm text-gray-400">{student.classe || 'Classe não definida'}</p>
                          <p className="text-sm text-gray-300">Encarregado: {student.guardian?.nome || 'Não registado'}</p>
                          <p className="text-sm text-gray-300">Email: {student.guardian?.email || 'Sem email'}</p>
                          <p className="text-sm text-gray-300">Telefone: {student.guardian?.telefone || 'Sem telefone'}</p>
                          <p className="text-xs text-gray-500 mt-1">QR Code ID: {student.qrcode_id || 'N/A'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => handleStudentEdit(student)} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-sm text-white">
                            <Edit3 className="w-4 h-4" /> Editar
                          </button>
                          <button onClick={() => handleDeleteStudent(student.id)} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-sm text-white">
                            <Trash2 className="w-4 h-4" /> Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminGlobalDashboard;
