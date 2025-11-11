# Stripe 決済セキュリティ強化 - 実装完了サマリー

実装日: 2025-10-11

## 概要

Stripe 決済統合のセキュリティを大幅に強化しました。IDOR 防止、Webhook 冪等性、データベース最小権限、ログマスキングなど、本番運用に必要なセキュリティ対策を実装しています。

---

## 実装した機能

### 1. ✅ MongoDB 一意制約とインデックス

**ファイル**: `mongo-init/init.js`

- `payments.user_id` に unique index（1 ユーザー 1 決済情報）
- `payments.stripe_customer_id` に unique index（顧客 ID 重複防止）
- `stripe_events` コレクション新規作成（Webhook 冪等性管理）
- TTL インデックスで古いイベントを 30 日後に自動削除

**効果**: データ整合性の保証、レースコンディション対策

---

### 2. ✅ Webhook 冪等性処理

**ファイル**: `backend/controllers/payment.go`

**実装内容**:

- `StripeEvent` 構造体定義
- `stripe_events` コレクションでイベント ID 管理
- 署名検証（デフォルト 5 分 tolerance）
- 重複イベントの自動検出と拒否

**効果**:

- リプレイ攻撃の防止
- 重複課金の防止
- なりすまし Webhook の検出

---

### 3. ✅ IDOR 対策

**ファイル**: `backend/controllers/payment.go`（全ハンドラー）

**実装内容**:

- すべての決済 API で `c.GetString("user_id")` のみ使用
- クライアントからの user_id 入力を完全無視
- JWT 認証済みユーザーの情報のみアクセス可能

**効果**: 他ユーザーの決済情報への不正アクセス防止

---

### 4. ✅ API レスポンスから機微情報を削除

**ファイル**: `backend/controllers/payment.go`

**変更内容**:

- `CreateStripeCustomerHandler`: `stripe_customer_id` を返さない
- 内部処理でのみ使用、クライアントには非公開

**効果**: 課金者特定リスクの低減

---

### 5. ✅ PII マスキング

**ファイル**:

- 新規 `backend/utils/logger.go`
- 適用 `backend/controllers/payment.go`

**実装内容**:

- `MaskPII()`: 自動マスキング関数
- `LogSafe()`: 安全なログ出力
- 正規表現で email、Stripe ID をマスク

**対象**:

- メールアドレス: `user@example.com` → `u***r@example.com`
- Stripe Customer ID: `cus_1234567890` → `cus_***7890`
- その他すべての Stripe ID (pm*, sub*, pi*, seti*)

**効果**: ログ漏洩時の PII 保護

---

### 6. ✅ MongoDB セキュリティ設定

**ファイル**:

- `docker-compose.yml`
- `mongo-init/init.js`
- `.env.example`

**実装内容**:

- MongoDB 認証有効化（`--auth`）
- 最小権限アプリユーザー作成（`readWrite` のみ）
- root ユーザーと分離

**接続文字列例**:

```
mongodb://juice_academy_app:password@mongodb:27017/juice_academy?authSource=juice_academy
```

**効果**:

- RCE 時のダメージ最小化
- 他 DB へのアクセス制限
- 管理者権限の不正取得防止

---

### 7. ✅ JWT/リフレッシュトークン運用の再設計

**ファイル**:

- `backend/controllers/auth_tokens.go`
- `backend/controllers/otp.go`
- `backend/controllers/auth.go`

**実装内容**:

- アクセストークンは 15 分有効の JWT に短縮
- リフレッシュトークンは 64 byte ランダム値を SHA-256 ハッシュで `refresh_tokens` コレクションに保存（TTL/重複防止インデックス付き）
- リフレッシュトークンは `HttpOnly + Secure + SameSite=Strict` Cookie として配布
- `/api/auth/refresh` 実装により Cookie + CSRF 二重送信で再発行
- ログアウト時にリフレッシュトークンとアクセストークン双方を失効

**効果**:

- XSS からのセッション窃取を最小化
- 漏洩時もハッシュ保管によりリフレッシュトークンの再利用を阻害
- 再計算性を担保したセッション再発行フローが確立

---

### 8. ✅ CSRF 防御と CORS 厳格化

**ファイル**:

- `backend/controllers/csrf.go`
- `backend/main.go`
- `frontend/src/services/api.ts`

**実装内容**:

- `refresh_tokens` に CSRF トークンハッシュを保存し、`X-CSRF-Token` 二重送信方式で検証
- すべての状態変更系エンドポイントを `CSRFProtection` ミドルウェアで保護
- CORS は許可ドメインのホワイトリストのみ許可し、Cookie を伴う `withCredentials` 通信を前提に `Access-Control-Allow-Credentials: true`
- フロントエンドは `axios` リクエストで `withCredentials` と CSRF ヘッダーを自動送信

**効果**:

- セッション継続に Cookie を利用しつつ CSRF を遮断
- 誤設定によるワイルドカード CORS を排除

---

### 9. ✅ レート制限と Redis ハンドリングの堅牢化

**ファイル**:

- `backend/services/redis.go`
- `backend/middleware/ratelimit.go`

**実装内容**:

- Redis 初期化失敗時はアプリ起動を中止（フォールバックでのサイレント劣化を阻止）
- Redis 未初期化時のパニック防止ガードを追加
- レート制限超過時に `Retry-After` ヘッダーを返却し、クライアントが指数バックオフに利用可能

**効果**:

- レートリミッタの安定運用
- クライアント側の再試行制御を支援し、DoS 耐性を強化

---

### 10. ✅ Correlation-ID による監査ログ拡充

**ファイル**:

- `backend/middleware/correlation.go`
- `backend/utils/logger.go`
- `backend/controllers/payment.go` 他

**実装内容**:

- すべてのリクエストに `X-Correlation-ID` を付与し、レスポンスヘッダーにも伝播
- ログ出力は PII マスキングに加えて `[cid=...]` プレフィックスで相関 ID を自動付与
- `gin.Context` → `context.Context` に相関 ID を紐付け、サービス層で一貫して利用

**効果**:

- API コールチェーンを横断した監査トレースが可能
- インシデント調査やイベント集約が容易に

---

### 11. ✅ Docker / Compose ハードニング

**ファイル**:

- `backend/Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`

**実装内容**:

- アプリコンテナを非 root ユーザーで実行し、ビルド後に権限を `appuser` に委譲
- `read_only`, `no-new-privileges`, `cap_drop: [ALL]`, `tmpfs:/tmp` を適用
- `.env` のフルマウントを廃止し、Secrets/環境変数起点の注入へ移行

**効果**:

- コンテナ breakout や権限昇格のリスク軽減
- 誤設定による平文シークレット露出を防止

---

---

### 7. ✅ データマイグレーションスクリプト

**ファイル**: 新規 `backend/scripts/migrate_payment_security.go`

**機能**:

- payments/subscriptions の重複データ検出
- user_id, stripe_customer_id の重複チェック
- インデックス作成（安全に）
- 修正手順の自動出力

**実行方法**:

```bash
cd backend/scripts
MONGODB_URI="mongodb://..." go run migrate_payment_security.go
```

---

### 8. ✅ アカウント削除フロー強化

**ファイル**:

- 新規 `backend/ACCOUNT_DELETION.md`（ドキュメント）
- `backend/controllers/user.go`（実装強化）

**削除順序**:

1. Stripe サブスクリプション停止
2. Stripe 顧客削除
3. MongoDB サブスクリプション削除
4. MongoDB 決済情報削除
5. MongoDB ユーザー削除

**効果**:

- 幽霊課金の防止
- GDPR 準拠
- データ整合性の保証

---

### 9. ✅ セキュリティドキュメント

**ファイル**: 新規 `backend/SECURITY.md`

**内容**:

- 実装済みセキュリティ対策の詳細
- IDOR 対策ガイドライン
- Webhook セキュリティ
- 運用チェックリスト
- トラブルシューティング

---

## 環境変数の追加

`.env.example` に以下を追加：

```bash
# MongoDB認証（セキュリティ強化）
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your-strong-mongodb-root-password-change-me
MONGO_APP_PASSWORD=app_secure_password_change_in_production

# MongoDB接続文字列も更新
MONGODB_URI=mongodb://juice_academy_app:app_secure_password_change_in_production@mongodb:27017/juice_academy?authSource=juice_academy
```

---

## デプロイ手順

### 1. 環境変数の設定

```bash
# .env ファイルを作成（.env.example をコピー）
cp .env.example .env

# 以下の値を必ず変更してください
MONGO_INITDB_ROOT_PASSWORD=<強力なパスワード>
MONGO_APP_PASSWORD=<強力なパスワード>
STRIPE_WEBHOOK_SECRET=<Stripeダッシュボードから取得>
```

### 2. データマイグレーション実行

```bash
# 既存データの整合性チェック
cd backend/scripts
MONGODB_URI="mongodb://..." go run migrate_payment_security.go

# 重複データがある場合は手動で修正
```

### 3. Docker 再起動

```bash
# MongoDBを含む全サービスを再起動
docker-compose down -v  # ⚠️ ボリュームも削除（初回のみ）
docker-compose up --build
```

### 4. 動作確認

```bash
# MongoDB認証確認
docker exec -it <mongo-container> mongosh \
  -u juice_academy_app \
  -p app_secure_password_change_in_production \
  --authenticationDatabase juice_academy

# インデックス確認
use juice_academy
db.payments.getIndexes()
db.stripe_events.getIndexes()

# Webhook動作確認（Stripe CLIを使用）
stripe listen --forward-to http://localhost:8080/api/webhook/stripe
stripe trigger payment_intent.succeeded
```

---

## チェックリスト

### デプロイ前

- [ ] `.env` ファイルの全環境変数を設定
- [ ] MongoDB パスワードを強力なものに変更
- [ ] Stripe Webhook シークレットを設定
- [ ] マイグレーションスクリプトを実行

### デプロイ後

- [ ] MongoDB 認証が有効か確認
- [ ] インデックスが作成されているか確認
- [ ] Webhook が Stripe に登録されているか確認
- [ ] 決済フローの E2E テスト実施
- [ ] ログマスキングが機能しているか確認

### 定期的な確認

- [ ] `stripe_events` が適切に削除されているか（30 日 TTL）
- [ ] 異常な Webhook アクセスがないか
- [ ] エラーログの監視
- [ ] データベースバックアップの実行確認

---

## トラブルシューティング

### MongoDB 接続エラー

```
Error: Authentication failed
```

**解決策**:

1. `.env` の認証情報を確認
2. `mongo-init/init.js` が実行されているか確認
3. コンテナを完全に再起動: `docker-compose down -v && docker-compose up --build`

### Webhook 署名検証失敗

```
Webhook signature verification failed
```

**解決策**:

1. `STRIPE_WEBHOOK_SECRET` が正しいか確認
2. Stripe ダッシュボードでシークレットを再取得
3. ローカル開発では Stripe CLI を使用

### インデックス作成エラー

```
duplicate key error
```

**解決策**:

1. マイグレーションスクリプトで重複データを検出
2. 重複レコードを手動で削除
3. インデックスを再作成

---

## パフォーマンス影響

### 期待される影響

- **Webhook 処理**: +5-10ms（冪等性チェック）
- **決済 API**: ほぼ影響なし（インデックスにより高速化）
- **ログ出力**: +1-2ms（マスキング処理）

### 最適化のヒント

- `stripe_events` の自動削除により、コレクションサイズを一定に保つ
- インデックスにより検索性能が向上
- ログマスキングは非同期処理に移行可能（必要に応じて）

---

## セキュリティ評価

### 強化前のリスク

| リスク                         | 深刻度 | 発生確率 |
| ------------------------------ | ------ | -------- |
| IDOR（他人の決済情報アクセス） | 高     | 中       |
| Webhook 重複処理（二重課金）   | 高     | 中       |
| データ不整合（重複顧客 ID）    | 中     | 高       |
| PII ログ漏洩                   | 中     | 中       |
| MongoDB 全権限 RCE             | 高     | 低       |

### 強化後のリスク

| リスク           | 深刻度 | 発生確率 | 対策           |
| ---------------- | ------ | -------- | -------------- |
| IDOR             | 低     | 低       | JWT 認証強制   |
| Webhook 重複処理 | 低     | 低       | 冪等性管理     |
| データ不整合     | 低     | 低       | 一意制約       |
| PII ログ漏洩     | 低     | 低       | 自動マスキング |
| MongoDB RCE      | 中     | 低       | 最小権限       |

---

## 今後の改善提案

### 短期（1-2 週間）

- [ ] Webhook 配信失敗時のリトライ処理
- [ ] 決済エラー時のアラート機能
- [ ] 管理画面での決済状況モニタリング

### 中期（1-3 ヶ月）

- [ ] stripe_customer_id の AES-GCM 暗号化（オプション）
- [ ] 監査ログの永続化（別 DB または S3）
- [ ] 異常検知アラート（機械学習ベース）

### 長期（3 ヶ月以上）

- [ ] PCI-DSS 準拠の完全達成
- [ ] マルチリージョン対応
- [ ] ゼロトラストアーキテクチャへの移行

---

## 参考資料

- [backend/SECURITY.md](backend/SECURITY.md) - セキュリティガイドライン
- [backend/ACCOUNT_DELETION.md](backend/ACCOUNT_DELETION.md) - アカウント削除フロー
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 連絡先

セキュリティに関する質問や懸念事項がある場合:

- 開発チーム: [開発者メール]
- セキュリティインシデント: [セキュリティ担当者メール]

---

**実装完了日**: 2025-10-11  
**実装者**: AI Agent (Cursor)  
**レビュー状態**: 実装完了（レビュー待ち）
