package middleware

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	jwt "github.com/golang-jwt/jwt/v5"
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

		// JWT トークンからも管理者情報を取得
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			// "Bearer "を除去
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")

			// トークンの解析
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				// 環境変数からJWTシークレットを取得
				secret := os.Getenv("JWT_SECRET")
				if secret == "" {
					return nil, fmt.Errorf("JWT_SECRET environment variable is not set")
				}
				return []byte(secret), nil
			})

			if err == nil && token.Valid {
				// クレームの取得
				if claims, ok := token.Claims.(jwt.MapClaims); ok {
					// トークンに isAdmin=true が含まれていれば管理者として認証
                    if isAdmin, exists := claims["isAdmin"]; exists && isAdmin == true {
                        c.Next()
                        return
                    }

                    // role=admin が含まれていても管理者として認証
                    if role, exists := claims["role"]; exists && role == "admin" {
                        c.Next()
                        return
                    }
                }
            }
        }

		// MongoDB からユーザー情報を取得して確認（バックアップ方法）
		userID, err := primitive.ObjectIDFromHex(userIDStr.(string))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "無効なユーザーIDです"})
			c.Abort()
			return
		}

		// ユーザーコレクションから管理者権限を確認
		ctx := context.Background()
		var user struct {
			IsAdmin bool   `bson:"is_admin"`
			Role    string `bson:"role"`
		}

		err = userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
			c.Abort()
			return
		}

		// isAdmin フラグまたは role=admin のどちらかを確認
		if user.IsAdmin || user.Role == "admin" {
			c.Next()
			return
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "管理者権限が必要です"})
		c.Abort()
	}
}
