#!/bin/bash
# Redeploy Script - EduGuard 360
# Use: bash redeploy.sh

echo "🚀 EduGuard 360 - Deploy Automation"
echo "====================================="
echo ""

# Step 1: Verificar Git status
echo "[1/6] Verificando status do Git..."
git status
echo ""

# Confirmar antes de continuar
read -p "Deseja continuar com o deploy? (s/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Deploy cancelado."
    exit 1
fi

# Step 2: Adicionar arquivos
echo "[2/6] Adicionando arquivos..."
git add .
echo "✓ Arquivos adicionados"

# Step 3: Fazer commit
echo "[3/6] Criando commit..."
read -p "Mensagem do commit (padrão: 'feat: update literature portal'): " commitMsg
if [ -z "$commitMsg" ]; then
    commitMsg="feat: update literature portal and navigation"
fi

git commit -m "$commitMsg"
echo "✓ Commit criado"

# Step 4: Push para GitHub
echo "[4/6] Enviando para GitHub..."
git push origin main
echo "✓ Push realizado"

# Step 5: Build local (opcional)
echo "[5/6] Fazer build local também? (s/n)"
read -n 1 buildLocal
echo
if [[ $buildLocal =~ ^[Ss]$ ]]; then
    echo "Compilando..."
    npm run build
    echo "✓ Build concluído"
    echo ""
    echo "📁 Pasta 'dist' está pronta para upload manual se necessário"
fi

# Step 6: Resumo final
echo ""
echo "[6/6] Resumo do deploy"
echo ""
echo "✅ Deploy iniciado com sucesso!"
echo ""
echo "Próximos passos:"
echo "  1. Vercel detectará o push automaticamente"
echo "  2. Deploy começará em ~2-3 minutos"
echo "  3. Acompanhe em: https://vercel.com/dashboard"
echo ""
echo "Teste após deploy:"
echo "  • https://eduguard360.co.mz/portais"
echo "  • https://eduguard360.co.mz/literatura"
echo "  • Limpar cache: Ctrl+Shift+Delete"
echo ""
echo "====================================="
