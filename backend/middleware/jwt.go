package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
)

var jwtSecret = []byte("your_secret_key")

// JWTAuthMiddleware は JWT トークンの検証を行うミドルウェア。
func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// デバッグ用にヘッダー情報を出力
		fmt.Printf("Authorization header: %s\n", c.GetHeader("Authorization"))

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "認証ヘッダーがありません"})
			c.Abort()
			return
		}

		// "Bearer "を除去
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// トークンの検証
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return jwtSecret, nil
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "無効なトークンです: " + err.Error()})
			c.Abort()
			return
		}

		if !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "トークンが無効です"})
			c.Abort()
			return
		}

		// クレームの取得
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "無効なトークン形式です"})
			c.Abort()
			return
		}

		// デバッグ用にクレーム情報を出力
		fmt.Printf("Token claims: %+v\n", claims)

		// ユーザーIDをコンテキストに設定
		userID, ok := claims["user_id"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザーIDが見つかりません"})
			c.Abort()
			return
		}

		c.Set("user_id", userID)
		c.Next()
	}
}
