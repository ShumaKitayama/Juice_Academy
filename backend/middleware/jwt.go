package middleware

import (
	"fmt"
	"juice_academy_backend/services"
	"net/http"
	"os"
	"strings"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
)

var jwtSecret []byte

func init() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		panic("JWT_SECRET environment variable is required")
	}
	jwtSecret = []byte(secret)
}

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

		// JTI（JWT ID）の取得とブラックリストチェック
		jti, jtiExists := claims["jti"].(string)
		if jtiExists {
			// Redisでブラックリストチェック
			isBlacklisted, err := services.IsTokenBlacklisted(jti)
			if err != nil {
				fmt.Printf("ブラックリストチェックエラー: %v\n", err)
				// エラーが発生した場合はログを出力するが、処理は継続
			} else if isBlacklisted {
				fmt.Printf("ブラックリストに登録されたトークン: jti=%s\n", jti)
				c.JSON(http.StatusUnauthorized, gin.H{"error": "無効化されたトークンです"})
				c.Abort()
				return
			}
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
		if jtiExists {
			c.Set("jti", jti)
		}
		
		// 有効期限もコンテキストに設定
		if exp, expExists := claims["exp"]; expExists {
			c.Set("exp", exp)
		}

		// 追加のユーザー情報をコンテキストに設定
		// 管理者フラグがあればそれも設定
		if isAdmin, exists := claims["isAdmin"]; exists {
			c.Set("is_admin", isAdmin)
			fmt.Printf("トークンから管理者フラグを設定: %v\n", isAdmin)
		}

		// ロールがあればそれも設定
		if role, exists := claims["role"]; exists {
			c.Set("role", role)
			fmt.Printf("トークンからロールを設定: %v\n", role)
		}

		c.Next()
	}
}
