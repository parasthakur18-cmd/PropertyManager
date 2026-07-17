const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env.production');
const { parsed = {} } = dotenv.config({ path: envPath });

module.exports = {
  apps: [{
    name: 'propertymanager',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: '3000',
      ...parsed,
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
  }]
};
