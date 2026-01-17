module.exports = {
  apps: [{
    name: 'propertymanager',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: '3000',
      // Database
      DATABASE_URL: 'postgresql://myappuser:StrongPassword321@localhost:5432/myappdb',
      // Session Secret (generated with: openssl rand -base64 64)
      SESSION_SECRET: 'OhzxIBcqP5K1E/mZ4mP15oD2xk6Q18yYRvFoSBMicrxv0Iw67yDaiAPihK0VikCp51K50qwESdWLOXKEmKgnPg==',
      // Disable Replit auth for VPS
      DISABLE_REPLIT_AUTH: 'true',
      // Optional: Object Storage
      DEFAULT_OBJECT_STORAGE_BUCKET_ID: 'replit-objstore-dadf9949-2217-4c0b-a3b4-c84c1a6f6bff',
      PUBLIC_OBJECT_SEARCH_PATHS: '/replit-objstore-dadf9949-2217-4c0b-a3b4-c84c1a6f6bff/public',
      PRIVATE_OBJECT_DIR: '/replit-objstore-dadf9949-2217-4c0b-a3b4-c84c1a6f6bff/.private',
      // Optional: WhatsApp/Authkey
      AUTHKEY_API_KEY: '6c094eed3cd9b928',
      AUTHKEY_WHATSAPP_NUMBER: 'your-whatsapp-number',
      AUTHKEY_WA_TEMPLATE_ID: '18491',
      AUTHKEY_WA_TASK_REMINDER: '23109',
      // Optional: Payment Gateway
      RAZORPAY_KEY_ID: 'rzp_live_RkGgLu6G2vIeKr',
      RAZORPAY_KEY_SECRET: 'j4dZ0f7280WUNOvIjODSHCWB',
      RAZORPAY_WEBHOOK_SECRET: 'Forest@123321',
      // Optional: AI Integration
      AI_INTEGRATIONS_OPENAI_BASE_URL: 'http://localhost:1106/modelfarm/openai',
      AI_INTEGRATIONS_OPENAI_API_KEY: '_DUMMY_API_KEY_',
      // Optional: Email Service
      AGENTMAIL_API_KEY: 'am_f6b462f7c7b0b04822cf60172014667e7048f8a77b2d2e62d54f058abcdd35f0',
      // Optional: Beds24
      BEDS24_API_KEY: 'hostezee2024apikey123',
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
