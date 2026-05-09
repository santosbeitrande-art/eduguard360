# ⚡ QUICK START - Integração Portais EduGuard 360

## 🎯 Objetivo
Integrar os portais (Segurança Escolar + EduMarket) na landing page do eduguard360.co.mz

## ⏱️ Tempo Estimado
- **Integração**: 15 minutos
- **Testes**: 10 minutos
- **Deploy**: 5 minutos
- **Total**: ~30 minutos

---

## 📋 Checklist de Implementação

### PASSO 1: Verificar Arquivos (2 min)
```bash
# Verifique se os seguintes arquivos existem:

✓ src/EducuardPortalHub.tsx
✓ src/EducationMarketplace.tsx
✓ src/EducatorCreateCourse.tsx
✓ src/components/EducuardNavigation.tsx
✓ src/components/PortalsPromoSection.tsx
✓ backend/src/routes/marketplace.ts
✓ src/App.tsx (com rotas atualizadas)
```

---

### PASSO 2: Atualizar Landing Page (5 min)

**Arquivo:** `src/pages/public/LandingPage.tsx`

#### 2.1 - Adicione os imports no topo:
```tsx
import EducuardNavigation from "@/components/EducuardNavigation";
import PortalsPromoSection from "@/components/PortalsPromoSection";
```

#### 2.2 - Adicione EducuardNavigation logo após a abertura do componente:
```tsx
export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ADICIONE ISTO: */}
      <EducuardNavigation variant="light" />
      
      {/* Resto da página... */}
    </div>
  );
}
```

#### 2.3 - Adicione PortalsPromoSection entre as sections:
```tsx
{/* Adicione APÓS features section e ANTES de demo request */}
<PortalsPromoSection />
```

---

### PASSO 3: Testar Navegação (8 min)

#### 3.1 - URLs Principais
```
✓ / → Landing Page
✓ /portais → Portal Hub (novo)
✓ /sistema → Segurança Escolar
✓ /edumarket → EduMarket
✓ /edumarket/criar-curso → Course Creator
```

#### 3.2 - Testar Menu
```
1. Hover em "Portais" → dropdown aparece
2. Clique em portal → navega corretamente
3. Mobile: hambúrguer → menu → portais dropdown
```

#### 3.3 - Testar Botões
```
1. "Explorar Portais" (hero)
2. "Acessar Portais" (nav)
3. "Ver Todos os Portais" (promo section)
4. Cards de portais individuais
```

#### 3.4 - Portal Hub Tests
```
1. Acesse /portais
2. Veja 4 portais (2 disponíveis + 2 em breve)
3. Clique "Acessar" → navega
4. Click "Em Breve" → modal email
```

---

### PASSO 4: Verificar Performance (3 min)

```bash
# No browser (F12):
1. Console: sem erros
2. Network: componentes carregam
3. Responsividade: mobile/tablet/desktop
```

---

### PASSO 5: Deploy (2 min)

```bash
npm run build
git add .
git commit -m "feat: integrar portais na landing page"
git push origin main
# Deploy via seu hosting (Vercel/etc)
```

---

## 🎨 Customizações Rápidas

### Mudar Cores
```tsx
// Em EducuardPortalHub.tsx, linha ~60
color: 'from-blue-600 to-blue-700'  // Mude aqui
```

### Adicionar Portal Futuro
```tsx
// Em EducuardPortalHub.tsx, adicione à array:
{
  id: 'meu-portal',
  name: 'Meu Portal',
  title: '🚀 Meu Portal',
  description: 'Descrição...',
  color: 'from-green-600 to-emerald-600',
  status: 'coming-soon',
  features: ['Feature 1', 'Feature 2'],
}
```

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Cannot find module" | Verifique import path: `@/components/...` |
| Rotas não funcionam | Verifique App.tsx tem todas as rotas |
| Styling errado | Verifique Tailwind está configurado |
| Componentes não aparecem | Abra F12, veja console por erros |

---

## ✅ Checklist Final

```
□ Arquivos criados verificados
□ Landing page atualizada
□ Navegação testada
□ Performance OK
□ Deploy feito
□ Métricas iniciadas
```

---

## 📊 Estrutura Final

```
Landing Page
├── EducuardNavigation (novo)
├── Hero
├── Features
├── PortalsPromoSection (novo)
├── Demo Request
├── Testimonials
├── CTA
└── Footer

/portais → EducuardPortalHub
├── Segurança Escolar ✓
├── EduMarket ✓
├── Enterprise ⏰
└── Analytics ⏰

/sistema → Portal Segurança
/edumarket → Portal EduMarket
```

---

## 🚀 Próximos Passos

- [ ] Implementar componentes
- [ ] Testar navegação
- [ ] Deploy para produção
- [ ] Monitorar métricas
- [ ] Otimizar com dados

---

**Pronto para integrar? Comece pelo PASSO 1!** 🎉

