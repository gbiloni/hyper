// Ecosistema PM2 para HyperCRM
// Usar con: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'hypercrm',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001 -H 0.0.0.0',
      cwd: '/opt/hyperisp/crm',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/pm2/hypercrm-error.log',
      out_file: '/var/log/pm2/hypercrm-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    }
  ]
};
