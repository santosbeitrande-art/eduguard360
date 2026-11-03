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
- [eduguard/verify-frontend/index.html](eduguard/verify-frontend/index.html)
- [eduguard/verify-frontend/login.html](eduguard/verify-frontend/login.html)

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

### Building360 business backend em host separado

Para manter o `api.eduguard360.co.mz` actual ligado ao Verify API e publicar o backend Nest business separadamente:

1. Criar um novo servico web no Render usando o blueprint [render.business-api.yaml](render.business-api.yaml) ou apontando para [backend/Dockerfile](backend/Dockerfile). O blueprint usa o plano gratuito para permitir um deploy sem cartao de pagamento.
2. Publicar o servico com um host proprio, por exemplo `business.eduguard360.co.mz`.
3. Na Cloudflare, criar `business` como `CNAME` para o hostname publico do Render.
   No Windows/PowerShell podes usar [restore-business-dns.ps1](restore-business-dns.ps1):

```powershell
./restore-business-dns.ps1 -TargetHost <render-host-publico> -RecordType CNAME
```

Depois disso:

1. Na Vercel, definir `BUSINESS_API_BASE` para a API business geral.
2. Definir `BUILDING360_API_BASE` com o hostname dedicado da API Building360, sem caminho final. Em produção, o proxy devolve HTTP 503 se esta variável faltar; não encaminha Building360 para o domínio antigo da API.
3. Configurar `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` apenas como variáveis server-side nos serviços que executam operações administrativas do Supabase (Vercel e/ou Render, conforme os endpoints utilizados). Configurar também `BUILDING360_INVITE_REDIRECT_URL` no serviço backend que envia convites.
4. Nunca usar o prefixo `VITE_` para a chave service role nem guardar credenciais nos ficheiros do repositório.
5. Fazer redeploy do frontend e validar:
	- `https://business.eduguard360.co.mz/api/v1/health`
	- `https://business.eduguard360.co.mz/api/v1/health/ready` (deve devolver `ready: true`)
	- `https://business.eduguard360.co.mz/api/v1/building360/public/overview`
	- `https://eduguard360.co.mz/api/v1/building360/public/overview`

O backend Nest business agora expoe healthcheck proprio em `/api/v1/health` para validacao do deploy.
O blueprint de produção usa `/api/v1/health/ready`, que confirma a ligação à base de dados e a presença de configuração server-side para Supabase Auth antes de considerar o serviço pronto. O endpoint `/api/v1/health` continua disponível como verificação de vida.

O plano gratuito pode suspender o serviço após inatividade e causar demora no primeiro pedido. O serviço de produção criado em Oregon não pode ser movido de região no Render; a base Supabase está na Europa, pelo que a latência inter-regional poderá ser superior. Configure `DATABASE_URL` para uma base de dados de produção separada (não a base de staging), além das chaves Supabase, diretamente no painel do provider. Não comite credenciais no repositório. Defina os hosts reais no painel do provider e valide-os antes de promover produção. O domínio `api.eduguard360.co.mz` continua reservado ao Verify; Building360 deve usar o hostname dedicado configurado em `BUILDING360_API_BASE`.
O container inclui a CA pública oficial do Supabase em `backend/certs/supabase-prod-ca-2021.crt` e define `NODE_EXTRA_CA_CERTS` para que o Node valide corretamente TLS ao conectar-se ao Postgres. Não remova a validação do certificado TLS para contornar erros de conexão.

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
