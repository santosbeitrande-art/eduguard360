-- ========================================
-- 🗄️ EcoTrade360 - Schema da Base de Dados
-- ========================================
-- Data: 2026-05-01
-- Versão: 1.0
-- DBMS: PostgreSQL
-- ========================================

-- ========================================
-- 1️⃣ TABELA: USERS
-- ========================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255), -- Se não usar Auth0/Firebase
  role VARCHAR(50) NOT NULL DEFAULT 'both', -- 'seller', 'buyer', 'both'
  avatar_url VARCHAR(512),
  rating DECIMAL(3, 2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  total_reviews INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP -- Para soft deletes
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ========================================
-- 2️⃣ TABELA: LISTINGS (Anúncios)
-- ========================================

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'plastic', 'metal', 'paper', 'glass', 'organic', 'other'
  weight DECIMAL(10, 2) NOT NULL CHECK (weight > 0), -- em kg
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  status VARCHAR(50) NOT NULL DEFAULT 'available', -- 'available', 'reserved', 'completed', 'cancelled'
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Portugal',
  images_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- Para limpeza automática (30 dias padrão)
  completed_at TIMESTAMP,
  deleted_at TIMESTAMP -- Soft delete
);

CREATE INDEX idx_listings_user_id ON listings(user_id);
CREATE INDEX idx_listings_type ON listings(type);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_location ON listings(latitude, longitude);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);

-- Índice GiST para queries geoespaciais (opcional, se usar PostGIS)
-- CREATE INDEX idx_listings_geom ON listings USING GIST(ll_to_earth(latitude, longitude));

-- ========================================
-- 3️⃣ TABELA: IMAGES (Imagens dos anúncios)
-- ========================================

CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url VARCHAR(512) NOT NULL,
  order_index INT DEFAULT 0,
  file_size INT, -- em bytes
  mime_type VARCHAR(50), -- 'image/jpeg', 'image/png'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_images_listing_id ON images(listing_id, order_index);

-- ========================================
-- 4️⃣ TABELA: RESERVATIONS (Reservas)
-- ========================================

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'cancelled', 'expired'
  reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL, -- 2h por padrão
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reservations_listing_id ON reservations(listing_id);
CREATE INDEX idx_reservations_buyer_id ON reservations(buyer_id);
CREATE INDEX idx_reservations_seller_id ON reservations(seller_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at);

-- ========================================
-- 5️⃣ TABELA: RATINGS (Avaliações)
-- ========================================

CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  score INT NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  is_seller_rating BOOLEAN DEFAULT FALSE, -- Quem fez a avaliação
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_different_users CHECK (from_user != to_user)
);

CREATE INDEX idx_ratings_to_user ON ratings(to_user);
CREATE INDEX idx_ratings_from_user ON ratings(from_user);
CREATE INDEX idx_ratings_listing_id ON ratings(listing_id);
CREATE INDEX idx_ratings_created_at ON ratings(created_at DESC);

-- ========================================
-- 6️⃣ TABELA: NOTIFICATIONS (Notificações)
-- ========================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50), -- 'new_listing', 'reservation', 'completion', 'rating', 'system'
  related_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  related_reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ========================================
-- 7️⃣ TABELA: MESSAGES (Chat seller-buyer)
-- ========================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX idx_messages_reservation_id ON messages(reservation_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- ========================================
-- 8️⃣ TABELA: ACTIVITY LOG (Auditoria)
-- ========================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- 'listing_created', 'reservation_made', 'rating_given'
  entity_type VARCHAR(50), -- 'listing', 'reservation', 'user'
  entity_id UUID,
  details JSONB, -- Dados extras em JSON
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ========================================
-- 9️⃣ TABELA: BLOCKED USERS (Bloqueios)
-- ========================================

CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_different_blocked CHECK (blocker_id != blocked_id),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked_id ON blocked_users(blocked_id);

-- ========================================
-- 🔟 TABELA: CATEGORIES (Categorias de lixo)
-- ========================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_url VARCHAR(255),
  color_hex VARCHAR(7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Popular categorias padrão
INSERT INTO categories (name, slug, color_hex) VALUES
('Plástico', 'plastic', '#1E90FF'),
('Metal', 'metal', '#808080'),
('Papel', 'paper', '#8B7355'),
('Vidro', 'glass', '#00FF00'),
('Orgânico', 'organic', '#228B22'),
('Eletrónicos', 'electronics', '#000000'),
('Têxteis', 'textiles', '#FF1493'),
('Outro', 'other', '#C0C0C0');

-- ========================================
-- 1️⃣1️⃣ TABELA: OTP TOKENS (Para autenticação)
-- ========================================

CREATE TABLE otp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) NOT NULL,
  code VARCHAR(6) NOT NULL,
  attempts INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_tokens_phone ON otp_tokens(phone);
CREATE INDEX idx_otp_tokens_expires_at ON otp_tokens(expires_at);

-- ========================================
-- 1️⃣2️⃣ VIEWS ÚTEIS
-- ========================================

-- View: Utilizadores com estatísticas
CREATE VIEW user_stats AS
SELECT
  u.id,
  u.name,
  u.phone,
  u.rating,
  u.total_reviews,
  COUNT(DISTINCT l.id) as total_listings,
  COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_sales,
  COUNT(DISTINCT CASE WHEN r.buyer_id = u.id AND r.status = 'completed' THEN r.id END) as completed_purchases,
  u.created_at
FROM users u
LEFT JOIN listings l ON u.id = l.user_id AND l.deleted_at IS NULL
LEFT JOIN reservations r ON (u.id = r.seller_id OR u.id = r.buyer_id)
GROUP BY u.id, u.name, u.phone, u.rating, u.total_reviews, u.created_at;

-- View: Anúncios ativos com distância (exemplo)
CREATE VIEW active_listings_view AS
SELECT
  l.id,
  l.title,
  l.type,
  l.weight,
  l.price,
  l.latitude,
  l.longitude,
  l.address,
  l.status,
  u.name as seller_name,
  u.rating as seller_rating,
  COUNT(DISTINCT i.id) as image_count,
  l.created_at
FROM listings l
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN images i ON l.id = i.listing_id
WHERE l.status = 'available' AND l.deleted_at IS NULL AND l.expires_at > CURRENT_TIMESTAMP
GROUP BY l.id, l.title, l.type, l.weight, l.price, l.latitude, l.longitude, l.address, l.status, u.name, u.rating, l.created_at;

-- ========================================
-- 1️⃣3️⃣ FUNCTIONS / TRIGGERS
-- ========================================

-- Função: Atualizar total_reviews do utilizador
CREATE OR REPLACE FUNCTION update_user_review_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET total_reviews = (SELECT COUNT(*) FROM ratings WHERE to_user = NEW.to_user)
  WHERE id = NEW.to_user;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_reviews
AFTER INSERT ON ratings
FOR EACH ROW
EXECUTE FUNCTION update_user_review_count();

-- Função: Atualizar average rating do utilizador
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET rating = COALESCE((SELECT AVG(score) FROM ratings WHERE to_user = NEW.to_user), 5.0)
  WHERE id = NEW.to_user;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_rating
AFTER INSERT OR UPDATE ON ratings
FOR EACH ROW
EXECUTE FUNCTION update_user_rating();

-- Função: Expirar reservas antigas
CREATE OR REPLACE FUNCTION expire_old_reservations()
RETURNS void AS $$
BEGIN
  UPDATE reservations
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < CURRENT_TIMESTAMP;

  -- Atualizar listings para available novamente
  UPDATE listings
  SET status = 'available'
  WHERE status = 'reserved'
    AND id IN (
      SELECT listing_id FROM reservations WHERE status = 'expired'
    );
END;
$$ LANGUAGE plpgsql;

-- Executar a cada 5 minutos (via Cron job externo ou pg_cron)
-- SELECT cron.schedule('expire-reservations', '*/5 * * * *', 'SELECT expire_old_reservations();');

-- ========================================
-- 1️⃣4️⃣ PERMISSÕES (Exemplo)
-- ========================================

-- Criar role para aplicação
-- CREATE ROLE ecotrade_app WITH LOGIN PASSWORD 'secure_password';
-- GRANT CONNECT ON DATABASE ecotrade360 TO ecotrade_app;
-- GRANT USAGE ON SCHEMA public TO ecotrade_app;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ecotrade_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ecotrade_app;

-- ========================================
-- 🔒 CONSTRAINTS IMPORTANTES
-- ========================================

-- Verificar: Não pode haver 2 reservas ativas para o mesmo anúncio
ALTER TABLE reservations ADD CONSTRAINT unique_active_reservation
  UNIQUE(listing_id, status) WHERE status = 'active';

-- ========================================
-- 📊 DADOS INICIAIS (SEED)
-- ========================================

-- Inserir categorias (já feito acima)
-- Inserir testes (opcional)

-- ========================================
-- ✅ FIM DO SCRIPT
-- ========================================
-- Data última edição: 2026-05-01
-- Versão: 1.0
-- Status: Pronto para produção após testes
