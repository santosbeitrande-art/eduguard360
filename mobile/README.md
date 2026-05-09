# EcoTrade360 Mobile App

Aplicação Flutter para a plataforma EcoTrade360 - Marketplace de Reciclagem

## 📦 Pré-requisitos

- Flutter 3.0+
- Dart 3.0+
- Android Studio ou Xcode (para emuladores)

## 🚀 Quick Start

### 1. Instalar Dependências

```bash
cd mobile
flutter pub get
```

### 2. Correr a App

```bash
# iOS
flutter run -d ios

# Android
flutter run -d android

# Web
flutter run -d web
```

## 📂 Estrutura de Pastas

```
lib/
├── main.dart
├── models/
│   ├── user.dart
│   └── listing.dart
├── screens/
│   ├── auth/
│   │   ├── login_screen.dart
│   │   └── otp_screen.dart
│   ├── listings/
│   │   └── listings_screen.dart
│   └── map/
│       └── map_screen.dart
├── services/
│   └── api_service.dart
└── providers/
    └── auth_provider.dart
```

## 🔑 Funcionalidades MVP

- ✅ Login via OTP
- ✅ Listar anúncios
- ✅ Detalhes do anúncio
- ✅ Filtros (tipo, preço)
- ✅ Mapa com pins
- ⏳ Criar anúncio
- ⏳ Reservar anúncio
- ⏳ Sistema de avaliações

## 🌍 Google Maps

Para usar o mapa, adicione a chave de API do Google Maps nos arquivos de plataforma Android e iOS:

- Android: `android/app/src/main/AndroidManifest.xml`
- iOS: `ios/Runner/AppDelegate.swift`

## 📱 Deployment

### iOS

```bash
flutter build ios
```

### Android

```bash
flutter build apk --release
flutter build appbundle --release
```

## 🐛 Troubleshooting

### Erro de conectividade com API

Certificar que o backend está rodando em `http://localhost:3000`

### Dependências não instaladas

```bash
flutter clean
flutter pub get
```

## 📞 Suporte

Para dúvidas, contate o tech lead do projeto.
