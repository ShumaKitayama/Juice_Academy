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

// setupAnnouncementTestRouter はお知らせテスト用のGinルーターを作成する
func setupAnnouncementTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	// テスト用のルートを設定
	api := router.Group("/api")
	{
		api.GET("/announcements", TestBasicAnnouncementsHandler)
		api.GET("/announcements/:id", TestBasicAnnouncementByIdHandler)
	}
	
	return router
}

// makeAnnouncementRequest はお知らせテスト用のHTTPリクエストを作成して実行する
func makeAnnouncementRequest(method, url string, body interface{}) *httptest.ResponseRecorder {
	var jsonBody []byte
	if body != nil {
		jsonBody, _ = json.Marshal(body)
	}

	req, _ := http.NewRequest(method, url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router := setupAnnouncementTestRouter()
	router.ServeHTTP(w, req)

	return w
}

// TestGetAnnouncementsHandler はお知らせ一覧取得のテストを行う
func TestGetAnnouncementsHandler(t *testing.T) {
	tests := []struct {
		name               string
		expectedStatusCode int
		description        string
	}{
		{
			name:               "お知らせ一覧取得",
			expectedStatusCode: http.StatusOK,
			description:        "お知らせ一覧が正常に取得されること",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := makeAnnouncementRequest("GET", "/api/announcements", nil)
			
			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)
			
			// レスポンスがJSONであることを確認
			contentType := response.Header().Get("Content-Type")
			assert.True(t, strings.Contains(contentType, "application/json"), "レスポンスはJSON形式であるべき")
			
			// レスポンスの構造を確認
			var jsonResponse map[string]interface{}
			err := json.Unmarshal(response.Body.Bytes(), &jsonResponse)
			assert.NoError(t, err, "レスポンスのJSONパースに成功するべき")
			
			// 期待される属性が存在することを確認
			_, hasAnnouncements := jsonResponse["announcements"]
			_, hasCount := jsonResponse["count"]
			assert.True(t, hasAnnouncements, "announcementsキーが存在するべき")
			assert.True(t, hasCount, "countキーが存在するべき")
		})
	}
}

// TestGetAnnouncementByIdHandler はお知らせ詳細取得のテストを行う
func TestGetAnnouncementByIdHandler(t *testing.T) {
	tests := []struct {
		name               string
		announcementID     string
		expectedStatusCode int
		description        string
	}{
		{
			name:               "無効なお知らせID形式",
			announcementID:     "invalid-id",
			expectedStatusCode: http.StatusBadRequest,
			description:        "無効なID形式で400エラーが返されること",
		},
		{
			name:               "存在しないお知らせID",
			announcementID:     "507f1f77bcf86cd799439011", // 有効なObjectID形式だが存在しない
			expectedStatusCode: http.StatusNotFound,
			description:        "存在しないお知らせIDで404エラーが返されること",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/api/announcements/" + tt.announcementID
			response := makeAnnouncementRequest("GET", url, nil)
			
			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)
			
			// エラーレスポンスがJSONであることを確認
			contentType := response.Header().Get("Content-Type")
			assert.True(t, strings.Contains(contentType, "application/json"), "レスポンスはJSON形式であるべき")
		})
	}
}
