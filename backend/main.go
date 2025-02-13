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
	_ = dbClient
	// ※必要に応じて dbClient を各コントローラーで利用する方法を検討する

	router := gin.Default()

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
