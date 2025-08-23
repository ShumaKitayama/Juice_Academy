package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// setupJWTTestRouter はJWTテスト用のGinルーターを作成する
func setupJWTTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	// テスト用の保護されたルートを設定
	protected := router.Group("/protected")
	protected.Use(JWTAuthMiddleware())
	{
		protected.GET("/test", func(c *gin.Context) {
			userID, exists := c.Get("user_id")
			if !exists {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "user_id not found in context"})
				return
			}
			
			c.JSON(http.StatusOK, gin.H{
				"message": "Success",
				"user_id": userID,
			})
		})
	}
	
	return router
}

// generateTestToken はテスト用のJWTトークンを生成する
func generateTestToken(userID, email, role string, isAdmin bool, expiry time.Time) string {
	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"role":    role,
		"isAdmin": isAdmin,
		"exp":     expiry.Unix(),
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	// テスト用の固定シークレットを使用（環境変数が設定されていない場合）
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "test-jwt-secret-key-minimum-32-characters-long"
	}
	tokenString, _ := token.SignedString([]byte(secret))
	return tokenString
}

// TestJWTAuthMiddleware はJWT認証ミドルウェアのテストを行う
func TestJWTAuthMiddleware(t *testing.T) {
	tests := []struct {
		name               string
		setupToken         func() string
		expectedStatusCode int
		description        string
	}{
		{
			name: "有効なJWTトークン",
			setupToken: func() string {
				return generateTestToken(
					"507f1f77bcf86cd799439011",
					"test@example.com",
					"student",
					false,
					time.Now().Add(time.Hour),
				)
			},
			expectedStatusCode: http.StatusOK,
			description:        "有効なJWTトークンでアクセスが許可されること",
		},
		{
			name: "期限切れのJWTトークン",
			setupToken: func() string {
				return generateTestToken(
					"507f1f77bcf86cd799439033",
					"expired@example.com",
					"student",
					false,
					time.Now().Add(-time.Hour), // 1時間前に期限切れ
				)
			},
			expectedStatusCode: http.StatusUnauthorized,
			description:        "期限切れのJWTトークンでアクセスが拒否されること",
		},
		{
			name: "認証ヘッダーなし",
			setupToken: func() string {
				return ""
			},
			expectedStatusCode: http.StatusUnauthorized,
			description:        "認証ヘッダーがない場合にアクセスが拒否されること",
		},
		{
			name: "不正な形式のトークン",
			setupToken: func() string {
				return "invalid.token.format"
			},
			expectedStatusCode: http.StatusUnauthorized,
			description:        "不正な形式のトークンでアクセスが拒否されること",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// リクエストを作成
			req, _ := http.NewRequest("GET", "/protected/test", nil)
			
			// 認証ヘッダーを設定
			token := tt.setupToken()
			if token != "" {
				req.Header.Set("Authorization", "Bearer "+token)
			}
			
			// レスポンスレコーダーを作成
			w := httptest.NewRecorder()
			router := setupJWTTestRouter()
			
			// リクエストを実行
			router.ServeHTTP(w, req)
			
			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, w.Code, tt.description)
			
			// レスポンスがJSONであることを確認
			contentType := w.Header().Get("Content-Type")
			assert.True(t, strings.Contains(contentType, "application/json"), "レスポンスはJSON形式であるべき")
		})
	}
}

// TestJWTAuthMiddlewareEdgeCases はエッジケースのテストを行う
func TestJWTAuthMiddlewareEdgeCases(t *testing.T) {
	edgeCases := []struct {
		name               string
		authHeader         string
		expectedStatusCode int
		description        string
	}{
		{
			name:               "空のBearerトークン",
			authHeader:         "Bearer ",
			expectedStatusCode: http.StatusUnauthorized,
			description:        "空のBearerトークンでアクセスが拒否されること",
		},
		{
			name:               "Bearer以外の認証スキーム",
			authHeader:         "Basic dXNlcjpwYXNzd29yZA==",
			expectedStatusCode: http.StatusUnauthorized,
			description:        "Bearer以外の認証スキームでアクセスが拒否されること",
		},
		{
			name:               "小文字のbearer",
			authHeader:         "bearer " + generateTestToken("test", "test@example.com", "student", false, time.Now().Add(time.Hour)),
			expectedStatusCode: http.StatusUnauthorized,
			description:        "小文字のbearerでアクセスが拒否されること",
		},
	}

	for _, tc := range edgeCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", "/protected/test", nil)
			req.Header.Set("Authorization", tc.authHeader)
			
			w := httptest.NewRecorder()
			router := setupJWTTestRouter()
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tc.expectedStatusCode, w.Code, tc.description)
		})
	}
}

