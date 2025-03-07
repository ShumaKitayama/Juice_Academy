package middleware

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// userCollection はユーザー情報を格納するコレクション
var userCollection *mongo.Collection

// InitUserCollection はユーザーコレクションを初期化します
func InitUserCollection(db *mongo.Database) {
	userCollection = db.Collection("users")
}

// AdminRequired は管理者権限を持つユーザーのみアクセスを許可するミドルウェアです
func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// ユーザー情報をコンテキストから取得
		userIDStr, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
			c.Abort()
			return
		}

		// MongoDB からユーザー情報を取得
		userID, err := primitive.ObjectIDFromHex(userIDStr.(string))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "無効なユーザーIDです"})
			c.Abort()
			return
		}

		// ユーザーコレクションから管理者権限を確認
		ctx := context.Background()
		var user struct {
			IsAdmin bool `bson:"isAdmin"`
		}

		err = userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
			c.Abort()
			return
		}

		if !user.IsAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "管理者権限が必要です"})
			c.Abort()
			return
		}

		c.Next()
	}
}
