-- =============================================================================
-- EduGuard360 - Official RLS hardening (production)
-- Execute in Supabase SQL Editor as project owner.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0) Schema compatibility (fix known production drift)
-- -----------------------------------------------------------------------------
alter table if exists public.utilizadores
  add column if not exists status text default 'active';

alter table if exists public.utilizadores
  add column if not exists is_active boolean default true;

-- Expand role compatibility across legacy and new profile names.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'utilizadores'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%perfil%'
  loop
    execute format('alter table public.utilizadores drop constraint if exists %I', c.conname);
  end loop;
end $$;

alter table public.utilizadores
  add constraint utilizadores_perfil_check
  check (
    perfil in (
      'admin', 'super_admin', 'superadmin',
      'director', 'school_admin', 'diretor',
      'administrator',
      'secretaria', 'secretariat',
      'coordenador', 'coordinator',
      'professor', 'teacher', 'docente',
      'financeiro', 'finance',
      'rh', 'hr',
      'seguranca', 'security', 'scanner',
      'parent', 'pai', 'encarregado', 'guardian',
      'student', 'aluno'
    )
  );

-- Guarantee one account per email across all profiles (case-insensitive).
do $$
begin
  if exists (
    select 1
    from public.utilizadores
    where email is not null and btrim(email) <> ''
    group by lower(btrim(email))
    having count(*) > 1
  ) then
    raise exception 'Nao foi possivel criar indice unico de email: existem emails duplicados em public.utilizadores.';
  end if;
end $$;

create unique index if not exists uq_utilizadores_email_normalized
  on public.utilizadores (lower(btrim(email)))
  where email is not null and btrim(email) <> '';

-- -----------------------------------------------------------------------------
-- 1) Ensure RLS is enabled and enforced
-- -----------------------------------------------------------------------------
alter table public.utilizadores enable row level security;
alter table public.escolas enable row level security;
alter table public.alunos enable row level security;
alter table public.entradas enable row level security;

alter table public.utilizadores force row level security;
alter table public.escolas force row level security;
alter table public.alunos force row level security;
alter table public.entradas force row level security;

-- -----------------------------------------------------------------------------
-- 2) Drop existing policies (idempotent, independent of policy names)
-- -----------------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'utilizadores' loop
    execute format('drop policy if exists %I on public.utilizadores', p.policyname);
  end loop;

  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'escolas' loop
    execute format('drop policy if exists %I on public.escolas', p.policyname);
  end loop;

  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'alunos' loop
    execute format('drop policy if exists %I on public.alunos', p.policyname);
  end loop;

  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'entradas' loop
    execute format('drop policy if exists %I on public.entradas', p.policyname);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 3) Helper functions for policy logic
-- -----------------------------------------------------------------------------
create or replace function public.normalize_profile(profile_value text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(profile_value, ''))
    when 'admin' then 'super_admin'
    when 'superadmin' then 'super_admin'
    when 'school_admin' then 'director'
    when 'diretor' then 'director'
    when 'secretariat' then 'secretaria'
    when 'coordinator' then 'coordenador'
    when 'teacher' then 'professor'
    when 'docente' then 'professor'
    when 'finance' then 'financeiro'
    when 'hr' then 'rh'
    when 'security' then 'seguranca'
    when 'scanner' then 'seguranca'
    when 'pai' then 'parent'
    when 'encarregado' then 'parent'
    when 'guardian' then 'parent'
    when 'aluno' then 'student'
    else lower(coalesce(profile_value, ''))
  end;
$$;

create or replace function public.current_domain_user_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select u.id
  from public.utilizadores u
  where u.auth_id = auth.uid()
  order by u.id
  limit 1;
$$;

create or replace function public.current_domain_profile()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select public.normalize_profile(u.perfil)
  from public.utilizadores u
  where u.auth_id = auth.uid()
  order by u.id
  limit 1;
$$;

create or replace function public.current_domain_school_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select u.escola_id
  from public.utilizadores u
  where u.auth_id = auth.uid()
  order by u.id
  limit 1;
$$;

create or replace function public.current_domain_email()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select lower(coalesce(u.email, ''))
  from public.utilizadores u
  where u.auth_id = auth.uid()
  order by u.id
  limit 1;
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_domain_profile() = 'super_admin';
$$;

create or replace function public.is_school_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_domain_profile() in (
    'director', 'administrator', 'secretaria',
    'coordenador', 'professor', 'financeiro',
    'rh', 'seguranca'
  );
$$;

create or replace function public.can_operate_qr()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_domain_profile() in ('seguranca', 'director', 'administrator', 'super_admin');
$$;

create or replace function public.can_manage_students()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_domain_profile() in ('director', 'administrator', 'secretaria', 'coordenador', 'super_admin');
$$;

-- Pre-login account status lookup used by login flow without opening full table read.
create or replace function public.get_account_status_by_email(p_email text)
returns table (
  id uuid,
  email text,
  perfil text,
  status text,
  is_active boolean,
  escola_id uuid
)
language sql
security definer
set search_path = public
stable
as $$
  select
    u.id,
    lower(coalesce(u.email, '')) as email,
    public.normalize_profile(u.perfil) as perfil,
    coalesce(u.status, case when coalesce(u.is_active, true) then 'active' else 'pending' end) as status,
    coalesce(u.is_active, true) as is_active,
    u.escola_id
  from public.utilizadores u
  where lower(coalesce(u.email, '')) = lower(coalesce(p_email, ''))
  limit 1;
$$;

revoke all on function public.get_account_status_by_email(text) from public;
grant execute on function public.get_account_status_by_email(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4) Policies - UTILIZADORES
-- -----------------------------------------------------------------------------
create policy utilizadores_select_self_or_admin
on public.utilizadores
for select
to authenticated
using (
  public.is_platform_admin()
  or auth_id = auth.uid()
  or (
    public.is_school_staff()
    and escola_id = public.current_domain_school_id()
  )
);

create policy utilizadores_insert_admin_only
on public.utilizadores
for insert
to authenticated
with check (public.is_platform_admin());

create policy utilizadores_update_self_or_admin
on public.utilizadores
for update
to authenticated
using (
  public.is_platform_admin()
  or auth_id = auth.uid()
)
with check (
  public.is_platform_admin()
  or auth_id = auth.uid()
);

-- -----------------------------------------------------------------------------
-- 5) Policies - ESCOLAS
-- -----------------------------------------------------------------------------
create policy escolas_select_by_scope
on public.escolas
for select
to authenticated
using (
  public.is_platform_admin()
  or id = public.current_domain_school_id()
);

create policy escolas_insert_admin_only
on public.escolas
for insert
to authenticated
with check (public.is_platform_admin());

create policy escolas_update_admin_or_director
on public.escolas
for update
to authenticated
using (
  public.is_platform_admin()
  or (public.current_domain_profile() = 'director' and id = public.current_domain_school_id())
)
with check (
  public.is_platform_admin()
  or (public.current_domain_profile() = 'director' and id = public.current_domain_school_id())
);

-- -----------------------------------------------------------------------------
-- 6) Policies - ALUNOS
-- -----------------------------------------------------------------------------
create policy alunos_select_by_role_scope
on public.alunos
for select
to authenticated
using (
  public.is_platform_admin()
  or (
    public.is_school_staff()
    and escola_id = public.current_domain_school_id()
  )
  or (
    public.current_domain_profile() in ('parent', 'student')
    and (
      encarregado_id = public.current_domain_user_id()
      or exists (
        select 1
        from public.utilizadores u
        where u.id = alunos.encarregado_id
          and lower(coalesce(u.email, '')) = public.current_domain_email()
      )
    )
  )
);

create policy alunos_insert_school_ops
on public.alunos
for insert
to authenticated
with check (
  public.is_platform_admin()
  or (
    public.can_manage_students()
    and escola_id = public.current_domain_school_id()
  )
);

create policy alunos_update_school_ops
on public.alunos
for update
to authenticated
using (
  public.is_platform_admin()
  or (
    public.can_manage_students()
    and escola_id = public.current_domain_school_id()
  )
)
with check (
  public.is_platform_admin()
  or (
    public.can_manage_students()
    and escola_id = public.current_domain_school_id()
  )
);

create policy alunos_delete_school_ops
on public.alunos
for delete
to authenticated
using (
  public.is_platform_admin()
  or (
    public.can_manage_students()
    and escola_id = public.current_domain_school_id()
  )
);

-- -----------------------------------------------------------------------------
-- 7) Policies - ENTRADAS
-- -----------------------------------------------------------------------------
create policy entradas_select_by_role_scope
on public.entradas
for select
to authenticated
using (
  public.is_platform_admin()
  or (
    public.is_school_staff()
    and exists (
      select 1
      from public.alunos a
      where a.id = entradas.aluno_id
        and a.escola_id = public.current_domain_school_id()
    )
  )
  or (
    public.current_domain_profile() in ('parent', 'student')
    and (
      lower(coalesce(entradas.encarregado_email, '')) = public.current_domain_email()
      or exists (
        select 1
        from public.alunos a
        where a.id = entradas.aluno_id
          and (
            a.encarregado_id = public.current_domain_user_id()
            or exists (
              select 1
              from public.utilizadores u
              where u.id = a.encarregado_id
                and lower(coalesce(u.email, '')) = public.current_domain_email()
            )
          )
      )
    )
  )
);

create policy entradas_insert_qr_ops
on public.entradas
for insert
to authenticated
with check (
  public.is_platform_admin()
  or (
    public.can_operate_qr()
    and exists (
      select 1
      from public.alunos a
      where a.id = entradas.aluno_id
        and a.escola_id = public.current_domain_school_id()
    )
  )
);

-- -----------------------------------------------------------------------------
-- 8) Grants (table-level permissions; RLS still enforces row scope)
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

revoke all on table public.utilizadores from anon;
revoke all on table public.escolas from anon;
revoke all on table public.alunos from anon;
revoke all on table public.entradas from anon;

grant select, insert, update on table public.utilizadores to authenticated;
grant select, insert, update on table public.escolas to authenticated;
grant select, insert, update, delete on table public.alunos to authenticated;
grant select, insert on table public.entradas to authenticated;

commit;
