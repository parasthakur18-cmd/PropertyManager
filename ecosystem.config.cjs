// Production: sab values .env.production se aayengi (app direct wahi file use karta hai)
const path = require('path');
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
try {
  require('dotenv').config({ path: path.join(__dirname, '.env.production') });
} catch (_) {}

module.exports = {
  apps: [{
    name: 'propertymanager',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: '3000',
      // Baaki sab .env.production me – wahi edit karo, phir: pm2 restart propertymanager
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
