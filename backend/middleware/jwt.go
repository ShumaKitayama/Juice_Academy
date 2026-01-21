package middleware

import (
	"fmt"
	"juice_academy_backend/services"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	jwt "github.com/golang-jwt/jwt/v5"
)

var (
	jwtSecret     []byte
	jwtSecretOnce sync.Once
)

// getJWTSecret は JWT シークレットを遅延初期化で取得する
// sync.Once パターンにより、テスト時の panic を防ぎ、必要な時に初期化される
func getJWTSecret() []byte {
	jwtSecretOnce.Do(func() {
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			log.Fatal("JWT_SECRET environment variable is required")
		}
		jwtSecret = []byte(secret)
	})
	return jwtSecret
}

// JWTAuthMiddleware は JWT トークンの検証を行うミドルウェア。
func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
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
			return getJWTSecret(), nil
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

		// JTI（JWT ID）の取得とブラックリストチェック
		jti, jtiExists := claims["jti"].(string)
		if jtiExists {
			// Redisでブラックリストチェック
			isBlacklisted, err := services.IsTokenBlacklisted(jti)
			if err == nil && isBlacklisted {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "無効化されたトークンです"})
				c.Abort()
				return
			}
		}

		// ユーザーIDをコンテキストに設定
		userID, ok := claims["user_id"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザーIDが見つかりません"})
			c.Abort()
			return
		}

		c.Set("user_id", userID)
		if jtiExists {
			c.Set("jti", jti)
		}

		// 有効期限もコンテキストに設定
		if exp, expExists := claims["exp"]; expExists {
			c.Set("exp", exp)
		}

		// 追加のユーザー情報をコンテキストに設定
		if isAdmin, exists := claims["isAdmin"]; exists {
			c.Set("is_admin", isAdmin)
		}

		if role, exists := claims["role"]; exists {
			c.Set("role", role)
		}

		c.Next()
	}
}
