const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gyrpigvvmndfjwswknud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5cnBpZ3Z2bW5kZmp3c3drbnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTU0NTEsImV4cCI6MjA4NzQzMTQ1MX0.IvggGGl3vh3glxW_KmaJ8LKel8AxBwuvYxMKDhlbuAs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createAdmin() {
  console.log('Tentando criar utilizador...');
  
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@eduguard360.co.mz',
    password: 'Admin@1234',
  });

  if (error) {
    console.error('Erro ao criar Auth User:', error.message);
    // Verificar se já existe (User already registered)
    if (error.message.includes('already registered')) {
        console.log('Utilizador Auth já existe. Tentando inserir na tabela utilizadores se faltar...');
        
        // Log in to get the user ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: 'admin@eduguard360.co.mz',
            password: 'Admin@1234',
        });
        
        if (signInError) {
            console.log('Erro ao fazer login:', signInError.message);
            return;
        }
        
        const userId = signInData.user.id;
        
        const { error: insertError } = await supabase.from('utilizadores').insert([
          {
            id: userId,
            auth_id: userId,
            nome: 'Administrador Global',
            email: 'admin@eduguard360.co.mz',
            perfil: 'admin',
            escola_id: null
          }
        ]);
        
        if (insertError) {
            console.log('Tabela utilizadores:', insertError.message);
        } else {
            console.log('Inserido na tabela utilizadores com sucesso!');
        }
    }
    return;
  }

  console.log('User Auth criado com sucesso!', data.user?.id);
  
  if (data.user) {
    const { error: insertError } = await supabase.from('utilizadores').insert([
      {
        id: data.user.id,
        auth_id: data.user.id,
        nome: 'Administrador Global',
        email: 'admin@eduguard360.co.mz',
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
