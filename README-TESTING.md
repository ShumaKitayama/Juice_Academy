# Juice Academy テスト環境ガイド

## 概要

このドキュメントでは、Juice Academy プロジェクトのテスト環境の構成、実行方法、本番環境でのテスト戦略について説明します。

## 📁 テスト構成

### バックエンドテスト

#### 基本テスト（MongoDB 不要）

- `backend/controllers/auth_simple_test.go` - 認証機能の基本テスト
- `backend/controllers/announcement_simple_test.go` - お知らせ機能の基本テスト
- `backend/controllers/admin_simple_test.go` - 管理者機能の基本テスト
- `backend/middleware/jwt_simple_test.go` - JWT 認証テスト
- `backend/controllers/test_basic.go` - テスト用ハンドラー

#### MongoDB 統合テスト

- `backend/controllers/auth_integration_test.go` - 認証機能の統合テスト
- `backend/controllers/announcement_integration_test.go` - お知らせ機能の統合テスト

#### テスト実行環境

- `backend/docker-compose.test.yml` - テスト用 MongoDB 環境
- `backend/run_tests.sh` - 統合テスト実行スクリプト

### フロントエンドテスト

#### 静的解析・ビルドテスト

- ESLint 静的解析
- TypeScript 型チェック
- 本番環境ビルド確認

## 🚀 テスト実行方法

### 1. バックエンドテスト

#### クイック実行（推奨）

```bash
cd backend
./run_tests.sh
```

このスクリプトは以下を自動実行します：

1. 基本テスト（MongoDB 不要）
2. テスト用 MongoDB 起動
3. MongoDB 統合テスト
4. 環境クリーンアップ

#### 個別テスト実行

**基本テストのみ**

```bash
cd backend

# 認証機能テスト
go test -v ./controllers -run "TestRegister|TestLogin"

# お知らせ機能テスト
go test -v ./controllers -run "TestGet.*Handler"

# JWTミドルウェアテスト
go test -v ./middleware

# 全基本テスト
go test -v ./controllers ./middleware
```

**MongoDB 統合テスト**

```bash
cd backend

# テスト用MongoDBを起動
docker-compose -f docker-compose.test.yml up -d

# 環境変数を設定
export MONGODB_TEST_URI="mongodb://localhost:27018"

# 認証統合テスト
go test -v ./controllers -run "TestAuthIntegrationSuite"

# お知らせ統合テスト
go test -v ./controllers -run "TestAnnouncementIntegrationSuite"

# クリーンアップ
docker-compose -f docker-compose.test.yml down -v
```

#### テストカバレッジ

```bash
cd backend
./run_tests.sh --coverage
```

### 2. フロントエンドテスト

```bash
cd frontend

# 依存関係のインストール
npm ci

# ESLint静的解析
npm run lint

# TypeScript型チェック
npx tsc --noEmit

# 本番環境ビルド
npm run build
```

## 🧪 テスト内容詳細

### バックエンドテスト

#### 基本テスト

- HTTP API の基本動作確認
- バリデーション、エラーハンドリング
- JWT 認証・認可の確認
- データベース接続不要の軽量テスト

#### MongoDB 統合テスト

**認証機能**

- ユーザーデータの MongoDB 挿入・取得
- 重複チェック機能
- パスワードハッシュの保存・取得
- 管理者ユーザーの自動作成

**お知らせ機能**

- CRUD 操作（作成、読み取り、更新、削除）
- 複数お知らせの取得とソート
- 検索・フィルタリング機能

### フロントエンドテスト

#### 静的解析

- ESLint によるコード品質チェック
- TypeScript による型安全性確認

#### ビルドテスト

- 本番環境向けビルド成功確認
- ビルド成果物の検証

## 🐳 テスト環境

### Docker 環境

#### テスト用 MongoDB 設定

- **イメージ**: mongo:7.0
- **ポート**: 27018（本番環境と分離）
- **データベース**: juice_academy_test
- **ヘルスチェック**: 自動的な準備完了確認

#### 環境変数

- `MONGODB_TEST_URI`: mongodb://localhost:27018
- `ENABLE_TESTS`: テスト機能の有効化
- `TEST_MODE`: テストモードの設定

## 🔄 CI/CD 統合

### GitHub Actions

#### バックエンドテスト（`.github/workflows/backend-tests.yml`）

- Go 環境のセットアップ
- MongoDB 統合テスト環境
- 基本テスト + 統合テスト実行
- テストカバレッジ生成

#### フロントエンドテスト（`.github/workflows/frontend-tests.yml`）

- Node.js 環境のセットアップ
- ESLint + TypeScript チェック
- 本番ビルド確認
- ビルド成果物のアップロード

#### 本番デプロイ（`.github/workflows/deploy-production.yml`）

- テスト実行（スキップ可能）
- 本番イメージビルド
- デプロイ前検証

### 自動実行タイミング

- `main` / `production-deployment` ブランチへのプッシュ
- プルリクエスト作成時
- 関連ファイルの変更時

## 📊 本番環境でのテスト戦略

### デプロイ前テスト

#### 自動実行（デフォルト）

```bash
# テスト込みデプロイ
./deploy.sh
```

#### 手動制御

```bash
# テストスキップ
./deploy.sh --skip-tests

# テスト強制実行
./deploy.sh --run-tests
```

### 継続的テスト

#### 定期テスト実行

```bash
# 毎日のヘルスチェック
cd backend && ./run_tests.sh

# 週次の包括的テスト
cd backend && ./run_tests.sh --coverage
cd frontend && npm run build && npm run lint
```

#### 監視・アラート

- テスト失敗時の Slack/メール通知
- テストカバレッジの追跡
- パフォーマンステストの定期実行

## 🐛 トラブルシューティング

### よくある問題

#### 1. MongoDB 接続エラー

```bash
# 解決策
docker-compose -f backend/docker-compose.test.yml down -v
docker-compose -f backend/docker-compose.test.yml up -d
```

#### 2. ポート競合

```bash
# 使用中ポートの確認
lsof -i :27018

# 異なるポートの使用
export MONGODB_TEST_URI="mongodb://localhost:27019"
```

#### 3. テストタイムアウト

```bash
# タイムアウト延長
go test -v ./controllers -timeout 120s
```

#### 4. フロントエンドビルドエラー

```bash
# 依存関係の再インストール
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### パフォーマンス最適化

#### テスト実行時間

- **基本テスト**: ~1-2 秒
- **MongoDB 統合テスト**: ~10-30 秒
- **フロントエンドテスト**: ~30-60 秒

#### 最適化のヒント

- 並列テスト実行
- テストデータベースの分離
- キャッシュの活用

## 📈 テストメトリクス

### 追跡指標

- **テストカバレッジ**: 目標 80%以上
- **テスト実行時間**: 目標 2 分以内
- **成功率**: 目標 99%以上

### レポート生成

```bash
# カバレッジレポート
cd backend
./run_tests.sh --coverage
open coverage.html

# CI/CDでの自動レポート
# GitHub ActionsでCodecovに自動送信
```

## 🤝 テストの拡張

### 新機能のテスト追加

#### 1. 決済機能テスト

```go
// controllers/payment_integration_test.go
func TestPaymentIntegrationSuite(t *testing.T) {
    // Stripe + MongoDB統合テスト
}
```

#### 2. E2E テスト

```go
// 複数機能を組み合わせた統合テスト
func TestE2EWorkflow(t *testing.T) {
    // 登録 → 認証 → お知らせ作成 → 決済
}
```

#### 3. パフォーマンステスト

```bash
# 負荷テスト用のスクリプト
cd backend
go test -v ./controllers -run TestPerformance -timeout 300s
```

このテスト環境により、安全で信頼性の高い本番環境デプロイが実現できます。
