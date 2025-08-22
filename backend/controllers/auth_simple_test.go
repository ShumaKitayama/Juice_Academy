package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// setupTestRouter はテスト用のGinルーターを作成する
func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	// テスト用のルートを設定
	api := router.Group("/api")
	{
		api.POST("/register", TestBasicRegisterHandler)
		api.POST("/login", TestBasicLoginHandler)
	}
	
	return router
}

// makeRequest はHTTPリクエストを作成して実行する
func makeRequest(method, url string, body interface{}) *httptest.ResponseRecorder {
	var jsonBody []byte
	if body != nil {
		jsonBody, _ = json.Marshal(body)
	}

	req, _ := http.NewRequest(method, url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router := setupTestRouter()
	router.ServeHTTP(w, req)

	return w
}

// TestRegisterHandler はユーザー登録のテストを行う
func TestRegisterHandler(t *testing.T) {
	tests := []struct {
		name               string
		requestBody        map[string]interface{}
		expectedStatusCode int
		description        string
	}{
		{
			name: "正常な登録",
			requestBody: map[string]interface{}{
				"role":       "student",
				"student_id": "test001",
				"name_kana":  "テストユーザー",
				"email":      "test@example.com",
				"password":   "password123",
			},
			expectedStatusCode: http.StatusCreated,
			description:        "有効なデータでユーザー登録が成功すること",
		},
		{
			name: "無効なメールアドレス",
			requestBody: map[string]interface{}{
				"role":       "student",
				"student_id": "test002",
				"name_kana":  "テストユーザー",
				"email":      "invalid-email",
				"password":   "password123",
			},
			expectedStatusCode: http.StatusBadRequest,
			description:        "無効なメールアドレスで登録が失敗すること",
		},
		{
			name: "必須フィールド不足",
			requestBody: map[string]interface{}{
				"role":     "student",
				"email":    "test2@example.com",
				"password": "password123",
				// student_id と name_kana が不足
			},
			expectedStatusCode: http.StatusBadRequest,
			description:        "必須フィールドが不足している場合に登録が失敗すること",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := makeRequest("POST", "/api/register", tt.requestBody)
			
			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)
			
			// レスポンスがJSONであることを確認
			contentType := response.Header().Get("Content-Type")
			assert.True(t, strings.Contains(contentType, "application/json"), "レスポンスはJSON形式であるべき")
		})
	}
}

// TestLoginHandler はログインのテストを行う
func TestLoginHandler(t *testing.T) {
	tests := []struct {
		name               string
		requestBody        map[string]interface{}
		expectedStatusCode int
		description        string
	}{
		{
			name: "無効なメールアドレス形式",
			requestBody: map[string]interface{}{
				"email":    "invalid-email",
				"password": "password123",
			},
			expectedStatusCode: http.StatusBadRequest,
			description:        "無効なメールアドレス形式でログインが失敗すること",
		},
		{
			name: "存在しないユーザー",
			requestBody: map[string]interface{}{
				"email":    "nonexistent@example.com",
				"password": "password123",
			},
			expectedStatusCode: http.StatusUnauthorized,
			description:        "存在しないユーザーでログインが失敗すること",
		},
		{
			name: "空のメールアドレス",
			requestBody: map[string]interface{}{
				"email":    "",
				"password": "password123",
			},
			expectedStatusCode: http.StatusBadRequest,
			description:        "空のメールアドレスでログインが失敗すること",
		},
		{
			name: "空のパスワード",
			requestBody: map[string]interface{}{
				"email":    "test@example.com",
				"password": "",
			},
			expectedStatusCode: http.StatusBadRequest,
			description:        "空のパスワードでログインが失敗すること",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := makeRequest("POST", "/api/login", tt.requestBody)
			
			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)
			
			// レスポンスがJSONであることを確認
			contentType := response.Header().Get("Content-Type")
			assert.True(t, strings.Contains(contentType, "application/json"), "レスポンスはJSON形式であるべき")
		})
	}
}
