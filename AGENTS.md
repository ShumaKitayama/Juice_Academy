# Juice Academy - Repository Guidelines

> **最終更新**: 2026-01-21  
> **ステータス**: 本番運用中（Cloudflare Tunnel経由）

---

## Overview

Juice Academy は、Go + React + MongoDB で構成されたサブスクリプションプラットフォームです。Stripe決済、2段階認証(OTP)、管理者機能を備え、セキュリティを重視した設計になっています。

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Backend** | Go + Gin | 1.20+ |
| **Frontend** | React + Vite + TypeScript | React 19, Vite 6 |
| **Database** | MongoDB | 6.0 / 7.0 |
| **Cache/Session** | Redis | Alpine |
| **Styling** | TailwindCSS | 3.4 |
| **Payment** | Stripe | stripe-go v72 |
| **Auth** | JWT + Refresh Token + OTP | - |
| **Deploy** | Docker + Cloudflare Tunnel | - |
| **CI/CD** | GitHub Actions | - |

---

## Project Structure & Module Organization

```
Juice_Academy/
├── backend/                    # Go API サーバー
│   ├── controllers/            # HTTP ハンドラー (auth, payment, announcement, etc.)
│   ├── middleware/             # JWT認証, Admin, CORS, RateLimit, Correlation-ID
│   ├── services/               # ビジネスロジック (email, redis)
│   ├── config/                 # MongoDB接続設定
│   ├── db/                     # シードデータ
│   ├── utils/                  # ロガー, PIIマスキング
│   ├── scripts/                # マイグレーション, 重複検出
│   ├── Dockerfile              # 開発用
│   └── Dockerfile.prod         # 本番用 (non-root, hardened)
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/         # 再利用可能UIコンポーネント
│   │   ├── pages/              # ルート別画面
│   │   ├── services/           # API クライアント (axios)
│   │   ├── contexts/           # AuthContext
│   │   ├── hooks/              # useAuth, etc.
│   │   └── config/             # 環境変数
│   ├── Dockerfile              # 開発用
│   └── Dockerfile.prod         # 本番用
├── mongo-init/                 # MongoDB初期化スクリプト (インデックス, ユーザー作成)
├── .github/workflows/          # GitHub Actions CI/CD
│   ├── backend-tests.yml       # Go テスト + MongoDB/Redis統合テスト
│   └── frontend-tests.yml      # ESLint + TypeScript + Build
├── docker-compose.yml          # 開発環境
├── docker-compose.prod.yml     # 本番環境 (hardened)
└── *.md                        # ドキュメント群
```

---

## Implemented Features

### Core Features
- **認証システム**: JWT (15分) + HttpOnly Refresh Token + CSRF二重送信
- **2段階認証 (2FA)**: OTP (ワンタイムパスワード) 対応
- **Stripe決済**: サブスクリプション管理, Webhook冪等性処理
- **お知らせ機能**: 管理者による作成/編集/削除
- **ユーザー管理**: プロフィール編集, アカウント削除

### Security Implementations
- **IDOR対策**: JWT認証済みuser_idのみ使用
- **Webhook冪等性**: `stripe_events` コレクションで重複処理防止
- **PIIマスキング**: ログ内のメール/Stripe IDを自動マスク
- **MongoDB認証**: 最小権限 (`readWrite` のみ)
- **CSRF防御**: 状態変更APIをCSRFミドルウェアで保護
- **レート制限**: Redis + Retry-Afterヘッダー
- **Correlation-ID**: リクエスト横断の監査トレース
- **Docker Hardening**: `read_only`, `no-new-privileges`, `cap_drop: ALL`

---

## Build, Test, and Development Commands

### 開発環境の起動

```bash
# Docker で全サービスを起動 (MongoDB, Redis, Backend, Frontend)
docker-compose up --build

# フロントエンドのみ (ローカル開発)
cd frontend && npm install && npm run dev  # localhost:5173

# バックエンドのみ (ローカル開発)
cd backend && go run ./main.go             # localhost:8080
```

### テスト実行

```bash
# バックエンド: 統合テスト (Docker必須)
cd backend && ./run_tests.sh [--coverage]

# バックエンド: 個別テスト
cd backend && go test -v ./controllers -run TestAuthIntegrationSuite
cd backend && go test -v ./middleware

# フロントエンド: 静的解析 + ビルド
cd frontend && npm run lint && npx tsc --noEmit && npm run build
```

### コミット前チェック (必須)

```bash
# フロントエンド
cd frontend && npm run lint && npx tsc --noEmit && npm run build

# バックエンド
cd backend && go fmt ./... && go vet ./...
```

---

## Coding Style & Naming Conventions

### Go (Backend)
- `go fmt` / `goimports` を常に適用
- パッケージ名は小文字、エクスポート関数は PascalCase
- テストファイル: `*_simple_test.go` (単体), `*_integration_test.go` (統合)
- テーブル駆動テストを推奨

### TypeScript (Frontend)
- 2スペースインデント、シングルクォート
- コンポーネント: PascalCase (`Button.tsx`)
- フック: `useX` プレフィックス (`useAuth.ts`)
- `frontend/eslint.config.js` に従い、`eslint-disable` は使わない

---

## Testing Guidelines

### バックエンドテスト
- `_test.go` はソースファイルと同じディレクトリに配置
- `TestXxx` 命名で `go test` が自動検出
- `./run_tests.sh` は Docker で `mongodb-test` コンテナを起動・クリーンアップ
- 環境変数: `MONGODB_TEST_URI`, `JWT_SECRET`, `APP_ENV=test`, `REDIS_ADDR`

### フロントエンドテスト
- 現時点は手動検証 + ESLint + TypeScript型チェック
- PRにはスクリーンショット/GIFを添付

### CI/CD (GitHub Actions)
- `main`, `production-deployment` ブランチへのpush/PRで自動実行
- バックエンド: 基本テスト → MongoDB/Redis統合テスト → カバレッジ
- フロントエンド: ESLint → 型チェック → ビルド

---

## Commit & Pull Request Guidelines

### コミットメッセージ
```
<type>: <subject> (≤72文字, 命令形)

# Types
feat:     新機能
fix:      バグ修正
chore:    メンテナンス
docs:     ドキュメント
refactor: リファクタリング
test:     テスト追加/修正
style:    フォーマット修正
```

### PRチェックリスト
- [ ] `./run_tests.sh` 成功
- [ ] `npm run lint && npm run build` 成功
- [ ] PR説明に変更内容, Issue参照, 検証手順を記載
- [ ] UI変更はスクリーンショット/GIF添付

---

## Environment & Configuration Notes

### 必須環境変数

```bash
# JWT
JWT_SECRET=your-32-char-minimum-secret

# MongoDB
MONGODB_URI=mongodb://user:pass@host:27017/juice_academy?authSource=juice_academy
MONGODB_DATABASE=juice_academy
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=strong-password

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_DEFAULT_PRICE_ID=price_xxx

# Redis
REDIS_ADDR=redis:6379

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Frontend (Vite)
VITE_API_URL=https://yourdomain.com/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### 設定ファイル
- `.env.example`: ルートの環境変数テンプレート
- `backend/.env.example`: バックエンド固有の設定
- `mongo-init/init.js`: MongoDB初期化 (ユーザー作成, インデックス)

---

## Deployment

### 本番デプロイ

```bash
# 本番用Docker Compose
docker-compose -f docker-compose.prod.yml up --build -d

# ログ確認
docker-compose -f docker-compose.prod.yml logs -f

# サービス状態確認
docker-compose -f docker-compose.prod.yml ps
```

### インフラ構成
- **SSL/TLS**: Cloudflare Tunnel (Zero Trust)
- **MongoDB**: 認証有効化, 外部ポート非公開
- **コンテナ**: 非root実行, read_only, 権限最小化

### 関連ドキュメント
- `README-DEPLOYMENT.md`: 詳細なデプロイ手順
- `PRE_COMMIT_CHECKLIST.md`: コミット前チェック
- `backend/SECURITY.md`: セキュリティガイドライン
- `SECURITY_ENHANCEMENT_SUMMARY.md`: セキュリティ強化の実装詳細

---

## Troubleshooting

### よくある問題

| 問題 | 解決策 |
|------|--------|
| MongoDB接続エラー | `.env` の認証情報確認 → `docker-compose down -v && docker-compose up --build` |
| Webhook署名検証失敗 | `STRIPE_WEBHOOK_SECRET` を再確認 |
| テストタイムアウト | `go test -timeout 120s` で延長 |
| ESLintエラー (未使用変数) | `catch { }` または変数削除 |

### デバッグコマンド

```bash
# MongoDBシェル接続
docker exec -it <container> mongosh -u user -p pass --authenticationDatabase juice_academy

# Redis接続確認
docker exec -it <container> redis-cli ping

# Stripe Webhook ローカルテスト
stripe listen --forward-to http://localhost:8080/api/webhook/stripe
```

---

## Security Checklist

### デプロイ前
- [ ] 環境変数がすべて設定されている
- [ ] MongoDB パスワードが強力
- [ ] Stripe Webhook シークレットが設定済み
- [ ] CORS が特定ドメインのみ許可

### デプロイ後
- [ ] Webhook が Stripe に登録されている
- [ ] 決済フローの E2E テスト完了
- [ ] ログマスキングが機能している

### 定期確認 (月次)
- [ ] `stripe_events` の自動削除確認 (30日 TTL)
- [ ] 異常アクセスパターンの確認
- [ ] セキュリティパッチの適用

---

## References

| ドキュメント | 内容 |
|-------------|------|
| `README.md` | プロジェクト概要, 開発環境構築 |
| `README-DEPLOYMENT.md` | 本番デプロイ詳細ガイド |
| `README-TESTING.md` | テスト実行の詳細 |
| `PRE_COMMIT_CHECKLIST.md` | コミット前チェック手順 |
| `backend/SECURITY.md` | Stripe決済セキュリティ |
| `backend/2FA_README.md` | 2段階認証の実装詳細 |
| `backend/ACCOUNT_DELETION.md` | アカウント削除フロー |
| `SECURITY_ENHANCEMENT_SUMMARY.md` | セキュリティ強化サマリー |
