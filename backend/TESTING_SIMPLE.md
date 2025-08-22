# バックエンドテストガイド（シンプル版）

このドキュメントでは、Juice Academy バックエンドのシンプルなテストコードの実行方法と構成について説明します。

## 📁 テストファイル構成

以下のシンプルなテストファイルが作成されています：

### コントローラーテスト

- `controllers/auth_simple_test.go` - 認証機能の基本テスト（登録、ログイン）
- `controllers/announcement_simple_test.go` - お知らせ機能の基本テスト（一覧取得、詳細取得）

### ミドルウェアテスト

- `middleware/jwt_simple_test.go` - JWT 認証ミドルウェアの基本テスト

## 🚀 テスト実行前の準備

### 1. 依存関係のインストール

```bash
cd backend
go mod tidy
```

## ⚡ テスト実行方法

### 全テストの実行

```bash
# 全テストを実行
go test ./...

# 詳細出力付きで全テストを実行
go test -v ./...

# カバレッジ付きで実行
go test -v -cover ./...
```

### 個別テストの実行

```bash
# 認証機能のテストのみ実行
go test -v ./controllers -run TestRegisterHandler
go test -v ./controllers -run TestLoginHandler

# お知らせ機能のテストのみ実行
go test -v ./controllers -run TestGetAnnouncementsHandler
go test -v ./controllers -run TestGetAnnouncementByIdHandler

# JWTミドルウェアのテストのみ実行
go test -v ./middleware -run TestJWTAuthMiddleware
```

## 🧪 テスト内容の概要

### 1. 認証機能テスト（auth_simple_test.go）

- **TestRegisterHandler**: ユーザー登録の基本的な検証

  - 正常な登録処理
  - 無効なメールアドレスでの登録失敗
  - 必須フィールド不足での登録失敗

- **TestLoginHandler**: ログインの基本的な検証
  - 無効なメールアドレス形式での失敗
  - 存在しないユーザーでのログイン失敗
  - 空のメールアドレス・パスワードでの失敗

### 2. お知らせ機能テスト（announcement_simple_test.go）

- **TestGetAnnouncementsHandler**: お知らせ一覧取得の検証

  - 正常なレスポンス形式の確認
  - JSON レスポンスの構造確認

- **TestGetAnnouncementByIdHandler**: お知らせ詳細取得の検証
  - 無効な ID 形式での 400 エラー
  - 存在しない ID での 404 エラー

### 3. JWT ミドルウェアテスト（jwt_simple_test.go）

- **TestJWTAuthMiddleware**: JWT 認証の基本的な検証

  - 有効なトークンでのアクセス許可
  - 期限切れトークンでのアクセス拒否
  - 認証ヘッダーなしでのアクセス拒否
  - 不正な形式のトークンでのアクセス拒否

- **TestJWTAuthMiddlewareEdgeCases**: エッジケースの検証
  - 空の Bearer トークン
  - Bearer 以外の認証スキーム
  - 小文字の bearer

## 📊 テスト戦略

### シンプルなアプローチ

- 複雑な依存関係を避け、基本的な機能のみをテスト
- データベース接続を必要としない軽量なテスト
- HTTP API の基本的な動作確認に重点

### テストの限界

これらのテストは以下の制約があります：

- データベースとの統合テストは含まれていません
- 実際のユーザーデータの作成・削除はテストしていません
- 認証が必要なエンドポイントの完全なテストは含まれていません

## 🔄 テスト実行例

```bash
# プロジェクトルートから
cd backend

# 全テストの実行
go test -v ./...

# 期待される出力例：
=== RUN   TestRegisterHandler
=== RUN   TestRegisterHandler/正常な登録
=== RUN   TestRegisterHandler/無効なメールアドレス
=== RUN   TestRegisterHandler/必須フィールド不足
--- PASS: TestRegisterHandler (0.01s)
    --- PASS: TestRegisterHandler/正常な登録 (0.00s)
    --- PASS: TestRegisterHandler/無効なメールアドレス (0.00s)
    --- PASS: TestRegisterHandler/必須フィールド不足 (0.00s)
=== RUN   TestLoginHandler
--- PASS: TestLoginHandler (0.00s)
=== RUN   TestGetAnnouncementsHandler
--- PASS: TestGetAnnouncementsHandler (0.00s)
=== RUN   TestJWTAuthMiddleware
--- PASS: TestJWTAuthMiddleware (0.00s)
PASS
```

## 🐛 トラブルシューティング

### よくある問題

1. **依存関係エラー**

   ```bash
   go mod tidy
   go mod download
   ```

2. **テストが失敗する場合**
   ```bash
   # 詳細なエラー情報を表示
   go test -v ./controllers
   go test -v ./middleware
   ```

## 📝 注意事項

1. **データベース接続**: これらのテストは実際のデータベース接続を必要としません
2. **環境依存**: テストは環境に依存しないよう設計されています
3. **基本機能のみ**: 複雑なビジネスロジックや統合機能は含まれていません

## 🤝 テストの拡張

より本格的なテストが必要な場合は：

1. テスト用のインメモリデータベースを設定
2. より複雑なテストシナリオを追加
3. モックを使用した外部サービスのテスト
4. エンドツーエンドテストの実装

詳細な実装については、既存のテストコードを参考にしてください。

