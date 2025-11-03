module.exports = {
  apps: [
    {
      // Frontend Next.js Application
      name: 's4labs-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/home/puwpl/Desktop/frontend/s4labs',
      instances: 1, // Next.js handles its own worker processes
      exec_mode: 'fork', // Next.js doesn't work well with cluster mode
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      min_uptime: '10s',
      max_restarts: 10,
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      // Backend Node.js Application
      name: 's4labs-backend',
      script: './dist/index.js',
      cwd: '/home/puwpl/Desktop/frontend/s4labs/backend',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      wait_ready: true,
      listen_timeout: 5000,
      kill_timeout: 5000,
      node_args: '--max-old-space-size=2048',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/s4labs.git',
      path: '/var/www/s4labs',
      'pre-deploy-local': '',
      'post-deploy': 'cd /var/www/s4labs && npm install && npm run build:prod && cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
};