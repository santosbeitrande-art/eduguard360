#!/usr/bin/env pwsh
# Redeploy Script - EduGuard 360
# Use: ./redeploy.ps1

Write-Host "🚀 EduGuard 360 - Deploy Automation" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Cores para output
$Green = 'Green'
$Red = 'Red'
$Yellow = 'Yellow'
$Blue = 'Cyan'

# Step 1: Verificar Git status
Write-Host "[1/6] Verificando status do Git..." -ForegroundColor $Blue
git status

Write-Host ""
Write-Host "Deseja continuar com o deploy? (S/N)" -ForegroundColor $Yellow
$confirm = Read-Host

if ($confirm -ne 'S' -and $confirm -ne 's') {
    Write-Host "Deploy cancelado." -ForegroundColor $Red
    exit
}

# Step 2: Adicionar arquivos
Write-Host "[2/6] Adicionando arquivos..." -ForegroundColor $Blue
git add .
Write-Host "✓ Arquivos adicionados" -ForegroundColor $Green

# Step 3: Fazer commit
Write-Host "[3/6] Criando commit..." -ForegroundColor $Blue
$commitMsg = Read-Host "Mensagem do commit (padrão: 'feat: update literature portal')"
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    $commitMsg = "feat: update literature portal and navigation"
}

git commit -m "$commitMsg"
Write-Host "✓ Commit criado" -ForegroundColor $Green

# Step 4: Push para GitHub
Write-Host "[4/6] Enviando para GitHub..." -ForegroundColor $Blue
git push origin main
Write-Host "✓ Push realizado" -ForegroundColor $Green

# Step 5: Build local (opcional)
Write-Host "[5/6] Fazer build local também? (S/N)" -ForegroundColor $Yellow
$buildLocal = Read-Host

if ($buildLocal -eq 'S' -or $buildLocal -eq 's') {
    Write-Host "Compilando..." -ForegroundColor $Blue
    npm run build
    Write-Host "✓ Build concluído" -ForegroundColor $Green
    Write-Host ""
    Write-Host "📁 Pasta 'dist' está pronta para upload manual se necessário" -ForegroundColor $Yellow
}

# Step 6: Resumo final
Write-Host "[6/6] Resumo do deploy" -ForegroundColor $Blue
Write-Host ""
Write-Host "✅ Deploy iniciado com sucesso!" -ForegroundColor $Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor $Yellow
Write-Host "  1. Vercel detectará o push automaticamente"
Write-Host "  2. Deploy começará em ~2-3 minutos"
Write-Host "  3. Acompanhe em: https://vercel.com/dashboard"
Write-Host ""
Write-Host "Teste após deploy:" -ForegroundColor $Yellow
Write-Host "  • https://eduguard360.co.mz/portais"
Write-Host "  • https://eduguard360.co.mz/literatura"
Write-Host "  • Limpar cache: Ctrl+Shift+Delete"
Write-Host ""
Write-Host "=====================================" -ForegroundColor $Cyan
