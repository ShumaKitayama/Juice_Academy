# MongoDB 統合テストガイド

このドキュメントでは、Juice Academy バックエンドの MongoDB 統合テストの実行方法について説明します。

## 📁 テスト構成

### 基本テスト（MongoDB 不要）

- `controllers/auth_simple_test.go` - 認証機能の基本テスト
- `controllers/announcement_simple_test.go` - お知らせ機能の基本テスト
- `middleware/jwt_simple_test.go` - JWT 認証テスト
- `controllers/test_basic.go` - テスト用ハンドラー

### MongoDB 統合テスト

- `controllers/auth_integration_test.go` - 認証機能の MongoDB 統合テスト
- `controllers/announcement_integration_test.go` - お知らせ機能の MongoDB 統合テスト

### テスト実行環境

- `docker-compose.test.yml` - テスト用 MongoDB 環境
- `run_tests.sh` - 統合テスト実行スクリプト

## 🚀 テスト実行方法

### 1. クイックテスト実行（推奨）

```bash
# 全自動でテストを実行（Docker + MongoDB統合テスト）
./run_tests.sh
```

このスクリプトは以下を自動実行します：

1. 基本テストの実行
2. Docker 環境でのテスト用 MongoDB 起動
3. MongoDB 統合テストの実行
4. 環境のクリーンアップ

### 2. 個別テスト実行

#### 基本テストのみ（MongoDB 不要）

```bash
# 認証機能の基本テスト
go test -v ./controllers -run "TestRegister|TestLogin"

# お知らせ機能の基本テスト
go test -v ./controllers -run "TestGet.*Handler"

# JWTミドルウェアテスト
go test -v ./middleware

# 全基本テスト
go test -v ./controllers ./middleware
```

#### MongoDB 統合テスト

```bash
# テスト用MongoDBを起動
docker-compose -f docker-compose.test.yml up -d

# 環境変数を設定
export MONGODB_TEST_URI="mongodb://localhost:27018"

# 認証機能の統合テスト
go test -v ./controllers -run "TestAuthIntegrationSuite"

# お知らせ機能の統合テスト
go test -v ./controllers -run "TestAnnouncementIntegrationSuite"

# クリーンアップ
docker-compose -f docker-compose.test.yml down -v
```

### 3. ローカル MongoDB でのテスト

```bash
# ローカルのMongoDBを使用する場合
export MONGODB_TEST_URI="mongodb://localhost:27017"
go test -v ./controllers -run ".*Integration.*"
```

## 🧪 テスト内容詳細

### 基本テスト

- HTTP API の基本的な動作確認
- バリデーション、エラーハンドリング
- JWT 認証・認可の確認
- データベース接続不要の軽量テスト

### MongoDB 統合テスト

#### 認証機能統合テスト（auth_integration_test.go）

- **TestUserRegistrationIntegration**

  - ユーザーデータの MongoDB 挿入・取得
  - 重複チェック機能
  - データ整合性の確認

- **TestUserAuthenticationIntegration**

  - メールアドレスによるユーザー検索
  - パスワードハッシュの保存・取得
  - 存在しないユーザーのハンドリング

- **TestAdminUserIntegration**
  - 管理者ユーザーの自動作成（SeedAdminUser）
  - 冪等性の確認（複数回実行しても 1 人だけ）
  - is_admin フラグの正確性

#### お知らせ機能統合テスト（announcement_integration_test.go）

- **TestAnnouncementCRUDIntegration**

  - Create: お知らせの作成と保存
  - Read: 作成されたお知らせの取得
  - Update: お知らせ内容の更新
  - Delete: お知らせの削除と確認

- **TestAnnouncementListIntegration**

  - 複数お知らせの作成と取得
  - 作成日時による降順ソート
  - レスポンス形式の確認
  - データ完整性の検証

- **TestAnnouncementQueryIntegration**
  - タイトルによる部分一致検索
  - 日付範囲による絞り込み
  - ドキュメント数のカウント機能

## 🐳 Docker 環境詳細

### テスト用 MongoDB 設定

- **イメージ**: mongo:7.0
- **ポート**: 27018（本番環境と分離）
- **データベース**: juice_academy_test
- **ネットワーク**: 分離されたテストネットワーク
- **ヘルスチェック**: 自動的な準備完了確認

### 環境変数

- `MONGODB_TEST_URI`: テスト用 MongoDB の接続 URI
- デフォルト: `mongodb://localhost:27018`

## 📊 テスト結果例

### 成功時の出力例

```bash
🚀 Juice Academy バックエンドテストスイートを実行中...

ℹ️  基本テスト（MongoDB接続不要）を実行中...
=== RUN   TestRegisterHandler
=== RUN   TestLoginHandler
--- PASS: TestRegisterHandler (0.00s)
--- PASS: TestLoginHandler (0.00s)
✅ 基本テストが成功しました

ℹ️  JWTミドルウェアテストを実行中...
=== RUN   TestJWTAuthMiddleware
--- PASS: TestJWTAuthMiddleware (0.00s)
✅ ミドルウェアテストが成功しました

ℹ️  テスト用MongoDBコンテナを起動中...
✅ テスト用MongoDBが起動しました

ℹ️  MongoDB統合テストを実行中...
=== RUN   TestAuthIntegrationSuite
=== RUN   TestUserRegistrationIntegration
=== RUN   TestUserAuthenticationIntegration
--- PASS: TestAuthIntegrationSuite (0.50s)
✅ 認証統合テストが成功しました

=== RUN   TestAnnouncementIntegrationSuite
=== RUN   TestAnnouncementCRUDIntegration
=== RUN   TestAnnouncementListIntegration
--- PASS: TestAnnouncementIntegrationSuite (0.30s)
✅ お知らせ統合テストが成功しました

✅ 🎉 すべてのテストが成功しました！

実行されたテスト：
  ✅ 基本機能テスト（認証、お知らせ、JWT）
  ✅ MongoDB統合テスト（認証、お知らせのCRUD）
  ✅ データベース接続とクエリ
```

## 🐛 トラブルシューティング

### よくある問題

#### 1. MongoDB 接続エラー

```bash
# エラー例：connection refused
```

**解決策**：

```bash
# Dockerが起動しているか確認
docker ps

# テスト用MongoDBを再起動
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d

# ヘルスチェック確認
docker-compose -f docker-compose.test.yml logs mongodb-test
```

#### 2. ポート競合エラー

```bash
# エラー例：port 27018 already in use
```

**解決策**：

```bash
# 使用中のポートを確認
lsof -i :27018

# プロセスを終了
kill -9 <PID>

# または異なるポートを使用
# docker-compose.test.ymlの ports を変更
```

#### 3. テストタイムアウト

```bash
# エラー例：test timeout
```

**解決策**：

```bash
# タイムアウト時間を延長
go test -v ./controllers -run ".*Integration.*" -timeout 120s

# またはMongoDBの準備時間を延長
# run_tests.sh の待機ループを調整
```

#### 4. 権限エラー

```bash
# エラー例：permission denied: ./run_tests.sh
```

**解決策**：

```bash
chmod +x run_tests.sh
```

## 🔄 継続的インテグレーション（CI）での使用

### GitHub Actions 例

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Go
        uses: actions/setup-go@v3
        with:
          go-version: 1.20

      - name: Install dependencies
        run: |
          cd backend
          go mod download

      - name: Run tests
        run: |
          cd backend
          ./run_tests.sh
```

## 📈 パフォーマンス考慮事項

### テスト実行時間

- **基本テスト**: ~1 秒（超高速）
- **MongoDB 統合テスト**: ~10-30 秒（Docker 起動込み）
- **合計時間**: ~30-60 秒

### 最適化のヒント

- CI 環境では`docker-compose up -d --wait`を使用
- 並列テスト実行のためのテストデータベース分離
- MongoDB 接続プールの適切な設定

## 🤝 テストの拡張

### 新しい統合テストの追加

1. **決済機能の統合テスト**

```go
// controllers/payment_integration_test.go
func TestPaymentIntegrationSuite(t *testing.T) {
    // Stripe + MongoDB統合テスト
}
```

2. **ユーザー管理の統合テスト**

```go
// controllers/user_integration_test.go
func TestUserManagementIntegrationSuite(t *testing.T) {
    // ユーザーCRUD + 権限管理
}
```

3. **エンドツーエンドテスト**

```go
// 複数機能を組み合わせた統合テスト
func TestE2EWorkflow(t *testing.T) {
    // 登録 → 認証 → お知らせ作成 → 決済
}
```

詳細な実装については、既存のテストコードを参考にしてください。
