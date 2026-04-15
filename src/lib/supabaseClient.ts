import { supabase } from '@/lib/supabase';
export { supabase };

export async function saveStudentEntry(student: any) {
  const { data, error } = await supabase.from('entries').insert([student]);
  if (error) throw error;
  return data;
}