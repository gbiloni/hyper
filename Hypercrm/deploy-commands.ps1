# DEPLOY HYPERCRM — COMANDOS PASO A PASO
# Ejecutar desde PowerShell en: D:\DESA\java\PROJECTOS\Hypercrm

# ══════════════════════════════════════════
# PASO 1: Build local de Next.js
# ══════════════════════════════════════════
cd D:\DESA\java\PROJECTOS\Hypercrm
npm run build


# ══════════════════════════════════════════
# PASO 2: Copiar archivos al servidor
# ══════════════════════════════════════════
# Primero crear el directorio en el servidor
ssh root@190.9.0.170 "mkdir -p /opt/hyperisp/crm"

# Copiar carpeta .next (el build compilado)
scp -r .next root@190.9.0.170:/opt/hyperisp/crm/

# Copiar carpeta public (imágenes, íconos, etc)
scp -r public root@190.9.0.170:/opt/hyperisp/crm/

# Copiar archivos de configuración y código fuente
scp package.json root@190.9.0.170:/opt/hyperisp/crm/
scp package-lock.json root@190.9.0.170:/opt/hyperisp/crm/
scp next.config.ts root@190.9.0.170:/opt/hyperisp/crm/
scp tsconfig.json root@190.9.0.170:/opt/hyperisp/crm/
scp ecosystem.config.cjs root@190.9.0.170:/opt/hyperisp/crm/

# IMPORTANTE: Copiar el .env.local con las variables de producción
scp .env.local root@190.9.0.170:/opt/hyperisp/crm/

# Copiar el script de setup del servidor
scp setup-server.sh root@190.9.0.170:/tmp/

# Copiar la config de Nginx
scp nginx.conf root@190.9.0.170:/tmp/hypercrm-nginx.conf


# ══════════════════════════════════════════
# PASO 3: Ejecutar setup en el servidor
# ══════════════════════════════════════════
ssh root@190.9.0.170 "bash /tmp/setup-server.sh"


# ══════════════════════════════════════════
# PASO 4: Instalar SSL (después de verificar que el DNS apunte al servidor)
# ══════════════════════════════════════════
ssh root@190.9.0.170 "certbot --nginx -d crm.hyperisp.com.ar --non-interactive --agree-tos -m admin@hyperisp.com.ar"

# Copiar el nginx.conf FINAL con SSL (el que generó certbot + proxy)
# Certbot lo modifica automáticamente. Si necesitás reemplazarlo:
# scp nginx.conf root@190.9.0.170:/etc/nginx/sites-available/hypercrm
# ssh root@190.9.0.170 "nginx -t && systemctl reload nginx"


# ══════════════════════════════════════════
# VERIFICACIÓN FINAL
# ══════════════════════════════════════════
ssh root@190.9.0.170 "pm2 status && pm2 logs hypercrm --lines 20"
