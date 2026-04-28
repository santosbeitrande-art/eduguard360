const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gyrpigvvmndfjwswknud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5cnBpZ3Z2bW5kZmp3c3drbnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTU0NTEsImV4cCI6MjA4NzQzMTQ1MX0.IvggGGl3vh3glxW_KmaJ8LKel8AxBwuvYxMKDhlbuAs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogin() {
  console.log('Tentando login...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@eduguard360.co.mz',
    password: 'Admin@1234',
  });
  
  if (error) {
    console.log('Erro no login:', error.message);
  } else {
    console.log('Login com sucesso!', data.user.id);
  }
}

testLogin();
