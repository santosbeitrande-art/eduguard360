# 🚀 TESTES RÁPIDOS - Verificação de Campos

**Objetivo:** Validação rápida de todos os campos funcionando  
**Tempo Estimado:** 15 minutos  
**Status:** 🔄 Em Andamento

---

## ✅ CHECKLIST RÁPIDO

### [1 MIN] 🏠 Home Page
```
1. Abra https://eduguard360.co.mz
2. Veja hero section com título
3. Clique "Explorar Portais" → deve ir para /portais
4. Scroll para baixo → veja 3 portal cards
```

**Teste Rápido:**
- [ ] Home carrega sem erros
- [ ] Hero section visível
- [ ] CTA buttons clickáveis
- [ ] Portals promo section exibida

---

### [2 MIN] 🏛️ Hub de Portais
```
1. Vá para https://eduguard360.co.mz/portais
2. Veja 5 cards de portal
```

**Teste Rápido:**
- [ ] Segurança Escolar card visível
- [ ] EduMarket card visível  
- [ ] Literatura Aberta card visível (badge "Novo")
- [ ] Enterprise & Analytics (coming soon)
- [ ] Clique "Explorar" em Literatura → `/literatura`

---

### [3 MIN] 📖 LITERATURA ABERTA - Campo de Busca

**URL:** https://eduguard360.co.mz/literatura

```
1. Vá para /literatura
2. Veja hero laranja com "Literatura Aberta"
3. Veja campo de busca com placeholder branco ⭐ (VERIFICAR NOVO)
4. Digite "Dom Quixote" e pressione Enter
5. Veja resultados aparecerem
```

**Teste Rápido:**
- [ ] Hero section exibida (fundo laranja)
- [ ] Placeholder branco VISÍVEL
- [ ] Busca "Dom Quixote" retorna resultados
- [ ] Resultados mostram em grid

---

### [4 MIN] 🎛️ LITERATURA - Filtros

```
1. Permaneça em /literatura
2. Sidebar esquerda mostra filtros
3. Altere cada filtro e observe resultado
```

**Teste Rápido:**

#### Filtro Idioma
- [ ] Dropdown abre
- [ ] Selecione "English" 
- [ ] Resultados atualizam

#### Filtro Licença
- [ ] Dropdown abre
- [ ] Selecione "Creative Commons"
- [ ] Resultados refinam

#### Filtro Assunto
- [ ] Digite "Python" no campo
- [ ] Resultados filtram
- [ ] Limpe campo → todos retornam

#### Filtro País
- [ ] Selecione "Moçambique"
- [ ] Resultados moçambicanos

#### Filtro Fonte
- [ ] Selecione "Gutenberg"
- [ ] Resultados do Gutenberg aparecem
- [ ] Selecione "Repoarte"
- [ ] Resultados moçambicanos do Repoarte

---

### [5 MIN] 📚 LITERATURA - Cards e Ações

```
1. Na /literatura, veja cards de livros
2. Teste cada botão
```

**Teste Rápido:**

#### Card de Livro (cada um tem 3 botões)
- [ ] **Botão VER**
  - Clique em livro Open Library → abre /literatura/[id]
  - Clique em livro Gutenberg → abre site externo
  
- [ ] **Botão ❤️ (Heart)**
  - Clique → muda cor (salvo)
  - Clique novamente → volta vazio
  
- [ ] **Botão Compartilhar**
  - Clique → abre opções share
  - Selecione opção (copy link, etc)

---

### [6 MIN] 📄 LITERATURA - Detalhe do Livro

```
1. A partir de um livro, clique "Ver"
2. Se Open Library → navega para /literatura/[workId]
3. Se Gutenberg/Repoarte → abre link externo
```

**Para Open Library:**
- [ ] URL mostra `/literatura/` + ID
- [ ] Botão "Voltar" leva a `/literatura`
- [ ] Informações completas do livro
- [ ] Link para ler online

---

### [7 MIN] 📑 LITERATURA - Tabs

```
1. Em /literatura, clique em cada tab
```

**Teste Rápido:**

- [ ] **EXPLORAR tab**
  - Mostra resultados de busca
  - Filtros funcionam

- [ ] **COLEÇÕES tab**
  - 3 coleções visíveis
  - Botão "Explorar Coleção"

- [ ] **MOÇAMBIQUE tab**
  - Carrega livros moçambicanos
  - Exemplos: "O Rei Gazimba", etc

- [ ] **GUARDADOS tab**
  - Mostra "Nenhum livro guardado" ou lista
  - Livros salvos aparecem aqui

---

### [8 MIN] 🛒 EDUMARKET

```
1. Vá para https://eduguard360.co.mz/edumarket
2. Veja grid de cursos
```

**Teste Rápido:**
- [ ] Cursos carregam
- [ ] Campos visíveis (imagem, título, preço)
- [ ] Botões funcionam
- [ ] Search funciona
- [ ] Filtros funcionam
- [ ] Carrinho adiciona/remove
- [ ] Checkout funciona

---

### [9 MIN] 🔒 SEGURANÇA ESCOLAR

```
1. Vá para https://eduguard360.co.mz/sistema
2. Se não logado → mostra login
3. Se logado → mostra dashboard
```

**Teste Rápido:**
- [ ] Login page carrega
- [ ] Login funciona com credenciais
- [ ] Dashboard mostra para admin
- [ ] Logout funciona

---

### [10 MIN] 🧭 Navegação Global

**Menu Principal:**
- [ ] "Início" → `/`
- [ ] "Sobre" → scroll/página
- [ ] "Contacto" → scroll/página
- [ ] "Portais" dropdown → submenu funciona
  - [ ] Segurança Escolar → `/sistema`
  - [ ] EduMarket → `/edumarket`
  - [ ] Literatura → `/literatura`

**Mobile Menu:**
- [ ] Abra no mobile (<768px)
- [ ] Hamburger visível
- [ ] Toque hamburger → menu abre
- [ ] Portais expand
- [ ] Links funcionam
- [ ] Fecha ao selecionar

---

### [11 MIN] 📱 Responsividade

```
1. Abra DevTools (F12)
2. Clique device toolbar
3. Teste em 3 tamanhos
```

**Teste Rápido:**

#### Desktop (1280px)
- [ ] Layout em 3+ colunas
- [ ] Menus horizontais
- [ ] Sem scroll horizontal

#### Tablet (768px)
- [ ] Layout em 2 colunas
- [ ] Menus ajustados
- [ ] Sem scroll horizontal

#### Mobile (375px)
- [ ] Layout 1 coluna
- [ ] Hamburger menu
- [ ] Tudo tappable
- [ ] Sem scroll horizontal

---

### [12 MIN] 🔗 Verificação de Rotas (Breadcrumb)

Teste cada rota direto:

```javascript
// Cole no console (F12) para verificar rotas:
console.log("Routes Test:");
console.log("✅ Home: " + window.location.origin + "/");
console.log("✅ Portals Hub: " + window.location.origin + "/portais");
console.log("✅ Literature: " + window.location.origin + "/literatura");
console.log("✅ Literature Book: " + window.location.origin + "/literatura/OL1234567W");
console.log("✅ System: " + window.location.origin + "/sistema");
console.log("✅ EduMarket: " + window.location.origin + "/edumarket");
```

**Teste Rápido:**
- [ ] Todas as rotas carregam sem 404
- [ ] Rota inválida mostra erro/redirecionado
- [ ] Back button funciona em todas

---

### [13 MIN] 🎨 Verificação Visual

```
1. Abra each portal
2. Procure por problemas visuais
```

**Teste Rápido:**
- [ ] Nenhum texto cortado
- [ ] Imagens carregam
- [ ] Cores consistentes
- [ ] Buttons visíveis
- [ ] Inputs com labels claros
- [ ] Sem layout shifts

---

### [14 MIN] 🐛 Verificação Console

```
1. Abra DevTools (F12)
2. Clique "Console" tab
3. Procure por erros vermelhos
```

**Teste Rápido:**
- [ ] Console limpo (sem erros)
- [ ] Warnings apenas informativos
- [ ] Network requests completam
- [ ] Nenhum 404 em assets

---

### [15 MIN] ✨ Verificação Final

**Última Checagem:**

- [ ] Todos os campos testados
- [ ] Sem erros críticos
- [ ] Tudo responsivo
- [ ] Navegação fluida
- [ ] Performance aceitável

---

## 🚨 Issues Encontrados

### Critical (Bloqueia Uso)
```
[ ] Nenhum identificado ainda
```

### High Priority (Afeta UX)
```
[ ] Nenhum identificado ainda
```

### Medium Priority (Melhorias)
```
[ ] Nenhum identificado ainda
```

### Low Priority (Polish)
```
[ ] Nenhum identificado ainda
```

---

## 📊 Resultado Final

**Data de Teste:** _______________  
**Testador:** _______________  
**Resultado:**
- [ ] ✅ PASSOU - Tudo funciona
- [ ] ⚠️ PASSOU COM WARNINGS - Itens menores
- [ ] ❌ FALHOU - Issues críticas encontradas

**Observações:**
```
_________________________________________________________
_________________________________________________________
_________________________________________________________
```

---

## 🔄 Próximos Passos

Se tudo passar ✅:
1. Documentar em CAMPO_VERIFICACAO_COMPLETA.md
2. Deploy está PRONTO para produção
3. Notificar usuários de novo "Literatura" portal

Se tiver issues ⚠️:
1. Documentar cada issue
2. Priorizar por impacto
3. Implementar fixes
4. Re-testar

---

**Última Verificação:** 2024  
**Status:** 🔄 Pronto para início de testes

