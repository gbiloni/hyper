# HyperCRM — Script de Deploy a Producción
# Servidor: 190.9.0.170 | Ruta: /opt/hyperisp/crm | Dominio: crm.hyperisp.com.ar
# Ejecutar desde: D:\DESA\java\PROJECTOS\Hypercrm

$SERVER_IP = "190.9.0.170"
$SERVER_USER = "root"
$REMOTE_PATH = "/opt/hyperisp/crm"
$LOCAL_PATH = "D:\DESA\java\PROJECTOS\Hypercrm"

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host " HyperCRM — Deploy a Produccion" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Paso 1: Build local
Write-Host "`n[1/4] Compilando Next.js para produccion..." -ForegroundColor Yellow
Set-Location $LOCAL_PATH
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: El build fallo. Revisa los errores arriba." -ForegroundColor Red
    exit 1
}
Write-Host "Build exitoso." -ForegroundColor Green

# Paso 2: Preparar el servidor (crear directorio, instalar Node/PM2 si no estan)
Write-Host "`n[2/4] Preparando el servidor remoto..." -ForegroundColor Yellow
$setupCmd = @"
mkdir -p /opt/hyperisp/crm
# Instalar Node.js 20 LTS si no existe
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
# Instalar PM2 globalmente si no existe
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo "Servidor preparado."
"@
ssh "${SERVER_USER}@${SERVER_IP}" $setupCmd

# Paso 3: Copiar archivos al servidor (excluye node_modules y .next del fuente)
Write-Host "`n[3/4] Copiando archivos al servidor..." -ForegroundColor Yellow

# Archivos necesarios para produccion:
$filesToCopy = @(
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "postcss.config.mjs",
    "tailwind.config.*",
    ".env.local",
    "public",
    "src",
    ".next"
)

foreach ($file in $filesToCopy) {
    $localFile = Join-Path $LOCAL_PATH $file
    if (Test-Path $localFile) {
        Write-Host "  Copiando: $file" -ForegroundColor Gray
        scp -r $localFile "${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/"
    }
}

Write-Host "Archivos copiados." -ForegroundColor Green

# Paso 4: Instalar dependencias y reiniciar PM2 en el servidor
Write-Host "`n[4/4] Instalando dependencias y levantando PM2..." -ForegroundColor Yellow
$startCmd = @"
cd /opt/hyperisp/crm
npm install --production
# Detener instancia anterior si existe
pm2 delete hypercrm 2>/dev/null || true
# Iniciar nueva instancia
pm2 start npm --name "hypercrm" -- start -- -p 3001
pm2 save
pm2 startup
echo "HyperCRM corriendo en puerto 3001."
pm2 status
"@
ssh "${SERVER_USER}@${SERVER_IP}" $startCmd

Write-Host "`n=======================================" -ForegroundColor Green
Write-Host " Deploy completado exitosamente!" -ForegroundColor Green
Write-Host " App corriendo en: http://190.9.0.170:3001" -ForegroundColor Green
Write-Host " Dominio publico:  https://crm.hyperisp.com.ar" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
