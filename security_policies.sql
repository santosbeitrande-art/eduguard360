-- ==============================================================================
-- ATENÇÃO: EXECUTE ESTE SCRIPT NO "SQL EDITOR" DO SEU DASHBOARD SUPABASE
-- ==============================================================================

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
  auth_id = auth.uid() OR 
  (SELECT perfil FROM utilizadores WHERE auth_id = auth.uid() LIMIT 1) = 'admin'
);

-- ==============================================================================
-- 3. Políticas para a tabela ESCOLAS
-- ==============================================================================
-- Os diretores só podem ver a escola a que pertencem.
-- O Admin pode ver todas.
CREATE POLICY "Diretor vê a sua escola" ON escolas
FOR SELECT USING (
  id IN (SELECT escola_id FROM utilizadores WHERE auth_id = auth.uid() AND perfil = 'director') OR
  (SELECT perfil FROM utilizadores WHERE auth_id = auth.uid() LIMIT 1) = 'admin'
);

-- ==============================================================================
-- 4. Políticas para a tabela ALUNOS
-- ==============================================================================
-- Pais só vêem os seus próprios educandos.
-- Diretores só vêem os alunos da sua escola.
-- Admins vêem todos.
CREATE POLICY "Pais vêem educandos, Diretores vêem alunos da escola" ON alunos
FOR SELECT USING (
  -- Se for o encarregado do aluno
  encarregado_id IN (SELECT id FROM utilizadores WHERE auth_id = auth.uid()) OR
  -- Se for o diretor da escola do aluno
  escola_id IN (SELECT escola_id FROM utilizadores WHERE auth_id = auth.uid() AND perfil = 'director') OR
  -- Se for admin
  (SELECT perfil FROM utilizadores WHERE auth_id = auth.uid() LIMIT 1) = 'admin'
);

-- ==============================================================================
-- 5. Políticas para a tabela ENTRADAS
-- ==============================================================================
-- Apenas podem ver as entradas dos alunos que têm permissão para visualizar na tabela alunos.
CREATE POLICY "Acesso às entradas baseado no acesso ao aluno" ON entradas
FOR SELECT USING (
  aluno_id IN (
    SELECT id FROM alunos WHERE 
      encarregado_id IN (SELECT id FROM utilizadores WHERE auth_id = auth.uid()) OR
      escola_id IN (SELECT escola_id FROM utilizadores WHERE auth_id = auth.uid() AND perfil = 'director') OR
      (SELECT perfil FROM utilizadores WHERE auth_id = auth.uid() LIMIT 1) = 'admin'
  )
);

-- NOTA: Como o scanner e admin usam o sistema para inserir dados, vamos dar permissões de inserção
CREATE POLICY "Permitir inserção de entradas" ON entradas
FOR INSERT WITH CHECK (
  (SELECT perfil FROM utilizadores WHERE auth_id = auth.uid() LIMIT 1) IN ('admin', 'scanner')
);
