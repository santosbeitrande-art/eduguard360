const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gyrpigvvmndfjwswknud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5cnBpZ3Z2bW5kZmp3c3drbnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTU0NTEsImV4cCI6MjA4NzQzMTQ1MX0.IvggGGl3vh3glxW_KmaJ8LKel8AxBwuvYxMKDhlbuAs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function linkUser() {
  const authId = 'b328b464-8e41-4fca-b3f0-77febf4b3400';
  
  const { error } = await supabase
    .from('utilizadores')
    .update({ auth_id: authId })
    .eq('email', 'admin@eduguard360.co.mz');
    
  if (error) {
    console.error('Erro ao atualizar:', error.message);
  } else {
    console.log('Utilizador ligado com sucesso!');
  }
}

linkUser();
