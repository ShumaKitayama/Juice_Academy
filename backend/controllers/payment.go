package controllers

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/customer"
	"github.com/stripe/stripe-go/v72/paymentmethod"
	"github.com/stripe/stripe-go/v72/setupintent"
	"github.com/stripe/stripe-go/v72/webhook"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var (
	paymentCollection      *mongo.Collection
	subscriptionCollection *mongo.Collection
)

// Payment はMongoDBのpaymentsコレクションのドキュメント構造
type Payment struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID           primitive.ObjectID `bson:"user_id" json:"user_id"`
	StripeCustomerID string             `bson:"stripe_customer_id" json:"stripe_customer_id"`
	HasPaymentMethod bool               `bson:"has_payment_method" json:"has_payment_method"`
	CreatedAt        time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt        time.Time          `bson:"updated_at" json:"updated_at"`
}

// Subscription はMongoDBのsubscriptionsコレクションのドキュメント構造
type Subscription struct {
	ID                   primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID               primitive.ObjectID `bson:"user_id" json:"user_id"`
	StripeCustomerID     string             `bson:"stripe_customer_id" json:"stripe_customer_id"`
	StripeSubscriptionID string             `bson:"stripe_subscription_id" json:"stripe_subscription_id"`
	Status               string             `bson:"status" json:"status"`
	PriceID              string             `bson:"price_id" json:"price_id"`
	CurrentPeriodEnd     time.Time          `bson:"current_period_end" json:"current_period_end"`
	CancelAtPeriodEnd    bool               `bson:"cancel_at_period_end" json:"cancel_at_period_end"`
	CreatedAt            time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt            time.Time          `bson:"updated_at" json:"updated_at"`
}

// InitPaymentCollection はペイメントコレクションを初期化
func InitPaymentCollection(client *mongo.Client) {
	paymentCollection = client.Database("juice_academy").Collection("payments")

	// ルートディレクトリの.envファイルを読み込む
	// 現在のディレクトリから親ディレクトリの.envを探す
	rootEnvPath := filepath.Join("..", ".env")
	err := godotenv.Load(rootEnvPath)
	if err != nil {
		// ルートパスが見つからない場合、カレントディレクトリの.envを試す
		err = godotenv.Load()
		if err != nil {
			log.Println("Warning: .env file not found, using environment variables")
		}
	}

    // Stripe APIキーの設定（秘密鍵を環境変数から取得）
    // 環境変数名は .env.example / docker-compose と揃える
    stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
}

// InitSubscriptionCollection はサブスクリプションコレクションを初期化
func InitSubscriptionCollection(client *mongo.Client) {
	subscriptionCollection = client.Database("juice_academy").Collection("subscriptions")
}

// CreateStripeCustomerHandler はユーザー登録時にStripe顧客を作成するハンドラ
func CreateStripeCustomerHandler(c *gin.Context) {
	// JWTなどからユーザーIDを取得（認証ミドルウェア経由で取得する想定）
	userIDStr := c.GetString("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	// ユーザーIDをObjectIDに変換
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正なユーザーIDです"})
		return
	}

	// ユーザー情報を取得
	var user User
	ctx := context.Background()
	err = userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	// 既存の支払い情報を確認
	var existingPayment Payment
	err = paymentCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&existingPayment)
	if err == nil {
		// 既に支払い情報が存在する場合
		c.JSON(http.StatusOK, gin.H{
			"message":            "既に支払い情報が登録されています",
			"stripe_customer_id": existingPayment.StripeCustomerID,
			"has_payment_method": existingPayment.HasPaymentMethod,
		})
		return
	}

	// Stripeに顧客を作成
	params := &stripe.CustomerParams{
		Email: stripe.String(user.Email),
		Name:  stripe.String(user.NameKana),
	}

	// メタデータをセット
	params.AddMetadata("user_id", userID.Hex())
	params.AddMetadata("student_id", user.StudentID)

	stripeCustomer, err := customer.New(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Stripe顧客の作成に失敗しました"})
		return
	}

	// MongoDB に支払い情報を保存
	now := time.Now()
	payment := Payment{
		UserID:           userID,
		StripeCustomerID: stripeCustomer.ID,
		HasPaymentMethod: false,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	_, err = paymentCollection.InsertOne(ctx, payment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "支払い情報の保存に失敗しました"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":            "Stripe顧客情報を作成しました",
		"stripe_customer_id": stripeCustomer.ID,
	})
}

// SetupIntentHandler はカード登録用のSetupIntentを作成するハンドラ
func SetupIntentHandler(c *gin.Context) {
    // 認証済みユーザーのIDをJWTから取得
    userIDStr := c.GetString("user_id")
    if userIDStr == "" {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
        return
    }

    // ユーザーIDをObjectIDに変換
    userID, err := primitive.ObjectIDFromHex(userIDStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "不正なユーザーIDです"})
        return
    }

	// 支払い情報を取得
	var payment Payment
	ctx := context.Background()
	err = paymentCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&payment)
	if err != nil {
		// 支払い情報が見つからない場合はStripe顧客を作成するよう促す
		c.JSON(http.StatusNotFound, gin.H{"error": "Stripe顧客情報が見つかりません"})
		return
	}

	// SetupIntentを作成
	params := &stripe.SetupIntentParams{
		Customer: stripe.String(payment.StripeCustomerID),
		Usage:    stripe.String("off_session"),
	}

	si, err := setupintent.New(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "SetupIntent作成に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"clientSecret": si.ClientSecret,
	})
}

// ConfirmSetupHandler はカード登録の確認と支払い方法の紐付けを行うハンドラ
func ConfirmSetupHandler(c *gin.Context) {
    // 認証済みユーザーのIDをJWTから取得
    userIDStr := c.GetString("user_id")
    if userIDStr == "" {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
        return
    }

    // リクエストボディ（支払い方法ID）を検証
    var req struct {
        PaymentMethodID string `json:"paymentMethodId" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "不正な入力データです"})
        return
    }

    // ユーザーIDをObjectIDに変換
    userID, err := primitive.ObjectIDFromHex(userIDStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "不正なユーザーIDです"})
        return
    }

	// 支払い情報を取得
	var payment Payment
	ctx := context.Background()
	err = paymentCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&payment)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "支払い情報が見つかりません"})
		return
	}

	// 支払い情報を更新
	update := bson.M{
		"$set": bson.M{
			"has_payment_method": true,
			"updated_at":         time.Now(),
		},
	}

	_, err = paymentCollection.UpdateOne(ctx, bson.M{"user_id": userID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "支払い情報の更新に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "支払い方法が正常に登録されました",
	})
}

// CreateSubscriptionHandler はサブスクリプションを作成するハンドラ
func CreateSubscriptionHandler(c *gin.Context) {
	var req struct {
		UserID  string `json:"userId" binding:"required"`
		PriceID string `json:"priceId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な入力データです"})
		return
	}

	// ユーザーIDをObjectIDに変換
	userID, err := primitive.ObjectIDFromHex(req.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正なユーザーIDです"})
		return
	}

	// 支払い情報を取得
	var payment Payment
	ctx := context.Background()
	err = paymentCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&payment)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "支払い情報が見つかりません"})
		return
	}

	// 支払い方法が登録されているか確認
	if !payment.HasPaymentMethod {
		c.JSON(http.StatusBadRequest, gin.H{"error": "支払い方法が登録されていません"})
		return
	}

	// ユーザーの支払い方法を取得
	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(payment.StripeCustomerID),
		Type:     stripe.String("card"),
	}
	iter := paymentmethod.List(params)

	// 支払い方法があるか確認
	hasPaymentMethod := false
	for iter.Next() {
		hasPaymentMethod = true
		break
	}

	if !hasPaymentMethod {
		c.JSON(http.StatusBadRequest, gin.H{"error": "登録された支払い方法がありません"})
		return
	}

	// 現在の時刻を取得
	now := time.Now()
	// 次回請求日（1ヶ月後）
	nextBillingDate := now.AddDate(0, 1, 0)

	// サブスクリプション情報をDBに保存
	newSubscription := Subscription{
		UserID:               userID,
		StripeCustomerID:     payment.StripeCustomerID,
		StripeSubscriptionID: "sub_" + primitive.NewObjectID().Hex(), // 仮のサブスクリプションID
		Status:               "active",
		PriceID:              req.PriceID,
		CurrentPeriodEnd:     nextBillingDate,
		CancelAtPeriodEnd:    false,
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	// 既存のサブスクリプションを確認
	var existingSub Subscription
	err = subscriptionCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&existingSub)
	if err == nil {
		// 既存のサブスクリプションがある場合はエラー
		c.JSON(http.StatusBadRequest, gin.H{"error": "既にアクティブなサブスクリプションがあります"})
		return
	}

	// 新規サブスクリプションを作成
	_, err = subscriptionCollection.InsertOne(ctx, newSubscription)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サブスクリプション情報の保存に失敗しました: " + err.Error()})
		return
	}

	// 成功レスポンスを返す
	c.JSON(http.StatusOK, gin.H{
		"message": "サブスクリプションが正常に作成されました",
		"subscription": gin.H{
			"id":                 newSubscription.ID.Hex(),
			"status":             newSubscription.Status,
			"current_period_end": newSubscription.CurrentPeriodEnd,
		},
		// フロントエンドでリダイレクトするためのURL
		"redirect": "/subscription/success",
	})
}

// PaymentHistoryHandler は決済履歴を取得するハンドラ
func PaymentHistoryHandler(c *gin.Context) {
	// JWTなどからユーザーIDを取得（認証ミドルウェア経由で取得する想定）
	userIDStr := c.GetString("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	// ユーザーIDをObjectIDに変換
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正なユーザーIDです"})
		return
	}

	// 支払い情報を取得
	var payment Payment
	ctx := context.Background()
	err = paymentCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&payment)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "支払い情報が見つかりません"})
		return
	}

	// サブスクリプション情報を取得
	var subscription Subscription
	err = subscriptionCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&subscription)

	// 決済履歴の配列
	var paymentHistory []gin.H

	// サブスクリプションがある場合
	if err == nil && subscription.Status == "active" {
		// サブスクリプション開始時の決済
		startDate := subscription.CreatedAt

		// 次回請求日までの各月の決済を生成
		currentDate := startDate
		for currentDate.Before(time.Now()) {
			paymentHistory = append(paymentHistory, gin.H{
				"id":          primitive.NewObjectID().Hex(),
				"amount":      3000, // サブスクリプション料金
				"status":      "success",
				"type":        "subscription",
				"created_at":  currentDate,
				"description": "juice学園 月額サブスクリプション",
			})

			// 次の月へ
			currentDate = currentDate.AddDate(0, 1, 0)
		}

		// 未来の予定決済（次回請求日）
		if !subscription.CancelAtPeriodEnd {
			paymentHistory = append(paymentHistory, gin.H{
				"id":          "upcoming",
				"amount":      3000, // サブスクリプション料金
				"status":      "upcoming",
				"type":        "subscription",
				"created_at":  subscription.CurrentPeriodEnd,
				"description": "juice学園 月額サブスクリプション（予定）",
			})
		}
	}

	// 決済履歴がない場合
	if len(paymentHistory) == 0 {
		paymentHistory = append(paymentHistory, gin.H{
			"id":          "setup",
			"amount":      0,
			"status":      "success",
			"type":        "setup",
			"created_at":  payment.CreatedAt,
			"description": "支払い方法の登録",
		})
	}

	// 日付の降順でソート
	sort.Slice(paymentHistory, func(i, j int) bool {
		dateI, okI := paymentHistory[i]["created_at"].(time.Time)
		dateJ, okJ := paymentHistory[j]["created_at"].(time.Time)
		if !okI || !okJ {
			return false
		}
		return dateI.After(dateJ)
	})

	c.JSON(http.StatusOK, gin.H{
		"payment_history": paymentHistory,
	})
}

// GetPaymentMethodsHandler は支払い方法一覧を取得するハンドラ
func GetPaymentMethodsHandler(c *gin.Context) {
	// JWTなどからユーザーIDを取得（認証ミドルウェア経由で取得する想定）
	userIDStr := c.GetString("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	// ユーザーIDをObjectIDに変換
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正なユーザーIDです"})
		return
	}

	// 支払い情報を取得
	var payment Payment
	ctx := context.Background()
	err = paymentCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&payment)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "支払い情報が見つかりません"})
		return
	}

	// Stripe APIを使用して支払い方法一覧を取得
	if payment.StripeCustomerID == "" {
		c.JSON(http.StatusOK, gin.H{"paymentMethods": []string{}})
		return
	}

	// Stripeから支払い方法を取得
	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(payment.StripeCustomerID),
		Type:     stripe.String("card"),
	}

	// 支払い方法一覧を取得
	paymentMethods := []gin.H{}

	i := paymentmethod.List(params)
	for i.Next() {
		pm := i.PaymentMethod()

		// カード情報を整形
		paymentMethod := gin.H{
			"id": pm.ID,
			"card": gin.H{
				"brand":     string(pm.Card.Brand),
				"last4":     pm.Card.Last4,
				"exp_month": pm.Card.ExpMonth,
				"exp_year":  pm.Card.ExpYear,
			},
			"isDefault": true, // 現状では最初のカードをデフォルトとして扱う
		}

		paymentMethods = append(paymentMethods, paymentMethod)
	}

	c.JSON(http.StatusOK, gin.H{"paymentMethods": paymentMethods})
}

// DeletePaymentMethodHandler は支払い方法を削除するハンドラ
func DeletePaymentMethodHandler(c *gin.Context) {
	// JWTなどからユーザーIDを取得（認証ミドルウェア経由で取得する想定）
	userIDStr := c.GetString("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	// ユーザーIDをObjectIDに変換
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正なユーザーIDです"})
		return
	}

	// 支払い方法IDをパスパラメータから取得
	paymentMethodID := c.Param("id")
	if paymentMethodID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "支払い方法IDが必要です"})
		return
	}

	// 支払い情報を取得
	var payment Payment
	ctx := context.Background()
	err = paymentCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&payment)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "支払い情報が見つかりません"})
		return
	}

	// Stripe APIを使用して支払い方法を削除
	if payment.StripeCustomerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Stripe顧客IDが見つかりません"})
		return
	}

	// Stripeから支払い方法を取得
	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(payment.StripeCustomerID),
		Type:     stripe.String("card"),
	}

	// 支払い方法一覧を取得
	found := false

	i := paymentmethod.List(params)
	for i.Next() {
		pm := i.PaymentMethod()
		if pm.ID == paymentMethodID {
			// 支払い方法をデタッチ（削除）
			detachParams := &stripe.PaymentMethodDetachParams{}
			_, err := paymentmethod.Detach(paymentMethodID, detachParams)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "支払い方法の削除に失敗しました: " + err.Error()})
				return
			}
			found = true
			break
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "指定された支払い方法が見つかりません"})
		return
	}

	// 支払い方法が削除されたら、ユーザーの支払い方法フラグを更新
	// 残りの支払い方法があるかチェック
	remainingParams := &stripe.PaymentMethodListParams{
		Customer: stripe.String(payment.StripeCustomerID),
		Type:     stripe.String("card"),
	}

	remainingIter := paymentmethod.List(remainingParams)
	hasRemainingPaymentMethods := remainingIter.Next()

	// 支払い方法がなくなった場合のみフラグを更新
	if !hasRemainingPaymentMethods {
		update := bson.M{
			"$set": bson.M{
				"has_payment_method": false,
				"updated_at":         time.Now(),
			},
		}
		_, err = paymentCollection.UpdateOne(ctx, bson.M{"user_id": userID}, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "支払い情報の更新に失敗しました"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "支払い方法が正常に削除されました"})
}

// StripeWebhookHandler はStripeからのWebhookイベントを処理するハンドラ
func StripeWebhookHandler(c *gin.Context) {
	// リクエストボディを読み込む
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストボディの読み込みに失敗しました"})
		return
	}

	// Webhookシークレットを環境変数から取得
	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if webhookSecret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Webhookシークレットが設定されていません"})
		return
	}

	// イベントを検証
	event, err := webhook.ConstructEvent(body, c.GetHeader("Stripe-Signature"), webhookSecret)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Webhookの署名検証に失敗しました: " + err.Error()})
		return
	}

	// イベントタイプに応じて処理を分岐
	switch event.Type {
	case "checkout.session.completed":
		// Checkout Sessionが完了した場合の処理
		var checkoutSession stripe.CheckoutSession
		err := json.Unmarshal(event.Data.Raw, &checkoutSession)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "イベントデータの解析に失敗しました"})
			return
		}

		// サブスクリプションモードの場合のみ処理
		if checkoutSession.Mode == "subscription" && checkoutSession.Subscription != nil {
			// ユーザーIDを取得
			userID, err := primitive.ObjectIDFromHex(checkoutSession.ClientReferenceID)
			if err != nil {
				log.Printf("不正なユーザーID: %v", err)
				c.JSON(http.StatusOK, gin.H{"received": true}) // エラーでもStripeには200を返す
				return
			}

			// サブスクリプション情報を取得
			// 注意: 実際の実装ではStripe APIを使用してサブスクリプション情報を取得する必要があります
			// ここではダミーデータを使用します
			now := time.Now()
			nextMonth := now.AddDate(0, 1, 0)

			// サブスクリプション情報をDBに保存
			ctx := context.Background()
			newSubscription := Subscription{
				UserID:               userID,
				StripeCustomerID:     checkoutSession.Customer.ID,
				StripeSubscriptionID: checkoutSession.Subscription.ID,
				Status:               "active",
				PriceID:              "price_monthly", // 実際のプランIDに置き換える
				CurrentPeriodEnd:     nextMonth,
				CancelAtPeriodEnd:    false,
				CreatedAt:            now,
				UpdatedAt:            now,
			}

			// 既存のサブスクリプションを確認
			var existingSub Subscription
			err = subscriptionCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&existingSub)
			if err == nil {
				// 既存のサブスクリプションがある場合は更新
				update := bson.M{
					"$set": bson.M{
						"stripe_subscription_id": checkoutSession.Subscription.ID,
						"status":                 "active",
						"price_id":               "price_monthly", // 実際のプランIDに置き換える
						"current_period_end":     nextMonth,
						"cancel_at_period_end":   false,
						"updated_at":             now,
					},
				}
				_, err = subscriptionCollection.UpdateOne(ctx, bson.M{"user_id": userID}, update)
			} else {
				// 新規サブスクリプションを作成
				_, err = subscriptionCollection.InsertOne(ctx, newSubscription)
			}

			if err != nil {
				log.Printf("サブスクリプション情報の保存に失敗: %v", err)
			}
		}

	case "customer.subscription.updated":
		// サブスクリプションが更新された場合の処理
		var sub stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &sub)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "イベントデータの解析に失敗しました"})
			return
		}

		// DBからサブスクリプションを検索
		ctx := context.Background()
		update := bson.M{
			"$set": bson.M{
				"status":               string(sub.Status),
				"current_period_end":   time.Unix(sub.CurrentPeriodEnd, 0),
				"cancel_at_period_end": sub.CancelAtPeriodEnd,
				"updated_at":           time.Now(),
			},
		}
		_, err = subscriptionCollection.UpdateOne(ctx, bson.M{"stripe_subscription_id": sub.ID}, update)
		if err != nil {
			log.Printf("サブスクリプション情報の更新に失敗: %v", err)
		}

	case "customer.subscription.deleted":
		// サブスクリプションが削除された場合の処理
		var sub stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &sub)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "イベントデータの解析に失敗しました"})
			return
		}

		// DBからサブスクリプションを更新
		ctx := context.Background()
		update := bson.M{
			"$set": bson.M{
				"status":     "canceled",
				"updated_at": time.Now(),
			},
		}
		_, err = subscriptionCollection.UpdateOne(ctx, bson.M{"stripe_subscription_id": sub.ID}, update)
		if err != nil {
			log.Printf("サブスクリプション情報の更新に失敗: %v", err)
		}
	}

	// Stripeに正常応答を返す
	c.JSON(http.StatusOK, gin.H{"received": true})
}

// CancelSubscriptionHandler はサブスクリプションをキャンセルするハンドラ
func CancelSubscriptionHandler(c *gin.Context) {
	// JWTなどからユーザーIDを取得（認証ミドルウェア経由で取得する想定）
	userIDStr := c.GetString("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	// ユーザーIDをObjectIDに変換
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正なユーザーIDです"})
		return
	}

	// サブスクリプション情報を取得
	var sub Subscription
	ctx := context.Background()
	err = subscriptionCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&sub)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "サブスクリプション情報が見つかりません"})
		return
	}

	// Stripeでサブスクリプションをキャンセル（次回更新時）
	// 注意: 実際の実装ではStripe APIを使用してサブスクリプションをキャンセルする必要があります
	// ここではDBの更新のみを行います

	// DBのサブスクリプション情報を更新
	update := bson.M{
		"$set": bson.M{
			"cancel_at_period_end": true,
			"updated_at":           time.Now(),
		},
	}
	_, err = subscriptionCollection.UpdateOne(ctx, bson.M{"user_id": userID}, update)
	if err != nil {
		log.Printf("サブスクリプション情報の更新に失敗: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サブスクリプション情報の更新に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "サブスクリプションは次回更新時にキャンセルされます",
	})
}

// GetSubscriptionStatusHandler はサブスクリプションの状態を取得するハンドラ
func GetSubscriptionStatusHandler(c *gin.Context) {
	// JWTなどからユーザーIDを取得（認証ミドルウェア経由で取得する想定）
	userIDStr := c.GetString("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	// ユーザーIDをObjectIDに変換
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正なユーザーIDです"})
		return
	}

	// サブスクリプション情報を取得
	var sub Subscription
	ctx := context.Background()
	err = subscriptionCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&sub)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "サブスクリプション情報が見つかりません"})
		return
	}

	// サブスクリプション情報を返す
	c.JSON(http.StatusOK, gin.H{
		"subscription": sub,
	})
}
