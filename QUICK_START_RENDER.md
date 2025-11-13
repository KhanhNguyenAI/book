# Quick Start - Deploy lên Render

## Bước 1: Chuẩn bị

1. **Commit code lên GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

## Bước 2: Deploy với Render Blueprint (Khuyến nghị)

1. **Đăng nhập Render Dashboard**: https://dashboard.render.com
2. **Click "New +" → "Blueprint"**
3. **Connect repository** của bạn
4. **Render sẽ tự động detect `render.yaml`**
5. **Review và click "Apply"**

Render sẽ tự động:
- Tạo PostgreSQL database
- Deploy backend service
- Deploy frontend static site
- Link database với backend

## Bước 3: Cấu hình Environment Variables

Sau khi deploy, vào **Backend Service** → **Environment** và thêm:

### Bắt buộc:
```
SECRET_KEY=<generate-random-string>
JWT_SECRET_KEY=<generate-random-string>
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE=<your-supabase-service-role>
```

### Tùy chọn:
```
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<your-email>
MAIL_PASSWORD=<your-app-password>
MAIL_DEFAULT_SENDER=<your-email>
GOOGLE_AI_API_KEY=<your-google-ai-api-key>
```

## Bước 4: Cập nhật URLs

1. **Lấy Backend URL** từ Render Dashboard (ví dụ: `https://book-backend.onrender.com`)
2. **Lấy Frontend URL** từ Render Dashboard (ví dụ: `https://book-frontend.onrender.com`)
3. **Cập nhật CORS trong Backend**:
   - Vào Backend Service → Environment
   - Update `CORS_ORIGINS` với frontend URL:
     ```
     CORS_ORIGINS=https://book-frontend.onrender.com
     ```
4. **Cập nhật Frontend API URL**:
   - Vào Frontend Service → Environment
   - Update `VITE_API_URL` với backend URL:
     ```
     VITE_API_URL=https://book-backend.onrender.com/api
     ```
5. **Redeploy** cả backend và frontend

## Bước 5: Kiểm tra

1. **Backend Health Check**:
   - Truy cập: `https://your-backend.onrender.com/health`
   - Should return: `{"status": "success", ...}`

2. **Frontend**:
   - Truy cập: `https://your-frontend.onrender.com`
   - Should load React app

3. **Test API**:
   - Test authentication
   - Test API endpoints
   - Test WebSocket (nếu có)

## Lưu ý quan trọng

### Free Plan
- Services **sleep sau 15 phút** không có traffic
- **Cold start** có thể mất 30-60 giây
- Database có giới hạn **90MB**

### Environment Variables
- **KHÔNG** commit file `.env`
- Set tất cả secrets trong Render Dashboard
- Render tự động set `DATABASE_URL` và `PORT`

### Database
- Render tự động tạo database khi dùng Blueprint
- Connection string được tự động link với backend
- Free plan có backup tự động (7 ngày)

## Troubleshooting

### Backend không start
- Check logs trong Render Dashboard
- Kiểm tra environment variables
- Kiểm tra database connection
- Kiểm tra PORT (Render tự động set)

### Frontend không load
- Kiểm tra build logs
- Kiểm tra `VITE_API_URL` environment variable
- Kiểm tra backend CORS settings

### Database connection failed
- Kiểm tra `DATABASE_URL` đã được set chưa
- Kiểm tra database không bị sleep
- Kiểm tra SSL mode (production cần `require`)

## Tài liệu chi tiết

Xem file `RENDER_DEPLOYMENT.md` để biết hướng dẫn chi tiết.

## Support

- [Render Documentation](https://render.com/docs)
- [Render Support](https://render.com/docs/support)

