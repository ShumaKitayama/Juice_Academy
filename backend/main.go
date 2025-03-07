package main

import (
	"juice_academy_backend/config"
	"juice_academy_backend/controllers"
	"juice_academy_backend/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	// MongoDB への接続（Docker Compose の mongodb サービスを利用）
	dbClient := config.ConnectDB("mongodb://mongodb:27017")

	// データベース参照
	db := dbClient.Database("juice_academy")

	// コレクションの初期化
	controllers.InitUserCollection(dbClient)
	controllers.InitPaymentCollection(dbClient)
	controllers.InitSubscriptionCollection(dbClient) // サブスクリプションコレクションの初期化
	middleware.InitUserCollection(db)                // ミドルウェア用のユーザーコレクション初期化

	// 管理者ユーザーの作成
	controllers.SeedAdminUser(db)

	router := gin.Default()

	// CORS設定の追加
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// 公開 API グループ
	api := router.Group("/api")
	{
		api.POST("/register", controllers.RegisterHandler)
		api.POST("/login", controllers.LoginHandler)
		api.GET("/announcements", controllers.GetAnnouncementsHandler)

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
	adminRoutes.Use(middleware.AdminRequired())
	{
		adminRoutes.POST("/announcements", controllers.CreateAnnouncementHandler)
		adminRoutes.PUT("/announcements/:id", controllers.UpdateAnnouncementHandler)
		adminRoutes.DELETE("/announcements/:id", controllers.DeleteAnnouncementHandler)

		// 管理者権限付与エンドポイント
		adminRoutes.PUT("/users/:id/admin", controllers.SetAdminStatus)
	}

	router.Run(":8080")
}
