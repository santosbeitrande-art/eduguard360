const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gyrpigvvmndfjwswknud.supabase.co';
const SUPABASE_ANON_KEY = '******';

const ADMIN_EMAIL = process.env.EDUGUARD_ADMIN_EMAIL || 'admin@eduguard360.co.mz';
const ADMIN_PASSWORD = String(process.env.EDUGUARD_ADMIN_PASSWORD || '').trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (!ADMIN_PASSWORD) {
  console.error('Defina EDUGUARD_ADMIN_PASSWORD para executar este script.');
  process.exit(1);
}

async function testLogin() {
  console.log('Tentando login...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  
  if (error) {
    console.log('Erro no login:', error.message);
  } else {
    console.log('Login com sucesso!', data.user.id);
  }
}

testLogin();
