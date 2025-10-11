package main

import (
	"juice_academy_backend/config"
	"juice_academy_backend/controllers"
	"juice_academy_backend/middleware"
	"juice_academy_backend/services"
	"log"
	"os"
	"strings"
	"time"

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

	// Redis への接続
	err := services.InitRedis()
	if err != nil {
		log.Printf("Redis接続に失敗しました（継続実行）: %v", err)
		// Redisが利用できない場合でもサーバーは起動する
	}

	// コレクションの初期化
	controllers.InitUserCollection(dbClient)
	controllers.InitPaymentCollection(dbClient)
	controllers.InitSubscriptionCollection(dbClient)
	controllers.InitStripeEventCollection(dbClient) // Webhook冪等性管理用
	controllers.InitAnnouncementCollection(db) // お知らせコレクションの初期化を追加
	controllers.InitOTPCollection(db) // OTPコレクションの初期化を追加
	middleware.InitUserCollection(db)

	// 管理者ユーザーの作成（本番環境では初回のみ、または環境変数で制御）
	if os.Getenv("APP_ENV") != "production" || os.Getenv("SEED_ADMIN_USER") == "true" {
		controllers.SeedAdminUser()
	}

	router := gin.Default()

    // CORS設定（Allow-Credentialsとワイルドカードの非併用を徹底）
    router.Use(func(c *gin.Context) {
        origin := c.Request.Header.Get("Origin")
        allowOrigin := ""
        allowCreds := false

        if os.Getenv("APP_ENV") == "production" {
            if corsAllowedOrigins != "" && corsAllowedOrigins != "*" {
                for _, o := range strings.Split(corsAllowedOrigins, ",") {
                    if origin == strings.TrimSpace(o) {
                        allowOrigin = origin
                        allowCreds = true // 明示許可時のみCredentials許可
                        break
                    }
                }
            }
            // production で "*" は非推奨。どうしても必要なら allowCreds は付けない
            if corsAllowedOrigins == "*" {
                allowOrigin = "*"
                allowCreds = false
            }
        } else {
            // 開発環境: デフォルトでワイルドカードを許可（Credentialsは付けない）
            if corsAllowedOrigins == "*" || corsAllowedOrigins == "" {
                allowOrigin = "*"
                allowCreds = false
            } else {
                for _, o := range strings.Split(corsAllowedOrigins, ",") {
                    if origin == strings.TrimSpace(o) {
                        allowOrigin = origin
                        allowCreds = true
                        break
                    }
                }
            }
        }

        if allowOrigin != "" {
            c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
            c.Writer.Header().Set("Vary", "Origin")
        }
        c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
        if allowCreds {
            c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
        }

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
        // 追加推奨ヘッダー
        c.Writer.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
        c.Writer.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        c.Writer.Header().Set("Cross-Origin-Opener-Policy", "same-origin")
        c.Writer.Header().Set("Cross-Origin-Resource-Policy", "same-origin")
        c.Next()
    })

    // 公開 API グループ
    api := router.Group("/api")
    {
        api.POST("/register", controllers.RegisterHandler)
        api.POST("/login", middleware.RateLimit("login", 10, time.Minute), controllers.LoginHandler)
        api.POST("/login-2fa", middleware.RateLimit("login2fa", 10, time.Minute), controllers.Login2FAHandler) // 2FA用ログイン
        api.GET("/announcements", controllers.GetAnnouncementsHandler)
        api.GET("/announcements/:id", controllers.GetAnnouncementByIdHandler)

        // 2FA関連のエンドポイント
        api.POST("/otp/send", middleware.RateLimit("otp_send", 5, time.Minute), controllers.SendOTPHandler)
        api.POST("/otp/verify", middleware.RateLimit("otp_verify", 10, time.Minute), controllers.VerifyOTPHandler)
        api.POST("/otp/resend", middleware.RateLimit("otp_resend", 3, time.Minute), controllers.ResendOTPHandler)

        // Stripe Webhookエンドポイント（Stripeのみが呼び出す）
        api.POST("/webhook/stripe", controllers.StripeWebhookHandler)
    }

	// JWT 認証が必要な API グループ
	protected := api.Group("/")
	protected.Use(middleware.JWTAuthMiddleware())
	{
		protected.POST("/logout", controllers.LogoutHandler)
		protected.DELETE("/account", controllers.DeleteAccountHandler)

		// お知らせ管理（管理者のみ）
		protected.POST("/announcements", middleware.AdminRequired(), controllers.CreateAnnouncementHandler)
		protected.PUT("/announcements/:id", middleware.AdminRequired(), controllers.UpdateAnnouncementHandler)
		protected.DELETE("/announcements/:id", middleware.AdminRequired(), controllers.DeleteAnnouncementHandler)

        // 決済関連（認証必須）
        // SetupIntent 作成/確認は認証が必要。user_id はJWTから取得し、クライアントからの入力は信用しない
        protected.POST("/payment/setup-intent", middleware.RateLimit("setup_intent", 20, time.Minute), controllers.SetupIntentHandler)
        protected.POST("/payment/confirm-setup", middleware.RateLimit("confirm_setup", 20, time.Minute), controllers.ConfirmSetupHandler)
        protected.POST("/payment/customer", middleware.RateLimit("create_customer", 10, time.Minute), controllers.CreateStripeCustomerHandler)
        protected.POST("/payment/subscription", middleware.RateLimit("create_subscription", 10, time.Minute), controllers.CreateSubscriptionHandler)
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
