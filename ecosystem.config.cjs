module.exports = {
  apps: [
    {
      name: 's4labs-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/puwpl/Desktop/project',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      merge_logs: true
    },
    {
      name: 's4labs-backend',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/puwpl/Desktop/project/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      error_file: '../logs/backend-error.log',
      out_file: '../logs/backend-out.log',
      log_file: '../logs/backend-combined.log',
      time: true,
      merge_logs: true,
      wait_ready: true,
      listen_timeout: 10000
    }
  ],

  deploy: {
    production: {
      user: 'puwpl',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/s4labs.git',
      path: '/home/puwpl/Desktop/project',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:prod && cd backend && npm install && npm run build && cd .. && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': ''
    }
  }
};