import { supabase } from '@/lib/supabase';
import { EmailService } from '@/services/emailService';
export { supabase };

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

  let { data, error } = await supabase.from('entradas').insert([fullEntryPayload]);

  if (error && isMissingEncarregadoEmailColumnError(error)) {
    const fallbackEntryPayload = {
      aluno_id: aluno.id,
      tipo: nextType,
    };

    const fallbackInsert = await supabase.from('entradas').insert([fallbackEntryPayload]);
    data = fallbackInsert.data;
    error = fallbackInsert.error;
  }

  if (error) {
    console.error('Erro ao gravar entrada/saída:', error);
    throw new Error(toReadableDbError(error, 'Erro ao gravar entrada/saída.'));
  }

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

  return data;
}