# DEPLOY RÁPIDO HYPERCRM (Vía ZIP)
# Ejecutar desde PowerShell en: D:\DESA\java\PROJECTOS\Hypercrm

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host " HyperCRM — Deploy Rapido (ZIP)" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# 1. Recompilar
Write-Host "`n[1/4] Compilando Next.js..." -ForegroundColor Yellow
npm run build

# 2. Comprimir
Write-Host "`n[2/4] Comprimiendo archivos en build.zip..." -ForegroundColor Yellow
if (Test-Path "build.zip") { Remove-Item "build.zip" -Force }
Compress-Archive -Path .next, public -DestinationPath build.zip -Force

# 3. Subir
Write-Host "`n[3/4] Subiendo al servidor (muy rapido)..." -ForegroundColor Yellow
scp build.zip .env.local root@190.9.0.170:/opt/hyperisp/crm/

# 4. Descomprimir y recargar
Write-Host "`n[4/4] Descomprimiendo en el servidor y recargando PM2..." -ForegroundColor Yellow
ssh root@190.9.0.170 "cd /opt/hyperisp/crm && apt-get install -y unzip > /dev/null 2>&1 && unzip -q -o build.zip && rm build.zip && pm2 reload hypercrm"

# Limpiar local
if (Test-Path "build.zip") { Remove-Item "build.zip" -Force }

Write-Host "`n=======================================" -ForegroundColor Green
Write-Host " Deploy Completado Exitosamente!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
