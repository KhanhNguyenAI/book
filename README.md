# 📚 Book App — Nền tảng đọc sách trực tuyến

Ứng dụng web đọc sách trực tuyến full-stack với tính năng chat thời gian thực, chatbot AI (RAG), quản lý sách, và bảng quản trị.

---

## Mục lục

- [Tính năng](#tính-năng)
- [Tech Stack](#tech-stack)
- [Kiến trúc dự án](#kiến-trúc-dự-án)
- [Cài đặt & Chạy local](#cài-đặt--chạy-local)
- [Biến môi trường](#biến-môi-trường)
- [API Endpoints](#api-endpoints)
- [Deploy lên Render](#deploy-lên-render)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)

---

## Tính năng

### Người dùng
- Đăng ký / đăng nhập (JWT Authentication)
- Đọc sách theo chương, đánh dấu trang, lưu lịch sử đọc
- Đánh giá & bình luận sách
- Yêu thích sách, bookmark
- Chỉnh sửa hồ sơ cá nhân

### Cộng đồng
- Nhắn tin trực tiếp (1-1) theo thời gian thực (Socket.IO)
- Phòng chat nhóm
- Đăng bài viết / bình luận cộng đồng
- Báo cáo tin nhắn vi phạm

### Chatbot AI
- Chatbot hỏi đáp về sách sử dụng kỹ thuật RAG (Retrieval-Augmented Generation)
- Tích hợp Google AI API
- Vector store để tìm kiếm ngữ nghĩa

### Quản trị (Admin)
- Dashboard thống kê tổng quan
- Quản lý người dùng
- Quản lý sách & nội dung
- Quản lý tin nhắn & báo cáo
- Cấu hình chatbot

---

## Tech Stack

| Phần | Công nghệ |
|------|-----------|
| **Frontend** | React 18, Vite, React Router v7, Material UI v7 |
| **State / Data** | TanStack Query, Axios |
| **Real-time** | Socket.IO Client |
| **Charts** | Recharts |
| **Backend** | Python 3.13, Flask, Flask-SocketIO (Eventlet) |
| **Database** | PostgreSQL, SQLAlchemy 2.0, Alembic |
| **Auth** | Flask-JWT-Extended |
| **Storage** | Supabase (file/ảnh) |
| **Email** | Flask-Mail (SMTP Gmail) |
| **AI / Chatbot** | Google AI API, RAG pipeline, BM25 |
| **Deploy** | Render.com |

---

## Kiến trúc dự án

```
Browser (React + Vite)
        │  REST API + WebSocket
        ▼
Flask Backend (Gunicorn + Eventlet)
        │
        ├── PostgreSQL  (dữ liệu chính)
        ├── Supabase    (lưu trữ file)
        └── Vector Store (ChromaDB / FAISS cho RAG)
```

---

## Cài đặt & Chạy local

### Yêu cầu
- Python 3.13+
- Node.js 18+
- PostgreSQL 14+

### 1. Clone repository

```bash
git clone https://github.com/KhanhNguyenAI/book.git
cd book
```

### 2. Cài đặt Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Tạo file `.env` từ mẫu:

```bash
cp env.example .env
# Chỉnh sửa .env với thông tin của bạn
```

Chạy migration database:

```bash
cd ..
alembic upgrade head
```

Khởi động backend:

```bash
cd backend
python app.py
```

Backend chạy tại `http://localhost:5000`

### 3. Cài đặt Frontend

```bash
cd frontend
npm install
```

Tạo file `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Khởi động frontend:

```bash
npm run dev
```

Frontend chạy tại `http://localhost:5173`

---

## Biến môi trường

### Backend (`backend/.env`)

| Biến | Mô tả | Bắt buộc |
|------|--------|----------|
| `DATABASE_URL` | Connection string PostgreSQL | ✅ |
| `SECRET_KEY` | Flask secret key | ✅ |
| `JWT_SECRET_KEY` | Khóa ký JWT | ✅ |
| `FLASK_ENV` | `development` hoặc `production` | ✅ |
| `PORT` | Cổng server (mặc định: 5000) | |
| `CORS_ORIGINS` | Danh sách origin được phép | ✅ |
| `SUPABASE_URL` | URL dự án Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE` | Service role key Supabase | ✅ |
| `MAIL_SERVER` | SMTP server (vd: smtp.gmail.com) | |
| `MAIL_PORT` | SMTP port (mặc định: 587) | |
| `MAIL_USERNAME` | Email gửi | |
| `MAIL_PASSWORD` | App password email | |
| `MAIL_DEFAULT_SENDER` | Email hiển thị người gửi | |
| `GOOGLE_AI_API_KEY` | API key Google AI (cho chatbot) | |
| `VECTOR_DB_PATH` | Đường dẫn lưu vector store | |
| `REBUILD_VECTOR_DB` | `true` để rebuild vector DB | |

---

## API Endpoints

| Nhóm | Prefix | Mô tả |
|------|--------|--------|
| Auth | `/api/auth` | Đăng ký, đăng nhập, đổi mật khẩu, reset password |
| Books | `/api/books` | CRUD sách, chương, đánh giá, bình luận |
| Users | `/api/users` | Hồ sơ, bookmark, yêu thích, lịch sử |
| Messages | `/api` | Tin nhắn trực tiếp (REST + WebSocket) |
| Chat Rooms | `/api` | Phòng chat nhóm |
| Posts | `/api` | Bài viết cộng đồng |
| Bot | `/api` | Chatbot AI hỏi đáp về sách |
| Admin | `/api/admin` | Quản trị hệ thống |
| Health | `/health` | Kiểm tra trạng thái server & DB |

### Ví dụ một số endpoint

```
POST   /api/auth/register          Đăng ký tài khoản
POST   /api/auth/login             Đăng nhập
GET    /api/books                  Lấy danh sách sách
GET    /api/books/:id              Chi tiết sách
POST   /api/books                  Thêm sách mới (yêu cầu auth)
GET    /api/users/profile          Xem hồ sơ cá nhân
POST   /api/chat                   Gửi câu hỏi cho chatbot AI
GET    /health                     Health check
```

---

## Deploy lên Render

Dự án có sẵn file `render.yaml` để deploy tự động lên [Render.com](https://render.com).

### Deploy nhanh

1. Fork repository này về tài khoản GitHub của bạn
2. Vào [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Chọn repository vừa fork
4. Render sẽ tự động tạo:
   - Web service cho **Backend** (Python)
   - Static site cho **Frontend** (React)
   - PostgreSQL database
5. Thêm các biến môi trường còn lại trong Render Dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE`
   - `GOOGLE_AI_API_KEY`
   - `MAIL_*` (nếu dùng email)

### Tạo tài khoản admin

Sau khi deploy, chạy lệnh sau để tạo admin:

```bash
cd backend
python create_amin.py
```

---

## Cấu trúc thư mục

```
book/
├── backend/
│   ├── app.py                  # Điểm khởi động Flask
│   ├── extensions.py           # Khởi tạo extensions (db, jwt, mail...)
│   ├── routes/                 # API blueprints
│   │   ├── auth.py
│   │   ├── book.py
│   │   ├── user.py
│   │   ├── message.py
│   │   ├── chat_room.py
│   │   ├── post.py
│   │   ├── bot.py              # Chatbot AI
│   │   └── admin.py
│   ├── models/                 # SQLAlchemy models
│   ├── services/               # Business logic
│   ├── middleware/             # Auth middleware
│   ├── utils/                  # Tiện ích (error handler...)
│   ├── migrations/             # Alembic migrations
│   ├── requirements.txt
│   └── env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/              # Các trang (Home, Books, Chat, Admin...)
│   │   ├── components/         # Components tái sử dụng
│   │   ├── context/            # React Context (Auth, Language)
│   │   └── App.jsx
│   ├── index.html
│   └── package.json
│
├── migrations/                 # Alembic migration scripts
├── render.yaml                 # Cấu hình deploy Render
└── README.md
```

---

## Demo

> Video hướng dẫn: [YouTube](https://www.youtube.com/watch?v=baO8PnWvYYE)

---

## License

MIT License — tự do sử dụng cho mục đích học tập và phát triển.
