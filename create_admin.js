import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gyrpigvvmndfjwswknud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5cnBpZ3Z2bW5kZmp3c3drbnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTU0NTEsImV4cCI6MjA4NzQzMTQ1MX0.IvggGGl3vh3glxW_KmaJ8LKel8AxBwuvYxMKDhlbuAs';

const ADMIN_EMAIL = process.env.EDUGUARD_ADMIN_EMAIL || 'admin@eduguard360.co.mz';
const ADMIN_PASSWORD = String(process.env.EDUGUARD_ADMIN_PASSWORD || '').trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (!ADMIN_PASSWORD) {
  console.error('Defina EDUGUARD_ADMIN_PASSWORD para executar este script.');
  process.exit(1);
}

async function createAdmin() {
  console.log('Tentando criar utilizador...');
  
  const { data, error } = await supabase.auth.signUp({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (error) {
    console.error('Erro ao criar Auth User:', error.message);
    return;
  }

  console.log('User Auth criado com sucesso!', data.user?.id);
  
  if (data.user) {
    // Agora tenta inserir na tabela 'utilizadores'
    const { error: insertError } = await supabase.from('utilizadores').insert([
      {
        id: data.user.id, // assumindo que id é uuid
        auth_id: data.user.id,
        nome: 'Administrador Global',
        email: ADMIN_EMAIL,
        perfil: 'admin',
        escola_id: null
      }
    ]);
    
    if (insertError) {
      console.error('Erro ao inserir na tabela utilizadores:', insertError.message);
    } else {
      console.log('Utilizador inserido na tabela utilizadores com sucesso!');
    }
  }
}

createAdmin();
