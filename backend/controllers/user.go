package controllers

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DeleteAccountHandler はユーザーのアカウント削除処理を行うハンドラ
func DeleteAccountHandler(c *gin.Context) {
	// デバッグ用にコンテキストの内容を出力
	fmt.Printf("Context keys: %v\n", c.Keys)

	// コンテキストからユーザーIDを取得
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証情報が見つかりません"})
		return
	}

	fmt.Printf("User ID from context: %v\n", userIDStr)

	// 文字列をObjectIDに変換
	userID, err := primitive.ObjectIDFromHex(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正なユーザーIDです"})
		return
	}

	// ユーザーの削除
	ctx := context.Background()
	result, err := userCollection.DeleteOne(ctx, bson.M{"_id": userID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "アカウントの削除に失敗しました"})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "アカウントが見つかりません"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "アカウントを削除しました"})
}
