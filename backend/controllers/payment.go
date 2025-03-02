package controllers

import (
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/customer"
	"github.com/stripe/stripe-go/v72/setupintent"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var (
	paymentCollection *mongo.Collection
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

	// Stripe APIキーの設定
	stripe.Key = os.Getenv("STRIPE_API_KEY")
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
	var req struct {
		UserID string `json:"userId" binding:"required"`
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
	var req struct {
		UserID          string `json:"userId" binding:"required"`
		PaymentMethodID string `json:"paymentMethodId" binding:"required"`
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

	// サブスクリプション作成のコメント
	// 注意: Stripe SDKのバージョンが合わない場合は、APIドキュメントを参照して適切に実装してください
	c.JSON(http.StatusOK, gin.H{
		"message": "サブスクリプション作成APIの呼び出しが必要です。Stripe SDKの正しいバージョンでインポートしてください。",
		"details": "顧客ID: " + payment.StripeCustomerID + "に対して価格ID: " + req.PriceID + "のサブスクリプションを作成します。",
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

	// ここではダミーデータを返していますが、実際にはStripe APIを使用して支払い履歴を取得する
	c.JSON(http.StatusOK, []gin.H{
		{"id": "1", "amount": 1980, "status": "success", "created_at": time.Now().AddDate(0, 0, -30)},
		{"id": "2", "amount": 1980, "status": "success", "created_at": time.Now()},
	})
}
