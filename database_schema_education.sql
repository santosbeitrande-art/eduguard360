-- ============================================
-- SCHEMA DE BANCO DE DADOS - PLATAFORMA EDUCAÇÃO
-- Para Supabase/PostgreSQL
-- ============================================

-- ============================================
-- 1. TABELAS CORE DE USUÁRIOS
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Mozambique',
  language VARCHAR(10) DEFAULT 'pt',
  profile_image_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'student', 'educator', 'admin', 'institutional'
  verified_at TIMESTAMP,
  verification_documents TEXT, -- JSON com URLs dos documentos
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. TABELAS DE CURSOS
-- ============================================

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'tech', 'business', 'language', 'arts', etc
  level VARCHAR(50) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  cover_image_url TEXT,
  thumbnail_url TEXT,
  price_mzn DECIMAL(10, 2) DEFAULT 0,
  price_usd DECIMAL(10, 2) DEFAULT 0,
  is_free BOOLEAN DEFAULT false,
  duration_minutes INTEGER, -- Duração total em minutos
  total_lessons INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'archived'
  student_count INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  video_url TEXT, -- URL do vídeo no S3 ou Vimeo
  video_duration_seconds INTEGER,
  materials_url TEXT[], -- Array de URLs para PDFs, documentos
  is_preview BOOLEAN DEFAULT false, -- Aula de prévia grátis
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id),
  type VARCHAR(50) NOT NULL, -- 'quiz', 'assignment', 'project'
  title VARCHAR(255) NOT NULL,
  questions JSONB NOT NULL, -- Array de questões
  pass_percentage DECIMAL(5, 2) DEFAULT 70,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. INSCRIÇÕES E PROGRESSO
-- ============================================

CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP DEFAULT NOW(),
  completion_date TIMESTAMP,
  progress_percentage DECIMAL(5, 2) DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  certificate_issued BOOLEAN DEFAULT false,
  certificate_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

CREATE TABLE IF NOT EXISTS lesson_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT NOW(),
  time_spent_seconds INTEGER DEFAULT 0,
  UNIQUE(enrollment_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES course_assessments(id) ON DELETE CASCADE,
  score DECIMAL(5, 2),
  passed BOOLEAN,
  attempted_at TIMESTAMP DEFAULT NOW(),
  answers JSONB -- Respostas do aluno
);

-- ============================================
-- 4. AVALIAÇÕES E RATINGS
-- ============================================

CREATE TABLE IF NOT EXISTS course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  review_text TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- ============================================
-- 5. PAGAMENTOS E BILLING
-- ============================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES course_enrollments(id),
  user_id UUID NOT NULL REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  amount_mzn DECIMAL(10, 2),
  amount_usd DECIMAL(10, 2),
  payment_method VARCHAR(50) NOT NULL, -- 'mpesa', 'credit_card', 'bank_transfer', 'voucher'
  mpesa_transaction_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  reference_number VARCHAR(255),
  payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS educator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id UUID NOT NULL REFERENCES users(id),
  total_earned_mzn DECIMAL(15, 2) DEFAULT 0,
  total_earned_usd DECIMAL(15, 2) DEFAULT 0,
  amount_requested_mzn DECIMAL(10, 2),
  amount_requested_usd DECIMAL(10, 2),
  bank_account_number VARCHAR(50),
  bank_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  requested_date TIMESTAMP,
  payout_date TIMESTAMP,
  reference_number VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. LITERATURA ABERTA
-- ============================================

CREATE TABLE IF NOT EXISTS open_literature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  authors VARCHAR(500),
  publisher VARCHAR(255),
  publication_year INTEGER,
  isbn VARCHAR(20),
  language VARCHAR(10) DEFAULT 'pt',
  category VARCHAR(100),
  topic_tags TEXT[],
  country_origin VARCHAR(100),
  license VARCHAR(50), -- 'public_domain', 'cc_by', 'cc_by_sa', 'cc_by_nc', 'open_access'
  source VARCHAR(50) NOT NULL, -- 'gutenberg', 'openlibrary', 'arxiv', 'ssrn', 'repoarte', 'other'
  source_url TEXT NOT NULL,
  cover_image_url TEXT,
  description TEXT,
  file_url TEXT,
  file_format VARCHAR(20), -- 'pdf', 'epub', 'mobi', 'txt'
  file_size_mb DECIMAL(10, 2),
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source, source_url)
);

CREATE TABLE IF NOT EXISTS literature_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  literature_id UUID NOT NULL REFERENCES open_literature(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_number INTEGER,
  text_excerpt TEXT,
  user_annotation TEXT,
  highlight_color VARCHAR(20), -- 'yellow', 'green', 'blue', 'red'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS literature_course_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  literature_id UUID NOT NULL REFERENCES open_literature(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id),
  relevance_note TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 7. FÓRUM & COMUNIDADE
-- ============================================

CREATE TABLE IF NOT EXISTS course_forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT false,
  reply_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES course_forum_threads(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_educator_reply BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8. NOTIFICAÇÕES & MENSAGENS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'course_enrolled', 'new_lesson', 'grade_posted', 'forum_reply'
  title VARCHAR(255),
  message TEXT,
  related_entity_id UUID, -- ID do curso, lição, etc
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 9. ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_courses_educator ON courses(educator_id);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_price ON courses(price_mzn);

CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_enrollments_student ON course_enrollments(student_id);
CREATE INDEX idx_enrollments_completed ON course_enrollments(is_completed);

CREATE INDEX idx_lessons_course ON course_lessons(course_id);
CREATE INDEX idx_lessons_preview ON course_lessons(is_preview);

CREATE INDEX idx_reviews_course ON course_reviews(course_id);
CREATE INDEX idx_reviews_rating ON course_reviews(rating);

CREATE INDEX idx_transactions_user ON payment_transactions(user_id);
CREATE INDEX idx_transactions_status ON payment_transactions(status);
CREATE INDEX idx_transactions_course ON payment_transactions(course_id);

CREATE INDEX idx_literature_language ON open_literature(language);
CREATE INDEX idx_literature_license ON open_literature(license);
CREATE INDEX idx_literature_source ON open_literature(source);
CREATE INDEX idx_literature_tags ON open_literature USING GIN(topic_tags);

CREATE INDEX idx_forum_course ON course_forum_threads(course_id);
CREATE INDEX idx_forum_pinned ON course_forum_threads(pinned);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read_at);

-- ============================================
-- 10. VIEWS ÚTEIS PARA QUERIES
-- ============================================

CREATE VIEW course_analytics AS
SELECT 
  c.id,
  c.title,
  c.educator_id,
  COUNT(DISTINCT ce.student_id) as total_students,
  COUNT(DISTINCT CASE WHEN ce.is_completed THEN ce.student_id END) as completed_students,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN ce.is_completed THEN ce.student_id END) / 
        NULLIF(COUNT(DISTINCT ce.student_id), 0), 2) as completion_rate,
  AVG(cr.rating) as avg_rating,
  COUNT(DISTINCT cr.id) as total_reviews,
  SUM(pt.amount_mzn) as total_revenue_mzn
FROM courses c
LEFT JOIN course_enrollments ce ON c.id = ce.course_id
LEFT JOIN course_reviews cr ON c.id = cr.course_id
LEFT JOIN payment_transactions pt ON c.id = pt.course_id AND pt.status = 'completed'
GROUP BY c.id, c.title, c.educator_id;

CREATE VIEW educator_earnings AS
SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(DISTINCT c.id) as total_courses,
  SUM(pt.amount_mzn * 0.75) as total_earnings_mzn,
  SUM(pt.amount_usd * 0.75) as total_earnings_usd,
  SUM(CASE WHEN pt.status = 'completed' THEN 1 ELSE 0 END) as total_sales,
  AVG(cr.rating) as avg_course_rating
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.role = 'educator'
LEFT JOIN courses c ON u.id = c.educator_id
LEFT JOIN course_enrollments ce ON c.id = ce.course_id
LEFT JOIN payment_transactions pt ON ce.id = pt.enrollment_id
LEFT JOIN course_reviews cr ON c.id = cr.course_id
WHERE ur.id IS NOT NULL
GROUP BY u.id, u.name, u.email;

-- ============================================
-- DADOS INICIAIS (OPCIONAL)
-- ============================================

-- Inserir categorias padrão
INSERT INTO courses (educator_id, title, description, category, level, price_mzn, status)
VALUES (
  (SELECT id FROM users LIMIT 1),
  'Template Course',
  'This is a template',
  'tech',
  'beginner',
  0,
  'draft'
) ON CONFLICT DO NOTHING;

