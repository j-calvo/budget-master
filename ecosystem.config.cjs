module.exports = {
  apps: [
    {
      name: 'personal-finance-app',
      script: './backend/server.js',
      cwd: '.',
      node_args: '--max-old-space-size=512',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
        DATABASE_URL: 'file:./dev.db'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', 'uploads'],
    }
  ]
};
