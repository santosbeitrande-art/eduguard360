# 🌱 EcoTrade360 - Guia de Deployment
## Marketplace de Reciclagem - Do Teste ao Online

---

## 📋 Resumo do Projeto

**EcoTrade360** é um marketplace para compra e venda de materiais recicláveis com:
- 📱 **App Mobile** (Flutter)
- 🌐 **Web Dashboard** (React/Vite)
- 🔧 **Backend API** (Node.js/Express)
- 🗄️ **Database** (PostgreSQL)

---

## 🚀 OPÇÃO 1: MAIS RÁPIDO (Teste/MVP - €0)

### Deploy Completo em 30 Minutos

#### **Arquitetura:**
```
Web (Vercel) ──> Backend (Railway) ──> Database (Railway)
     ↓              ↓
https://seu-app.vercel.app    https://api.railway.app
```

---

### ✅ PASSO 1: Preparar Projeto (5 min)

```bash
# Entrar na pasta do projeto
cd "c:\Users\AEAO\Desktop\Santos\website-guide eduguard360"

# Verificar estrutura
ls -la

# Deve ter:
# - reciclagem-marketplace/
#   - web/
#   - backend/
#   - mobile/
```

#### **Testar Localmente:**

```bash
# Terminal 1: Backend
cd reciclagem-marketplace/backend
npm install
npm start
# Deve rodar em http://localhost:3000

# Terminal 2: Web
cd reciclagem-marketplace/web
npm install
npm run dev
# Deve rodar em http://localhost:5173
```

---

### ✅ PASSO 2: GitHub (5 min)

```bash
# Na raiz do projeto
cd "c:\Users\AEAO\Desktop\Santos\website-guide eduguard360"

# Se não tiver Git iniciado
git init
git add .
git commit -m "EcoTrade360 - Initial commit"

# Criar repositório em: https://github.com/new
# Depois:
git remote add origin https://github.com/SEU_USUARIO/ecotrade360.git
git branch -M main
git push -u origin main
```

**Resultado:** Código no GitHub ✅

---

### ✅ PASSO 3: Deploy Web (Vercel) - 3 min

1. Ir para https://vercel.com/new
2. Clicar "Import Git Repository"
3. Selecionar seu repositório
4. **Configure:**
   - Root Directory: `reciclagem-marketplace/web`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Deploy

**Resultado:** 
- Web em produção: https://seu-app.vercel.app ✅

---

### ✅ PASSO 4: Deploy Backend (Railway) - 7 min

**Opção A: Via Web**

1. Ir para https://railway.app
2. "New Project"
3. "Deploy from GitHub repo"
4. Selecionar seu repositório
5. Criar serviço PostgreSQL
6. Configurar Environment:
   ```
   DATABASE_URL = postgresql://...
   PORT = 5000
   NODE_ENV = production
   ```

**Opção B: Via CLI (Mais rápido)**

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Na pasta backend
cd reciclagem-marketplace/backend

# Criar projeto
railway init

# Deploy
railway up
```

**Resultado:** 
- API em produção: https://seu-api.railway.app ✅
- Database PostgreSQL criado ✅

---

### ✅ PASSO 5: Conectar Frontend ao Backend (2 min)

Atualizar variáveis de ambiente na Vercel:

```
VITE_API_URL = https://seu-api.railway.app
```

---

## 💳 OPÇÃO 2: COM DOMÍNIO PRÓPRIO (€5-10/ano)

### Adicionar domínio .pt ao seu site

#### **Passo 1: Comprar Domínio (2 min)**

Escolha barata:
- **Namecheap**: €0,88 (1º ano) → https://www.namecheap.com
- **Porkbun**: €8,50/ano → https://porkbun.com
- **Google Domains**: €12/ano → https://domains.google

**Exemplo:** `ecotrade360.pt`

#### **Passo 2: Conectar Domínio (3 min)**

**Na Vercel (Web):**
1. Project Settings → Domains
2. Add Domain: `ecotrade360.pt`
3. Seguir instruções DNS
4. Pronto!

**Na Railway (Backend):**
1. Project Settings → Domains
2. Add Domain: `api.ecotrade360.pt`
3. Configurar DNS

#### **Resultado:**
```
Web:  https://ecotrade360.pt
API:  https://api.ecotrade360.pt
```

**Custo Total:**
- Vercel: €0 (grátis)
- Railway: €5-20/mês
- Domínio: €5/ano
- **Total: €5-20/mês**

---

## 🏆 OPÇÃO 3: SOLUÇÃO PROFISSIONAL (€20-50/mês)

### Full Stack em 1 Plataforma

Use **DigitalOcean App Platform** - tudo junto:

#### **Vantagens:**
- ✅ Frontend + Backend + Database
- ✅ SSL automático
- ✅ Deploy automático (git push)
- ✅ Suporte 24/7
- ✅ Fácil escaling

#### **Passos:**

1. Criar conta: https://digitalocean.com
2. "Apps" → "Create App"
3. Conectar GitHub
4. Configurar:
   ```yaml
   services:
     - name: web
       github:
         path: ./reciclagem-marketplace/web
       build_command: npm run build
       
     - name: api
       github:
         path: ./reciclagem-marketplace/backend
       build_command: npm install
       
     - name: db
       type: postgres
   ```
5. Deploy

**Resultado:**
- Tudo funcionando: https://seu-app.ondigitalocean.app
- **Custo: €12/mês**

---

## 📱 DEPLOY MOBILE (Flutter)

### Publicar App na Play Store & App Store

#### **Para Android (Play Store)**

```bash
cd reciclagem-marketplace/mobile

# Build release APK
flutter build apk --release

# Resultado em: build/app/outputs/apk/release/app-release.apk

# Ou build App Bundle (recomendado)
flutter build appbundle

# Upload em: https://play.google.com/console
```

**Custo:**
- Conta Google Play: €25 (one-time)
- Publicação: Grátis

#### **Para iOS (App Store)**

```bash
# Build release IPA
flutter build ios --release

# Usar Xcode para configurar provisioning profiles
# Upload em: https://appstoreconnect.apple.com
```

**Custo:**
- Apple Developer: $99/ano

---

## 🔗 CHECKLIST DE DEPLOYMENT

### Antes de Deploy

- [ ] Código testado localmente
- [ ] `.env` configurado corretamente
- [ ] Database migrado
- [ ] Imagens otimizadas
- [ ] Variáveis de ambiente em produção
- [ ] CORS configurado
- [ ] SSL/HTTPS ativo

### Depois de Deploy

- [ ] Acessar website
- [ ] Testar autenticação
- [ ] Criar anúncio de teste
- [ ] Visualizar no mapa
- [ ] Testar filtros
- [ ] Verificar performance
- [ ] Monitorar logs

---

## 🚨 POSSÍVEIS ERROS

### ❌ "API retorna 404"

```bash
# Verificar se backend está rodando
curl https://seu-api.railway.app/health

# Se não funciona:
# 1. Verificar variáveis de ambiente em Railway
# 2. Verificar logs: railway logs
# 3. Rebuildar: railway up
```

### ❌ "Database connection refused"

```bash
# Verificar string de conexão
echo $DATABASE_URL

# Deve ser:
# postgresql://user:password@host:5432/database

# Se vazio:
# 1. Adicionar variável em Railway dashboard
# 2. Redeployar
```

### ❌ "Frontend não encontra API"

```bash
# Em Vercel dashboard:
# 1. Settings → Environment Variables
# 2. Adicionar: VITE_API_URL=https://seu-api.railway.app
# 3. Redeploy
```

### ❌ "Build falha"

```bash
# Limpar cache
rm -rf node_modules dist
npm install
npm run build

# Testar localmente antes de fazer push
npm run dev
```

---

## 📊 MONITORAMENTO

### Monitorar Performance

**Vercel:**
- Dashboard → Analytics
- Ver: Load time, bandwidth, errors

**Railway:**
- Dashboard → Logs
- Ver: Erros, requests, performance

**Banco de Dados:**
```bash
# Conectar ao PostgreSQL
psql $DATABASE_URL

# Verificar tamanho
SELECT pg_size_pretty(pg_database_size('ecotrade360'));

# Ver queries lentas
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

---

## 💡 DICAS IMPORTANTES

### 1. **Otimizar Imagens**

```bash
# Usar ImageOptim, TinyPNG, ou Vercel Image Optimization
# No código:
<Image 
  src={imageUrl}
  alt="Lixo reciclável"
  width={400}
  height={300}
  quality={80}
/>
```

### 2. **Cache de API**

```javascript
// Backend: Adicionar headers de cache
app.get('/api/listings', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300'); // 5 min
  res.json(listings);
});
```

### 3. **Logs Estruturados**

```javascript
// Para debug em produção
console.log(JSON.stringify({
  timestamp: new Date(),
  level: 'INFO',
  message: 'User created',
  userId: user.id
}));
```

### 4. **Backup Database**

```bash
# Railway automático, mas fazer backup manual:
pg_dump $DATABASE_URL > backup.sql

# Restaurar:
psql $DATABASE_URL < backup.sql
```

---

## 🎯 MINHA RECOMENDAÇÃO

### **Para MVP (Hoje)**
1. GitHub + Vercel (Web) + Railway (Backend)
2. Testar com usuários reais
3. Custo: **€5-20/mês**
4. Tempo: **30 min**

### **Para Produção (Depois)**
1. DigitalOcean ou AWS
2. CloudFlare CDN
3. SendGrid (emails)
4. Stripe (pagamentos)
5. Auth0 (autenticação avançada)

---

## 📞 LINKS RÁPIDOS

| Serviço | URL | Custo |
|---------|-----|-------|
| Vercel | https://vercel.com | €0 |
| Railway | https://railway.app | €5+ |
| DigitalOcean | https://digitalocean.com | €12+ |
| Namecheap | https://namecheap.com | €0,88 |
| GitHub | https://github.com | €0 |

---

## 🎓 PRÓXIMAS ETAPAS

1. ✅ Deploy MVP
2. ✅ Testes com usuários
3. ✅ Feedback & iterações
4. ✅ Analytics (Google Analytics, Mixpanel)
5. ✅ Pagamentos (Stripe/PayPal)
6. ✅ Notificações (Firebase Cloud Messaging)
7. ✅ Chat (Socket.io)
8. ✅ IA (Sugestão de preços, recomendações)

---

**Precisa de ajuda? Comece pelo PASSO 1!** 🚀
