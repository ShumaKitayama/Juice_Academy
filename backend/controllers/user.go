package controllers

import (
	"context"
	"juice_academy_backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/customer"
	subscriptionapi "github.com/stripe/stripe-go/v72/sub"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DeleteAccountHandler はユーザーのアカウント削除処理を行うハンドラ（Stripe連携対応）
// 詳細は backend/ACCOUNT_DELETION.md を参照
func DeleteAccountHandler(c *gin.Context) {
	// コンテキストからユーザーIDを取得
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証情報が見つかりません"})
		return
	}

	// 文字列をObjectIDに変換
	userID, err := primitive.ObjectIDFromHex(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正なユーザーIDです"})
		return
	}

	ctx := context.Background()

	// === STEP 1: Stripe 側のクリーンアップ ===
	// 詳細: backend/ACCOUNT_DELETION.md 参照

	// 1.1 アクティブなサブスクリプションの停止
	var subscription Subscription
	err = subscriptionCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&subscription)
	if err == nil && subscription.StripeSubscriptionID != "" && subscription.Status == "active" {
		// 即時キャンセル
		params := &stripe.SubscriptionCancelParams{}
		_, err := subscriptionapi.Cancel(subscription.StripeSubscriptionID, params)
		if err != nil {
			utils.LogErrorCtx(c.Request.Context(), "DeleteAccount", err, "Failed to cancel Stripe subscription")
			// サブスクリプション停止失敗は致命的エラー（課金継続を防ぐ）
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "サブスクリプションの停止に失敗しました。カスタマーサポートにお問い合わせください",
			})
			return
		}
		utils.LogInfoCtx(c.Request.Context(), "DeleteAccount", "Stripe subscription cancelled for user: "+userID.Hex())
	}

	// 1.2 Stripe 顧客の削除（オプション）
	var payment Payment
	err = paymentCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&payment)
	if err == nil && payment.StripeCustomerID != "" {
		_, err := customer.Del(payment.StripeCustomerID, nil)
		if err != nil {
			// 顧客削除失敗は警告のみ（継続可能）
			utils.LogWarningCtx(c.Request.Context(), "DeleteAccount", "Failed to delete Stripe customer (continuing): "+err.Error())
		} else {
			utils.LogInfoCtx(c.Request.Context(), "DeleteAccount", "Stripe customer deleted for user: "+userID.Hex())
		}
	}

	// === STEP 2: MongoDB のクリーンアップ ===

	// 2.1 サブスクリプション情報の削除
	_, err = subscriptionCollection.DeleteMany(ctx, bson.M{"user_id": userID})
	if err != nil {
		utils.LogErrorCtx(c.Request.Context(), "DeleteAccount", err, "Failed to delete subscriptions")
		// 警告のみで継続
	}

	// 2.2 決済情報の削除
	_, err = paymentCollection.DeleteMany(ctx, bson.M{"user_id": userID})
	if err != nil {
		utils.LogErrorCtx(c.Request.Context(), "DeleteAccount", err, "Failed to delete payments")
		// 警告のみで継続
	}

	// 2.3 ユーザー本体の削除（最後）
	result, err := userCollection.DeleteOne(ctx, bson.M{"_id": userID})
	if err != nil {
		utils.LogErrorCtx(c.Request.Context(), "DeleteAccount", err, "Failed to delete user")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "アカウントの削除に失敗しました"})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "アカウントが見つかりません"})
		return
	}

	utils.LogInfoCtx(c.Request.Context(), "DeleteAccount", "Account deleted successfully: "+userID.Hex())
	c.JSON(http.StatusOK, gin.H{"message": "アカウントを削除しました"})
}

// SetAdminStatus は特定のユーザーに管理者権限を付与または削除します
// 注: このエンドポイント自体も管理者権限で保護する必要があります
func SetAdminStatus(c *gin.Context) {
	userID := c.Param("id")
	var requestBody struct {
		IsAdmin bool `json:"isAdmin"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なリクエスト形式です"})
		return
	}

	// ObjectID に変換
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なユーザーIDです"})
		return
	}

	// データベースからユーザーを取得して更新
	ctx := context.Background()
	filter := bson.M{"_id": objID}
	update := bson.M{"$set": bson.M{"isAdmin": requestBody.IsAdmin}}

	result, err := userCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の更新に失敗しました"})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "管理者権限が更新されました",
		"userId":  userID,
		"isAdmin": requestBody.IsAdmin,
	})
}
