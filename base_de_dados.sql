-- Ativar extensão de identificadores universais
create extension if not exists "uuid-ossp";

-- Tabela: escolas
create table escolas (
  id uuid primary key default uuid_generate_v4(),
  nome text,
  endereco text,
  telefone text,
  email text,
  criado_em timestamp default now()
);

-- Tabela: utilizadores
create table utilizadores (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid references auth.users(id), -- Importante ligar à Autenticação Oficial Supabase
  nome text,
  email text unique,
  senha text, 
  perfil text check (perfil in ('admin', 'director', 'pai', 'scanner')), 
  escola_id uuid references escolas(id)
);

-- Tabela: alunos
create table alunos (
  id uuid primary key default uuid_generate_v4(),
  nome text,
  classe text,
  escola_id uuid references escolas(id),
  encarregado_id uuid references utilizadores(id),
  qrcode_id text unique -- Para gerar o ALUNO_ID_XXXX como pedido
);

-- Tabela: entradas
create table entradas (
  id uuid primary key default uuid_generate_v4(),
  aluno_id uuid references alunos(id),
  tipo text check (tipo in ('entrada', 'saida')),
  data timestamp default now()
);

-- =======================================================
-- NOTA: Como isto é um MVP inicial para conseguir testar rápido,
-- vamos garantir que a API pública pode ver as tabelas temporariamente.
-- =======================================================
alter table escolas enable row level security;
alter table utilizadores enable row level security;
alter table alunos enable row level security;
alter table entradas enable row level security;

create policy "Permitir API visualizar (MVP)" on escolas for all using (true);
create policy "Permitir API visualizar (MVP)" on utilizadores for all using (true);
create policy "Permitir API visualizar (MVP)" on alunos for all using (true);
create policy "Permitir API visualizar (MVP)" on entradas for all using (true);
