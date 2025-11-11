# デプロイ時のセキュリティチェックリスト

このドキュメントは、本番環境へのデプロイ前に確認すべきセキュリティ設定をまとめています。

## 必須環境変数の設定

### 1. アプリケーション環境（最重要）

```bash
APP_ENV=production
```

この環境変数を設定することで：

- 詳細なデバッグログが無効化されます
- PII（個人識別情報）がログから除外されます
- エラーメッセージが一般化されます
- Gin フレームワークがリリースモードで動作します

### 2. JWT 設定

```bash
JWT_SECRET=<強力なランダム文字列（最低32文字）>
```

⚠️ **警告**: デフォルト値や弱いシークレットは使用しないでください。

### 3. Stripe 設定

```bash
STRIPE_SECRET_KEY=sk_live_...  # 本番用キー
STRIPE_PUBLISHABLE_KEY=pk_live_...  # 本番用キー
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhookシークレット
```

⚠️ **警告**: テスト用キー（`sk_test_`）を本番環境で使用しないでください。

### 4. CORS 設定

```bash
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

⚠️ **警告**: 本番環境で `*`（ワイルドカード）を使用しないでください。

### 5. MongoDB 設定

```bash
MONGODB_URI=mongodb://username:password@host:port/database?authSource=admin
```

- 強力なパスワードを使用
- 認証を有効化
- 必要に応じて SSL/TLS を有効化

### 6. Redis 設定

```bash
REDIS_URL=redis://username:password@host:port
```

- パスワード認証を有効化
- 必要に応じて SSL/TLS を使用

### 7. SMTP 設定

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=<アプリパスワード>
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Juice Academy
```

⚠️ **警告**: Gmail の場合は通常のパスワードではなく、アプリパスワードを使用してください。

### 8. 管理者ユーザー作成

```bash
SEED_ADMIN_USER=false
```

⚠️ **重要**:

- 初回デプロイ時のみ`true`に設定
- デプロイ後は必ず`false`に変更
- デフォルトパスワードを直ちに変更

## セキュリティヘッダー

本番環境では以下のセキュリティヘッダーが自動的に設定されます：

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`

## ログ出力の制御

`APP_ENV=production`を設定すると、以下の情報がログから除外されます：

- ユーザー ID
- メールアドレス
- OTP コード
- JWT トークン ID
- 詳細なエラースタックトレース
- Stripe 顧客 ID、決済 ID

## デプロイ前チェックリスト

- [ ] `APP_ENV=production`を設定
- [ ] すべての環境変数が`.env.example`を参照して設定済み
- [ ] JWT_SECRET が強力なランダム文字列（32 文字以上）
- [ ] Stripe 本番用 API キーを使用
- [ ] CORS 設定が具体的なドメインのみを許可
- [ ] MongoDB 認証が有効化
- [ ] Redis 認証が有効化
- [ ] HTTPS/TLS が有効化（Cloudflare Tunnel など）
- [ ] 管理者デフォルトパスワードを変更
- [ ] バックアップ戦略が確立
- [ ] ログローテーションが設定済み

## デプロイ後チェックリスト

- [ ] アプリケーションが正常に起動
- [ ] ログに機密情報が含まれていないことを確認
- [ ] 認証フローが正常に動作
- [ ] Stripe Webhook が正常に受信できることを確認
- [ ] メール送信が正常に動作
- [ ] 管理者でログインし、デフォルトパスワードを変更

## トラブルシューティング

### ログが出力されない

本番環境では詳細なデバッグログは出力されません。これは正常な動作です。

エラーログは引き続き出力されますが、機密情報はマスキングされます。

### Webhook が動作しない

1. Stripe Webhook シークレットが正しく設定されているか確認
2. Webhook エンドポイント（`/api/webhook/stripe`）がアクセス可能か確認
3. Stripe ダッシュボードで配信履歴を確認

### メールが送信されない

1. SMTP 設定が正しいか確認
2. Gmail の場合、アプリパスワードを使用しているか確認
3. 2 段階認証が有効になっているか確認（Gmail）

## セキュリティインシデント対応

セキュリティ問題を発見した場合：

1. 直ちにサービスを一時停止（必要に応じて）
2. JWT_SECRET を変更（全ユーザーのトークンが無効化されます）
3. 影響範囲を特定
4. 必要に応じてユーザーに通知
5. 脆弱性を修正してから再デプロイ

## 定期的なセキュリティチェック

- [ ] 依存関係の更新（月次）
- [ ] ログの監査（週次）
- [ ] アクセスログの異常検知（日次）
- [ ] SSL/TLS 証明書の有効期限確認（月次）
- [ ] バックアップの動作確認（月次）

## 関連ドキュメント

- [2FA_README.md](./2FA_README.md) - 二段階認証の詳細
- [SECURITY.md](./SECURITY.md) - Stripe 決済セキュリティ
- [ACCOUNT_DELETION.md](./ACCOUNT_DELETION.md) - アカウント削除フロー
- [TESTING_MONGODB.md](./TESTING_MONGODB.md) - テストガイド

---

**最終更新**: 2025-10-17
