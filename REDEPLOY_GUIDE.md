# 🚀 Guia de Redeploy - EduGuard 360

**Última atualização:** 3 de Junho de 2026  
**URL de produção:** https://eduguard360.co.mz  
**URL de desenvolvimento:** http://192.168.1.60:8080  
**Repositório:** https://github.com/santosbeitrande-art/eduguard360

---

## 📋 Sumário

Mudanças recentes implementadas:
- ✅ Portal de Literatura Aberta integrado
- ✅ Card Literatura no hub de portais (`/portais`)
- ✅ Menu de navegação atualizado com Literatura
- ✅ Suporte a livros Open Library, Gutenberg e Repoarte
- ✅ Página de detalhe do livro (`/literatura/:bookId`)

---

## 🔄 Opção 1: Redeploy via GitHub + Vercel (RECOMENDADO)

### Passo 1: Commit das mudanças no Git

```bash
cd "c:\Users\AEAO\Desktop\Santos\website-guide eduguard360"

# Ver o status atual
git status

# Adicionar todos os arquivos modificados
git add .

# Ou adicionar seletivamente (se preferir)
git add src/App.tsx
git add src/EducuardPortalHub.tsx
git add src/components/EducuardNavigation.tsx
git add src/components/PortalsPromoSection.tsx
git add src/components/LiteraturePortal.tsx
git add src/pages/LiteraturePage.tsx
git add src/pages/LiteratureBookPage.tsx
git add src/pages/public/LandingPage.tsx
git add src/pages/system/AdminDashboard.tsx
```

### Passo 2: Criar o commit

```bash
git commit -m "feat: integrar portal de literatura aberta com Open Library e Project Gutenberg"
```

**Exemplo de mensagem detalhada:**
```bash
git commit -m "feat: integrar portal de literatura aberta

- Adicionar Portal de Literatura com múltiplas fontes (Open Library, Project Gutenberg, Repoarte)
- Integrar card Literatura no hub de portais (/portais)
- Adicionar Literatura ao menu de navegação principal
- Criar página de detalhe do livro (/literatura/:bookId)
- Suporte a busca avançada, filtros e fallback de dados
- Remover filtro duplicado na seção de filtros"
```

### Passo 3: Push para o GitHub

```bash
git push origin main
```

**O que acontece a seguir:**
- GitHub recebe o push
- Vercel recebe webhook automaticamente
- Vercel inicia o build da branch `main`
- Após ~2-3 minutos, a versão nova está em produção
- URL atualizada em https://eduguard360.co.mz

---

## 🏠 Opção 2: Deploy Manual no Servidor Local/Produção

Se usar FTP, SSH ou outro método de deploy:

### Passo 1: Build local

```bash
cd "c:\Users\AEAO\Desktop\Santos\website-guide eduguard360"

# Limpar build anterior (opcional)
rmdir /s dist

# Fazer o build
npm run build

# Verificar que a pasta dist foi criada
dir dist
```

### Passo 2: Enviar arquivos para produção

**Via FTP:**
```
1. Conectar ao FTP do servidor
2. Ir para a pasta raiz do site (ex: /public_html ou /www)
3. Deletar pasta `dist` antiga (ou renomear como backup)
4. Upload da nova pasta `dist` do seu computador
```

**Via SSH/Terminal:**
```bash
# Se tiver acesso SSH ao servidor
scp -r dist/* usuario@192.168.1.60:/caminho/do/site/

# Ou usar rsync (mais eficiente)
rsync -avz dist/* usuario@192.168.1.60:/caminho/do/site/
```

**Via GitHub Actions (se configurado):**
```bash
# Apenas fazer push (como na Opção 1)
git add .
git commit -m "..."
git push origin main
```

### Passo 3: Limpar cache do navegador

Após upload, os visitantes precisam limpar cache:

```
Chrome:  Ctrl+Shift+Delete
Firefox: Ctrl+Shift+Delete
Safari:  Cmd+Shift+Delete
```

Ou você pode adicionar cache-busting aos arquivos:
```html
<!-- Se tiver acesso ao HTML raiz -->
<link rel="stylesheet" href="/dist/assets/index.css?v=1.0.1">
<script src="/dist/assets/index.js?v=1.0.1"></script>
```

---

## ✅ Verificação Pós-Deploy

### Local (desenvolvimento)

```bash
# 1. Iniciar servidor dev
npm run dev

# 2. Abrir http://localhost:5173
# 3. Testar:
- Clicar em "Portais" no menu
- Verificar se "Literatura Aberta" aparece
- Clicar em "Literatura" e procurar livros
- Testar busca por "Dom Quixote" ou "Python"
- Testar com Project Gutenberg como fonte
- Clicar num livro e verificar página de detalhe
- Testar fallback (desligar internet temporariamente)
```

### Produção (https://eduguard360.co.mz)

```
1. Abrir https://eduguard360.co.mz/portais
   - Deve ver 5 cards (3 disponíveis + 2 em breve)
   - "Literatura Aberta" deve estar na lista

2. Clicar em "Literatura Aberta"
   - Deve abrir https://eduguard360.co.mz/literatura
   - Deve mostrar formulário de busca
   - Deve mostrar 3 livros padrão (fallback)

3. Fazer busca por "Dom Quixote"
   - Deve retornar resultados
   - Deve permitir clicar num livro

4. Limpar cache se algo não aparecer
   - Ctrl+Shift+Delete no navegador
   - Ou usar modo incógnito
```

---

## 🔗 Configuração Vercel

**Vercel.json atual** (já configurado):
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**O que faz:**
- `framework: "vite"` - Usa Vite para build
- `buildCommand` - Comando de build automático
- `outputDirectory` - Pasta onde fica o site final
- `rewrites` - **IMPORTANTE**: Faz redireção de todas as rotas para `/index.html` (necessário para SPA React Router)

---

## ⚡ Checklist Rápido

- [ ] `git status` - verificar mudanças
- [ ] `git add .` - adicionar arquivos
- [ ] `git commit -m "feat: ..."` - fazer commit com mensagem clara
- [ ] `git push origin main` - enviar para GitHub
- [ ] Aguardar 2-3 minutos para Vercel fazer deploy
- [ ] Testar https://eduguard360.co.mz/portais
- [ ] Testar https://eduguard360.co.mz/literatura
- [ ] Limpar cache do navegador se necessário
- [ ] Verificar console do navegador (F12) para erros
- [ ] Testar em dispositivo móvel

---

## 🐛 Troubleshooting

### "Portal não aparece em produção mas aparece localmente"

**Causa:** Cache do navegador ou Vercel  
**Solução:**
1. Limpar cache: Ctrl+Shift+Delete
2. Usar modo incógnito do navegador
3. Aguardar 5-10 minutos para Vercel fazer cache-invalidation
4. Verificar em outro navegador/dispositivo

### "Livros não carregam"

**Causa:** API Open Library/Gutenberg indisponível ou bloqueada por CORS  
**Solução:**
1. Verificar console (F12) para erros de CORS
2. Testar direto em https://openlibrary.org/search.json?q=python
3. Se offline, deve usar fallback
4. Testar em diferentes redes

### "Página fica em branco"

**Causa:** Erro de JavaScript ou problemas de build  
**Solução:**
1. Abrir console (F12) para ver erro exato
2. Fazer rebuild: `npm run build`
3. Verificar se há erros de compilação
4. Testar localmente antes de fazer deploy

### "URLs antigas funcionam, novas não"

**Causa:** Falta de `rewrites` no vercel.json  
**Solução:**
- Verificar se `vercel.json` está configurado corretamente
- Se editar `vercel.json`, precisa fazer novo deploy

---

## 📞 Contato e Suporte

- **GitHub:** https://github.com/santosbeitrande-art/eduguard360
- **Issues:** https://github.com/santosbeitrande-art/eduguard360/issues
- **Vercel Dashboard:** https://vercel.com/dashboard (se tem acesso)

---

## 📝 Notas Adicionais

### Mudanças de código incluídas:

1. **src/App.tsx**
   - Rota `/portais` → `EducuardPortalHub`
   - Rota `/literatura` → `LiteraturePage`
   - Rota `/literatura/:bookId` → `LiteratureBookPage`

2. **src/EducuardPortalHub.tsx**
   - Card "Literatura Aberta" adicionado
   - Badge "Novo" para destacar portal

3. **src/components/LiteraturePortal.tsx**
   - Portal completo com busca
   - Suporte Open Library, Gutenberg, Repoarte
   - Fallback de dados

4. **src/components/EducuardNavigation.tsx**
   - "Literatura Aberta" no menu Portais

5. **src/components/PortalsPromoSection.tsx**
   - Card Literatura na seção de promoção

### Métodos de acesso:

- Landing page → "Explorar Portais" → `/portais` → Literatura
- Menu nav → "Portais" dropdown → Literatura
- Diretamente: `/literatura`
- Livro específico: `/literatura/OL45883W` (exemplo)

---

**Status:** ✅ Pronto para produção  
**Build:** ✅ Sem erros  
**Testes:** ✅ Funcionando localmente
