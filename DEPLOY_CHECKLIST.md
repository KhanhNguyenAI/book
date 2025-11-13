# Checklist Deploy lên Render

## Trước khi Deploy

### 1. Chuẩn bị Repository
- [ ] Code đã được commit và push lên GitHub/GitLab
- [ ] Đã tạo file `.gitignore` để không commit sensitive files
- [ ] Đã test application chạy được ở local

### 2. Kiểm tra Dependencies
- [ ] `backend/requirements.txt` đã có đầy đủ dependencies
- [ ] `frontend/package.json` đã có đầy đủ dependencies
- [ ] Đã test build frontend thành công: `npm run build`

### 3. Environment Variables
- [ ] Đã chuẩn bị danh sách các environment variables cần thiết
- [ ] Đã có Supabase credentials (nếu dùng)
- [ ] Đã có email credentials (nếu dùng)
- [ ] Đã có Google AI API key (nếu dùng chatbot)

## Bước Deploy

### Bước 1: Tạo Database
- [ ] Đăng nhập Render Dashboard
- [ ] Tạo PostgreSQL Database
- [ ] Lưu lại Connection String

### Bước 2: Deploy Backend
- [ ] Tạo Web Service cho backend
- [ ] Connect repository
- [ ] Cấu hình build command: `pip install -r backend/requirements.txt`
- [ ] Cấu hình start command: `cd backend && python app.py`
- [ ] Set environment variables:
  - [ ] `DATABASE_URL` (từ database)
  - [ ] `SECRET_KEY` (generate random)
  - [ ] `JWT_SECRET_KEY` (generate random)
  - [ ] `FLASK_ENV=production`
  - [ ] `CORS_ORIGINS` (frontend URL)
  - [ ] `SUPABASE_URL` (nếu dùng)
  - [ ] `SUPABASE_SERVICE_ROLE` (nếu dùng)
  - [ ] `MAIL_*` (nếu dùng email)
- [ ] Deploy và kiểm tra logs

### Bước 3: Deploy Frontend
- [ ] Tạo Static Site cho frontend
- [ ] Connect repository
- [ ] Cấu hình build command: `cd frontend && npm install && npm run build`
- [ ] Cấu hình publish directory: `frontend/dist`
- [ ] Set environment variable: `VITE_API_URL` (backend URL)
- [ ] Deploy và kiểm tra

### Bước 4: Cập nhật CORS
- [ ] Cập nhật `CORS_ORIGINS` trong backend với frontend URL
- [ ] Restart backend service

### Bước 5: Database Setup
- [ ] Chạy database migrations (nếu có)
- [ ] Tạo admin user (nếu cần)
- [ ] Kiểm tra database connection

## Sau khi Deploy

### Kiểm tra
- [ ] Backend health check: `https://your-backend.onrender.com/health`
- [ ] Frontend load được: `https://your-frontend.onrender.com`
- [ ] API endpoints hoạt động
- [ ] WebSocket connection hoạt động (nếu có)
- [ ] Authentication hoạt động
- [ ] File upload hoạt động (nếu dùng Supabase)

### Monitoring
- [ ] Kiểm tra logs trong Render Dashboard
- [ ] Setup alerts (nếu cần)
- [ ] Monitor database usage
- [ ] Monitor service uptime

## Troubleshooting

### Backend không start
- [ ] Kiểm tra logs
- [ ] Kiểm tra environment variables
- [ ] Kiểm tra database connection
- [ ] Kiểm tra PORT (Render tự động set)

### Frontend không load
- [ ] Kiểm tra build command
- [ ] Kiểm tra publish directory
- [ ] Kiểm tra environment variables
- [ ] Kiểm tra API URL

### Database connection failed
- [ ] Kiểm tra DATABASE_URL format
- [ ] Kiểm tra SSL mode (production cần `require`)
- [ ] Kiểm tra database không bị sleep

### WebSocket không hoạt động
- [ ] Kiểm tra SocketIO configuration
- [ ] Kiểm tra CORS settings
- [ ] Kiểm tra Render WebSocket support

## Lưu ý

1. **Free Plan Limitations:**
   - Services sleep sau 15 phút không có traffic
   - Cold start có thể mất 30-60 giây
   - Database có giới hạn 90MB

2. **Environment Variables:**
   - KHÔNG commit `.env` file
   - Set tất cả secrets trong Render Dashboard
   - Sử dụng Render's secret management

3. **Database:**
   - Free plan có backup tự động (7 ngày)
   - Connection limit: 97 connections
   - Monitor storage usage

4. **Build Time:**
   - First build có thể mất vài phút
   - Subsequent builds thường nhanh hơn
   - Monitor build logs

5. **Custom Domain:**
   - Render hỗ trợ custom domain
   - Cần verify domain ownership
   - Free plan hỗ trợ custom domain

## Resources

- [Render Documentation](https://render.com/docs)
- [Render Python Guide](https://render.com/docs/deploy-flask)
- [Render Static Sites](https://render.com/docs/static-sites)
- [Render PostgreSQL](https://render.com/docs/databases)

