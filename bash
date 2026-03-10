#!/bin/bash
# diagnose-eduguard.sh

echo "🔍 Diagnosticando EduGuard360..."

# Verificar Node.js
echo "✓ Node: $(node -v)"

# Verificar estrutura
[ -f "package.json" ] && echo "✓ package.json encontrado" || echo "✗ package.json AUSENTE"
[ -f "next.config.js" ] && echo "✓ next.config.js encontrado" || echo "✗ next.config.js AUSENTE"

# Verificar dependências
npm install 2>/dev/null && echo "✓ Dependências instaladas" || echo "✗ Falha no npm install"

# Build local
npm run build 2>/dev/null && echo "✓ Build local OK" || echo "✗ Build local FALHOU"

# Verificar variáveis de ambiente
[ -f ".env.local" ] && echo "⚠️ .env.local existe (não commitar!)" || echo "ℹ️ Sem .env.local"
