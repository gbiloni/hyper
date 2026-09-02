#!/bin/bash
# =============================================================================
#  HyperCRM - Script de Setup Completo en Servidor de Producción
#  Ejecutar como root en: 190.9.0.170
#  Uso: bash /tmp/setup-hypercrm.sh
# =============================================================================

set -e  # Sale si hay error

APP_DIR="/opt/hyperisp/crm"
APP_NAME="hypercrm"
APP_PORT=3001
DOMAIN="crm.hyperisp.com.ar"

echo "============================================"
echo "  HyperCRM - Setup de Producción"
echo "  Dominio: $DOMAIN"
echo "  Puerto:  $APP_PORT"
echo "============================================"

# ─── 1. Instalar Node.js 20 LTS ───────────────────────────────────────────
echo ""
echo "[1/7] Verificando Node.js..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 18 ]]; then
    echo "Instalando Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "Node.js instalado: $(node -v)"
else
    echo "Node.js ya instalado: $(node -v)"
fi

# ─── 2. Instalar PM2 ──────────────────────────────────────────────────────
echo ""
echo "[2/7] Verificando PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2..."
    npm install -g pm2
    echo "PM2 instalado: $(pm2 -v)"
else
    echo "PM2 ya instalado: $(pm2 -v)"
fi

# ─── 3. Crear directorio de la aplicación ─────────────────────────────────
echo ""
echo "[3/7] Preparando directorio $APP_DIR..."
mkdir -p $APP_DIR
mkdir -p /var/log/pm2

# ─── 4. Instalar dependencias de producción ────────────────────────────────
echo ""
echo "[4/7] Instalando dependencias npm..."
cd $APP_DIR

if [ ! -f "package.json" ]; then
    echo "ERROR: No se encontró package.json en $APP_DIR"
    echo "Primero copiá los archivos del proyecto al servidor."
    exit 1
fi

npm install --production
echo "Dependencias instaladas."

# ─── 5. Levantar con PM2 ──────────────────────────────────────────────────
echo ""
echo "[5/7] Iniciando HyperCRM con PM2..."

# Detener instancia anterior si existe
pm2 delete $APP_NAME 2>/dev/null || true

# Iniciar con el ecosystem config
if [ -f "$APP_DIR/ecosystem.config.cjs" ]; then
    pm2 start $APP_DIR/ecosystem.config.cjs
else
    # Fallback directo
    pm2 start npm --name "$APP_NAME" -- start -- -p $APP_PORT -H 0.0.0.0
fi

pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash 2>/dev/null || true

echo "HyperCRM corriendo:"
pm2 status $APP_NAME

# ─── 6. Configurar Nginx ──────────────────────────────────────────────────
echo ""
echo "[6/7] Configurando Nginx..."

if ! command -v nginx &> /dev/null; then
    echo "Instalando Nginx..."
    apt-get update && apt-get install -y nginx
fi

# Copiar config temporal SIN SSL primero (para que certbot pueda verificar)
cat > /etc/nginx/sites-available/hypercrm << 'NGINX_EOF'
server {
    listen 80;
    server_name crm.hyperisp.com.ar;

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;
    }
}
NGINX_EOF

# Activar el site
ln -sf /etc/nginx/sites-available/hypercrm /etc/nginx/sites-enabled/hypercrm 2>/dev/null || true
nginx -t && systemctl reload nginx
echo "Nginx configurado (HTTP por ahora)."

# ─── 7. Instalar SSL con Certbot ──────────────────────────────────────────
echo ""
echo "[7/7] Instalando certificado SSL..."

if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
fi

echo ""
echo "IMPORTANTE: Asegurate de que el DNS de $DOMAIN apunte a esta IP antes de continuar."
echo "Para instalar SSL automáticamente, ejecutá:"
echo ""
echo "  certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@hyperisp.com.ar"
echo ""
echo "O si querés hacerlo interactivo:"
echo "  certbot --nginx -d $DOMAIN"
echo ""

# ─── Resumen Final ────────────────────────────────────────────────────────
echo "============================================"
echo "  SETUP COMPLETADO"
echo "============================================"
echo ""
echo "  App:     http://$DOMAIN  (HTTP, sin SSL aún)"
echo "  Directo: http://190.9.0.170:$APP_PORT"
echo ""
echo "  Comandos útiles:"
echo "  pm2 status          → ver estado"
echo "  pm2 logs $APP_NAME  → ver logs en tiempo real"
echo "  pm2 restart $APP_NAME → reiniciar"
echo ""
echo "  Para actualizar el código:"
echo "  cd $APP_DIR && git pull && npm run build && pm2 restart $APP_NAME"
echo ""
