# 二段階認証（2FA）システム

Juice Academy に実装された二段階認証システムについて説明します。

## 概要

このシステムは、ログイン時にメールで送信されるワンタイムパスコード（OTP）を使用した二段階認証を提供します。

## システム構成

### バックエンド

#### 1. OTP 管理（`controllers/otp.go`）

- **OTP 生成**: 6 桁のランダムな数字コードを生成
- **OTP 検証**: ユーザーが入力したコードの有効性を確認
- **有効期限管理**: OTP は 5 分間有効
- **再送信機能**: 1 分間のレート制限付きで OTP 再送信が可能

#### 2. メール送信（`services/email.go`）

- **HTML 形式のメール**: 美しいデザインの OTP メールテンプレート
- **SMTP 設定**: 環境変数による柔軟なメール設定
- **セキュリティ情報**: ユーザーへのセキュリティ注意事項を含む

#### 3. データベース構造

```go
type OTP struct {
    ID        primitive.ObjectID `bson:"_id,omitempty"`
    UserID    primitive.ObjectID `bson:"user_id"`
    Email     string             `bson:"email"`
    Code      string             `bson:"code"`
    Purpose   string             `bson:"purpose"` // "login", "password_reset"
    ExpiresAt time.Time          `bson:"expires_at"`
    IsUsed    bool               `bson:"is_used"`
    CreatedAt time.Time          `bson:"created_at"`
}
```

#### 4. API エンドポイント

- `POST /api/otp/send` - OTP 送信
- `POST /api/otp/verify` - OTP 検証
- `POST /api/otp/resend` - OTP 再送信

### フロントエンド

#### 1. OTP 入力コンポーネント（`components/OTPInput.tsx`）

- **6 桁入力フィールド**: 自動フォーカス移動機能
- **ペースト対応**: クリップボードからの一括入力
- **タイマー表示**: 残り有効時間の表示
- **再送信機能**: ボタンクリックで OTP 再送信

#### 2. 2FA 認証画面（`pages/TwoFactorAuth.tsx`）

- **ユーザーフレンドリーな UI**: 分かりやすい操作画面
- **エラーハンドリング**: 適切なエラーメッセージ表示
- **セキュリティ情報**: ユーザーへの注意事項表示

#### 3. ログインフロー更新（`pages/Login.tsx`）

- **段階的認証**: パスワード認証 → OTP 送信 → 2FA 画面遷移
- **エラーハンドリング**: 各段階での適切なエラー処理

## 設定方法

### 1. 環境変数設定

`.env`ファイルに以下の設定を追加：

```env
# SMTP設定（メール送信用）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Juice Academy
```

### 2. Gmail 設定例

1. **Google アカウントの 2 段階認証を有効化**
2. **アプリパスワードを生成**:
   - Google Account Settings > Security > 2-Step Verification > App passwords
   - "Mail" を選択してパスワードを生成
   - 生成されたパスワードを`SMTP_PASSWORD`に設定

### 3. 他のメールプロバイダー

#### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
```

#### Yahoo Mail

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
```

## ユーザーフロー

1. **ログイン画面**: ユーザーがメールアドレスとパスワードを入力
2. **パスワード認証**: バックエンドでパスワードを検証
3. **OTP 送信**: 認証成功時にメールで OTP を送信
4. **2FA 画面遷移**: フロントエンドが 2FA 画面に自動遷移
5. **OTP 入力**: ユーザーがメールで受け取った OTP を入力
6. **OTP 検証**: バックエンドで OTP を検証
7. **ログイン完了**: 検証成功時に JWT トークンを発行してログイン完了

## セキュリティ機能

### 1. OTP セキュリティ

- **短い有効期限**: 5 分間で自動失効
- **一回限りの使用**: 使用後は自動的に無効化
- **暗号化通信**: HTTPS/TLS 経由でのみ送信

### 2. レート制限

- **再送信制限**: 1 分間に 1 回まで
- **ブルートフォース対策**: 連続した不正な試行を防止

### 3. データ保護

- **自動削除**: TTL インデックスによる期限切れ OTP の自動削除
- **セキュアストレージ**: OTP はハッシュ化して保存（実装可能）

## テスト

### 1. 単体テスト

```bash
# OTP機能のテスト実行
go test -v ./controllers -run TestOTP
go test -v ./controllers -run TestSendOTP
go test -v ./controllers -run TestVerifyOTP
```

### 2. 統合テスト

```bash
# MongoDB統合テストの実行
./run_tests.sh
```

## トラブルシューティング

### 1. メール送信エラー

```bash
# ログでSMTP設定を確認
2024/01/01 12:00:00 OTPメール送信エラー: dial tcp: lookup smtp.gmail.com: no such host
```

**解決策**: SMTP 設定を確認し、ネットワーク接続をチェック

### 2. OTP 期限切れ

```json
{
  "error": "無効または期限切れの認証コードです"
}
```

**解決策**: 新しい OTP を再送信

### 3. レート制限

```json
{
  "error": "認証コードは1分間に1回まで送信できます"
}
```

**解決策**: 1 分間待機後に再送信

## 今後の拡張予定

### 1. SMS 認証

- 電話番号による SMS 認証の追加
- メール/SMS 選択可能な認証方式

### 2. TOTP（Time-based OTP）

- Google Authenticator などのアプリ連携
- QR コード生成機能

### 3. バックアップコード

- ワンタイム使用のバックアップ認証コード
- デバイス紛失時の代替認証手段

### 4. デバイス記憶機能

- 信頼できるデバイスの記憶
- 一定期間の 2FA スキップ機能

## API 仕様

### OTP 送信 API

```http
POST /api/otp/send
Content-Type: application/json

{
  "email": "user@example.com",
  "purpose": "login"
}
```

**レスポンス**:

```json
{
  "message": "認証コードを送信しました",
  "expires_in": 300
}
```

### OTP 検証 API

```http
POST /api/otp/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "purpose": "login"
}
```

**レスポンス**:

```json
{
  "message": "認証が完了しました",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "role": "student",
    "studentId": "12345",
    "nameKana": "ユーザー名",
    "isAdmin": false
  }
}
```

この二段階認証システムにより、Juice Academy のセキュリティが大幅に向上し、ユーザーアカウントの保護が強化されます。
