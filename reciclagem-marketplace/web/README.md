## 🌐 Web Interface - Reciclagem Marketplace

Interface web simples para o marketplace de reciclagem, sem precisar de Flutter.

### Como rodar

#### 1. Certifique-se que o backend está rodando

```bash
cd reciclagem-marketplace/backend
npm start
```

Backend roda em: `http://localhost:4000`

#### 2. Inicie a interface web

```bash
cd reciclagem-marketplace/web
node server.js
```

Web app roda em: `http://localhost:5000`

### 🎯 Funcionalidades

- ✅ Acesso público para qualquer pessoa consultar anúncios
- ✅ Registro obrigatório com nome/empresa e telefone para comprar ou vender
- ✅ Login por telefone (mock)
- ✅ Listagem de anúncios de reciclagem
- ✅ Filtros por tipo (Plástico, Metal, Papel)
- ✅ Exibição de preço e peso
- ✅ Responsivo (mobile e desktop)
- ✅ Integração com backend

### 📱 Acesso

Abra no navegador: **http://localhost:5000**

### 🔐 Login de teste

Use qualquer número de telefone moçambicano válido:

- `+258 82 123 4567`
- `258 84 987 6543`
- `87 123 4567`
- `821234567`

**Qualquer número moçambicano é aceite automaticamente.**

### 📂 Arquivos

- `index.html` - Estrutura HTML
- `styles.css` - Estilos CSS responsivos
- `app.js` - Lógica do app (integração com API)
- `server.js` - Servidor HTTP local
- `vercel.json` - Configuração para deploy estático em Vercel

### 🚀 Deploy em Vercel

Este projeto pode ser publicado em Vercel, o mesmo serviço usado para o `eduguard360`.

1. Instale o Vercel CLI (se ainda não tiver):

```bash
npm install -g vercel
```

2. No diretório do web app:

```bash
cd reciclagem-marketplace/web
vercel --prod
```

3. Aponte o domínio `.mz` no registar para o domínio Vercel gerado.

> Observação: o backend ainda precisa estar deployado em um servidor acessível e o `API_BASE` em `app.js` deverá ser atualizado para o URL do backend de produção.
