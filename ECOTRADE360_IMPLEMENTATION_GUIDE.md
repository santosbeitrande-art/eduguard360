# 🚀 EcoTrade360 - Guia de Implementação

## 📋 Pré-requisitos

### Hardware

- PC/Mac com 8GB RAM mínimo
- Conexão internet estável

### Software

- Node.js v18+ ou superior
- PostgreSQL 14+ ou Firebase
- Git
- Docker (opcional)
- Android Studio / Xcode (para mobile)
- Flutter SDK v3.0+ (se usar Flutter)

---

## 🏗️ Fase 1: Setup Inicial (Semana 1-2)

### 1.1 Estrutura de Repositórios

```bash
ecotrade360/
├── backend/          # API Node.js + PostgreSQL
├── mobile/           # Flutter App
├── web/              # Web Dashboard (React - opcional)
└── docs/             # Documentação
```

### 1.2 Criar Repositório Git

```bash
mkdir ecotrade360
cd ecotrade360
git init
git branch -b develop
```

### 1.3 Escolher Stack Tecnológico

#### ❌ Opção A: Firebase (Rápido)

**Vantagens:**
- Setup 30 minutos
- Sem DevOps
- Escalável automaticamente

**Desvantagens:**
- Menos controle
- Custo pode aumentar

**Pacotes:**
```
Firebase Auth + Firestore + Storage + FCM
```

#### ✅ Opção B: Node.js + PostgreSQL (Recomendado para startup)

**Vantagens:**
- Full controle
- Escalável
- Ecossistema rico

**Desvantagens:**
- Mais setup inicial
- Requer DevOps

**Tech Stack:**
```
Backend: Node.js + Express/NestJS
Database: PostgreSQL
Cache: Redis
Deployment: Docker + Heroku/AWS/DigitalOcean
```

---

## 🔧 Implementação Backend (Opção B - Recomendada)

### 2.1 Setup Node.js + Express

```bash
mkdir backend
cd backend
npm init -y
npm install express dotenv cors helmet
npm install -D typescript ts-node @types/node
```

### 2.2 Estrutura Base

```typescript
// backend/src/main.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRouter from './routes/auth';
import listingsRouter from './routes/listings';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/listings', listingsRouter);

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
```

### 2.3 Setup PostgreSQL

```bash
# Instalar PostgreSQL localmente
# macOS:
brew install postgresql@15

# Windows:
# Descarregar de: https://www.postgresql.org/download/windows/

# Linux:
sudo apt-get install postgresql postgresql-contrib
```

**Criar database:**

```bash
psql -U postgres
CREATE DATABASE ecotrade360;
\c ecotrade360
\i ecotrade360_database_schema.sql
```

### 2.4 Variáveis de Ambiente

```bash
# backend/.env

NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ecotrade360

# JWT
JWT_SECRET=seu_secret_aleatorio_super_seguro
JWT_EXPIRES_IN=7d

# Firebase (opcional para notificações)
FIREBASE_API_KEY=xxx
FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com

# Google Maps
GOOGLE_MAPS_API_KEY=xxx

# AWS S3 (para imagens)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=eu-west-1
AWS_S3_BUCKET=ecotrade360

# OTP Service (Twilio ou similar)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE=+351XXX
```

### 2.5 Exemplo: Auth Service

```typescript
// backend/src/services/auth.service.ts

import { twilio } from 'twilio';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export class AuthService {
  private twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  async sendOTP(phone: string): Promise<void> {
    const code = Math.random().toString().slice(2, 8); // 6 dígitos
    
    // Armazenar no Redis ou BD com expiração
    await this.storeOTP(phone, code);
    
    // Enviar SMS
    await this.twilioClient.messages.create({
      body: `Seu código EcoTrade360: ${code}`,
      from: process.env.TWILIO_PHONE,
      to: phone
    });
  }

  async verifyOTP(phone: string, code: string): Promise<string> {
    const storedCode = await this.getOTP(phone);
    
    if (!storedCode || storedCode !== code) {
      throw new Error('Invalid OTP');
    }

    // Gerar ou buscar utilizador
    let user = await this.getUserByPhone(phone);
    if (!user) {
      user = await this.createUser(phone);
    }

    // Gerar JWT
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return token;
  }

  private async storeOTP(phone: string, code: string): Promise<void> {
    // Implementar com Redis ou BD
    // TTL: 10 minutos
  }

  private async getOTP(phone: string): Promise<string | null> {
    // Implementar com Redis ou BD
    return null;
  }

  private async getUserByPhone(phone: string): Promise<any> {
    // Buscar na BD
    return null;
  }

  private async createUser(phone: string): Promise<any> {
    // Criar novo utilizador na BD
    return null;
  }
}
```

### 2.6 Exemplo: Listings Service

```typescript
// backend/src/services/listings.service.ts

import { db } from '../database';

export class ListingsService {
  async createListing(userId: string, data: any): Promise<any> {
    const query = `
      INSERT INTO listings (
        user_id, title, description, type, weight, price, 
        latitude, longitude, address, city, postal_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const result = await db.query(query, [
      userId,
      data.title,
      data.description,
      data.type,
      data.weight,
      data.price,
      data.latitude,
      data.longitude,
      data.address,
      data.city,
      data.postal_code
    ]);

    return result.rows[0];
  }

  async getNearbyListings(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<any[]> {
    // Usar fórmula de Haversine para calcular distância
    const query = `
      SELECT *,
        ( 6371 * acos(
          cos( radians($3) ) * cos( radians( latitude ) ) * 
          cos( radians( longitude ) - radians($2) ) + 
          sin( radians($3) ) * sin( radians( latitude ) )
        )) AS distance
      FROM listings
      WHERE status = 'available'
        AND deleted_at IS NULL
        AND expires_at > NOW()
      HAVING distance < $1
      ORDER BY distance;
    `;

    const result = await db.query(query, [radiusKm, longitude, latitude]);
    return result.rows;
  }

  async filterListings(filters: any): Promise<any[]> {
    let query = `
      SELECT l.*, COUNT(i.id) as image_count
      FROM listings l
      LEFT JOIN images i ON l.id = i.listing_id
      WHERE l.status = 'available' AND l.deleted_at IS NULL
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (filters.type) {
      query += ` AND l.type = $${paramCount++}`;
      params.push(filters.type);
    }

    if (filters.min_price) {
      query += ` AND l.price >= $${paramCount++}`;
      params.push(filters.min_price);
    }

    if (filters.max_price) {
      query += ` AND l.price <= $${paramCount++}`;
      params.push(filters.max_price);
    }

    query += ` GROUP BY l.id ORDER BY l.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }
}
```

---

## 📱 Implementação Mobile (Flutter)

### 3.1 Setup Flutter

```bash
# Instalar Flutter
# https://flutter.dev/docs/get-started/install

# Criar projeto
flutter create ecotrade360_mobile
cd ecotrade360_mobile

# Adicionar dependências
flutter pub add provider http geolocator google_maps_flutter
flutter pub add firebase_core firebase_messaging
flutter pub add image_picker
```

### 3.2 Estrutura Base

```
mobile/lib/
├── screens/
│   ├── auth/
│   │   ├── login_screen.dart
│   │   └── otp_screen.dart
│   ├── listings/
│   │   ├── create_listing_screen.dart
│   │   ├── listings_list_screen.dart
│   │   └── listing_detail_screen.dart
│   └── map/
│       └── map_screen.dart
├── models/
│   ├── user.dart
│   ├── listing.dart
│   └── reservation.dart
├── services/
│   ├── api_service.dart
│   └── location_service.dart
├── providers/
│   ├── auth_provider.dart
│   └── listings_provider.dart
└── main.dart
```

### 3.3 Exemplo: Auth Screen

```dart
// mobile/lib/screens/auth/login_screen.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('EcoTrade360')),
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'Número de Telefone',
                prefixText: '+351 ',
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loading ? null : _sendOTP,
              child: _loading
                  ? CircularProgressIndicator()
                  : Text('Enviar OTP'),
            ),
          ],
        ),
      ),
    );
  }

  void _sendOTP() async {
    setState(() => _loading = true);

    try {
      final authProvider = context.read<AuthProvider>();
      await authProvider.sendOTP('+351${_phoneController.text}');
      
      // Navegar para OTP screen
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => OTPScreen()),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro: $e')),
      );
    } finally {
      setState(() => _loading = false);
    }
  }
}
```

### 3.4 Exemplo: Map Screen

```dart
// mobile/lib/screens/map/map_screen.dart

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';

class MapScreen extends StatefulWidget {
  @override
  _MapScreenState createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  late GoogleMapController _mapController;
  LatLng? _userLocation;
  Set<Marker> _markers = {};

  @override
  void initState() {
    super.initState();
    _getUserLocation();
    _loadListings();
  }

  void _getUserLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition();
      setState(() {
        _userLocation = LatLng(position.latitude, position.longitude);
      });
    } catch (e) {
      print('Erro ao obter localização: $e');
    }
  }

  void _loadListings() async {
    final listingsProvider = context.read<ListingsProvider>();
    final listings = await listingsProvider.getNearbyListings(
      _userLocation?.latitude ?? 40.7128,
      _userLocation?.longitude ?? -74.0060,
    );

    setState(() {
      _markers = listings.map((listing) {
        return Marker(
          markerId: MarkerId(listing.id),
          position: LatLng(listing.latitude, listing.longitude),
          infoWindow: InfoWindow(
            title: listing.title,
            snippet: '€${listing.price}',
          ),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ListingDetailScreen(listing: listing),
              ),
            );
          },
        );
      }).toSet();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Mapa')),
      body: _userLocation == null
          ? Center(child: CircularProgressIndicator())
          : GoogleMap(
              onMapCreated: (controller) => _mapController = controller,
              initialCameraPosition: CameraPosition(
                target: _userLocation!,
                zoom: 14,
              ),
              markers: _markers,
            ),
    );
  }
}
```

---

## 🗄️ Setup PostgreSQL (detalhado)

### 4.1 Instalação

```bash
# macOS
brew install postgresql@15

# Windows
# Descarregar MSI de: https://www.postgresql.org/download/windows/

# Linux (Ubuntu)
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 4.2 Criar Database

```bash
sudo -u postgres psql

postgres=# CREATE DATABASE ecotrade360;
postgres=# CREATE USER ecotrade_app WITH PASSWORD 'secure_password';
postgres=# ALTER ROLE ecotrade_app SET client_encoding TO 'utf8';
postgres=# GRANT ALL PRIVILEGES ON DATABASE ecotrade360 TO ecotrade_app;
postgres=# \q
```

### 4.3 Executar Schema

```bash
psql -U ecotrade_app -d ecotrade360 -f ecotrade360_database_schema.sql
```

### 4.4 Verificar Tabelas

```bash
psql -U ecotrade_app -d ecotrade360
ecotrade360=# \dt
ecotrade360=# SELECT * FROM users;
ecotrade360=# \q
```

---

## 🐳 Docker Setup (Opcional mas Recomendado)

### 5.1 Dockerfile Backend

```dockerfile
# Dockerfile

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### 5.2 Docker Compose

```yaml
# docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: ecotrade360_db
    environment:
      POSTGRES_DB: ecotrade360
      POSTGRES_USER: ecotrade_app
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./ecotrade360_database_schema.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - ecotrade_network

  api:
    build: ./backend
    container_name: ecotrade360_api
    environment:
      DATABASE_URL: postgresql://ecotrade_app:secure_password@postgres:5432/ecotrade360
      NODE_ENV: production
      JWT_SECRET: your_secret_here
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    networks:
      - ecotrade_network

  redis:
    image: redis:7-alpine
    container_name: ecotrade360_cache
    ports:
      - "6379:6379"
    networks:
      - ecotrade_network

volumes:
  postgres_data:

networks:
  ecotrade_network:
    driver: bridge
```

**Executar:**

```bash
docker-compose up -d
```

---

## ✅ Checklist de Implementação

### MVP - Fase 1 (Semana 1-4)

- [ ] Repository setup (Git)
- [ ] Backend estrutura base
- [ ] PostgreSQL schema
- [ ] Auth (OTP)
- [ ] Listings CRUD
- [ ] Mobile UI básica
- [ ] Login screen
- [ ] Listings list
- [ ] Map view
- [ ] Testes unitários básicos
- [ ] Deploy local (Docker)

### Fase 2 (Semana 5-8)

- [ ] Reservation system
- [ ] Ratings system
- [ ] Firebase Cloud Messaging
- [ ] Chat real-time
- [ ] Image upload + AWS S3
- [ ] Analytics dashboard
- [ ] Performance optimization

### Fase 3 (Semana 9-12)

- [ ] IA de preço
- [ ] Integração EduGuard360
- [ ] App store deployment
- [ ] Marketing página landing

---

## 🔥 Comandos Úteis

### Backend

```bash
# Instalar dependências
npm install

# Dev server
npm run dev

# Build produção
npm run build

# Testes
npm test

# Lint
npm run lint
```

### Mobile

```bash
# Run iOS
flutter run -d ios

# Run Android
flutter run -d android

# Build APK
flutter build apk --release

# Build AAB (Play Store)
flutter build appbundle --release
```

### Database

```bash
# Backup
pg_dump -U ecotrade_app -d ecotrade360 > backup.sql

# Restore
psql -U ecotrade_app -d ecotrade360 < backup.sql

# Reset
psql -U ecotrade_app -d ecotrade360 -c "DROP SCHEMA public CASCADE;"
```

---

## 📞 Suporte & Próximos Passos

1. **Clonar este projeto**
2. **Seguir as instruções acima**
3. **Criar primeiro teste end-to-end**
4. **Deployar versão beta**

---

**Versão:** 1.0
**Última atualização:** 2026-05-01
**Status:** ✅ Pronto para desenvolvimento

