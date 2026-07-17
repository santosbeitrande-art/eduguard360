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

async function createAdmin() {
  console.log('Tentando criar utilizador...');
  
  const { data, error } = await supabase.auth.signUp({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (error) {
    console.error('Erro ao criar Auth User:', error.message);
    // Verificar se já existe (User already registered)
    if (error.message.includes('already registered')) {
      console.log('Utilizador Auth já existe. Tentando inserir na tabela utilizadores se faltar...');
      
      // Log in to get the user ID
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
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
          email: ADMIN_EMAIL,
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
