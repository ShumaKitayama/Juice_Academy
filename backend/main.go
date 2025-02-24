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

	// ユーザーコレクションの初期化
	controllers.InitUserCollection(dbClient)

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
	}

	// JWT 認証が必要な API グループ
	protected := api.Group("/")
	protected.Use(middleware.JWTAuthMiddleware())
	{
		protected.DELETE("/account", controllers.DeleteAccountHandler)

		// お知らせ管理（管理者のみ）
		protected.POST("/announcements", middleware.AdminMiddleware(), controllers.CreateAnnouncementHandler)
		protected.PUT("/announcements/:id", middleware.AdminMiddleware(), controllers.UpdateAnnouncementHandler)
		protected.DELETE("/announcements/:id", middleware.AdminMiddleware(), controllers.DeleteAnnouncementHandler)

		// 決済関連
		protected.POST("/payment", controllers.PaymentHandler)
		protected.GET("/payment/history", controllers.PaymentHistoryHandler)
	}

	router.Run(":8080")
}
