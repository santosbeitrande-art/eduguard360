-- ==============================================================================
-- ATENÇÃO: EXECUTE ESTE SCRIPT NO "SQL EDITOR" DO SEU DASHBOARD SUPABASE
-- ==============================================================================

-- Helpers para evitar recursão de RLS ao consultar utilizadores dentro das policies.
drop function if exists public.is_admin_user();
drop function if exists public.is_director_user();
drop function if exists public.is_director_for_school(uuid);

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.utilizadores
    where auth_id = auth.uid()
      and perfil = 'admin'
  );
$$;

create or replace function public.is_director_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.utilizadores
    where auth_id = auth.uid()
      and perfil = 'director'
  );
$$;

create or replace function public.is_director_for_school(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.utilizadores
    where auth_id = auth.uid()
      and perfil = 'director'
      and escola_id = target_school_id
  );
$$;

-- 1. Eliminar as políticas temporárias (MVP) antigas que permitiam acesso livre a todos
DROP POLICY IF EXISTS "Permitir API visualizar (MVP)" ON escolas;
DROP POLICY IF EXISTS "Permitir API visualizar (MVP)" ON utilizadores;
DROP POLICY IF EXISTS "Permitir API visualizar (MVP)" ON alunos;
DROP POLICY IF EXISTS "Permitir API visualizar (MVP)" ON entradas;

-- ==============================================================================
-- 2. Políticas para a tabela UTILIZADORES
-- ==============================================================================
-- Um utilizador só pode ver o seu próprio registo. 
-- O Admin pode ver todos.
CREATE POLICY "Utilizador vê o seu próprio perfil" ON utilizadores
FOR SELECT USING (
  auth_id = auth.uid()
  OR public.is_admin_user()
);

CREATE POLICY "Admin pode criar utilizadores" ON utilizadores
FOR INSERT WITH CHECK (
  public.is_admin_user()
);

CREATE POLICY "Admin pode atualizar utilizadores" ON utilizadores
FOR UPDATE USING (
  public.is_admin_user()
) WITH CHECK (
  public.is_admin_user()
);

-- ==============================================================================
-- 3. Políticas para a tabela ESCOLAS
-- ==============================================================================
-- Os diretores só podem ver a escola a que pertencem.
-- O Admin pode ver todas.
CREATE POLICY "Diretor vê a sua escola" ON escolas
FOR SELECT USING (
  public.is_director_for_school(id)
  OR public.is_admin_user()
);

CREATE POLICY "Admin pode criar escolas" ON escolas
FOR INSERT WITH CHECK (
  public.is_admin_user()
);

CREATE POLICY "Admin pode atualizar escolas" ON escolas
FOR UPDATE USING (
  public.is_admin_user()
) WITH CHECK (
  public.is_admin_user()
);

CREATE POLICY "Admin pode remover escolas" ON escolas
FOR DELETE USING (
  public.is_admin_user()
);

-- ==============================================================================
-- 4. Políticas para a tabela ALUNOS
-- ==============================================================================
-- Pais só vêem os seus próprios educandos.
-- Diretores só vêem os alunos da sua escola.
-- Admins vêem todos.
CREATE POLICY "Pais vêem educandos, Diretores vêem alunos da escola" ON alunos
FOR SELECT USING (
  encarregado_id IN (
    SELECT id FROM public.utilizadores WHERE auth_id = auth.uid()
  )
  OR public.is_director_for_school(escola_id)
  OR public.is_admin_user()
);

CREATE POLICY "Admin e diretores podem criar alunos" ON alunos
FOR INSERT WITH CHECK (
  public.is_admin_user()
  OR public.is_director_for_school(escola_id)
);

CREATE POLICY "Admin e diretores podem atualizar alunos" ON alunos
FOR UPDATE USING (
  public.is_admin_user()
  OR public.is_director_for_school(escola_id)
) WITH CHECK (
  public.is_admin_user()
  OR public.is_director_for_school(escola_id)
);

CREATE POLICY "Admin e diretores podem remover alunos" ON alunos
FOR DELETE USING (
  public.is_admin_user()
  OR public.is_director_for_school(escola_id)
);

-- ==============================================================================
-- 5. Políticas para a tabela ENTRADAS
-- ==============================================================================
-- Apenas podem ver as entradas dos alunos que têm permissão para visualizar na tabela alunos.
CREATE POLICY "Acesso às entradas baseado no acesso ao aluno" ON entradas
FOR SELECT USING (
  aluno_id IN (
    SELECT id FROM alunos WHERE 
      encarregado_id IN (SELECT id FROM public.utilizadores WHERE auth_id = auth.uid()) OR
      public.is_director_for_school(escola_id) OR
      public.is_admin_user()
  )
);

-- NOTA: Como o scanner e admin usam o sistema para inserir dados, vamos dar permissões de inserção
CREATE POLICY "Permitir inserção de entradas" ON entradas
FOR INSERT WITH CHECK (
  public.is_admin_user()
  OR exists (
    select 1
    from public.utilizadores
    where auth_id = auth.uid()
      and perfil = 'scanner'
  )
);
