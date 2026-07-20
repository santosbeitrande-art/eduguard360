# Correções recomendadas para o servidor

## 1) Aplicar no servidor
```bash
chmod +x server-fix-commands.sh
sudo ./server-fix-commands.sh
```

## 2) Verificar o serviço
```bash
sudo systemctl status eduguard --no-pager
sudo journalctl -u eduguard -n 50 --no-pager
```

## 3) Verificar o Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 4) Aceder à aplicação
- https://eduguard360.co.mz/public
- https://eduguard360.co.mz/health
