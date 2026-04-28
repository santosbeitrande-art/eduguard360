import { supabase } from '@/lib/supabase';
export { supabase };

export async function saveStudentEntry(student: any) {
  // First, find the student id by their qrcode_id
  const { data: aluno, error: alunoError } = await supabase
    .from('alunos')
    .select('id')
    .eq('qrcode_id', student.code)
    .single();

  if (alunoError || !aluno) {
    console.error("Aluno não encontrado:", alunoError);
    throw new Error("Aluno não encontrado na base de dados.");
  }

  // Determine if it's an entry or exit (entrada ou saida) - we'll default to 'entrada' for simplicity
  // In a real scenario, we might check the last entry to toggle between 'entrada' and 'saida'
  const { data, error } = await supabase.from('entradas').insert([{
    aluno_id: aluno.id,
    tipo: 'entrada'
  }]);

  if (error) throw error;
  return data;
}