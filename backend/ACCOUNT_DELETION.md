# アカウント削除フロー

Juice Academy のアカウント削除は、GDPR および個人情報保護法に準拠して実施する必要があります。
このドキュメントでは、安全かつ確実なアカウント削除の手順を説明します。

## 削除順序（重要）

**必ず以下の順序で実行してください：**

1. **Stripe 側の処理**（外部システム優先）
2. **MongoDB の処理**（内部システム）

この順序を守ることで、課金の不整合や幽霊課金を防止できます。

---

## 詳細手順

### 1. Stripe 側のクリーンアップ

#### 1.1 アクティブなサブスクリプションの確認

```go
// ユーザーのサブスクリプション情報を取得
var subscription Subscription
err := subscriptionCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&subscription)

if err == nil && subscription.StripeSubscriptionID != "" {
    // サブスクリプションが存在する
}
```

#### 1.2 サブスクリプションの停止

アクティブなサブスクリプションがある場合は即時キャンセル：

```go
import subscriptionapi "github.com/stripe/stripe-go/v72/sub"

// 即時キャンセル（返金なし）
params := &stripe.SubscriptionCancelParams{}
_, err := subscriptionapi.Cancel(subscription.StripeSubscriptionID, params)
if err != nil {
    // エラーハンドリング
    log.Printf("Stripe subscription cancellation failed: %v", err)
}
```

**注意事項：**

- `cancel_at_period_end` ではなく、即時キャンセルを推奨
- 返金ポリシーに応じて対応を変更可能

#### 1.3 Stripe 顧客の削除（オプション）

```go
import "github.com/stripe/stripe-go/v72/customer"

// 支払い情報を取得
var payment Payment
err := paymentCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&payment)

if err == nil && payment.StripeCustomerID != "" {
    // Stripe 顧客を削除
    _, err := customer.Del(payment.StripeCustomerID, nil)
    if err != nil {
        log.Printf("Stripe customer deletion failed: %v", err)
    }
}
```

**推奨：**

- 完全削除の場合は Stripe 顧客も削除
- 履歴保持の場合は削除せず、metadata に削除フラグを追加

---

### 2. MongoDB のクリーンアップ

Stripe 側の処理が完了してから実行します。

#### 2.1 関連コレクションの削除順序

```go
ctx := context.Background()

// 1. サブスクリプション情報の削除
_, err := subscriptionCollection.DeleteMany(ctx, bson.M{"user_id": userID})
if err != nil {
    log.Printf("Subscription deletion failed: %v", err)
}

// 2. 決済情報の削除
_, err = paymentCollection.DeleteMany(ctx, bson.M{"user_id": userID})
if err != nil {
    log.Printf("Payment deletion failed: %v", err)
}

// 3. その他の関連データ（お知らせの閲覧履歴など）
// 必要に応じて追加

// 4. ユーザー本体の削除（最後）
_, err = userCollection.DeleteOne(ctx, bson.M{"_id": userID})
if err != nil {
    log.Printf("User deletion failed: %v", err)
    return err
}
```

#### 2.2 論理削除の選択肢

完全削除ではなく論理削除を選択する場合：

```go
update := bson.M{
    "$set": bson.M{
        "deleted_at": time.Now(),
        "email": "deleted_" + userID.Hex() + "@deleted.local", // 一意制約回避
        "status": "deleted",
    },
}
_, err := userCollection.UpdateOne(ctx, bson.M{"_id": userID}, update)
```

---

### 3. ログとバックアップの処理

#### 3.1 ログのマスキング

過去のログファイルに PII が含まれている場合：

- ログローテーション時に自動的にマスキング
- 既存ログは手動でマスキングまたは削除

#### 3.2 バックアップの保持期間

- **法的要求がない場合**: 削除から 30 日後にバックアップからも削除
- **法的要求がある場合**: 規定の期間保持（暗号化必須）

---

## 実装例（完全版）

```go
// DeleteAccountWithStripeCleanup はStripe連携を含む完全なアカウント削除を実行
func DeleteAccountWithStripeCleanup(c *gin.Context) {
    userIDStr := c.GetString("user_id")
    if userIDStr == "" {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
        return
    }

    userID, err := primitive.ObjectIDFromHex(userIDStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "不正なユーザーIDです"})
        return
    }

    ctx := context.Background()

    // === STEP 1: Stripe 側のクリーンアップ ===

    // 1.1 サブスクリプションの停止
    var subscription Subscription
    err = subscriptionCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&subscription)
    if err == nil && subscription.StripeSubscriptionID != "" {
        // アクティブなサブスクリプションを即時キャンセル
        params := &stripe.SubscriptionCancelParams{}
        _, err := subscriptionapi.Cancel(subscription.StripeSubscriptionID, params)
        if err != nil {
            utils.LogError("DeleteAccount", err, "Failed to cancel Stripe subscription")
            c.JSON(http.StatusInternalServerError, gin.H{"error": "サブスクリプションの停止に失敗しました"})
            return
        }
        utils.LogInfo("DeleteAccount", "Stripe subscription cancelled: "+subscription.StripeSubscriptionID)
    }

    // 1.2 Stripe 顧客の削除（オプション）
    var payment Payment
    err = paymentCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&payment)
    if err == nil && payment.StripeCustomerID != "" {
        _, err := customer.Del(payment.StripeCustomerID, nil)
        if err != nil {
            // 顧客削除失敗は警告のみ（継続可能）
            utils.LogWarning("DeleteAccount", "Failed to delete Stripe customer: "+err.Error())
        } else {
            utils.LogInfo("DeleteAccount", "Stripe customer deleted")
        }
    }

    // === STEP 2: MongoDB のクリーンアップ ===

    // 2.1 サブスクリプション情報の削除
    _, err = subscriptionCollection.DeleteMany(ctx, bson.M{"user_id": userID})
    if err != nil {
        utils.LogError("DeleteAccount", err, "Failed to delete subscriptions")
    }

    // 2.2 決済情報の削除
    _, err = paymentCollection.DeleteMany(ctx, bson.M{"user_id": userID})
    if err != nil {
        utils.LogError("DeleteAccount", err, "Failed to delete payments")
    }

    // 2.3 ユーザー本体の削除
    result, err := userCollection.DeleteOne(ctx, bson.M{"_id": userID})
    if err != nil {
        utils.LogError("DeleteAccount", err, "Failed to delete user")
        c.JSON(http.StatusInternalServerError, gin.H{"error": "アカウントの削除に失敗しました"})
        return
    }

    if result.DeletedCount == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "アカウントが見つかりません"})
        return
    }

    utils.LogInfo("DeleteAccount", "Account deleted successfully: "+userID.Hex())
    c.JSON(http.StatusOK, gin.H{"message": "アカウントを削除しました"})
}
```

---

## チェックリスト

アカウント削除実装時の確認事項：

- [ ] Stripe サブスクリプションの停止を実装
- [ ] Stripe 顧客削除（または無効化）を実装
- [ ] MongoDB 削除順序の遵守（subscriptions → payments → user）
- [ ] エラーハンドリングの実装（部分的失敗への対応）
- [ ] ログへの記録（監査用）
- [ ] PII のマスキング
- [ ] バックアップからの削除手順の文書化
- [ ] 削除前の確認 UI の実装（フロントエンド）
- [ ] 削除完了通知の実装（メール等）

---

## トラブルシューティング

### Stripe 側の削除に失敗した場合

1. エラーログを確認
2. Stripe ダッシュボードで手動確認
3. 必要に応じて手動でキャンセル
4. MongoDB 側の削除は一旦保留（再試行可能な状態にする）

### MongoDB 側の削除に失敗した場合

1. トランザクションロールバック（実装済みの場合）
2. 手動で関連データを確認・削除
3. 整合性チェックスクリプトの実行

---

## 関連ドキュメント

- [GDPR 対応ガイドライン](https://gdpr.eu/)
- [Stripe Customer Deletion API](https://stripe.com/docs/api/customers/delete)
- [個人情報保護法](https://www.ppc.go.jp/)

---

## 更新履歴

- 2025-10-11: 初版作成（セキュリティ強化に伴い作成）
