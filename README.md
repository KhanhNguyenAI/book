# 📚 Book App — オンライン読書プラットフォーム

リアルタイムチャット、AIチャットボット（RAG）、書籍管理、管理者ダッシュボードを備えたフルスタックのオンライン読書Webアプリです。

---

## 目次

- [機能](#機能)
- [技術スタック](#技術スタック)
- [システムアーキテクチャ](#システムアーキテクチャ)
- [ローカル環境のセットアップ](#ローカル環境のセットアップ)
- [環境変数](#環境変数)
- [APIエンドポイント](#apiエンドポイント)
- [Renderへのデプロイ](#renderへのデプロイ)
- [ディレクトリ構成](#ディレクトリ構成)

---

## 機能

### ユーザー機能
- 会員登録 / ログイン（JWT認証）
- 章ごとの読書、しおり、読書履歴の保存
- 書籍の評価・コメント
- お気に入り・ブックマーク
- プロフィール編集

### コミュニティ機能
- リアルタイムダイレクトメッセージ（Socket.IO）
- グループチャットルーム
- 投稿・コミュニティコメント
- メッセージの違反報告

### AIチャットボット
- RAG（Retrieval-Augmented Generation）を活用した書籍Q&Aチャットボット
- Google AI API連携
- セマンティック検索用ベクターストア

### 管理者機能（Admin）
- 統計ダッシュボード
- ユーザー管理
- 書籍・コンテンツ管理
- メッセージ・報告管理
- チャットボット設定

---

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| **フロントエンド** | React 18、Vite、React Router v7、Material UI v7 |
| **状態管理 / データ取得** | TanStack Query、Axios |
| **リアルタイム通信** | Socket.IO Client |
| **グラフ** | Recharts |
| **バックエンド** | Python 3.13、Flask、Flask-SocketIO（Eventlet） |
| **データベース** | PostgreSQL、SQLAlchemy 2.0、Alembic |
| **認証** | Flask-JWT-Extended |
| **ストレージ** | Supabase（ファイル・画像） |
| **メール** | Flask-Mail（Gmail SMTP） |
| **AI / チャットボット** | Google AI API、RAGパイプライン、BM25 |
| **デプロイ** | Render.com |

---

## システムアーキテクチャ

```
ブラウザ（React + Vite）
        │  REST API + WebSocket
        ▼
Flask バックエンド（Gunicorn + Eventlet）
        │
        ├── PostgreSQL  （メインデータ）
        ├── Supabase    （ファイルストレージ）
        └── Vector Store（ChromaDB / FAISS — RAG用）
```

---

## ローカル環境のセットアップ

### 必要条件
- Python 3.13+
- Node.js 18+
- PostgreSQL 14+

### 1. リポジトリをクローン

```bash
git clone https://github.com/KhanhNguyenAI/book.git
cd book
```

### 2. バックエンドのセットアップ

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

`.env` ファイルをサンプルから作成:

```bash
cp env.example .env
# .env を編集して必要な値を入力してください
```

データベースマイグレーションを実行:

```bash
cd ..
alembic upgrade head
```

バックエンドを起動:

```bash
cd backend
python app.py
```

バックエンドは `http://localhost:5000` で起動します。

### 3. フロントエンドのセットアップ

```bash
cd frontend
npm install
```

`.env` ファイルを作成:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

フロントエンドを起動:

```bash
npm run dev
```

フロントエンドは `http://localhost:5173` で起動します。

---

## 環境変数

### バックエンド（`backend/.env`）

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 接続文字列 | ✅ |
| `SECRET_KEY` | Flask シークレットキー | ✅ |
| `JWT_SECRET_KEY` | JWT 署名キー | ✅ |
| `FLASK_ENV` | `development` または `production` | ✅ |
| `PORT` | サーバーポート（デフォルト: 5000） | |
| `CORS_ORIGINS` | 許可するオリジン一覧 | ✅ |
| `SUPABASE_URL` | Supabase プロジェクト URL | ✅ |
| `SUPABASE_SERVICE_ROLE` | Supabase サービスロールキー | ✅ |
| `MAIL_SERVER` | SMTP サーバー（例: smtp.gmail.com） | |
| `MAIL_PORT` | SMTP ポート（デフォルト: 587） | |
| `MAIL_USERNAME` | 送信メールアドレス | |
| `MAIL_PASSWORD` | メールアプリパスワード | |
| `MAIL_DEFAULT_SENDER` | 送信者表示名 | |
| `GOOGLE_AI_API_KEY` | Google AI API キー（チャットボット用） | |
| `VECTOR_DB_PATH` | ベクターストアの保存パス | |
| `REBUILD_VECTOR_DB` | `true` でベクターDBを再構築 | |

---

## APIエンドポイント

| グループ | プレフィックス | 説明 |
|----------|---------------|------|
| 認証 | `/api/auth` | 登録・ログイン・パスワード変更・リセット |
| 書籍 | `/api/books` | 書籍・章・評価・コメントのCRUD |
| ユーザー | `/api/users` | プロフィール・ブックマーク・お気に入り・履歴 |
| メッセージ | `/api` | ダイレクトメッセージ（REST + WebSocket） |
| チャットルーム | `/api` | グループチャット |
| 投稿 | `/api` | コミュニティ投稿 |
| チャットボット | `/api` | AIチャットボット |
| 管理者 | `/api/admin` | システム管理 |
| ヘルスチェック | `/health` | サーバー・DB の稼働確認 |

### 主なエンドポイント例

```
POST   /api/auth/register          アカウント登録
POST   /api/auth/login             ログイン
GET    /api/books                  書籍一覧取得
GET    /api/books/:id              書籍詳細取得
POST   /api/books                  書籍追加（要認証）
GET    /api/users/profile          プロフィール取得
POST   /api/chat                   AIチャットボットへ質問
GET    /health                     ヘルスチェック
```

---

## Renderへのデプロイ

プロジェクトには `render.yaml` が含まれており、[Render.com](https://render.com) への自動デプロイに対応しています。

### クイックデプロイ手順

1. このリポジトリを自分の GitHub アカウントにフォーク
2. [Render ダッシュボード](https://dashboard.render.com) → **New** → **Blueprint** を選択
3. フォークしたリポジトリを選択
4. Render が自動的に以下を作成します:
   - **バックエンド** Web サービス（Python）
   - **フロントエンド** 静的サイト（React）
   - **PostgreSQL** データベース
5. Render ダッシュボードで以下の環境変数を追加:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE`
   - `GOOGLE_AI_API_KEY`
   - `MAIL_*`（メール機能を使う場合）

### 管理者アカウントの作成

デプロイ後、以下のコマンドで管理者アカウントを作成してください:

```bash
cd backend
python create_amin.py
```

---

## ディレクトリ構成

```
book/
├── backend/
│   ├── app.py                  # Flask エントリーポイント
│   ├── extensions.py           # 拡張機能の初期化（db、jwt、mail...）
│   ├── routes/                 # API ブループリント
│   │   ├── auth.py
│   │   ├── book.py
│   │   ├── user.py
│   │   ├── message.py
│   │   ├── chat_room.py
│   │   ├── post.py
│   │   ├── bot.py              # AIチャットボット
│   │   └── admin.py
│   ├── models/                 # SQLAlchemy モデル
│   ├── services/               # ビジネスロジック
│   ├── middleware/             # 認証ミドルウェア
│   ├── utils/                  # ユーティリティ（エラーハンドラーなど）
│   ├── requirements.txt
│   └── env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/              # ページコンポーネント（Home、Books、Chat、Admin...）
│   │   ├── components/         # 再利用可能なコンポーネント
│   │   ├── context/            # React Context（Auth、Language）
│   │   └── App.jsx
│   ├── index.html
│   └── package.json
│
├── migrations/                 # Alembic マイグレーションスクリプト
├── render.yaml                 # Render デプロイ設定
└── README.md
```

---

## デモ動画

[![Book App Demo](https://img.youtube.com/vi/baO8PnWvYYE/0.jpg)](https://www.youtube.com/watch?v=baO8PnWvYYE)

---

## ライセンス

MIT License — 学習・開発目的での利用は自由です。
