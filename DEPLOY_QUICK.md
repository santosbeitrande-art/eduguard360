# ⚡ Deploy Rápido - Instruções 1-2-3

## 🎯 OPÇÃO 1: Script Automático (MAIS FÁCIL)

### Windows (PowerShell):
```powershell
cd "c:\Users\AEAO\Desktop\Santos\website-guide eduguard360"
.\redeploy.ps1
```

### Mac/Linux/WSL (Bash):
```bash
cd /caminho/para/website-guide\ eduguard360
chmod +x redeploy.sh
./redeploy.sh
```

**O script faz automaticamente:**
1. ✓ Adiciona todos os arquivos
2. ✓ Cria commit com mensagem
3. ✓ Faz push para GitHub
4. ✓ Vercel deploy automaticamente

---

## 🚀 OPÇÃO 2: Comandos Manuais

Se preferir fazer passo a passo:

### 1️⃣ Adicionar mudanças
```bash
cd "c:\Users\AEAO\Desktop\Santos\website-guide eduguard360"
git add .
```

### 2️⃣ Criar commit
```bash
git commit -m "feat: integrar portal de literatura aberta com Open Library, Gutenberg e Repoarte"
```

### 3️⃣ Enviar para GitHub
```bash
git push origin main
```

### ✅ Pronto!
Vercel detectará automaticamente e fará deploy em 2-3 minutos.

---

## 🔍 Verificar Deploy

### No Vercel Dashboard:
1. Abrir: https://vercel.com/dashboard
2. Procurar por: `eduguard360`
3. Ver status do build
4. Aguardar status ✅ "Ready"

### Testar em Produção:
```
✓ https://eduguard360.co.mz/portais
✓ https://eduguard360.co.mz/literatura
```

### Se não aparecer:
1. Limpar cache: `Ctrl+Shift+Delete`
2. Usar modo incógnito
3. Aguardar 5 minutos (cache Vercel)
4. Testar em outro navegador

---

## 📋 Arquivos Alterados

✅ `src/App.tsx` - Rotas do portal
✅ `src/EducuardPortalHub.tsx` - Card Literatura adicionado
✅ `src/components/EducuardNavigation.tsx` - Menu atualizado
✅ `src/components/PortalsPromoSection.tsx` - Promo seção
✅ `src/components/LiteraturePortal.tsx` - Portal completo
✅ `src/pages/LiteraturePage.tsx` - Página literatura
✅ `src/pages/LiteratureBookPage.tsx` - Página livro

---

## 📍 URLs do Portal de Literatura

| Rota | Descrição |
|------|-----------|
| `/portais` | Hub com 5 portais |
| `/literatura` | Portal de literatura (busca) |
| `/literatura/:bookId` | Página do livro |

---

## ❓ FAQ Rápido

**P: Quanto tempo demora o deploy?**  
R: ~2-3 minutos

**P: Preciso fazer mais alguma coisa?**  
R: Não, Vercel faz tudo automaticamente

**P: E se algo der errado?**  
R: Ver `REDEPLOY_GUIDE.md` seção "Troubleshooting"

**P: Posso cancelar o deploy?**  
R: Sim, responda "N" quando o script pergunta

**P: Como reverter se der erro?**  
R: `git revert HEAD` + push novamente

---

## 🎉 Status Atual

```
✅ Build local: Sucesso (sem erros)
✅ Rotas criadas: /portais, /literatura, /literatura/:bookId
✅ Componentes: Todos integrados
✅ Testes: Funcionando localmente
✅ Pronto para: DEPLOY EM PRODUÇÃO
```

---

## 🚀 PRÓXIMO PASSO

**Executar:** `.\redeploy.ps1` (Windows) ou `./redeploy.sh` (Mac/Linux)

---

*Última atualização: 3 Junho 2026*
