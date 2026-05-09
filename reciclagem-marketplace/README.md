# Reciclagem Marketplace

Este é um projeto independente para um aplicativo de reciclagem de lixo, sem nenhuma ligação com o projeto `eduguard360`.

## Estrutura

- `backend/` - API Node.js simples para anúncios de reciclagem
- `mobile/` - App Flutter de marketplace de reciclagem

## Como usar

### Backend

```bash
cd reciclagem-marketplace/backend
npm install
npm start
```

O backend ficará disponível em:

- http://localhost:4000/
- API: http://localhost:4000/api/listings
- Login: http://localhost:4000/api/login

### Mobile

```bash
cd reciclagem-marketplace/mobile
flutter pub get
flutter run
```

### Funcionalidades implementadas

- Login por telefone (mock)
- Listagem de coleta de recicláveis
- Mapa com pins de anúncios
- API simples com dados de localização

### Acesso à página do sistema

Abra no navegador:

- http://localhost:4000/

Esse é o endereço de acesso ao backend/web page do sistema independente de reciclagem.
