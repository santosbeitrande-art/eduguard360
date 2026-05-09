# EduMarket MZ - Guia de Implementação

## 🚀 Começar

### 1. Instalar Dependências

```bash
# Frontend
npm install lucide-react nodemailer

# Backend
npm install express nodemailer stripe dotenv cors
npm install -D @types/express @types/nodemailer
```

### 2. Integrar no App Existente

#### Frontend (App.tsx)

```tsx
import EducationMarketplace from './EducationMarketplace';

function App() {
  return (
    <>
      <EducationMarketplace />
    </>
  );
}
```

#### Backend (main.ts)

```typescript
import express from 'express';
import cors from 'cors';
import marketplaceRoutes from './routes/marketplace';

const app = express();

app.use(cors());
app.use(express.json());

// Marketplace routes
app.use('/api', marketplaceRoutes);

app.listen(3000, () => {
  console.log('EduMarket API rodando em http://localhost:3000');
});
```

---

## 📋 Endpoints API

### Autenticação
- `POST /api/auth/register` - Registar novo utilizador
- `GET /api/users/:userId` - Obter perfil

### Cursos
- `POST /api/courses` - Criar curso
- `GET /api/courses` - Listar cursos
- `PUT /api/courses/:courseId` - Atualizar curso
- `POST /api/courses/:courseId/enroll` - Inscrever aluno

### Pagamentos
- `POST /api/payments/mpesa` - Pagamento M-Pesa
- `POST /api/payments/withdraw` - Levantamento de fundos
- `GET /api/transactions/:userId` - Histórico

### Estatísticas
- `GET /api/analytics/educator/:userId` - Dashboard educador
- `GET /api/platform/stats` - Estatísticas plataforma

### Reviews
- `POST /api/reviews` - Deixar avaliação

---

## 🔐 Variáveis de Ambiente

Criar arquivo `.env`:

```env
# Email
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_app_gmail

# Stripe (para pagamentos)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...

# M-Pesa (integração moçambicana)
MPESA_API_KEY=seu_api_key
MPESA_API_URL=https://api.m-pesa.co.mz

# Banco de Dados
DATABASE_URL=postgresql://user:password@localhost/edumarket

# JWT
JWT_SECRET=sua_chave_secreta_aqui
```

---

## 💳 Integração de Pagamentos

### M-Pesa (Recomendado para Moçambique)

```typescript
import axios from 'axios';

class MPesaPayment {
  private apiKey = process.env.MPESA_API_KEY;
  private apiUrl = process.env.MPESA_API_URL;

  async checkout(phone: string, amount: number, reference: string) {
    try {
      const response = await axios.post(`${this.apiUrl}/checkout`, {
        phone,
        amount,
        reference,
        callbackUrl: 'https://seu-site.com/callback/mpesa',
      });

      return response.data;
    } catch (error) {
      console.error('Erro M-Pesa:', error);
      throw error;
    }
  }

  async handleCallback(data: any) {
    // Processar callback do M-Pesa
    if (data.status === 'success') {
      // Atualizar transação como completa
      console.log('Pagamento confirmado:', data.transactionId);
    }
  }
}

export default new MPesaPayment();
```

### Stripe (Para cartões)

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function createCheckout(amount: number, email: string) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'mzn', // Meticais
          product_data: {
            name: 'Curso Online',
          },
          unit_amount: amount * 100, // Converter para centavos
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: 'https://seu-site.com/success',
    cancel_url: 'https://seu-site.com/cancel',
    customer_email: email,
  });

  return session;
}
```

---

## 📱 Otimizações para Moçambique

### 1. Conexão Lenta
```css
/* Carregamento progressivo */
.image-placeholder {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 2. Dados Móveis
```typescript
// Service Worker para cache
const CACHE_NAME = 'edumarket-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/app.js',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

### 3. Modo Offline
```typescript
interface OfflineQueue {
  courses: Course[];
  enrollments: Enrollment[];
}

const offlineQueue: OfflineQueue = {
  courses: [],
  enrollments: [],
};

function queueAction(action: string, data: any) {
  // Fila ações quando offline
  offlineQueue[action as keyof OfflineQueue]?.push(data);
}

async function syncOfflineData() {
  // Sincronizar quando voltar online
  if (navigator.onLine) {
    for (const course of offlineQueue.courses) {
      await api.post('/courses', course);
    }
    offlineQueue.courses = [];
  }
}

window.addEventListener('online', syncOfflineData);
```

---

## 📊 Banco de Dados Schema

```sql
-- Utilizadores
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  type ENUM('educator', 'professional', 'student'),
  balance DECIMAL(10,2) DEFAULT 0,
  rating FLOAT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cursos
CREATE TABLE courses (
  id UUID PRIMARY KEY,
  instructor_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  price DECIMAL(10,2),
  description TEXT,
  status ENUM('draft', 'published', 'archived'),
  rating FLOAT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inscrições
CREATE TABLE enrollments (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  student_id UUID REFERENCES users(id),
  enrolled_at TIMESTAMP DEFAULT NOW(),
  progress INT DEFAULT 0,
  completed_at TIMESTAMP
);

-- Transações
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type ENUM('payment', 'withdrawal', 'refund'),
  amount DECIMAL(10,2),
  method ENUM('mpesa', 'bank', 'card'),
  status ENUM('pending', 'completed', 'failed'),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  student_id UUID REFERENCES users(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 Customização UI

### Tema para Moçambique

```typescript
const theme = {
  colors: {
    primary: '#1a73e8', // Azul
    success: '#34a853', // Verde (M-Pesa)
    warning: '#ea4335', // Vermelho
    neutral: '#5f6368', // Cinzento
    moçambique: '#007A5E', // Verde bandeira
  },
  fonts: {
    default: 'System UI, -apple-system, sans-serif',
  },
};
```

---

## ✅ Checklist de Lançamento

### MVP (Fase 1)
- [ ] Backend API básico
- [ ] Frontend marketplace
- [ ] Autenticação
- [ ] Listagem de cursos
- [ ] M-Pesa pagamento
- [ ] Dashboard educador
- [ ] 10 cursos iniciais

### Fase 2
- [ ] Certificados digitais
- [ ] Sistema de notificações
- [ ] Chat entre professor-aluno
- [ ] Análise detalhada
- [ ] Referência de renda

### Fase 3
- [ ] Aplicação mobile (React Native)
- [ ] Vídeo streaming (HLS)
- [ ] Gamificação
- [ ] Integrações bancárias
- [ ] Internacionalização

---

## 🚢 Deployment

### Vercel (Frontend)
```bash
vercel deploy
```

### AWS/DigitalOcean (Backend)
```bash
# Docker
docker build -t edumarket-api .
docker run -p 3000:3000 edumarket-api

# PM2
pm2 start server.ts --name "edumarket-api"
pm2 save
pm2 startup
```

---

## 📞 Suporte

Para dúvidas ou problemas:
- Email: support@edumarket.mz
- WhatsApp: +258 84 XXX XXXX
- Discord: https://discord.gg/edumarket

---

## 📄 Licença

Este projeto é código aberto sob licença MIT. Sinta-se livre para usar, modificar e distribuir.

