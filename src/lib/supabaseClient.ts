import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function saveStudentEntry(student: any) {
  const { data, error } = await supabase.from('entries').insert([student]);
  if (error) throw error;
  return data;
}