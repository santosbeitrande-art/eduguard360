import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

export const saveStudentEntry = async (student: {
  name: string;
  className: string;
  code: string;
}) => {
  const { data, error } = await supabase.from('students').insert([student]);
  if (error) console.error(error);
  return data;
};

export const getStudents = async () => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) console.error(error);
  return data || [];
};