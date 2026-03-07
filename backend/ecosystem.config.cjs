module.exports = {
  apps: [
    {
      name: 'personal-finance-api',
      script: './server.js',
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      }
    }
  ]
};
