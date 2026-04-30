import { supabase } from '@/lib/supabase';
import { EmailService } from '@/services/emailService';
export { supabase };

export async function saveStudentEntry(student: any) {
  const { data: aluno, error: alunoError } = await supabase
    .from('alunos')
    .select('id, nome, classe, escola_id, encarregado_id')
    .eq('qrcode_id', student.code)
    .single();

  if (alunoError || !aluno) {
    console.error('Aluno não encontrado:', alunoError);
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

  const { data, error } = await supabase.from('entradas').insert([
    {
      aluno_id: aluno.id,
      tipo: nextType,
      encarregado_email: guardian?.email || null,
    },
  ]);

  if (error) {
    console.error('Erro ao gravar entrada/saída:', error);
    throw error;
  }

  if (guardian?.email) {
    try {
      await EmailService.sendGuardianEntryExitAlert(
        guardian.email,
        guardian.nome,
        aluno.nome,
        escola?.nome || 'EduGuard360',
        nextType,
        formattedTime
      );
    } catch (sendError) {
      console.warn('Falha ao enviar alerta para encarregado:', sendError);
    }
  }

  return data;
}