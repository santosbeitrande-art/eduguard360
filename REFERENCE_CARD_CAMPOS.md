# 📋 REFERENCE CARD - Verificação de Campos

## 🎯 URLs DE TESTE

```
HOME       → https://eduguard360.co.mz/
PORTALS    → https://eduguard360.co.mz/portais
LITERATURA → https://eduguard360.co.mz/literatura
EDUMARKET  → https://eduguard360.co.mz/edumarket
SISTEMA    → https://eduguard360.co.mz/sistema
```

---

## 📖 LITERATURA PORTAL - QUICK TEST

### ✅ Visual Elements
```
[  ] Hero section (laranja/amber)
[  ] Book icon no topo
[  ] Título "Literatura Aberta"
[  ] Search input BRANCO placeholder ⭐
[  ] 4 Tabs: Explorar | Coleções | Moçambique | Guardados
[  ] Sidebar com filtros
[  ] Grid de livros
```

### 🔍 Search Tests
```
[  ] Buscar "Dom Quixote" → resultados aparecem
[  ] Buscar "Miguel Cervantes" → resultados aparecem
[  ] Buscar "Python" → resultados
[  ] Buscar "educação" → resultados
[  ] Buscar inválido → "nenhum resultado"
```

### 🎛️ Filter Tests
```
[  ] Idioma dropdown → filtra
[  ] Licença dropdown → filtra
[  ] Assunto input → filtra
[  ] País dropdown → filtra
[  ] Fonte dropdown → filtra
[  ] Combinação de filtros → funciona
```

### 📑 Tab Tests
```
[  ] EXPLORAR - mostra search results
[  ] COLEÇÕES - 3 coleções visíveis
[  ] MOÇAMBIQUE - conteúdo moçambicano
[  ] GUARDADOS - "nenhum livro" ou lista
```

### 🎬 Button Tests (em cada book card)
```
[  ] VER button → navega ou abre link
[  ] ❤️ button → toggle save (cor muda)
[  ] Share button → abre menu
```

---

## 🏛️ PORTAL HUB TESTS

```
URL: /portais

[  ] Segurança Escolar card → clickable
[  ] EduMarket card → clickable
[  ] Literatura Aberta card → clickable (badge "Novo")
[  ] Enterprise card → cinzento (não-clickable)
[  ] Analytics card → cinzento (não-clickable)
```

---

## 🛒 EDUMARKET TESTS

```
URL: /edumarket

[  ] Cursos carregam em grid
[  ] Search funciona
[  ] Filtros funcionam
[  ] Adicionar carrinho
[  ] Ver carrinho
[  ] Checkout
[  ] Admin access (/sistema/admin/edumarket)
```

---

## 🔒 SISTEMA (SEGURANÇA) TESTS

```
URL: /sistema

[  ] Login page carrega
[  ] Username/email input
[  ] Password input
[  ] Login button
[  ] Sucesso → dashboard aparece
[  ] Logout funciona
[  ] Admin role dados aparecem
```

---

## 🧭 NAVEGAÇÃO TESTS

### Desktop Menu
```
[  ] Logo home
[  ] "Início" → /
[  ] "Sobre" → scroll
[  ] "Contacto" → scroll
[  ] "Portais" dropdown:
    [  ] Segurança Escolar → /sistema
    [  ] EduMarket → /edumarket
    [  ] Literatura → /literatura
```

### Mobile Menu (< 768px)
```
[  ] Hamburger visible
[  ] Toca hamburger → menu abre
[  ] Portais expand
[  ] Links funcionam
[  ] Fecha ao selecionar
```

---

## 📱 RESPONSIVIDADE TESTS (F12 device toolbar)

### Desktop (1280px)
```
[  ] 3+ column layout
[  ] Horizontal menus
[  ] Sem scroll horizontal
```

### Tablet (768px)
```
[  ] 2 column layout
[  ] Menus ajustados
[  ] Sem scroll horizontal
```

### Mobile (375px)
```
[  ] 1 column layout
[  ] Hamburger menu
[  ] Elementos tappable
[  ] Sem scroll horizontal
```

---

## 🔧 DEVELOPER TESTS (F12)

### Console
```
[  ] Nenhum erro vermelho
[  ] Network requests OK (200, 304)
[  ] Nenhum 404 em assets
```

### Network
```
[  ] HTML - 200
[  ] CSS - 200
[  ] JS - 200
[  ] API calls - 200
[  ] Load time < 3s
```

### Lighthouse
```
[  ] Performance > 70
[  ] Accessibility > 80
[  ] Best Practices > 80
[  ] SEO > 80
```

---

## ✨ FINAL CHECKLIST

```
LITERATURA PORTAL
[  ] Visual OK
[  ] Search OK
[  ] Filters OK
[  ] Tabs OK
[  ] Buttons OK

HUB PORTALS
[  ] 5 Cards visible
[  ] Literatura new badge
[  ] Navigation OK

NAVIGATION
[  ] All links work
[  ] Mobile menu OK
[  ] Back buttons OK

RESPONSIVE
[  ] Desktop OK
[  ] Tablet OK
[  ] Mobile OK

CONSOLE
[  ] No errors
[  ] Network OK
[  ] Performance OK
```

---

## 📝 ISSUE LOG

### Issue 1
```
[ ] Title: _________________________
[ ] URL: __________________________
[ ] Severity: Critical | High | Medium | Low
[ ] Description: ___________________
[ ] Fix Status: Open | In Progress | Fixed
```

### Issue 2
```
[ ] Title: _________________________
[ ] URL: __________________________
[ ] Severity: Critical | High | Medium | Low
[ ] Description: ___________________
[ ] Fix Status: Open | In Progress | Fixed
```

---

## 🎯 RESULTADO FINAL

```
Data: ___________
Testador: ___________
Resultado: ✅ PASS | ⚠️ WARNINGS | ❌ FAIL

Total Tests: ___
Passed: ___
Failed: ___
Success Rate: ____%

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🚀 DEPLOY STATUS

```
Last Build: ________________
Last Commit: ________________
Deployed to: Production | Staging
Status: ✅ LIVE | 🔄 TESTING | ❌ FAILED
```

---

**Quick Reference Version 1.0**  
Last Updated: 2024

