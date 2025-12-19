package main

import (
	"juice_academy_backend/config"
	"juice_academy_backend/controllers"
	"juice_academy_backend/middleware"
	"juice_academy_backend/services"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func main() {
	// リリースモードで動作
	gin.SetMode(gin.ReleaseMode)

	// 環境変数から設定を取得
	mongoURI := getEnv("MONGODB_URI", "mongodb://mongodb:27017")
	corsAllowedOrigins := getEnv("CORS_ALLOWED_ORIGINS", "")
	port := getEnv("APP_PORT", "8080")

	// MongoDB への接続
	dbClient := config.ConnectDB(mongoURI)

	// データベース参照
	db := dbClient.Database(getEnv("MONGODB_DATABASE", "juice_academy"))

	// Redis への接続
	if err := services.InitRedis(); err != nil {
		log.Fatalf("Redis初期化に失敗しました: %v", err)
	}

	// コレクションの初期化
	controllers.InitUserCollection(dbClient)
	controllers.InitPaymentCollection(dbClient)
	controllers.InitSubscriptionCollection(dbClient)
	controllers.InitStripeEventCollection(dbClient) // Webhook冪等性管理用
	controllers.InitAnnouncementCollection(db)      // お知らせコレクションの初期化を追加
	controllers.InitOTPCollection(db)               // OTPコレクションの初期化を追加
	controllers.InitRefreshTokenCollection(dbClient)
	middleware.InitUserCollection(db)

	// 管理者ユーザーの作成（環境変数で制御）
	if os.Getenv("SEED_ADMIN_USER") == "true" {
		controllers.SeedAdminUser()
	}

	router := gin.Default()
	router.Use(middleware.CorrelationID())

	// /api が重複したパスを正規化する（例: /api/api/login -> /api/login）
	router.NoRoute(func(c *gin.Context) {
		p := c.Request.URL.Path
		// すべての重複 /api を単一の /api に縮約
		for strings.Contains(p, "/api/api") {
			p = strings.ReplaceAll(p, "/api/api", "/api")
		}
		if p != c.Request.URL.Path {
			c.Request.URL.Path = p
			// リライト後のルーティングを再実行
			router.HandleContext(c)
			return
		}
		c.JSON(404, gin.H{"error": "not found"})
	})

	// CORS設定
	allowedOrigins := parseAllowedOrigins(corsAllowedOrigins)
	if len(allowedOrigins) == 0 {
		log.Fatal("CORS_ALLOWED_ORIGINS が設定されていません")
	}

	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			if _, ok := allowedOrigins[origin]; ok {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
				c.Writer.Header().Set("Vary", "Origin")
				c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			} else {
				if c.Request.Method == http.MethodOptions {
					c.AbortWithStatus(http.StatusForbidden)
					return
				}
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "許可されていないオリジンです"})
				return
			}
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if c.Request.Method == http.MethodOptions {
			c.Status(http.StatusNoContent)
			c.Abort()
			return
		}

		c.Next()
	})

	// セキュリティヘッダーの追加
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")
		c.Writer.Header().Set("X-Frame-Options", "DENY")
		c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")
		c.Writer.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
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
		// ログインは必ず2FAを経由（パスワード認証 → OTP送信 → OTP検証）
		api.POST("/login", middleware.RateLimit("login", 10, time.Minute), controllers.LoginHandler)
		api.GET("/announcements", controllers.GetAnnouncementsHandler)
		api.GET("/announcements/:id", controllers.GetAnnouncementByIdHandler)
		api.POST("/auth/refresh", controllers.RefreshTokenHandler)

		// 2FA関連のエンドポイント（ログインに必須）
		api.POST("/otp/send", middleware.RateLimit("otp_send", 5, time.Minute), controllers.SendOTPHandler)
		api.POST("/otp/verify", middleware.RateLimit("otp_verify", 10, time.Minute), controllers.VerifyOTPHandler)
		api.POST("/otp/resend", middleware.RateLimit("otp_resend", 3, time.Minute), controllers.ResendOTPHandler)

		// Stripe Webhookエンドポイント（Stripeのみが呼び出す）
		api.POST("/webhook/stripe", controllers.StripeWebhookHandler)
	}

	// JWT 認証が必要な API グループ
	protected := api.Group("/")
	protected.Use(middleware.JWTAuthMiddleware(), controllers.CSRFProtection())
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
		protected.POST("/subscription/promotion", controllers.ApplyPromotionCodeHandler)
	}

	// 管理者専用ルート
	adminRoutes := api.Group("/admin")
	adminRoutes.Use(middleware.JWTAuthMiddleware(), controllers.CSRFProtection(), middleware.AdminRequired())
	{
		adminRoutes.POST("/announcements", controllers.CreateAnnouncementHandler)
		adminRoutes.PUT("/announcements/:id", controllers.UpdateAnnouncementHandler)
		adminRoutes.DELETE("/announcements/:id", controllers.DeleteAnnouncementHandler)
		adminRoutes.POST("/sync/stripe", controllers.SyncStripeSubscriptionsHandler)

		// 管理者権限付与エンドポイント
		adminRoutes.PUT("/users/:id/admin", controllers.SetAdminStatus)
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           router,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		ReadHeaderTimeout: 15 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("サーバー起動に失敗しました: %v", err)
	}
}

func parseAllowedOrigins(raw string) map[string]struct{} {
	result := make(map[string]struct{})
	for _, origin := range strings.Split(raw, ",") {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			result[trimmed] = struct{}{}
		}
	}
	return result
}

// 環境変数を取得するヘルパー関数
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
