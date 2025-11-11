# 二段階認証（2FA）システム

Juice Academy に実装された二段階認証システムについて説明します。

## 概要

このシステムは、ログイン時に**必ず**メールで送信されるワンタイムパスコード（OTP）を使用した二段階認証を提供します。

**重要な変更点（2025 年版）**:

- **OTP は必須**: すべてのログインで 2FA が必須になりました
- **Gmail API 使用**: SMTP 認証ではなく、Gmail API とサービスアカウントを使用
- **OAuth2 認証**: より安全な OAuth2 ベースの認証方式
- **本番環境最適化**: ログ出力を最小限に抑え、セキュリティを強化しました

## システム構成

### バックエンド

#### 1. OTP 管理（`controllers/otp.go`）

- **OTP 生成**: 6 桁のランダムな数字コードを生成
- **OTP 検証**: ユーザーが入力したコードの有効性を確認
- **有効期限管理**: OTP は 5 分間有効
- **再送信機能**: 1 分間のレート制限付きで OTP 再送信が可能

#### 2. メール送信（`services/email.go`）

- **Gmail API 使用**: サービスアカウントによる安全なメール送信
- **HTML 形式のメール**: 美しいデザインの OTP メールテンプレート
- **OAuth2 認証**: SMTP 認証よりセキュアな認証方式
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

## 設定方法（必須）- Gmail API 使用

### 1. Google Cloud Platform でプロジェクトを作成

1. **Google Cloud Console にアクセス**
   - [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. **新しいプロジェクトを作成**
   - プロジェクト名: `juice-academy-otp`（任意）
   - プロジェクト ID をメモしておく

### 2. Gmail API を有効化

1. **API ライブラリに移動**
   - ナビゲーション > APIs & Services > Library
2. **Gmail API を検索して有効化**
   - "Gmail API" を検索
   - "有効にする" をクリック

### 3. サービスアカウントを作成

1. **サービスアカウントページに移動**
   - ナビゲーション > IAM & Admin > Service Accounts
2. **サービスアカウントを作成**
   - 名前: `juice-academy-gmail-sender`（任意）
   - 説明: `OTP送信用サービスアカウント`
   - "作成して続行" をクリック
3. **ロールをスキップ**（Domain-wide Delegation で権限付与）
   - "続行" > "完了" をクリック

### 4. サービスアカウント鍵を作成

1. **作成したサービスアカウントをクリック**
2. **"キー" タブに移動**
   - "鍵を追加" > "新しい鍵を作成"
   - 形式: JSON
   - "作成" をクリック
3. **JSON ファイルがダウンロードされる**
   - ファイル名: `juice-academy-otp-xxxxx.json`
   - **このファイルは安全に保管してください**

### 5. Domain-wide Delegation を設定（Google Workspace 使用時）

**個人 Gmail アカウントの場合は、このステップをスキップしてステップ 6 へ**

1. **サービスアカウント詳細画面で**
   - "Domain-wide Delegation を有効にする" を ON
   - "保存" をクリック
2. **Client ID をメモ**

   - サービスアカウント詳細画面に表示される Client ID をコピー

3. **Google Workspace Admin Console で委任を設定**
   - Admin Console > セキュリティ > アクセスとデータ管理 > API の制御
   - "ドメイン全体の委任" > "新規追加"
   - Client ID: （先ほどメモした ID）
   - OAuth スコープ:
     ```
     https://www.googleapis.com/auth/gmail.send
     ```
   - "承認" をクリック

### 6. 環境変数を設定

`.env`ファイルに以下の設定が**必須**です：

```env
# Gmail API設定（OTP送信用 - 必須）
# サービスアカウントJSONの内容を1行にして設定
GMAIL_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project",...}
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Juice Academy
```

**JSON ファイルの設定方法**:

1. **JSON ファイルを 1 行に変換**:

   ```bash
   # Mac/Linuxの場合
   cat juice-academy-otp-xxxxx.json | tr -d '\n'

   # または、テキストエディタで開いて改行を削除
   ```

2. **環境変数に設定**:
   ```env
   GMAIL_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
   ```

**重要**: この設定がないとログインが機能しません。OTP は常に Gmail API 経由で実際にメール送信を行います。

## ユーザーフロー（2FA 必須）

1. **ログイン画面**: ユーザーがメールアドレスとパスワードを入力
   - エンドポイント: `POST /api/login`
2. **パスワード認証**: バックエンドでパスワードを検証
   - 成功時: `{"require_2fa": true, "email": "user@example.com"}` を返す
   - 失敗時: `401 Unauthorized`
3. **2FA 画面遷移**: フロントエンドが自動的に 2FA 画面に遷移
4. **OTP 送信**: ユーザーが「認証コードを送信」ボタンをクリック
   - エンドポイント: `POST /api/otp/send`
   - Gmail 経由で実際に OTP メールが送信される
5. **OTP 入力**: ユーザーがメールで受け取った 6 桁の OTP を入力
6. **OTP 検証**: バックエンドで OTP を検証
   - エンドポイント: `POST /api/otp/verify`
   - 成功時: JWT トークンとユーザー情報を返す
7. **ログイン完了**: 検証成功時に JWT トークンを発行してログイン完了

**注意**: ステップ 4 の OTP 送信をスキップすることはできません。すべてのログインで 2FA が必須です。

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

**エラー**: `{"error": "認証コードの送信に失敗しました"}`

**原因**:

- Gmail API 設定が不正または未設定
- サービスアカウント JSON が正しくない
- Gmail API が有効化されていない
- 送信元メールアドレスの権限がない
- ネットワーク接続の問題

**解決策**:

1. `.env`ファイルの`GMAIL_SERVICE_ACCOUNT_JSON`を確認
2. Google Cloud Console で Gmail API が有効か確認
3. サービスアカウント鍵が正しいか確認
4. `FROM_EMAIL`が正しく設定されているか確認
5. Domain-wide Delegation 設定を確認（Google Workspace 使用時）
6. ネットワーク接続を確認

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
