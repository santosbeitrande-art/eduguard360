import { supabase } from '@/lib/supabase';
import { EmailService } from '@/services/emailService';
export { supabase };

const LOCAL_STUDENTS_KEY = 'eduguard_local_students';
const LOCAL_ENTRIES_KEY = 'eduguard_local_entries';
const STUDENTS_CACHE_KEY = 'eduguard_admin_students_cache';

const readLocalStudents = (): any[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STUDENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalStudents = (items: any[]) => {
  localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(items));
};

const readLocalEntries = (): any[] => {
  try {
    const raw = localStorage.getItem(LOCAL_ENTRIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalEntries = (items: any[]) => {
  localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(items));
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

const writeStudentsCache = (items: Record<string, any[]>) => {
  localStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify(items));
};

const isPermissionDeniedError = (error: any): boolean => {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '42501'
    || message.includes('row-level security')
    || message.includes('permission denied');
};

const resolveFallbackSchoolId = () => {
  try {
    const raw = localStorage.getItem('currentUser') || localStorage.getItem('eduguard_user');
    if (!raw) return 'school-local';
    const parsed = JSON.parse(raw);
    return String(parsed?.escola_id || parsed?.school_id || 'school-local');
  } catch {
    return 'school-local';
  }
};

const persistStudentInCache = (student: any) => {
  const schoolId = String(student?.escola_id || resolveFallbackSchoolId());
  const cache = readStudentsCache();
  const current = Array.isArray(cache[schoolId]) ? cache[schoolId] : [];
  const normalizedCode = String(student?.qrcode_id || '').trim();

  const next = [
    ...current.filter((item: any) => String(item?.qrcode_id || '').trim() !== normalizedCode),
    {
      id: student.id,
      nome: student.nome,
      classe: student.classe,
      escola_id: schoolId,
      encarregado_id: student.encarregado_id || null,
      encarregado_email: student.encarregado_email || null,
      qrcode_id: normalizedCode,
      guardianEmail: student.encarregado_email || null,
    },
  ];

  cache[schoolId] = next;
  writeStudentsCache(cache);
};

const saveStudentEntryLocally = (student: any) => {
  const schoolId = resolveFallbackSchoolId();
  const students = readLocalStudents();
  const entries = readLocalEntries();

  const normalizedCode = String(student?.code || '').trim();
  const existing = students.find((item: any) => String(item?.qrcode_id || '').trim() === normalizedCode);

  const localStudent = existing || {
    id: `local-student-${Date.now()}`,
    nome: String(student?.name || '').trim() || `Aluno ${normalizedCode}`,
    classe: String(student?.className || '').trim() || 'Sem turma',
    escola_id: schoolId,
    encarregado_id: null,
    encarregado_email: null,
    qrcode_id: normalizedCode,
  };

  if (!existing) {
    students.push(localStudent);
    writeLocalStudents(students);
  }

  persistStudentInCache(localStudent);

  const last = entries
    .filter((item: any) => String(item?.aluno_id || '') === String(localStudent.id))
    .sort((a: any, b: any) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime())[0];

  const nextType = last?.tipo === 'entrada' ? 'saida' : 'entrada';
  const nowIso = new Date().toISOString();

  const nextEntry = {
    id: `local-entry-${Date.now()}`,
    aluno_id: localStudent.id,
    tipo: nextType,
    data: nowIso,
    encarregado_email: localStudent.encarregado_email,
  };

  entries.push(nextEntry);
  writeLocalEntries(entries);

  return [nextEntry];
};

const resolveCurrentSchoolIdFromStorage = () => {
  if (typeof window === 'undefined') return null;

  const isValidUuid = (value: unknown) => {
    if (typeof value !== 'string') return false;
    const normalized = value.trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized);
  };

  try {
    const currentUserRaw = localStorage.getItem('currentUser');
    const scannerUserRaw = localStorage.getItem('eduguard_user');

    const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
    const scannerUser = scannerUserRaw ? JSON.parse(scannerUserRaw) : null;

    const schoolIdCandidates = [
      currentUser?.escola_id,
      currentUser?.school_id,
      scannerUser?.escola_id,
      scannerUser?.school_id,
    ];

    const validSchoolId = schoolIdCandidates.find((candidate) => isValidUuid(candidate));
    return validSchoolId || null;
  } catch {
    return null;
  }
};

const resolveCurrentSchoolId = async () => {
  const fromStorage = resolveCurrentSchoolIdFromStorage();
  if (fromStorage) return fromStorage;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const authId = sessionData?.session?.user?.id;
    if (!authId) return null;

    const { data: profile } = await supabase
      .from('utilizadores')
      .select('escola_id')
      .eq('auth_id', authId)
      .maybeSingle();

    return profile?.escola_id || null;
  } catch {
    return null;
  }
};

const isNoRowsError = (error: any) => String(error?.code || '') === 'PGRST116';

const toReadableDbError = (error: any, fallback: string) => {
  if (!error) return fallback;
  const parts = [
    error.message || fallback,
    error.code ? `code=${error.code}` : null,
    error.details || null,
    error.hint || null,
  ].filter(Boolean);
  return parts.join(' | ');
};

const isMissingEncarregadoEmailColumnError = (error: any) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === 'PGRST204' && message.includes('encarregado_email');
};

export async function saveStudentEntry(student: any) {
  const { data: existingAluno, error: alunoError } = await supabase
    .from('alunos')
    .select('id, nome, classe, escola_id, encarregado_id')
    .eq('qrcode_id', student.code)
    .maybeSingle();

  if (alunoError && !isNoRowsError(alunoError)) {
    if (isPermissionDeniedError(alunoError)) {
      return saveStudentEntryLocally(student);
    }
    console.error('Erro ao buscar aluno:', alunoError);
    throw new Error(toReadableDbError(alunoError, 'Falha ao validar aluno.'));
  }

  let aluno = existingAluno;

  if (!aluno) {
    const schoolId = await resolveCurrentSchoolId();

    const autoStudentPayload = {
      nome: String(student?.name || '').trim() || `Aluno ${student.code}`,
      classe: String(student?.className || '').trim() || 'Sem turma',
      escola_id: schoolId,
      qrcode_id: student.code,
    };

    const { data: createdAluno, error: createAlunoError } = await supabase
      .from('alunos')
      .insert(autoStudentPayload)
      .select('id, nome, classe, escola_id, encarregado_id')
      .single();

    if (createAlunoError || !createdAluno) {
      if (isPermissionDeniedError(createAlunoError)) {
        return saveStudentEntryLocally(student);
      }
      console.error('Aluno não encontrado e falha ao auto-registrar:', createAlunoError);
      throw new Error(toReadableDbError(createAlunoError, 'Aluno não encontrado e não foi possível auto-registrar.'));
    }

    aluno = createdAluno;
  }

  if (!aluno) {
    throw new Error('Aluno não encontrado na base de dados.');
  }

  const [{ data: lastEntry }, { data: guardian }, { data: escola }] = await Promise.all([
    supabase
      .from('entradas')
      .select('tipo')
      .eq('aluno_id', aluno.id)
      .order('data', { ascending: false })
      .limit(1),
    aluno.encarregado_id
      ? supabase
          .from('utilizadores')
          .select('nome, email')
          .eq('id', aluno.encarregado_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    aluno.escola_id
      ? supabase
          .from('escolas')
          .select('nome')
          .eq('id', aluno.escola_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const nextType = lastEntry?.[0]?.tipo === 'entrada' ? 'saida' : 'entrada';
  const entryTimestamp = new Date();
  const formattedTime = entryTimestamp.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });

  const fullEntryPayload = {
    aluno_id: aluno.id,
    tipo: nextType,
    encarregado_email: guardian?.email || null,
  };

  let { data, error } = await supabase
    .from('entradas')
    .insert([fullEntryPayload])
    .select('id, tipo, data, aluno_id');

  if (error && isMissingEncarregadoEmailColumnError(error)) {
    const fallbackEntryPayload = {
      aluno_id: aluno.id,
      tipo: nextType,
    };

    const fallbackInsert = await supabase
      .from('entradas')
      .insert([fallbackEntryPayload])
      .select('id, tipo, data, aluno_id');
    data = fallbackInsert.data;
    error = fallbackInsert.error;
  }

  if (error) {
    if (isPermissionDeniedError(error)) {
      return saveStudentEntryLocally({
        code: student?.code,
        name: aluno.nome,
        className: aluno.classe,
      });
    }
    console.error('Erro ao gravar entrada/saída:', error);
    throw new Error(toReadableDbError(error, 'Erro ao gravar entrada/saída.'));
  }

  persistStudentInCache({
    ...aluno,
    encarregado_email: guardian?.email || null,
    qrcode_id: student?.code,
  });

  if (guardian?.email) {
    try {
      const emailSent = await EmailService.sendGuardianEntryExitAlert(
        guardian.email,
        guardian.nome,
        aluno.nome,
        escola?.nome || 'EduGuard360',
        nextType,
        formattedTime
      );

      if (!emailSent) {
        console.warn('Alerta de email não enviado ao encarregado:', guardian.email);
      }
    } catch (sendError) {
      console.warn('Falha ao enviar alerta para encarregado:', sendError);
    }
  }

  if (!data || data.length === 0) {
    return [{ tipo: nextType, aluno_id: aluno.id, data: entryTimestamp.toISOString() }];
  }

  return data;
}