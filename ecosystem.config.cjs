/**
 * PM2 Production Process Config for FedSocial (Proxmox VM + Cloudflare Tunnel)
 *
 * Usage on VM:
 *   npm run build:api && npm run build:web
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup
 */
module.exports = {
  apps: [
    {
      name: 'fedsocial-api',
      cwd: './apps/api',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      out_file: '../../logs/pm2-api-out.log',
      error_file: '../../logs/pm2-api-err.log',
      merge_logs: true,
    },
    {
      name: 'fedsocial-web',
      cwd: './apps/web',
      script: '../../node_modules/next/dist/bin/next',
      args: 'start -H 0.0.0.0 -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '768M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      out_file: '../../logs/pm2-web-out.log',
      error_file: '../../logs/pm2-web-err.log',
      merge_logs: true,
    },
  ],
};
