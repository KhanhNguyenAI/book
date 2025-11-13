# Hướng dẫn Deploy lên Render

## Tổng quan

Dự án này bao gồm:
- **Backend**: Flask API với SocketIO (Python)
- **Frontend**: React/Vite application
- **Database**: PostgreSQL

## Bước 1: Chuẩn bị Repository

1. **Đảm bảo code đã được commit và push lên GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Tạo file `.gitignore` nếu chưa có** (đã có sẵn trong project)

## Bước 2: Tạo Database trên Render

1. Đăng nhập vào [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Cấu hình:
   - **Name**: `book-database`
   - **Database**: `bookdb`
   - **User**: `bookuser`
   - **Region**: `Singapore` (hoặc region gần bạn)
   - **Plan**: `Free` (hoặc paid nếu cần)
4. Click **"Create Database"**
5. Lưu lại **Connection String** (sẽ dùng sau)

## Bước 3: Deploy Backend

### Cách 1: Sử dụng render.yaml (Khuyến nghị)

1. Trong Render Dashboard, click **"New +"** → **"Blueprint"**
2. Connect repository của bạn
3. Render sẽ tự động detect file `render.yaml`
4. Review cấu hình và click **"Apply"**

### Cách 2: Deploy thủ công

1. **Tạo Web Service:**
   - Click **"New +"** → **"Web Service"**
   - Connect repository của bạn
   - Chọn branch `main` (hoặc branch bạn muốn deploy)

2. **Cấu hình Build & Start:**
   - **Name**: `book-backend`
   - **Environment**: `Python 3`
   - **Region**: `Singapore`
   - **Branch**: `main`
   - **Root Directory**: `backend` (nếu code backend ở thư mục backend)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`

3. **Environment Variables:**
   Thêm các biến môi trường sau trong Render Dashboard:
   ```
   PYTHON_VERSION=3.13.0
   PORT=10000 (Render sẽ tự động set, nhưng có thể override)
   DATABASE_URL=<connection-string-from-database>
   SECRET_KEY=<generate-random-string>
   JWT_SECRET_KEY=<generate-random-string>
   FLASK_ENV=production
   CORS_ORIGINS=https://book-frontend.onrender.com
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_SERVICE_ROLE=<your-supabase-service-role>
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=<your-email>
   MAIL_PASSWORD=<your-app-password>
   MAIL_DEFAULT_SENDER=<your-email>
   VECTOR_DB_PATH=./vector_store
   REBUILD_VECTOR_DB=false
   ```

4. **Advanced Settings:**
   - **Auto-Deploy**: `Yes` (tự động deploy khi push code)
   - **Health Check Path**: `/health`

5. Click **"Create Web Service"**

## Bước 4: Deploy Frontend

### Cách 1: Static Site (Khuyến nghị - Miễn phí)

1. **Tạo Static Site:**
   - Click **"New +"** → **"Static Site"**
   - Connect repository của bạn

2. **Cấu hình:**
   - **Name**: `book-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

3. **Environment Variables:**
   ```
   VITE_API_URL=https://book-backend.onrender.com/api
   ```

4. Click **"Create Static Site"**

### Cách 2: Serve từ Backend (Nếu muốn)

Nếu muốn serve frontend từ backend, cần cập nhật backend để serve static files (xem phần dưới).

## Bước 5: Cập nhật CORS và API URL

1. **Backend CORS:**
   - Trong Render Dashboard, vào backend service
   - Thêm/update `CORS_ORIGINS` với URL frontend:
     ```
     CORS_ORIGINS=https://book-frontend.onrender.com
     ```

2. **Frontend API URL:**
   - Trong Render Dashboard, vào frontend service
   - Thêm environment variable:
     ```
     VITE_API_URL=https://book-backend.onrender.com/api
     ```

## Bước 6: Database Migrations

1. **Chạy migrations (nếu có):**
   - SSH vào backend service (Render có hỗ trợ)
   - Hoặc thêm vào start script:
     ```bash
     python -m flask db upgrade
     ```

2. **Tạo admin user (nếu cần):**
   - SSH vào backend
   - Chạy: `python create_admin.py`

## Bước 7: Kiểm tra Deployment

1. **Backend Health Check:**
   - Truy cập: `https://book-backend.onrender.com/health`
   - Should return: `{"status": "success", ...}`

2. **Frontend:**
   - Truy cập: `https://book-frontend.onrender.com`
   - Should load React app

3. **Test API:**
   - Test các endpoints API
   - Test WebSocket connection (nếu có)

## Lưu ý quan trọng

### 1. Free Plan Limitations
- **Sleep after inactivity**: Free services sẽ sleep sau 15 phút không có traffic
- **Cold start**: Lần đầu sau khi sleep có thể mất 30-60 giây để wake up
- **Build time**: Build có thể mất vài phút

### 2. Database
- Free PostgreSQL có giới hạn 90MB storage
- Connection limit: 97 connections
- Backup tự động (7 ngày retention trên free plan)

### 3. Environment Variables
- **KHÔNG** commit file `.env` vào Git
- Tất cả secrets phải set trong Render Dashboard
- Sử dụng Render's **Environment Variables** để quản lý

### 4. Logs
- Xem logs trong Render Dashboard
- Logs có sẵn real-time
- Có thể download logs

### 5. Custom Domain (Optional)
- Render hỗ trợ custom domain
- Cần verify domain ownership
- Free plan hỗ trợ custom domain

## Troubleshooting

### Backend không start
1. Check logs trong Render Dashboard
2. Kiểm tra environment variables
3. Kiểm tra database connection
4. Kiểm tra PORT (Render set tự động qua env var PORT)

### Frontend không connect được API
1. Kiểm tra `VITE_API_URL` trong frontend
2. Kiểm tra CORS trong backend
3. Kiểm tra backend URL đúng chưa

### Database connection failed
1. Kiểm tra `DATABASE_URL` đúng format
2. Kiểm tra database đã created chưa
3. Kiểm tra database không bị sleep (free plan)

### WebSocket không hoạt động
1. Render hỗ trợ WebSocket
2. Kiểm tra SocketIO configuration
3. Kiểm tra CORS cho WebSocket

## Cập nhật Code

Sau khi setup xong, mỗi khi push code lên repository:
1. Render sẽ tự động detect changes
2. Tự động build và deploy
3. Có thể xem progress trong Dashboard

## Tài nguyên

- [Render Documentation](https://render.com/docs)
- [Render Python Guide](https://render.com/docs/deploy-flask)
- [Render Static Sites](https://render.com/docs/static-sites)
- [Render PostgreSQL](https://render.com/docs/databases)

## Support

Nếu gặp vấn đề:
1. Check Render Dashboard logs
2. Check Render Status Page
3. Contact Render Support

