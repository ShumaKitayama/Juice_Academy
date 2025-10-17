# Stripe 決済セキュリティガイドライン

このドキュメントでは、Juice Academy の Stripe 決済統合におけるセキュリティ対策について説明します。

## 目次

1. [実装済みのセキュリティ対策](#実装済みのセキュリティ対策)
2. [IDOR（不適切な直接参照）対策](#idor不適切な直接参照対策)
3. [Webhook セキュリティ](#webhook-セキュリティ)
4. [データベースセキュリティ](#データベースセキュリティ)
5. [ログとモニタリング](#ログとモニタリング)
6. [運用チェックリスト](#運用チェックリスト)

---

## 実装済みのセキュリティ対策

### ✅ 1. 一意制約によるデータ整合性保護

**実装箇所**: `mongo-init/init.js`

```javascript
// payments コレクション
db.payments.createIndex({ user_id: 1 }, { unique: true });
db.payments.createIndex(
  { stripe_customer_id: 1 },
  { unique: true, sparse: true }
);

// subscriptions コレクション
db.subscriptions.createIndex(
  { stripe_subscription_id: 1 },
  { unique: true, sparse: true }
);

// stripe_events コレクション（Webhook冪等性）
db.stripe_events.createIndex({ event_id: 1 }, { unique: true });
```

**効果**:

- 1 ユーザーに複数の決済情報が紐づくのを防止
- Stripe 顧客 ID の重複を防止
- Webhook イベントの重複処理を防止

### ✅ 2. Webhook 冪等性処理

**実装箇所**: `backend/controllers/payment.go` - `StripeWebhookHandler`

```go
// 署名検証（tolerance: 300秒 = 5分）
_, err = webhook.ConstructEventWithOptions(body, c.GetHeader("Stripe-Signature"),
    webhookSecret, webhook.ConstructEventOptions{IgnoreAPIVersionMismatch: false})

// 冪等性チェック
stripeEvent := StripeEvent{
    EventID:    event.ID,
    EventType:  string(event.Type),
    ReceivedAt: time.Now(),
}
_, err = stripeEventCollection.InsertOne(ctx, stripeEvent)
if mongo.IsDuplicateKeyError(err) {
    // 既に処理済み
    return
}
```

**効果**:

- リプレイ攻撃の防止（5 分以上古いイベントを拒否）
- 同一イベントの重複処理を防止（重複課金防止）
- なりすまし Webhook の検出

### ✅ 3. IDOR 対策（認可一貫性）

**実装箇所**: 全決済関連ハンドラー

```go
// 常に JWT から取得した user_id のみを使用
userIDStr := c.GetString("user_id")  // ← 認証ミドルウェアが設定
userID, _ := primitive.ObjectIDFromHex(userIDStr)

// クライアントからの user_id は一切信用しない
var payment Payment
err := paymentCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&payment)
```

**効果**:

- 他のユーザーの決済情報への不正アクセスを防止
- パスパラメータやボディの user_id 改ざんを無効化

### ✅ 4. 機微情報の非公開化

**実装箇所**: 各 API レスポンス

```go
// ❌ 旧実装（stripe_customer_id を返していた）
c.JSON(http.StatusOK, gin.H{
    "stripe_customer_id": payment.StripeCustomerID,  // 危険
})

// ✅ 新実装（内部のみで使用）
c.JSON(http.StatusOK, gin.H{
    "message": "Stripe顧客情報を作成しました",
    // stripe_customer_id は返さない
})
```

**効果**:

- 課金者の特定リスクを低減
- 内部管理 ID の漏洩防止

### ✅ 5. PII マスキング

**実装箇所**: `backend/utils/logger.go`

```go
// 自動マスキング
utils.LogInfo("CreateStripeCustomer", "Customer created for user@example.com")
// 出力: "Customer created for u***r@example.com"

utils.LogInfo("Webhook", "Processing cus_1234567890abcdef")
// 出力: "Processing cus_***cdef"
```

**対象**:

- メールアドレス
- Stripe Customer ID (cus\_\*)
- Stripe Payment Method ID (pm\_\*)
- Stripe Subscription ID (sub\_\*)
- Stripe Payment Intent ID (pi\_\*)
- Stripe Setup Intent ID (seti\_\*)

### ✅ 6. MongoDB 認証と最小権限

**実装箇所**: `docker-compose.yml`, `mongo-init/init.js`

```javascript
// アプリケーション用ユーザー（readWrite のみ）
db.createUser({
  user: "juice_academy_app",
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: "readWrite", db: "juice_academy" }],
});
```

**接続文字列**:

```
mongodb://juice_academy_app:password@mongodb:27017/juice_academy?authSource=juice_academy
```

**効果**:

- RCE 発生時のダメージ最小化
- 管理者権限の不正取得を防止
- 他 DB へのアクセスを制限

---

## IDOR（不適切な直接参照）対策

### 脆弱なコード例

```go
// ❌ 危険: クライアントから user_id を受け取っている
type Request struct {
    UserID string `json:"user_id"`  // 改ざん可能
}
var req Request
c.ShouldBindJSON(&req)

// 攻撃者は他人の user_id を指定できる
payment := getPayment(req.UserID)
```

### 安全なコード例

```go
// ✅ 安全: JWT から取得した user_id のみ使用
userIDStr := c.GetString("user_id")  // 認証済み
if userIDStr == "" {
    return unauthorized
}

userID, _ := primitive.ObjectIDFromHex(userIDStr)
payment := getPayment(userID)  // 自分の情報のみ取得可能
```

### チェックポイント

- [ ] すべての決済 API で `c.GetString("user_id")` を使用
- [ ] クライアント入力の `user_id` は無視
- [ ] 管理者 API は別途 `AdminRequired()` ミドルウェアで保護

---

## Webhook セキュリティ

### 3 層防御

1. **署名検証** (必須)

   ```go
   webhook.ConstructEventWithOptions(body, signature, secret, options)
   ```

2. **タイムスタンプチェック** (tolerance: 5 分)

   - リプレイ攻撃を防止

3. **冪等性管理** (event_id の記録)
   - 重複処理を防止

### 運用上の注意

- ❌ IP 制限には依存しない（Stripe は固定 IP でない）
- ✅ Webhook シークレットは環境変数で管理
- ✅ 本番とテスト環境で異なるシークレットを使用

---

## データベースセキュリティ

### MongoDB 設定

```yaml
# docker-compose.yml
mongodb:
  command: ["--auth", "--bind_ip_all"]
  environment:
    MONGO_INITDB_ROOT_USERNAME: admin
    MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
```

### インデックス戦略

```javascript
// 一意制約（データ整合性）
db.payments.createIndex({ user_id: 1 }, { unique: true });

// TTLインデックス（自動削除）
db.stripe_events.createIndex(
  { received_at: 1 },
  { expireAfterSeconds: 2592000 } // 30日後に自動削除
);
```

### バックアップ

- 暗号化されたストレージに保存
- アクセス制御（管理者のみ）
- 定期的な復旧テスト

---

## ログとモニタリング

### ログレベル

```go
utils.LogInfo()     // 通常の操作
utils.LogWarning()  // 異常だが継続可能
utils.LogError()    // エラー発生
```

### 監視すべきイベント

- Webhook 署名検証失敗（攻撃の可能性）
- 決済エラーの急増
- 同一 IP からの大量リクエスト
- 未認証エンドポイントへのアクセス

### アラート設定例

```
- Webhook 署名エラー > 10回/時間
- Stripe API エラー率 > 5%
- サブスクリプションキャンセル率 > 20%
```

---

## 運用チェックリスト

### デプロイ前

- [ ] 環境変数がすべて設定されている
- [ ] Webhook シークレットが正しく設定されている
- [ ] MongoDB 認証が有効化されている
- [ ] Stripe API キー（本番/テスト）が正しい環境に設定されている
- [ ] ログマスキングが機能している（テスト実行）

### デプロイ後

- [ ] Webhook エンドポイントが Stripe に登録されている
- [ ] Webhook イベントが正常に受信されている
- [ ] 決済フローの E2E テスト完了
- [ ] エラーログの監視設定完了
- [ ] バックアップの自動実行確認

### 定期的な確認（月次）

- [ ] ログファイルのローテーション確認
- [ ] 異常なアクセスパターンの確認
- [ ] Stripe ダッシュボードと DB の整合性確認
- [ ] セキュリティパッチの適用

---

## トラブルシューティング

### Webhook が届かない

1. Stripe ダッシュボードで配信履歴を確認
2. 署名検証エラーの場合 → シークレットを再確認
3. タイムアウトの場合 → サーバー負荷を確認

### 決済情報の不整合

1. `backend/scripts/migrate_payment_security.go` を実行
2. 重複データの有無を確認
3. 手動で修正（必要に応じて）

### ログに PII が含まれている

1. `utils.LogSafe()` を使用しているか確認
2. 既存ログファイルを削除またはマスキング
3. ログローテーション設定を確認

---

## 参考資料

- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PCI DSS Compliance](https://www.pcisecuritystandards.org/)

---

## 更新履歴

- 2025-10-11: 初版作成（セキュリティ強化実装に伴い作成）
