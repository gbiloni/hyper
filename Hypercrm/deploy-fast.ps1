# DEPLOY RÁPIDO HYPERCRM (Vía ZIP)
# Ejecutar desde PowerShell en: D:\DESA\java\PROJECTOS\Hypercrm

Write-Host '=======================================' -ForegroundColor Cyan
Write-Host ' HyperCRM — Deploy Rapido (ZIP)' -ForegroundColor Cyan
Write-Host '=======================================' -ForegroundColor Cyan

Write-Host ''
Write-Host '[1/4] Compilando Next.js...' -ForegroundColor Yellow
npm run build

Write-Host ''
Write-Host '[2/4] Comprimiendo archivos en build.zip...' -ForegroundColor Yellow
if (Test-Path 'build.zip') { Remove-Item 'build.zip' -Force }
Compress-Archive -Path .next, public -DestinationPath build.zip -Force

Write-Host ''
Write-Host '[3/4] Subiendo al servidor (muy rapido)...' -ForegroundColor Yellow
scp build.zip .env.local root@190.9.0.170:/opt/hyperisp/crm/

Write-Host ''
Write-Host '[4/4] Descomprimiendo en el servidor y recargando PM2...' -ForegroundColor Yellow
$remoteCmd = 'cd /opt/hyperisp/crm && apt-get install -y unzip > /dev/null 2>&1; unzip -q -o build.zip; rm -f build.zip; pm2 reload hypercrm'
ssh root@190.9.0.170 $remoteCmd

# Limpiar local
if (Test-Path 'build.zip') { Remove-Item 'build.zip' -Force }

Write-Host ''
Write-Host '=======================================' -ForegroundColor Green
Write-Host ' Deploy Completado Exitosamente!' -ForegroundColor Green
Write-Host '=======================================' -ForegroundColor Green
