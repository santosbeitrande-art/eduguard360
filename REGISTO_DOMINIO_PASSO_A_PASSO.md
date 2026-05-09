# 🚀 Registo de Domínio .COM - Guia Passo a Passo
## Registar ecotrade360.com em 5 Minutos

---

## 📋 ANTES DE COMEÇAR

✅ Ter cartão de crédito/débito OU PayPal
✅ Email ativo (para confirmação)
✅ Decide: `ecotrade360` (sem hífens)

---

## 🎯 PASSO 1: Ir para Namecheap (1 min)

1. Abrir: https://www.namecheap.com
2. Procurar domínio (canto superior esquerdo)
3. Digitar: `ecotrade360`
4. Clicar Enter

**Resultado esperado:**
```
ecotrade360.com  ✅ Disponível (€8,88)
ecotrade360.co.uk  - Disponível
ecotrade360.net  - Disponível
```

---

## 🎯 PASSO 2: Adicionar ao Carrinho (1 min)

1. Clicar **"Add to Cart"** no ecotrade360.com
2. Escolher período: **1 Year** (€8,88)
3. Clicar **"View Cart"**

**Carrinho deve ter:**
```
ecotrade360.com - 1 year @ €8,88
```

---

## 🎯 PASSO 3: Configuração (1 min)

Na página do carrinho:

```
☐ Uncheck: "Auto-renew"  (opcional, mas recomendo deixar ON)
✅ Deixar: "WHOIS Guard" desativado (não precisa)
✅ Continuar
```

---

## 🎯 PASSO 4: Checkout (1 min)

1. Clicar **"Confirm Order"**
2. **Sign Up or Login:**
   ```
   Email: seu-email@gmail.com
   Senha: Criar senha forte
   Confirmar email
   ```
3. Voltar para checkout

---

## 🎯 PASSO 5: Pagamento (1 min)

**Método de Pagamento:**

### Opção A: Cartão de Crédito/Débito (Mais rápido)

```
Nome do Titular: Seu Nome
Número Cartão: 1234 5678 9012 3456
Validade: 12/26
CVV: 123
```

### Opção B: PayPal (Mais seguro)

```
1. Clicar "PayPal"
2. Aceitar redirecionamento
3. Fazer login PayPal
4. Confirmar pagamento
```

### Opção C: Transferência Bancária (Mais lento)

```
Mostram detalhes IBAN
Fazer transferência
Esperar confirmação (1-2 dias)
```

---

## ✅ CONFIRMAÇÃO

Após pagamento:

```
✅ Email enviado para seu-email@gmail.com
✅ Assunto: "Your domain ecotrade360.com has been registered"
✅ Domínio ativo em 5-10 minutos
```

---

## 🔧 PASSO 6: Conectar a Vercel (2 min)

### **Configurar Nameservers em Namecheap**

1. Na Namecheap: **Dashboard → Domains**
2. Clicar em **ecotrade360.com**
3. Ir para **Nameservers**
4. Mudar para **Custom DNS**
5. Adicionar nameservers Vercel:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

6. **Save** ✅

---

### **Adicionar Domínio em Vercel**

1. Ir para Vercel Dashboard
2. Selecionar seu projeto
3. **Settings → Domains**
4. Clicar **"Add Domain"**
5. Digitar: `ecotrade360.com`
6. Clicar **"Add"**

**Resultado:**

```
✅ Domain added
🔄 DNS propagating (pode levar 5 min a 48h)
```

7. **Esperar** (geralmente 5-30 min)
8. Pronto! Site em: https://ecotrade360.com ✅

---

## 📧 PASSO 7: Email Profissional (Bonus)

### **Opção A: Gmail Gratuito (Recomendado)**

```
1. Ir para: https://www.google.com/workspace
2. Criar email: info@ecotrade360.com
3. Clicar "Configurar"
4. Seguir instruções Google
5. Email profissional ativo em 24h
```

**Custo:** €6-12/mês por utilizador

---

### **Opção B: Forwarder Grátis (Namecheap)**

```
1. Na Namecheap, selecionar domínio
2. Ir para "Email"
3. Adicionar forwarder:
   
   info@ecotrade360.com → seu-email-pessoal@gmail.com
   
4. Pronto! Emails recebidos em seu gmail
```

**Custo:** Grátis

---

## ⚠️ POSSÍVEIS PROBLEMAS

### ❌ "Domínio não encontrado depois de 1 hora"

**Solução:**
```
1. Verificar se DNS propagou:
   https://www.whatsmydns.net
   
2. Se ainda não:
   - Aguardar mais 24h
   - DNS leva tempo a propagar
   
3. Se pasado 24h ainda não:
   - Contatar Vercel support
   - Verificar nameservers em Namecheap
```

### ❌ "Erro: Já está registado"

**Solução:**
```
Tentar variações:
- ecotrade360app.com
- ecotrade360trade.com
- ecotrade-360.com
- ecotraderecycle.com
```

### ❌ "Pagamento recusado"

**Solução:**
```
1. Verificar saldo cartão
2. Tentar PayPal
3. Usar cartão de débito (não crédito)
4. Contatar seu banco
```

---

## 🎯 CHECKLIST FINAL

- [ ] Registo em Namecheap completo
- [ ] Email de confirmação recebido
- [ ] Domínio ativo em Namecheap
- [ ] Nameservers mudados para Vercel
- [ ] Domínio adicionado em Vercel
- [ ] DNS propagado (versmydns.net)
- [ ] Website acessível em https://ecotrade360.com
- [ ] Email profissional criado (Gmail ou forwarder)

---

## 🚀 PRÓXIMAS ETAPAS

### Depois do Domínio Funcionar

1. **Deploy Web**
   ```bash
   cd reciclagem-marketplace/web
   npm run build
   # Deploy em Vercel
   ```

2. **Deploy Backend**
   ```bash
   cd reciclagem-marketplace/backend
   # Deploy em Railway
   ```

3. **Conectar Backend ao Frontend**
   ```
   VITE_API_URL = https://api.ecotrade360.com
   ```

4. **Testar Site**
   ```
   https://ecotrade360.com
   ✅ Site carrega
   ✅ Autenticação funciona
   ✅ API conecta
   ```

---

## 💡 DICAS IMPORTANTES

### 1. **Guarde a Senha Namecheap**
```
Email: seu-email@gmail.com
Senha: SenhaForte123!@#
Local seguro: LastPass, 1Password, ou anotação
```

### 2. **Renascimento Automático**
```
Namecheap renova automaticamente
Débita cartão 30 dias antes
Se quiser desativar: Settings → Auto-renew
```

### 3. **Proteger Conta**
```
✅ Ativar 2FA (Namecheap → Account → 2FA)
✅ Confirmar email
✅ Guardar recovery codes
```

### 4. **Verificar Propagação DNS**
```
Ferramenta: https://www.whatsmydns.net
Digitar: ecotrade360.com
Verificar se aponta para Vercel
```

---

## 📞 SUPORTE

### Se algo der errado:

**Namecheap Support:** https://www.namecheap.com/support/
**Vercel Support:** https://vercel.com/support
**Google Workspace:** https://support.google.com

---

## ✅ ESTIMATIVA DE TEMPO

| Passo | Tempo |
|-------|-------|
| Registo Namecheap | 5 min |
| Pagamento | 2 min |
| Confirmação email | 2 min |
| Nameservers | 2 min |
| Vercel | 2 min |
| **Espera DNS** | **5 min - 48h** |
| **TOTAL** | **~20 min** |

---

## 🎉 PRONTO!

**Depois disto terá:**

✅ Domínio próprio: ecotrade360.com
✅ Email profissional: info@ecotrade360.com
✅ Website online e acessível
✅ Pronto para começar operações

---

**Quer começar agora? Clique aqui:** https://www.namecheap.com

**Qualquer dúvida, avise!** 🚀
