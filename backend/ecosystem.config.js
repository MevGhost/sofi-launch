module.exports = {
  apps: [
    {
      name: 's4labs-backend',
      script: './dist/index.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Enable cluster mode for load balancing
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      
      // Logging
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Restart policies
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Graceful start/reload
      wait_ready: true,
      listen_timeout: 5000,
      kill_timeout: 5000,
      
      // Watch & reload (disable in production)
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git',
        '*.log',
        '.env*'
      ],
      
      // Advanced features
      autorestart: true,
      vizion: true, // Enable versioning control
      
      // Performance optimizations
      node_args: [
        '--max-old-space-size=2048',
        '--optimize-for-size',
        '--gc-interval=100'
      ],
      
      // Post-deploy actions
      post_update: [
        'npm install',
        'npx prisma generate',
        'npx prisma migrate deploy',
        'npm run build'
      ],
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['s4labs.io'], // Add your server IPs/hostnames
      ref: 'origin/main',
      repo: 'git@github.com:your-org/s4labs.git',
      path: '/var/www/s4labs-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npx prisma generate && npx prisma migrate deploy && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};