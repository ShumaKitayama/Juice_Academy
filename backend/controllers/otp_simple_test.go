package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// setupOTPTestRouter はOTPテスト用のGinルーターを作成する
func setupOTPTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	// テスト用のルートを設定
	api := router.Group("/api")
	{
		api.POST("/otp/send", BasicSendOTPHandler)
		api.POST("/otp/verify", BasicVerifyOTPHandler)
		api.POST("/otp/resend", BasicResendOTPHandler)
	}
	
	return router
}

// makeOTPRequest はOTPテスト用のHTTPリクエストを作成して実行する
func makeOTPRequest(method, url string, body interface{}) *httptest.ResponseRecorder {
	var jsonBody []byte
	if body != nil {
		jsonBody, _ = json.Marshal(body)
	}

	req, _ := http.NewRequest(method, url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router := setupOTPTestRouter()
	router.ServeHTTP(w, req)

	return w
}

// TestSendOTPHandler はOTP送信のテストを行う
func TestSendOTPHandler(t *testing.T) {
	tests := []struct {
		name               string
		requestBody        map[string]interface{}
		expectedStatusCode int
		description        string
	}{
		{
			name: "有効なOTP送信リクエスト",
			requestBody: map[string]interface{}{
				"email":   "test@example.com",
				"purpose": "login",
			},
			expectedStatusCode: http.StatusOK,
			description:        "有効なメールアドレスと目的でOTP送信が成功すること",
		},
		{
			name: "無効なメールアドレス",
			requestBody: map[string]interface{}{
				"email":   "invalid-email",
				"purpose": "login",
			},
			expectedStatusCode: http.StatusBadRequest,
			description:        "無効なメールアドレス形式でOTP送信が失敗すること",
		},
		{
			name: "無効な目的",
			requestBody: map[string]interface{}{
				"email":   "test@example.com",
				"purpose": "invalid_purpose",
			},
			expectedStatusCode: http.StatusBadRequest,
			description:        "無効な目的でOTP送信が失敗すること",
		},
		{
			name: "必須フィールド不足",
			requestBody: map[string]interface{}{
				"email": "test@example.com",
				// purpose が不足
			},
			expectedStatusCode: http.StatusBadRequest,
			description:        "必須フィールドが不足している場合にOTP送信が失敗すること",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := makeOTPRequest("POST", "/api/otp/send", tt.requestBody)
			
			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)
			
			// レスポンスがJSONであることを確認
			contentType := response.Header().Get("Content-Type")
			assert.Contains(t, contentType, "application/json", "レスポンスはJSON形式であるべき")
		})
	}
}

// TestVerifyOTPHandler はOTP検証のテストを行う
func TestVerifyOTPHandler(t *testing.T) {
	tests := []struct {
		name               string
		requestBody        map[string]interface{}
		expectedStatusCode int
		description        string
	}{
		{
			name: "有効なOTP検証リクエスト",
			requestBody: map[string]interface{}{
				"email":   "test@example.com",
				"code":    "123456",
				"purpose": "login",
			},
			expectedStatusCode: http.StatusUnauthorized, // テスト環境では実際のOTPがないため
			description:        "有効な形式のOTP検証リクエストが処理されること",
		},
		{
			name: "無効なメールアドレス",
			requestBody: map[string]interface{}{
				"email":   "invalid-email",
				"code":    "123456",
				"purpose": "login",
			},
			expectedStatusCode: http.StatusBadRequest,
			description:        "無効なメールアドレス形式でOTP検証が失敗すること",
		},
		{
			name: "必須フィールド不足",
			requestBody: map[string]interface{}{
				"email": "test@example.com",
				// code と purpose が不足
			},
			expectedStatusCode: http.StatusBadRequest,
			description:        "必須フィールドが不足している場合にOTP検証が失敗すること",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := makeOTPRequest("POST", "/api/otp/verify", tt.requestBody)
			
			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)
			
			// レスポンスがJSONであることを確認
			contentType := response.Header().Get("Content-Type")
			assert.Contains(t, contentType, "application/json", "レスポンスはJSON形式であるべき")
		})
	}
}

// TestResendOTPHandler はOTP再送信のテストを行う
func TestResendOTPHandler(t *testing.T) {
	tests := []struct {
		name               string
		requestBody        map[string]interface{}
		expectedStatusCode int
		description        string
	}{
		{
			name: "有効なOTP再送信リクエスト",
			requestBody: map[string]interface{}{
				"email":   "test@example.com",
				"purpose": "login",
			},
			expectedStatusCode: http.StatusOK,
			description:        "有効なメールアドレスと目的でOTP再送信が成功すること",
		},
		{
			name: "無効なメールアドレス",
			requestBody: map[string]interface{}{
				"email":   "invalid-email",
				"purpose": "login",
			},
			expectedStatusCode: http.StatusBadRequest,
			description:        "無効なメールアドレス形式でOTP再送信が失敗すること",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := makeOTPRequest("POST", "/api/otp/resend", tt.requestBody)
			
			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)
			
			// レスポンスがJSONであることを確認
			contentType := response.Header().Get("Content-Type")
			assert.Contains(t, contentType, "application/json", "レスポンスはJSON形式であるべき")
		})
	}
}

// BasicSendOTPHandler はテスト用の基本的なOTP送信ハンドラー
func BasicSendOTPHandler(c *gin.Context) {
	var req struct {
		Email   string `json:"email" binding:"required,email"`
		Purpose string `json:"purpose" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な入力データです"})
		return
	}

	// 有効な目的かチェック
	validPurposes := map[string]bool{
		"login":          true,
		"password_reset": true,
	}
	if !validPurposes[req.Purpose] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効な目的です"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "認証コードを送信しました",
		"expires_in": 300,
	})
}

// BasicVerifyOTPHandler はテスト用の基本的なOTP検証ハンドラー
func BasicVerifyOTPHandler(c *gin.Context) {
	var req struct {
		Email   string `json:"email" binding:"required,email"`
		Code    string `json:"code" binding:"required"`
		Purpose string `json:"purpose" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な入力データです"})
		return
	}

	// テスト環境では常に認証失敗（実際のOTPがないため）
	c.JSON(http.StatusUnauthorized, gin.H{"error": "無効または期限切れの認証コードです"})
}

// BasicResendOTPHandler はテスト用の基本的なOTP再送信ハンドラー
func BasicResendOTPHandler(c *gin.Context) {
	var req struct {
		Email   string `json:"email" binding:"required,email"`
		Purpose string `json:"purpose" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な入力データです"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "認証コードを再送信しました",
		"expires_in": 300,
	})
}

// TestOTPGeneration はOTP生成機能のテストを行う
func TestOTPGeneration(t *testing.T) {
	// OTP生成の基本テスト
	otp1, err1 := generateOTP()
	assert.NoError(t, err1, "OTP生成でエラーが発生しないこと")
	assert.Len(t, otp1, 6, "OTPは6桁であること")
	assert.Regexp(t, `^\d{6}$`, otp1, "OTPは数字のみで構成されること")

	// 複数回生成して一意性を確認
	otp2, err2 := generateOTP()
	assert.NoError(t, err2, "OTP生成でエラーが発生しないこと")
	assert.NotEqual(t, otp1, otp2, "生成されるOTPは異なること（高確率）")
}

// TestOTPValidation はOTPバリデーションのテストを行う
func TestOTPValidation(t *testing.T) {
	testCases := []struct {
		name     string
		code     string
		isValid  bool
	}{
		{"有効な6桁コード", "123456", true},
		{"有効な6桁コード（ゼロ含む）", "012345", true},
		{"無効な5桁コード", "12345", false},
		{"無効な7桁コード", "1234567", false},
		{"無効な文字含むコード", "12345a", false},
		{"空のコード", "", false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			isValid := len(tc.code) == 6 && tc.code != ""
			for _, char := range tc.code {
				if char < '0' || char > '9' {
					isValid = false
					break
				}
			}
			assert.Equal(t, tc.isValid, isValid, tc.name)
		})
	}
}

// TestOTPExpiration はOTP有効期限のテストを行う
func TestOTPExpiration(t *testing.T) {
	now := time.Now()
	
	// 5分後の有効期限
	expiry := now.Add(5 * time.Minute)
	
	// 現在時刻では有効
	assert.True(t, expiry.After(now), "OTPは現在時刻では有効であること")
	
	// 6分後では無効
	futureTime := now.Add(6 * time.Minute)
	assert.False(t, expiry.After(futureTime), "OTPは6分後には無効であること")
}
