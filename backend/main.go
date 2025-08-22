package main

import (
	"juice_academy_backend/config"
	"juice_academy_backend/controllers"
	"juice_academy_backend/middleware"
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func main() {
	// 本番環境では詳細ログを無効化
	if os.Getenv("APP_ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 環境変数から設定を取得
	mongoURI := getEnv("MONGODB_URI", "mongodb://mongodb:27017")
	corsAllowedOrigins := getEnv("CORS_ALLOWED_ORIGINS", "*")
	port := getEnv("APP_PORT", "8080")

	// MongoDB への接続
	dbClient := config.ConnectDB(mongoURI)

	// データベース参照
	db := dbClient.Database(getEnv("MONGODB_DATABASE", "juice_academy"))

	// コレクションの初期化
	controllers.InitUserCollection(dbClient)
	controllers.InitPaymentCollection(dbClient)
	controllers.InitSubscriptionCollection(dbClient)
	controllers.InitAnnouncementCollection(db) // お知らせコレクションの初期化を追加
	middleware.InitUserCollection(db)

	// 管理者ユーザーの作成（本番環境では初回のみ、または環境変数で制御）
	if os.Getenv("APP_ENV") != "production" || os.Getenv("SEED_ADMIN_USER") == "true" {
		controllers.SeedAdminUser(db)
	}

	router := gin.Default()

	// 本番環境向けCORS設定
	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// 本番環境では特定のオリジンのみ許可
		if os.Getenv("APP_ENV") == "production" {
			allowedOrigins := strings.Split(corsAllowedOrigins, ",")
			originAllowed := false
			for _, allowedOrigin := range allowedOrigins {
				if origin == strings.TrimSpace(allowedOrigin) {
					c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
					originAllowed = true
					break
				}
			}
			// 許可されていないオリジンの場合はデフォルト値を設定しない
			if !originAllowed && corsAllowedOrigins != "*" {
				// オリジンが許可されていない場合はCORSヘッダーを設定しない
			} else if corsAllowedOrigins == "*" {
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			}
		} else {
			// 開発環境では全てのオリジンを許可
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// セキュリティヘッダーの追加
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")
		c.Writer.Header().Set("X-Frame-Options", "DENY")
		c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")
		if os.Getenv("APP_ENV") == "production" {
			c.Writer.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	})

	// 公開 API グループ
	api := router.Group("/api")
	{
		api.POST("/register", controllers.RegisterHandler)
		api.POST("/login", controllers.LoginHandler)
		api.GET("/announcements", controllers.GetAnnouncementsHandler)
		api.GET("/announcements/:id", controllers.GetAnnouncementByIdHandler)

		// Stripe決済情報登録のためのエンドポイント（フロントエンドからのアクセス用）
		api.POST("/payment/setup-intent", controllers.SetupIntentHandler)
		api.POST("/payment/confirm-setup", controllers.ConfirmSetupHandler)

		// Stripe Webhookエンドポイント
		api.POST("/webhook/stripe", controllers.StripeWebhookHandler)
	}

	// JWT 認証が必要な API グループ
	protected := api.Group("/")
	protected.Use(middleware.JWTAuthMiddleware())
	{
		protected.DELETE("/account", controllers.DeleteAccountHandler)

		// お知らせ管理（管理者のみ）
		protected.POST("/announcements", middleware.AdminRequired(), controllers.CreateAnnouncementHandler)
		protected.PUT("/announcements/:id", middleware.AdminRequired(), controllers.UpdateAnnouncementHandler)
		protected.DELETE("/announcements/:id", middleware.AdminRequired(), controllers.DeleteAnnouncementHandler)

		// 決済関連
		protected.POST("/payment/customer", controllers.CreateStripeCustomerHandler)
		protected.POST("/payment/subscription", controllers.CreateSubscriptionHandler)
		protected.GET("/payment/history", controllers.PaymentHistoryHandler)
		protected.GET("/payment/methods", controllers.GetPaymentMethodsHandler)
		protected.DELETE("/payment/methods/:id", controllers.DeletePaymentMethodHandler)

		// サブスクリプション関連
		protected.GET("/subscription/status", controllers.GetSubscriptionStatusHandler)
		protected.POST("/subscription/cancel", controllers.CancelSubscriptionHandler)
	}

	// 管理者専用ルート
	adminRoutes := api.Group("/admin")
	adminRoutes.Use(middleware.JWTAuthMiddleware(), middleware.AdminRequired())
	{
		adminRoutes.POST("/announcements", controllers.CreateAnnouncementHandler)
		adminRoutes.PUT("/announcements/:id", controllers.UpdateAnnouncementHandler)
		adminRoutes.DELETE("/announcements/:id", controllers.DeleteAnnouncementHandler)

		// 管理者権限付与エンドポイント
		adminRoutes.PUT("/users/:id/admin", controllers.SetAdminStatus)
	}

	log.Printf("サーバーをポート %s で起動します", port)
	router.Run(":" + port)
}

// 環境変数を取得するヘルパー関数
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
