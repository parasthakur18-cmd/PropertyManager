# MinIO Setup for VPS

## ✅ MinIO Integration Complete

The application now supports MinIO (S3-compatible) object storage for VPS deployments.

## 📋 VPS पर Configuration Steps

### 1. Install MinIO Package

```bash
cd /var/www/myapp
npm install minio
```

### 2. Update PM2 Environment Variables

Edit `ecosystem.config.cjs` और MinIO credentials add करें:

```javascript
MINIO_ENDPOINT: 'localhost',  // या आपका MinIO server IP
MINIO_PORT: '9000',            // MinIO port
MINIO_USE_SSL: 'false',        // true अगर SSL use कर रहे हैं
MINIO_ACCESS_KEY: 'your-actual-access-key',
MINIO_SECRET_KEY: 'your-actual-secret-key',
MINIO_BUCKET_NAME: 'propertymanager',  // bucket name
```

या directly PM2 में set करें:

```bash
pm2 set propertymanager MINIO_ENDPOINT localhost
pm2 set propertymanager MINIO_PORT 9000
pm2 set propertymanager MINIO_USE_SSL false
pm2 set propertymanager MINIO_ACCESS_KEY your-access-key
pm2 set propertymanager MINIO_SECRET_KEY your-secret-key
pm2 set propertymanager MINIO_BUCKET_NAME propertymanager
```

### 3. Ensure MinIO Bucket Exists

Bucket automatically create हो जाएगा, लेकिन manually check करें:

```bash
# MinIO client से check करें (अगर installed है)
mc ls minio/propertymanager

# या MinIO web console से check करें
```

### 4. Restart Application

```bash
cd /var/www/myapp
npm install  # MinIO package install करने के लिए
npm run build
pm2 restart propertymanager --update-env
```

### 5. Test Upload

1. Application में check-in modal open करें
2. ID proof upload करें
3. Upload successful होना चाहिए

## 🔍 Troubleshooting

### Error: "MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be set"
- Environment variables properly set नहीं हैं
- `pm2 env propertymanager` से check करें
- `pm2 restart propertymanager --update-env` run करें

### Error: "Bucket does not exist"
- Bucket automatically create हो जाना चाहिए
- MinIO server running है या नहीं check करें
- MinIO credentials correct हैं या नहीं verify करें

### Upload stuck on "Uploading..."
- Browser console में error check करें
- Server logs check करें: `pm2 logs propertymanager`
- MinIO server accessible है या नहीं verify करें

## 📝 Environment Variables Summary

Required MinIO variables:
- `MINIO_ENDPOINT` - MinIO server address
- `MINIO_PORT` - MinIO port (default: 9000)
- `MINIO_USE_SSL` - true/false
- `MINIO_ACCESS_KEY` - MinIO access key
- `MINIO_SECRET_KEY` - MinIO secret key
- `MINIO_BUCKET_NAME` - Bucket name (default: propertymanager)

## 🎯 How It Works

1. Application automatically detects MinIO configuration
2. If MinIO is configured, it uses MinIO instead of Replit storage
3. Presigned URLs are generated for secure uploads
4. Files are stored in MinIO bucket
5. Files are served through `/objects/` endpoint with authentication

## ✅ Next Steps

1. VPS पर code pull करें: `git pull origin main`
2. MinIO package install करें: `npm install`
3. Build करें: `npm run build`
4. Environment variables set करें (ecosystem.config.cjs में)
5. Restart करें: `pm2 restart propertymanager --update-env`
6. Test करें!
