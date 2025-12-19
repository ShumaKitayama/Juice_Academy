package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"juice_academy_backend/utils"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/customer"
	"github.com/stripe/stripe-go/v72/invoice"
	"github.com/stripe/stripe-go/v72/paymentmethod"
	"github.com/stripe/stripe-go/v72/promotioncode"
	"github.com/stripe/stripe-go/v72/setupintent"
	subscriptionapi "github.com/stripe/stripe-go/v72/sub"
	"github.com/stripe/stripe-go/v72/webhook"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var (
	paymentCollection      *mongo.Collection
	subscriptionCollection *mongo.Collection
	stripeEventCollection  *mongo.Collection
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

// StripeEvent はWebhook冪等性管理用のドキュメント構造
type StripeEvent struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	EventID    string             `bson:"event_id" json:"event_id"`
	EventType  string             `bson:"event_type" json:"event_type"`
	ReceivedAt time.Time          `bson:"received_at" json:"received_at"`
}

// InitPaymentCollection はペイメントコレクションを初期化
func InitPaymentCollection(client *mongo.Client) {
	paymentCollection = client.Database("juice_academy").Collection("payments")

	// 本番での.env読込は行わない（誤設定・流出防止）。開発時のみ許可。
	if os.Getenv("APP_ENV") != "production" {
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
	}

	// Stripe APIキーの設定（秘密鍵を環境変数から取得）
	// 環境変数名は .env.example / docker-compose と揃える
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
}

// InitSubscriptionCollection はサブスクリプションコレクションを初期化
func InitSubscriptionCollection(client *mongo.Client) {
	subscriptionCollection = client.Database("juice_academy").Collection("subscriptions")
}

// InitStripeEventCollection はStripeイベントコレクションを初期化（Webhook冪等性管理）
func InitStripeEventCollection(client *mongo.Client) {
	stripeEventCollection = client.Database("juice_academy").Collection("stripe_events")
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
		// 既に支払い情報が存在する場合（セキュリティ: customer_idは返さない）
		c.JSON(http.StatusOK, gin.H{
			"message":            "既に支払い情報が登録されています",
			"has_payment_method": existingPayment.HasPaymentMethod,
		})
		return
	}

	// Stripe側で既存の顧客を検索（メールアドレスで検索）
	var stripeCustomer *stripe.Customer
	customerListParams := &stripe.CustomerListParams{}
	customerListParams.Email = stripe.String(user.Email)
	customerListParams.Limit = stripe.Int64(10) // 複数の顧客が存在する可能性を考慮

	customerIter := customer.List(customerListParams)
	foundValidCustomer := false

	// メールアドレスが一致する顧客の中から、このユーザーに紐づいている顧客を探す
	for customerIter.Next() {
		existingCustomer := customerIter.Customer()

		// メタデータにuser_idが含まれている場合、それが現在のユーザーと一致するかチェック
		if metaUserID, exists := existingCustomer.Metadata["user_id"]; exists {
			if metaUserID == userID.Hex() {
				// 現在のユーザーに紐づいている顧客を見つけた
				stripeCustomer = existingCustomer
				foundValidCustomer = true
				utils.LogInfoCtx(c.Request.Context(), "CreateStripeCustomer", "Found existing Stripe customer: "+stripeCustomer.ID+" for user: "+userID.Hex())

				// 名前とstudent_idを最新情報に更新
				updateParams := &stripe.CustomerParams{}
				if user.NameKana != "" && user.NameKana != existingCustomer.Name {
					updateParams.Name = stripe.String(user.NameKana)
				}
				if user.StudentID != "" {
					updateParams.AddMetadata("student_id", user.StudentID)
				}

				if updateParams.Name != nil || len(updateParams.Metadata) > 0 {
					_, err = customer.Update(stripeCustomer.ID, updateParams)
					if err != nil {
						utils.LogWarningCtx(c.Request.Context(), "CreateStripeCustomer", "Failed to update customer info: "+err.Error())
					}
				}
				break
			} else {
				// 同じメールアドレスだが別のユーザーに紐づいている顧客（通常は起こらないはず）
				utils.LogWarningCtx(c.Request.Context(), "CreateStripeCustomer",
					"Found customer "+existingCustomer.ID+" with same email but different user_id (expected: "+userID.Hex()+", got: "+metaUserID+")")
			}
		}
		// メタデータにuser_idがない場合は、古いデータの可能性があるのでスキップ
	}

	// イテレータのエラーをチェック（Stripe APIの一時的なエラーなどを検出）
	if err := customerIter.Err(); err != nil {
		utils.LogErrorCtx(c.Request.Context(), "CreateStripeCustomer", err, "Failed to iterate over Stripe customers")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Stripe顧客の検索に失敗しました"})
		return
	}

	if !foundValidCustomer {
		// 既存の顧客が見つからない場合、新規作成
		params := &stripe.CustomerParams{
			Email: stripe.String(user.Email),
			Name:  stripe.String(user.NameKana),
		}

		// メタデータをセット
		params.AddMetadata("user_id", userID.Hex())
		params.AddMetadata("student_id", user.StudentID)

		// Idempotency keyを設定（同時リクエスト対策）
		idempotencyKey := "customer-create:" + userID.Hex()
		params.SetIdempotencyKey(idempotencyKey)

		stripeCustomer, err = customer.New(params)
		if err != nil {
			utils.LogErrorCtx(c.Request.Context(), "CreateStripeCustomer", err, "Failed to create Stripe customer")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Stripe顧客の作成に失敗しました"})
			return
		}
		utils.LogInfoCtx(c.Request.Context(), "CreateStripeCustomer", "Created new Stripe customer: "+stripeCustomer.ID+" for email: "+user.Email)
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
		// レースコンディション対策: 重複キーエラーの場合は既存レコードを確認
		if mongo.IsDuplicateKeyError(err) {
			utils.LogInfoCtx(c.Request.Context(), "CreateStripeCustomer", "Duplicate key detected, checking existing record for user: "+userID.Hex())

			// 既存レコードを再取得
			var existingPaymentAfterInsert Payment
			err = paymentCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&existingPaymentAfterInsert)
			if err != nil {
				utils.LogErrorCtx(c.Request.Context(), "CreateStripeCustomer", err, "Failed to retrieve existing payment after duplicate key error")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "支払い情報の確認に失敗しました"})
				return
			}

			// Stripe顧客IDが一致しているか確認（データ整合性チェック）
			if existingPaymentAfterInsert.StripeCustomerID != stripeCustomer.ID {
				utils.LogErrorCtx(c.Request.Context(), "CreateStripeCustomer", nil,
					"Data inconsistency detected: MongoDB has different Stripe customer ID (expected: "+stripeCustomer.ID+", got: "+existingPaymentAfterInsert.StripeCustomerID+")")
				c.JSON(http.StatusConflict, gin.H{"error": "支払い情報の不整合が検出されました。サポートにお問い合わせください"})
				return
			}

			// Stripe顧客IDが一致している場合は成功として扱う
			utils.LogInfoCtx(c.Request.Context(), "CreateStripeCustomer", "Existing payment record matches Stripe customer, returning success for user: "+userID.Hex())
			c.JSON(http.StatusOK, gin.H{
				"message":            "Stripe顧客情報は既に登録されています",
				"has_payment_method": existingPaymentAfterInsert.HasPaymentMethod,
			})
			return
		}

		// その他のエラーの場合
		utils.LogErrorCtx(c.Request.Context(), "CreateStripeCustomer", err, "Failed to save payment info to DB")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "支払い情報の保存に失敗しました"})
		return
	}

	// セキュリティ: stripe_customer_id は返さない（内部管理のみ）
	utils.LogInfoCtx(c.Request.Context(), "CreateStripeCustomer", "Customer created successfully for user: "+userID.Hex())
	c.JSON(http.StatusCreated, gin.H{
		"message": "Stripe顧客情報を作成しました",
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

	// Stripe上で支払い方法を顧客に紐づけ
	// Attachが成功しない限り、デフォルト設定には進まない（アトミック性を保証）
	attachParams := &stripe.PaymentMethodAttachParams{
		Customer: stripe.String(payment.StripeCustomerID),
	}
	_, err = paymentmethod.Attach(req.PaymentMethodID, attachParams)
	if err != nil {
		// 既にアタッチ済みの場合のみ続行を許可
		errorMsg := strings.ToLower(err.Error())
		isAlreadyAttached := strings.Contains(errorMsg, "already attached") ||
			strings.Contains(errorMsg, "already exists")

		if !isAlreadyAttached {
			// アタッチに失敗した場合はエラーを返す（アトミック性を保証）
			utils.LogErrorCtx(c.Request.Context(), "ConfirmSetup", err, "Failed to attach payment method to customer")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "支払い方法の紐付けに失敗しました"})
			return
		}

		// すでにアタッチ済みの場合は警告ログを出力して続行
		utils.LogWarningCtx(c.Request.Context(), "ConfirmSetup", "PaymentMethod already attached, continuing")
	}

	// Attachが成功した（または既にアタッチ済み）場合のみ、デフォルト支払い方法に設定
	custParams := &stripe.CustomerParams{}
	custParams.InvoiceSettings = &stripe.CustomerInvoiceSettingsParams{DefaultPaymentMethod: stripe.String(req.PaymentMethodID)}
	if _, err := customer.Update(payment.StripeCustomerID, custParams); err != nil {
		utils.LogErrorCtx(c.Request.Context(), "ConfirmSetup", err, "Failed to update customer default payment method")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "デフォルト支払い方法の設定に失敗しました"})
		return
	}

	// DBを更新
	update := bson.M{
		"$set": bson.M{
			"has_payment_method": true,
			"updated_at":         time.Now(),
		},
	}
	if _, err := paymentCollection.UpdateOne(ctx, bson.M{"user_id": userID}, update); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "支払い情報の更新に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "支払い方法が正常に登録されました"})
}

// CreateSubscriptionHandler はサブスクリプションを作成するハンドラ
func CreateSubscriptionHandler(c *gin.Context) {
	var req struct {
		PriceID string `json:"priceId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な入力データです"})
		return
	}

	// ユーザーIDはJWTから取得（クライアントからの入力は信用しない）
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

	// 許可された価格IDの検証
	allowedPriceIDs := []string{
		os.Getenv("VITE_STRIPE_PRICE_ID_MONTHLY"),
		os.Getenv("VITE_STRIPE_PRICE_ID_YEARLY"),
		os.Getenv("VITE_STRIPE_PRICE_ID_2YEARS"),
	}

	isAllowed := false
	for _, id := range allowedPriceIDs {
		if id != "" && req.PriceID == id {
			isAllowed = true
			break
		}
	}

	if !isAllowed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効な価格IDです"})
		return
	}

	// 既存サブスクリプションを確認
	var existingSub Subscription
	ctx := context.Background()
	err = subscriptionCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&existingSub)
	if err == nil {
		// アクティブまたは試用期間中のサブスクリプションがある場合
		if existingSub.Status == "active" || existingSub.Status == "trialing" {
			// 解約予約中（CancelAtPeriodEnd == true）の場合は更新処理を行う
			if existingSub.CancelAtPeriodEnd {
				handleSubscriptionResumeOrUpdate(c, ctx, existingSub, req.PriceID)
				return
			}

			utils.LogWarningCtx(c.Request.Context(), "CreateSubscription", "User already has an active subscription: "+existingSub.StripeSubscriptionID)
			c.JSON(http.StatusBadRequest, gin.H{"error": "既にアクティブなサブスクリプションがあります"})
			return
		}
		// 不完全またはキャンセル済みのサブスクリプションがある場合は削除
		if existingSub.Status == "incomplete" || existingSub.Status == "canceled" || existingSub.Status == "incomplete_expired" {
			utils.LogInfoCtx(c.Request.Context(), "CreateSubscription", "Removing old subscription with status: "+existingSub.Status)

			// Stripe上でもサブスクリプションをキャンセル（念のため）
			// ※再契約時に過去のサブスクリプションがStripeに残っていても、新しいサブスクリプションを作成するので問題ないが、
			//   状態をクリーンにするためにキャンセル処理を試みる
			if existingSub.StripeSubscriptionID != "" {
				// 既にキャンセル済みの場合はエラーになる可能性があるため、エラーログのみ出力して続行
				_, cancelErr := subscriptionapi.Cancel(existingSub.StripeSubscriptionID, nil)
				if cancelErr != nil {
					utils.LogWarningCtx(c.Request.Context(), "CreateSubscription", "Failed to cancel old subscription on Stripe (might already be canceled): "+cancelErr.Error())
				} else {
					utils.LogInfoCtx(c.Request.Context(), "CreateSubscription", "Canceled old subscription on Stripe: "+existingSub.StripeSubscriptionID)
				}
			}

			// DBから削除
			_, delErr := subscriptionCollection.DeleteOne(ctx, bson.M{"user_id": userID})
			if delErr != nil {
				utils.LogWarningCtx(c.Request.Context(), "CreateSubscription", "Failed to delete old subscription from DB: "+delErr.Error())
				// DB削除に失敗した場合、後続の新規登録で重複エラーになる可能性があるためここでリターン
				c.JSON(http.StatusInternalServerError, gin.H{"error": "古いサブスクリプション情報の削除に失敗しました"})
				return
			}
		}
	}

	// 支払い情報を取得
	var payment Payment
	err = paymentCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&payment)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "支払い情報が見つかりません"})
		return
	}

	// Stripe上の支払い方法確認（最低1件必要）
	pmList := paymentmethod.List(&stripe.PaymentMethodListParams{Customer: stripe.String(payment.StripeCustomerID), Type: stripe.String("card")})
	hasPM := pmList.Next()

	// イテレータのエラーをチェック
	if err := pmList.Err(); err != nil {
		utils.LogErrorCtx(c.Request.Context(), "CreateSubscription", err, "Failed to list payment methods")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "支払い方法の確認に失敗しました"})
		return
	}

	if !hasPM {
		c.JSON(http.StatusBadRequest, gin.H{"error": "登録された支払い方法がありません"})
		return
	}

	// Stripeでサブスクリプション作成
	sparams := &stripe.SubscriptionParams{
		Customer: stripe.String(payment.StripeCustomerID),
		Items: []*stripe.SubscriptionItemsParams{
			{Price: stripe.String(req.PriceID)},
		},
	}
	// 支払い方法が不完全な場合はエラーを返す（デフォルト支払い方法が設定済みなのですぐにアクティブになる）
	sparams.PaymentBehavior = stripe.String("error_if_incomplete")
	sparams.AddExpand("latest_invoice.payment_intent")

	// Idempotency key (user + customer + price) for safe retries
	idempotencyKey := fmt.Sprintf("sub-create:%s:%s:%s", userID.Hex(), payment.StripeCustomerID, req.PriceID)
	sparams.SetIdempotencyKey(idempotencyKey)

	subRes, err := subscriptionapi.New(sparams)
	if err != nil {
		utils.LogErrorCtx(c.Request.Context(), "CreateSubscription", err, "Failed to create subscription in Stripe")
		// セキュリティ: 本番環境では詳細エラーメッセージを隠す
		errMsg := "サブスクリプションの作成に失敗しました"
		if os.Getenv("APP_ENV") != "production" {
			errMsg += ": " + err.Error()
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
		return
	}

	now := time.Now()
	// DBへ保存（作成結果に基づく）
	newSub := Subscription{
		UserID:               userID,
		StripeCustomerID:     payment.StripeCustomerID,
		StripeSubscriptionID: subRes.ID,
		Status:               string(subRes.Status),
		PriceID:              req.PriceID,
		CurrentPeriodEnd:     time.Unix(subRes.CurrentPeriodEnd, 0),
		CancelAtPeriodEnd:    subRes.CancelAtPeriodEnd,
		CreatedAt:            now,
		UpdatedAt:            now,
	}
	if _, err := subscriptionCollection.InsertOne(ctx, newSub); err != nil {
		utils.LogErrorCtx(c.Request.Context(), "CreateSubscription", err, "Failed to save subscription to database")
		// セキュリティ: 本番環境では詳細エラーメッセージを隠す
		errMsg := "サブスクリプション情報の保存に失敗しました"
		if os.Getenv("APP_ENV") != "production" {
			errMsg += ": " + err.Error()
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
		return
	}

	utils.LogInfoCtx(c.Request.Context(), "CreateSubscription", "Successfully created subscription for user: "+userID.Hex()+" with status: "+string(subRes.Status))

	// レスポンス: 必要ならフロントでPaymentIntentを処理可能
	resp := gin.H{
		"message": "サブスクリプションが正常に作成されました",
		"subscription": gin.H{
			"id":                   newSub.StripeSubscriptionID,
			"status":               newSub.Status,
			"current_period_end":   newSub.CurrentPeriodEnd,
			"cancel_at_period_end": newSub.CancelAtPeriodEnd,
		},
		"redirect": "/subscription/success",
	}
	if subRes.LatestInvoice != nil && subRes.LatestInvoice.PaymentIntent != nil {
		resp["payment_intent_client_secret"] = subRes.LatestInvoice.PaymentIntent.ClientSecret
	}
	c.JSON(http.StatusOK, resp)
}

// PaymentHistoryHandler は決済履歴を取得するハンドラ
// 重要: Stripeの実際のInvoice（請求書）データから履歴を取得する
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

	// Stripe顧客IDが存在しない場合は空の履歴を返す
	if payment.StripeCustomerID == "" {
		c.JSON(http.StatusOK, gin.H{
			"payment_history": []gin.H{},
		})
		return
	}

	// 決済履歴の配列
	var paymentHistory []gin.H

	// =================================================================
	// Stripeの実際のInvoice（請求書）を取得して表示
	// これが実際に課金された/課金予定の正確なデータ
	// =================================================================
	invoiceParams := &stripe.InvoiceListParams{
		Customer: stripe.String(payment.StripeCustomerID),
	}
	invoiceParams.Limit = stripe.Int64(100) // 最大100件取得

	invoiceIter := invoice.List(invoiceParams)
	for invoiceIter.Next() {
		inv := invoiceIter.Invoice()

		// Invoice のステータスを判定
		var status string
		switch inv.Status {
		case stripe.InvoiceStatusPaid:
			status = "success"
		case stripe.InvoiceStatusOpen:
			status = "pending"
		case stripe.InvoiceStatusDraft:
			status = "draft"
		case stripe.InvoiceStatusUncollectible:
			status = "failed"
		case stripe.InvoiceStatusVoid:
			status = "voided"
		default:
			status = string(inv.Status)
		}

		// 金額（Stripeは最小単位で保存しているため、JPYの場合はそのまま）
		amount := inv.AmountPaid
		if amount == 0 {
			amount = inv.AmountDue
		}

		// 請求書の説明を生成
		description := "juice学園 月額サブスクリプション"
		if inv.Description != "" {
			description = inv.Description
		} else if len(inv.Lines.Data) > 0 && inv.Lines.Data[0].Description != "" {
			description = inv.Lines.Data[0].Description
		}

		// 請求日の取得（Created または PeriodStart）
		var createdAt time.Time
		if inv.Created > 0 {
			createdAt = time.Unix(inv.Created, 0)
		} else {
			createdAt = time.Now()
		}

		paymentHistory = append(paymentHistory, gin.H{
			"id":          inv.ID,
			"amount":      amount,
			"status":      status,
			"type":        "subscription",
			"created_at":  createdAt,
			"description": description,
			// 追加情報（デバッグ/確認用）
			"stripe_status":  string(inv.Status),
			"invoice_number": inv.Number,
		})
	}

	// イテレータのエラーをチェック
	if err := invoiceIter.Err(); err != nil {
		utils.LogErrorCtx(c.Request.Context(), "PaymentHistory", err, "Failed to fetch invoices from Stripe")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "決済履歴の取得に失敗しました"})
		return
	}

	// =================================================================
	// 次回請求予定の取得（キャンセルされていないサブスクリプションの場合）
	// =================================================================
	var subscription Subscription
	err = subscriptionCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&subscription)
	if err == nil && (subscription.Status == "active" || subscription.Status == "trialing") && !subscription.CancelAtPeriodEnd {
		// Stripeから最新のサブスクリプション情報を取得して確認
		if subscription.StripeSubscriptionID != "" {
			stripeSub, stripeErr := subscriptionapi.Get(subscription.StripeSubscriptionID, nil)
			if stripeErr == nil && !stripeSub.CancelAtPeriodEnd && stripeSub.Status == stripe.SubscriptionStatusActive {
				// 未来の予定決済を追加
				paymentHistory = append(paymentHistory, gin.H{
					"id":          "upcoming",
					"amount":      3000, // TODO: Stripeから実際の次回請求額を取得
					"status":      "upcoming",
					"type":        "subscription",
					"created_at":  time.Unix(stripeSub.CurrentPeriodEnd, 0),
					"description": "juice学園 月額サブスクリプション（次回請求予定）",
				})
			}
		}
	}

	// 決済履歴がない場合
	if len(paymentHistory) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"payment_history": []gin.H{},
		})
		return
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

	// イテレータのエラーをチェック
	if err := i.Err(); err != nil {
		utils.LogErrorCtx(c.Request.Context(), "GetPaymentMethods", err, "Failed to iterate over payment methods")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "支払い方法の取得に失敗しました"})
		return
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
				// セキュリティ: 本番環境では詳細エラーメッセージを隠す
				errMsg := "支払い方法の削除に失敗しました"
				if os.Getenv("APP_ENV") != "production" {
					errMsg += ": " + err.Error()
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
				return
			}
			found = true
			break
		}
	}

	// イテレータのエラーをチェック
	if err := i.Err(); err != nil {
		utils.LogErrorCtx(c.Request.Context(), "DeletePaymentMethod", err, "Failed to iterate over payment methods")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "支払い方法の検索に失敗しました"})
		return
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

	// イテレータのエラーをチェック
	if err := remainingIter.Err(); err != nil {
		utils.LogErrorCtx(c.Request.Context(), "DeletePaymentMethod", err, "Failed to check remaining payment methods")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "支払い方法の確認に失敗しました"})
		return
	}

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
		utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Failed to read request body")
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストボディの読み込みに失敗しました"})
		return
	}

	// Webhookシークレットを環境変数から取得
	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if webhookSecret == "" {
		utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Webhook secret not configured")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Webhookシークレットが設定されていません"})
		return
	}

	// イベントを検証
	// セキュリティ強化: 署名検証によりなりすましWebhookを防止
	// stripe-go v72 では ConstructEvent がデフォルトで5分のtoleranceを持つ
	event, err := webhook.ConstructEvent(body, c.GetHeader("Stripe-Signature"), webhookSecret)
	if err != nil {
		utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Webhook signature verification failed")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Webhookの署名検証に失敗しました"})
		return
	}

	// 冪等性チェック: 同じイベントIDが既に処理されていないか確認
	ctx := context.Background()
	stripeEvent := StripeEvent{
		EventID:    event.ID,
		EventType:  string(event.Type),
		ReceivedAt: time.Now(),
	}

	_, err = stripeEventCollection.InsertOne(ctx, stripeEvent)
	if err != nil {
		// duplicate key error の場合は既に処理済み
		if mongo.IsDuplicateKeyError(err) {
			utils.LogInfoCtx(c.Request.Context(), "StripeWebhook", "Event already processed: "+event.ID)
			c.JSON(http.StatusOK, gin.H{"received": true, "message": "already processed"})
			return
		}
		// その他のエラー
		utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Failed to record event")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "イベント記録に失敗しました"})
		return
	}

	utils.LogInfoCtx(c.Request.Context(), "StripeWebhook", "Processing event: "+event.ID+" type: "+string(event.Type))

	// イベントタイプに応じて処理を分岐
	switch event.Type {
	case "checkout.session.completed":
		// Checkout Sessionが完了した場合の処理
		var checkoutSession stripe.CheckoutSession
		err := json.Unmarshal(event.Data.Raw, &checkoutSession)
		if err != nil {
			utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Failed to parse checkout session data")
			c.JSON(http.StatusBadRequest, gin.H{"error": "イベントデータの解析に失敗しました"})
			return
		}

		// サブスクリプションモードの場合のみ処理
		if checkoutSession.Mode == "subscription" && checkoutSession.Subscription != nil {
			// ユーザーIDを取得
			userID, err := primitive.ObjectIDFromHex(checkoutSession.ClientReferenceID)
			if err != nil {
				utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Invalid user ID in checkout session")
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
				utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Failed to save subscription info")
			}
		}

	case "customer.subscription.updated":
		// サブスクリプションが更新された場合の処理
		var sub stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &sub)
		if err != nil {
			utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Failed to parse subscription data")
			c.JSON(http.StatusBadRequest, gin.H{"error": "イベントデータの解析に失敗しました"})
			return
		}

		// DBからサブスクリプションを検索
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
			utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Failed to update subscription")
		}

	case "customer.subscription.deleted":
		// サブスクリプションが削除された場合の処理
		var sub stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &sub)
		if err != nil {
			utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Failed to parse subscription data")
			c.JSON(http.StatusBadRequest, gin.H{"error": "イベントデータの解析に失敗しました"})
			return
		}

		utils.LogInfoCtx(c.Request.Context(), "StripeWebhook", "Subscription deleted: "+sub.ID)

		// DBからサブスクリプションを更新
		update := bson.M{
			"$set": bson.M{
				"status":               "canceled",
				"cancel_at_period_end": true,
				"updated_at":           time.Now(),
			},
		}
		_, err = subscriptionCollection.UpdateOne(ctx, bson.M{"stripe_subscription_id": sub.ID}, update)
		if err != nil {
			utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Failed to update subscription status")
		}

	// =================================================================
	// 請求書（Invoice）関連のイベント処理
	// 実際の決済の成功・失敗を追跡するために重要
	// =================================================================
	case "invoice.paid":
		// 請求書が支払われた場合
		var inv stripe.Invoice
		err := json.Unmarshal(event.Data.Raw, &inv)
		if err != nil {
			utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Failed to parse invoice data")
			c.JSON(http.StatusBadRequest, gin.H{"error": "イベントデータの解析に失敗しました"})
			return
		}

		utils.LogInfoCtx(c.Request.Context(), "StripeWebhook", 
			fmt.Sprintf("Invoice paid: %s, Amount: %d, Customer: %s", inv.ID, inv.AmountPaid, inv.Customer.ID))

		// サブスクリプションに関連する請求の場合
		if inv.Subscription != nil {
			// サブスクリプションの状態を確認
			var sub Subscription
			err = subscriptionCollection.FindOne(ctx, bson.M{"stripe_subscription_id": inv.Subscription.ID}).Decode(&sub)
			if err == nil {
				// キャンセル予約済みのサブスクリプションへの課金を検出・警告
				if sub.CancelAtPeriodEnd {
					utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", nil,
						fmt.Sprintf("WARNING: Payment processed for subscription marked as cancel_at_period_end! "+
							"Subscription: %s, Invoice: %s, Amount: %d. This may require investigation.",
							inv.Subscription.ID, inv.ID, inv.AmountPaid))
				}
			}
		}

	case "invoice.payment_failed":
		// 請求書の支払いが失敗した場合
		var inv stripe.Invoice
		err := json.Unmarshal(event.Data.Raw, &inv)
		if err != nil {
			utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Failed to parse invoice data")
			c.JSON(http.StatusBadRequest, gin.H{"error": "イベントデータの解析に失敗しました"})
			return
		}

		utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", nil,
			fmt.Sprintf("Invoice payment FAILED: %s, Amount: %d, Customer: %s", inv.ID, inv.AmountDue, inv.Customer.ID))

		// サブスクリプションの状態を更新（past_due などにする可能性）
		if inv.Subscription != nil {
			update := bson.M{
				"$set": bson.M{
					"status":     "past_due",
					"updated_at": time.Now(),
				},
			}
			_, err = subscriptionCollection.UpdateOne(ctx, bson.M{"stripe_subscription_id": inv.Subscription.ID}, update)
			if err != nil {
				utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Failed to update subscription status after payment failure")
			}
		}

	case "invoice.upcoming":
		// 次回請求予定（課金前のチェック用）
		var inv stripe.Invoice
		err := json.Unmarshal(event.Data.Raw, &inv)
		if err != nil {
			utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", err, "Failed to parse invoice data")
			c.JSON(http.StatusBadRequest, gin.H{"error": "イベントデータの解析に失敗しました"})
			return
		}

		utils.LogInfoCtx(c.Request.Context(), "StripeWebhook",
			fmt.Sprintf("Upcoming invoice: %s, Amount: %d, Customer: %s", inv.ID, inv.AmountDue, inv.Customer.ID))

		// キャンセル予約済みのサブスクリプションに対する次回課金予定を検出
		if inv.Subscription != nil {
			var sub Subscription
			err = subscriptionCollection.FindOne(ctx, bson.M{"stripe_subscription_id": inv.Subscription.ID}).Decode(&sub)
			if err == nil && sub.CancelAtPeriodEnd {
				// これは通常発生しないはず（Stripeがcancel_at_period_endを尊重する場合）
				utils.LogErrorCtx(c.Request.Context(), "StripeWebhook", nil,
					fmt.Sprintf("CRITICAL: Upcoming invoice for subscription marked as cancel_at_period_end! "+
						"Subscription: %s. This requires immediate investigation!", inv.Subscription.ID))
			}
		}
	}

	// Stripeに正常応答を返す
	c.JSON(http.StatusOK, gin.H{"received": true})
}

// CancelSubscriptionHandler はサブスクリプションをキャンセルするハンドラ
// 重要: キャンセル処理は二重確認を行い、確実に実行される
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

	// StripeサブスクリプションIDがない場合はエラー
	if sub.StripeSubscriptionID == "" {
		utils.LogErrorCtx(c.Request.Context(), "CancelSubscription", nil, "Missing Stripe subscription ID")
		c.JSON(http.StatusBadRequest, gin.H{"error": "サブスクリプション情報が不完全です"})
		return
	}

	// =================================================================
	// ステップ1: Stripeでキャンセルを設定
	// =================================================================
	params := &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(true),
	}
	// Idempotency for safety
	params.SetIdempotencyKey("sub-cancel:" + sub.StripeSubscriptionID + ":" + time.Now().Format("2006-01-02"))

	utils.LogInfoCtx(c.Request.Context(), "CancelSubscription", 
		fmt.Sprintf("Initiating cancellation for subscription: %s, user: %s", sub.StripeSubscriptionID, userID.Hex()))

	// Stripe APIを呼び出してキャンセルを設定
	updatedSub, err := subscriptionapi.Update(sub.StripeSubscriptionID, params)
	if err != nil {
		utils.LogErrorCtx(c.Request.Context(), "CancelSubscription", err, "Failed to cancel subscription in Stripe")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サブスクリプションのキャンセルに失敗しました"})
		return
	}

	// =================================================================
	// ステップ2: キャンセルが確実に設定されたことを確認
	// =================================================================
	if !updatedSub.CancelAtPeriodEnd {
		// キャンセルが設定されていない場合は再試行
		utils.LogWarningCtx(c.Request.Context(), "CancelSubscription", 
			"Cancel flag not set after update, retrying...")
		
		// 再度取得して確認
		verifyParams := &stripe.SubscriptionParams{}
		verifySub, verifyErr := subscriptionapi.Get(sub.StripeSubscriptionID, verifyParams)
		if verifyErr != nil {
			utils.LogErrorCtx(c.Request.Context(), "CancelSubscription", verifyErr, "Failed to verify cancellation status")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "キャンセル状態の確認に失敗しました"})
			return
		}
		
		if !verifySub.CancelAtPeriodEnd {
			// まだキャンセルされていない場合は深刻なエラー
			utils.LogErrorCtx(c.Request.Context(), "CancelSubscription", nil, 
				fmt.Sprintf("CRITICAL: Subscription %s cancellation failed - cancel_at_period_end is still false!", sub.StripeSubscriptionID))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "キャンセル処理に失敗しました。サポートにお問い合わせください。"})
			return
		}
		
		updatedSub = verifySub
	}

	// =================================================================
	// ステップ3: MongoDBを更新（Stripeの実際の状態で更新）
	// =================================================================
	update := bson.M{
		"$set": bson.M{
			"cancel_at_period_end": updatedSub.CancelAtPeriodEnd,
			"status":               string(updatedSub.Status),
			"current_period_end":   time.Unix(updatedSub.CurrentPeriodEnd, 0),
			"updated_at":           time.Now(),
		},
	}
	_, err = subscriptionCollection.UpdateOne(ctx, bson.M{"user_id": userID}, update)
	if err != nil {
		// DBの更新に失敗しても、Stripe側ではキャンセルされている
		// 次回のGetSubscriptionStatus呼び出し時に同期される
		utils.LogErrorCtx(c.Request.Context(), "CancelSubscription", err, 
			"Failed to update subscription in DB, but Stripe cancellation was successful")
	}

	// =================================================================
	// ステップ4: 成功をログに記録
	// =================================================================
	utils.LogInfoCtx(c.Request.Context(), "CancelSubscription", 
		fmt.Sprintf("Successfully canceled subscription: %s, Period ends: %s", 
			sub.StripeSubscriptionID, 
			time.Unix(updatedSub.CurrentPeriodEnd, 0).Format("2006-01-02")))

	c.JSON(http.StatusOK, gin.H{
		"message": "サブスクリプションは次回更新時にキャンセルされます",
		"subscription": gin.H{
			"cancel_at_period_end": updatedSub.CancelAtPeriodEnd,
			"current_period_end":   time.Unix(updatedSub.CurrentPeriodEnd, 0),
			"status":               string(updatedSub.Status),
		},
	})
}

// GetSubscriptionStatusHandler はサブスクリプションの状態を取得するハンドラ
// 重要: 常にStripeの最新状態を取得して、MongoDBと同期する
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
		// サブスクリプションが見つからない場合は、hasActiveSubscription: false を返す
		c.JSON(http.StatusOK, gin.H{
			"hasActiveSubscription": false,
			"subscription":          nil,
		})
		return
	}

	// =================================================================
	// 重要: Stripeから最新のサブスクリプション状態を取得して同期
	// これにより、Webhookの遅延や欠落があっても正確な状態を表示できる
	// =================================================================
	if sub.StripeSubscriptionID != "" {
		stripeSub, stripeErr := subscriptionapi.Get(sub.StripeSubscriptionID, nil)
		if stripeErr != nil {
			// Stripeからの取得に失敗した場合
			// サブスクリプションが存在しない（削除された）場合
			if apiErr, ok := stripeErr.(*stripe.Error); ok && apiErr.Code == stripe.ErrorCodeResourceMissing {
				utils.LogInfoCtx(c.Request.Context(), "GetSubscriptionStatus", "Subscription not found in Stripe, marking as canceled: "+sub.StripeSubscriptionID)
				
				// MongoDBのステータスを更新
				update := bson.M{
					"$set": bson.M{
						"status":     "canceled",
						"updated_at": time.Now(),
					},
				}
				_, _ = subscriptionCollection.UpdateOne(ctx, bson.M{"user_id": userID}, update)
				
				c.JSON(http.StatusOK, gin.H{
					"hasActiveSubscription": false,
					"subscription": gin.H{
						"id":                   sub.StripeSubscriptionID,
						"status":               "canceled",
						"price_id":             sub.PriceID,
						"current_period_end":   sub.CurrentPeriodEnd,
						"cancel_at_period_end": true,
					},
				})
				return
			}
			
			// その他のエラーの場合はログを出力してDB上の情報を返す
			utils.LogWarningCtx(c.Request.Context(), "GetSubscriptionStatus", "Failed to fetch subscription from Stripe: "+stripeErr.Error())
		} else {
			// =================================================================
			// Stripeの状態とMongoDBの状態を比較・同期
			// =================================================================
			stripeStatus := string(stripeSub.Status)
			stripeCurrentPeriodEnd := time.Unix(stripeSub.CurrentPeriodEnd, 0)
			stripeCancelAtPeriodEnd := stripeSub.CancelAtPeriodEnd

			// ステータスが異なる場合は同期（Stripeが真実の源）
			needsUpdate := false
			if sub.Status != stripeStatus {
				utils.LogInfoCtx(c.Request.Context(), "GetSubscriptionStatus", 
					fmt.Sprintf("Status mismatch - DB: %s, Stripe: %s, syncing...", sub.Status, stripeStatus))
				sub.Status = stripeStatus
				needsUpdate = true
			}
			if !sub.CurrentPeriodEnd.Equal(stripeCurrentPeriodEnd) {
				sub.CurrentPeriodEnd = stripeCurrentPeriodEnd
				needsUpdate = true
			}
			if sub.CancelAtPeriodEnd != stripeCancelAtPeriodEnd {
				sub.CancelAtPeriodEnd = stripeCancelAtPeriodEnd
				needsUpdate = true
			}

			// MongoDBを更新
			if needsUpdate {
				update := bson.M{
					"$set": bson.M{
						"status":               sub.Status,
						"current_period_end":   sub.CurrentPeriodEnd,
						"cancel_at_period_end": sub.CancelAtPeriodEnd,
						"updated_at":           time.Now(),
					},
				}
				_, updateErr := subscriptionCollection.UpdateOne(ctx, bson.M{"user_id": userID}, update)
				if updateErr != nil {
					utils.LogWarningCtx(c.Request.Context(), "GetSubscriptionStatus", "Failed to sync subscription to DB: "+updateErr.Error())
				} else {
					utils.LogInfoCtx(c.Request.Context(), "GetSubscriptionStatus", "Successfully synced subscription status from Stripe")
				}
			}

			// =================================================================
			// キャンセル予約済みで期間終了の場合の厳格なチェック
			// =================================================================
			if stripeSub.CancelAtPeriodEnd && time.Now().After(stripeCurrentPeriodEnd) {
				// 期間が終了している場合、ステータスは「canceled」であるべき
				if stripeStatus != "canceled" {
					utils.LogWarningCtx(c.Request.Context(), "GetSubscriptionStatus", 
						fmt.Sprintf("Warning: Subscription %s has cancel_at_period_end=true and period has ended, but status is %s", 
							sub.StripeSubscriptionID, stripeStatus))
				}
			}
		}
	}

	// =================================================================
	// サブスクリプションがアクティブかどうかの判定
	// =================================================================
	hasActiveSubscription := sub.Status == "active" || sub.Status == "trialing"

	// キャンセル予約済みで期間終了後の場合は非アクティブ
	if sub.CancelAtPeriodEnd && time.Now().After(sub.CurrentPeriodEnd) {
		hasActiveSubscription = false
	}

	// サブスクリプション情報を返す（JSONタグに合わせてsnake_caseを使用）
	c.JSON(http.StatusOK, gin.H{
		"hasActiveSubscription": hasActiveSubscription,
		"subscription": gin.H{
			"id":                   sub.StripeSubscriptionID,
			"status":               sub.Status,
			"price_id":             sub.PriceID,
			"current_period_end":   sub.CurrentPeriodEnd,
			"cancel_at_period_end": sub.CancelAtPeriodEnd,
		},
	})
}

// SyncStripeSubscriptionsHandler はStripe側のサブスクリプション状態をMongoDBに同期する（管理者専用）
// handleSubscriptionResumeOrUpdate は解約予約中のサブスクリプションを再開または変更する
func handleSubscriptionResumeOrUpdate(c *gin.Context, ctx context.Context, sub Subscription, newPriceID string) {
	// Stripeから最新のサブスクリプション情報を取得
	stripeSub, err := subscriptionapi.Get(sub.StripeSubscriptionID, nil)
	if err != nil {
		utils.LogErrorCtx(c.Request.Context(), "ResumeSubscription", err, "Failed to fetch subscription from Stripe")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サブスクリプション情報の取得に失敗しました"})
		return
	}

	params := &stripe.SubscriptionParams{
		CancelAtPeriodEnd: stripe.Bool(false), // 解約予約をキャンセル（再開）
	}

	// プラン変更がある場合
	if sub.PriceID != newPriceID {
		// アイテムの更新
		if len(stripeSub.Items.Data) > 0 {
			params.Items = []*stripe.SubscriptionItemsParams{
				{
					ID:    stripe.String(stripeSub.Items.Data[0].ID), // 既存のアイテムID
					Price: stripe.String(newPriceID),                 // 新しい価格ID
				},
			}
		}
	}

	updatedSub, err := subscriptionapi.Update(sub.StripeSubscriptionID, params)
	if err != nil {
		utils.LogErrorCtx(c.Request.Context(), "ResumeSubscription", err, "Failed to update subscription in Stripe")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サブスクリプションの更新に失敗しました"})
		return
	}

	// DB更新
	update := bson.M{
		"$set": bson.M{
			"status":               string(updatedSub.Status),
			"price_id":             newPriceID,
			"cancel_at_period_end": updatedSub.CancelAtPeriodEnd,
			"current_period_end":   time.Unix(updatedSub.CurrentPeriodEnd, 0),
			"updated_at":           time.Now(),
		},
	}
	if _, err := subscriptionCollection.UpdateByID(ctx, sub.ID, update); err != nil {
		utils.LogErrorCtx(c.Request.Context(), "ResumeSubscription", err, "Failed to update subscription in DB")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "データベースの更新に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "サブスクリプションが正常に更新されました",
		"subscription": gin.H{
			"id":                   updatedSub.ID,
			"status":               updatedSub.Status,
			"current_period_end":   time.Unix(updatedSub.CurrentPeriodEnd, 0),
			"cancel_at_period_end": updatedSub.CancelAtPeriodEnd,
		},
		"redirect": "/subscription/success",
	})
}

// SyncStripeSubscriptionsHandler はStripe側のサブスクリプション状態をMongoDBに同期する（管理者専用）
func SyncStripeSubscriptionsHandler(c *gin.Context) {
	ctx := context.Background()

	cursor, err := subscriptionCollection.Find(ctx, bson.M{})
	if err != nil {
		utils.LogErrorCtx(c.Request.Context(), "SyncStripeSubscriptions", err, "Failed to list subscriptions")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サブスクリプション一覧の取得に失敗しました"})
		return
	}
	defer cursor.Close(ctx)

	var synced, removed int

	for cursor.Next(ctx) {
		var doc Subscription
		if err := cursor.Decode(&doc); err != nil {
			utils.LogErrorCtx(c.Request.Context(), "SyncStripeSubscriptions", err, "Failed to decode subscription document")
			continue
		}

		if doc.StripeSubscriptionID == "" {
			// 不整合データは削除
			_, _ = subscriptionCollection.DeleteOne(ctx, bson.M{"_id": doc.ID})
			removed++
			continue
		}

		stripeSub, err := subscriptionapi.Get(doc.StripeSubscriptionID, nil)
		if err != nil {
			utils.LogErrorCtx(c.Request.Context(), "SyncStripeSubscriptions", err, "Failed to fetch subscription from Stripe", doc.StripeSubscriptionID)
			if apiErr, ok := err.(*stripe.Error); ok && apiErr.Code == stripe.ErrorCodeResourceMissing {
				_, _ = subscriptionCollection.DeleteOne(ctx, bson.M{"_id": doc.ID})
				removed++
			}
			continue
		}

		customerID := doc.StripeCustomerID
		if stripeSub.Customer != nil {
			customerID = stripeSub.Customer.ID
		}

		update := bson.M{
			"$set": bson.M{
				"status":               string(stripeSub.Status),
				"stripe_customer_id":   customerID,
				"current_period_end":   time.Unix(stripeSub.CurrentPeriodEnd, 0),
				"cancel_at_period_end": stripeSub.CancelAtPeriodEnd,
				"updated_at":           time.Now(),
			},
		}

		if _, err := subscriptionCollection.UpdateByID(ctx, doc.ID, update); err != nil {
			utils.LogErrorCtx(c.Request.Context(), "SyncStripeSubscriptions", err, "Failed to update subscription document")
			continue
		}

		synced++
	}

	if err := cursor.Err(); err != nil {
		utils.LogErrorCtx(c.Request.Context(), "SyncStripeSubscriptions", err, "Cursor iteration error")
	}

	c.JSON(http.StatusOK, gin.H{
		"synced":  synced,
		"removed": removed,
	})
}

// ApplyPromotionCodeHandler はサブスクリプションにプロモーションコードを適用するハンドラ
func ApplyPromotionCodeHandler(c *gin.Context) {
	// リクエストボディの定義
	var req struct {
		Code string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "プロモーションコードを入力してください"})
		return
	}

	// ユーザーIDの取得
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

	// サブスクリプション情報をDBから取得
	var sub Subscription
	ctx := context.Background()
	err = subscriptionCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&sub)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "有効なサブスクリプションが見つかりません"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "サブスクリプション情報の取得に失敗しました"})
		return
	}

	// Stripe上でアクティブか確認（念のため）
	if sub.Status != "active" && sub.Status != "trialing" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "有効なサブスクリプションがありません"})
		return
	}

	// Stripe APIでプロモーションコードを検索
	// アクティブなプロモーションコードのみを検索
	params := &stripe.PromotionCodeListParams{
		Code:   stripe.String(req.Code),
		Active: stripe.Bool(true),
	}

	utils.LogInfoCtx(c.Request.Context(), "ApplyPromotionCode", "Searching for promotion code: "+req.Code)

	iter := promotioncode.List(params)
	var targetPromoCode *stripe.PromotionCode

	// 最初にヒットした有効なコードを使用
	for iter.Next() {
		pc := iter.PromotionCode()

		// 顧客限定クーポンかどうかチェック
		if pc.Customer != nil {
			if pc.Customer.ID != sub.StripeCustomerID {
				utils.LogInfoCtx(c.Request.Context(), "ApplyPromotionCode", fmt.Sprintf("Promotion code %s is restricted to customer %s, but current user is %s", pc.Code, pc.Customer.ID, sub.StripeCustomerID))
				continue // この顧客用ではない
			}
		}
		
		utils.LogInfoCtx(c.Request.Context(), "ApplyPromotionCode", fmt.Sprintf("Found valid promotion code: %s (ID: %s)", pc.Code, pc.ID))
		targetPromoCode = pc
		break
	}

	if err := iter.Err(); err != nil {
		utils.LogErrorCtx(c.Request.Context(), "ApplyPromotionCode", err, "Failed to list promotion codes")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "プロモーションコードの検索に失敗しました"})
		return
	}

	if targetPromoCode == nil {
		utils.LogWarningCtx(c.Request.Context(), "ApplyPromotionCode", "No valid promotion code found for code: "+req.Code)
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なプロモーションコードです"})
		return
	}

	// サブスクリプションに適用
	subParams := &stripe.SubscriptionParams{
		PromotionCode: stripe.String(targetPromoCode.ID),
	}

	updatedSub, err := subscriptionapi.Update(sub.StripeSubscriptionID, subParams)
	if err != nil {
		utils.LogErrorCtx(c.Request.Context(), "ApplyPromotionCode", err, "Failed to apply promotion code")

		// Stripeのエラーメッセージを解析して適切なメッセージを返す
		errMsg := "クーポンの適用に失敗しました"
		if stripeErr, ok := err.(*stripe.Error); ok {
			utils.LogWarningCtx(c.Request.Context(), "ApplyPromotionCode", fmt.Sprintf("Stripe error: Code=%s, Msg=%s", stripeErr.Code, stripeErr.Msg))
			// 既に使用済みなどのエラーハンドリング
			switch stripeErr.Code {
			case stripe.ErrorCodeCouponExpired:
				errMsg = "このクーポンは期限切れです"
			case stripe.ErrorCodeResourceAlreadyExists:
				errMsg = "このクーポンは既に使用されています"
			default:
				// コードがない場合やその他のエラーのメッセージ判定
				if strings.Contains(stripeErr.Msg, "prior transactions") {
					errMsg = "このクーポンは初回利用者限定です"
				}
			}
		}

		c.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
		return
	}

	// 成功レスポンス
	c.JSON(http.StatusOK, gin.H{
		"message": "クーポンが適用されました",
		"coupon": gin.H{
			"id":          targetPromoCode.Coupon.ID,
			"name":        targetPromoCode.Coupon.Name,
			"percent_off": targetPromoCode.Coupon.PercentOff,
			"amount_off":  targetPromoCode.Coupon.AmountOff,
		},
		"subscription": gin.H{
			"status":             updatedSub.Status,
			"current_period_end": updatedSub.CurrentPeriodEnd,
		},
	})
}
