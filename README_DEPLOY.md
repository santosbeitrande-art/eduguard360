# Deploy Estavel EduGuard Verify AI

Este repositorio agora suporta dois modos:
- Vercel-first (sem SSH, recomendado para o estado atual)
- VPS (modo legado, quando houver infraestrutura dedicada)

## Opcao A - Vercel-first (sem SSH/VPS)

Use esta opcao quando o dominio ja esta publicado na Vercel.

### O que fica publicado
- `https://eduguard360.co.mz/public`
- `https://eduguard360.co.mz/public/login`

As paginas acima sao estaticas e comunicam com uma API externa via:
- `https://api.eduguard360.co.mz`

Se a API estiver em outro host, ajuste o valor em:
- [public/public/index.html](public/public/index.html)
- [public/public/login.html](public/public/login.html)

### Passos
1. Fazer push para o repositorio ligado a Vercel.
2. Na Vercel, confirmar build de producao com `npm run build`.
3. Garantir que o dominio `eduguard360.co.mz` aponta para o projeto correto na Vercel.
4. Validar URLs finais:
	- `https://eduguard360.co.mz/public`
	- `https://eduguard360.co.mz/public/login`

### DNS recomendado (Cloudflare + Vercel)
- `@` (apex): apontar para Vercel
- `www`: CNAME para Vercel
- `api`: apontar para o backend (Render/Railway/Fly/Kubernetes/VPS futuro)

### Modo `api-external-orchestrated` no Render
Se o frontend `/public` exigir modo externo obrigatório, configure também estes env vars no serviço da API:

```env
ENERGENT_API_URL=https://api.eduguard360.co.mz/external/providers/energent/verify
CHECKFILE_API_URL=https://api.eduguard360.co.mz/external/providers/checkfile/verify
ENERGENT_API_KEY=<segredo-forte>
CHECKFILE_API_KEY=<segredo-forte>
```

Com isso, a API mantém o fluxo orquestrado externo ativo e deixa de devolver `external-validation-required` por falta de endpoint/chave.

### Restaurar DNS do subdominio da API (Cloudflare)
No Windows/PowerShell:

```powershell
./restore-api-dns.ps1 -ApiHost api.eduguard360.co.mz -TargetHost <backend-host> -RecordType CNAME
```

Use `-RecordType A` quando o target for IP.

## Opcao B - VPS (legado)

Este fluxo publica o mesmo sistema em ambiente estavel, sem URL temporaria.

## Opcao A - Deploy em um comando (local -> VPS via SSH)
No teu computador local, na raiz do projeto:

```bash
chmod +x deploy-vps-stable.sh
./deploy-vps-stable.sh <ssh_user> <ssh_host> eduguard360.co.mz
```

Exemplo:

```bash
./deploy-vps-stable.sh ubuntu 203.0.113.10 eduguard360.co.mz
```

## Opcao B - Deploy manual no servidor

### 1) Copiar projeto para VPS
```bash
sudo mkdir -p /var/www/eduguard360
sudo rsync -av ./ /var/www/eduguard360/
```

### 2) Instalar pacotes base
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx nodejs npm
```

### 3) Build e servico systemd (modo producao)
```bash
cd /var/www/eduguard360
chmod +x deploy-eduguard.sh deploy-eduguard-systemd.sh
./deploy-eduguard.sh
sudo ./deploy-eduguard-systemd.sh
```

### 4) Nginx com dominio fixo
```bash
cd /var/www/eduguard360
sudo cp deploy-eduguard-nginx.conf /etc/nginx/conf.d/eduguard.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 5) HTTPS fixo com Let's Encrypt
```bash
sudo certbot --nginx -d eduguard360.co.mz -d www.eduguard360.co.mz -d api.eduguard360.co.mz
```

## Verificacao final
```bash
sudo systemctl status eduguard --no-pager
curl -I https://eduguard360.co.mz/public/login
curl https://eduguard360.co.mz/verify-api/health
curl https://api.eduguard360.co.mz/health
```

## URLs finais
- https://eduguard360.co.mz/public/login
- https://eduguard360.co.mz/public

## Arquitetura futura robusta (quando contratar VPS/cluster)

Para o cenário de 8-16 vCPUs, 32GB RAM e NVMe, a recomendação é:
- API .NET em container dedicado
- Servicos Python/OCR/IA em workers separados
- Banco gerido (PostgreSQL) com backups automáticos
- Redis gerido para filas e cache
- Docker Compose inicial ou Kubernetes para escala
- Nginx/Traefik como gateway, com `api.eduguard360.co.mz`
- Frontend continua na Vercel para alta disponibilidade de edge/CDN
