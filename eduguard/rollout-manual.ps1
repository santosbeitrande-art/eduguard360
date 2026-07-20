param(
  [string]$Root = "c:/Users/AEAO/Desktop/Santos/website-guide eduguard360/eduguard",
  [switch]$SkipPythonDeps
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host "==> $message"
}

function Resolve-PythonLauncher {
  try {
    py -3.12 --version | Out-Null
    return @("py", "-3.12")
  }
  catch {
    return @("python")
  }
}

function Start-PythonService($servicePath, $port) {
  $venvPath = Join-Path $servicePath ".venv"
  if (!(Test-Path $venvPath)) {
    Write-Step "Criar venv para $servicePath"
    $pythonLauncher = Resolve-PythonLauncher
    if ($pythonLauncher.Count -gt 1) {
      & $pythonLauncher[0] $pythonLauncher[1] -m venv $venvPath
    }
    else {
      & $pythonLauncher[0] -m venv $venvPath
    }
  }

  $pythonExe = Join-Path $venvPath "Scripts/python.exe"
  if (!(Test-Path $pythonExe)) {
    throw "Python do venv não encontrado em $pythonExe"
  }

  if (-not $SkipPythonDeps) {
    Write-Step "Instalar dependências para $servicePath"
    & $pythonExe -m pip install --upgrade pip
    & $pythonExe -m pip install -r (Join-Path $servicePath "requirements.txt")
  }

  Write-Step "Arrancar serviço $servicePath na porta $port"
  Start-Process -FilePath $pythonExe -ArgumentList @("-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "$port") -WorkingDirectory $servicePath
}

$verifyApiPath = Join-Path $Root "verify-api"
$ocrPath = Join-Path $Root "ocr-service"
$visionPath = Join-Path $Root "vision-service"
$forensicsPath = Join-Path $Root "forensics-service"

Write-Step "Instalar dependências do verify-api"
Push-Location $verifyApiPath
npm install
npm run build

if ($env:VERIFY_PG_URL) {
  Write-Step "Aplicar schema PostgreSQL"
  npm run db:migrate:pg
}
Pop-Location

Start-PythonService -servicePath $ocrPath -port 8012
Start-PythonService -servicePath $visionPath -port 8011
Start-PythonService -servicePath $forensicsPath -port 8013

Write-Step "Arrancar verify-api"
Start-Process -FilePath "npm" -ArgumentList @("run", "dev") -WorkingDirectory $verifyApiPath

Write-Step "Rollout manual iniciado. Configure VERIFY_PG_URL, REDIS_URL, OCR_SERVICE_URL, VISION_SERVICE_URL e FORENSICS_SERVICE_URL antes do arranque final."