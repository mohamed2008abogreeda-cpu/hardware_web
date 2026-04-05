module.exports = {
  apps: [
    {
      name: 'hardware-backend',
      script: 'dist/server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      time: true,
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Restart policy
      max_restarts: 10,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
    },
  ],
};
