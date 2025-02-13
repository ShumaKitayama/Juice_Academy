package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// PaymentHandler は決済処理を行うハンドラ（Stripe 連携予定）。
func PaymentHandler(c *gin.Context) {
	// TODO: Stripeを利用した決済処理
	c.JSON(http.StatusOK, gin.H{"message": "Payment processed"})
}

// PaymentHistoryHandler は決済履歴を取得するハンドラ。
func PaymentHistoryHandler(c *gin.Context) {
	// TODO: DBから決済履歴を取得
	c.JSON(http.StatusOK, []gin.H{
		{"id": "1", "amount": 100, "status": "success", "created_at": time.Now()},
	})
}
