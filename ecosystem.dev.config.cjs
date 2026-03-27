module.exports = {
  apps: [
    {
      name: 'personal-finance-app-api',
      script: './backend/server.js',
      cwd: '.',
      env: {
        NODE_ENV: 'development',
        PORT: 5001,
        DATABASE_URL: 'file:../dev.db'
      },
      watch: ['./backend'],
      ignore_watch: ['node_modules', 'logs', 'uploads']
    },
    {
      name: 'personal-finance-app-ui',
      script: 'npm',
      args: 'run dev',
      cwd: './frontend',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
