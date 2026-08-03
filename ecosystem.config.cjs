const path = require('node:path')

module.exports = {
  apps: [
    {
      name: 'portal-reportes-backend',
      cwd: path.join(__dirname, 'backend'),
      script: 'src/server.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      restart_delay: 2000,
      max_memory_restart: '512M',
      kill_timeout: 12000,
      time: true,
      env: {
        NODE_ENV: 'production',
        DOTENV_CONFIG_PATH: path.join(__dirname, 'backend', '.env'),
      },
    },
  ],
}