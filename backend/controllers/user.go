package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// DeleteAccountHandler はユーザーのアカウント削除処理を行うハンドラ。
func DeleteAccountHandler(c *gin.Context) {
	// TODO: アカウント削除処理
	c.JSON(http.StatusOK, gin.H{"message": "Account deleted"})
}
