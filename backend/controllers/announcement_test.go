package controllers

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AnnouncementTestSuite はお知らせ機能のテストスイート
type AnnouncementTestSuite struct {
	TestSuite
}

// TestAnnouncementSuite はテストスイートを実行
func TestAnnouncementSuite(t *testing.T) {
	suite.Run(t, new(AnnouncementTestSuite))
}

// TestGetAnnouncementsHandler はお知らせ一覧取得のテストを行う
func (suite *AnnouncementTestSuite) TestGetAnnouncementsHandler() {
	tests := []struct {
		name               string
		setupData          []map[string]string // テスト用のお知らせデータ
		expectedStatusCode int
		expectedCount      int
		description        string
	}{
		{
			name:               "空のお知らせ一覧",
			setupData:          []map[string]string{},
			expectedStatusCode: http.StatusOK,
			expectedCount:      0,
			description:        "お知らせが存在しない場合に空の配列が返されること",
		},
		{
			name: "単一のお知らせ",
			setupData: []map[string]string{
				{
					"title":   "テストお知らせ1",
					"content": "これは最初のテストお知らせです。",
				},
			},
			expectedStatusCode: http.StatusOK,
			expectedCount:      1,
			description:        "単一のお知らせが正しく取得されること",
		},
		{
			name: "複数のお知らせ",
			setupData: []map[string]string{
				{
					"title":   "テストお知らせ1",
					"content": "これは最初のテストお知らせです。",
				},
				{
					"title":   "テストお知らせ2", 
					"content": "これは2番目のテストお知らせです。",
				},
				{
					"title":   "テストお知らせ3",
					"content": "これは3番目のテストお知らせです。",
				},
			},
			expectedStatusCode: http.StatusOK,
			expectedCount:      3,
			description:        "複数のお知らせが正しく取得されること",
		},
	}

	for _, tt := range tests {
		suite.T().Run(tt.name, func(t *testing.T) {
			// テストデータをセットアップ
			suite.clearDatabase()
			for _, data := range tt.setupData {
				_, err := suite.CreateTestAnnouncement(data["title"], data["content"])
				assert.NoError(t, err)
			}

			response := suite.MakeRequest("GET", "/api/announcements", nil)

			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)

			// レスポンスの解析
			var jsonResponse map[string]interface{}
			err := suite.ParseJSONResponse(response, &jsonResponse)
			assert.NoError(t, err)

			// お知らせの数を確認
			announcements := jsonResponse["announcements"].([]interface{})
			assert.Equal(t, tt.expectedCount, len(announcements), "お知らせの数が期待値と一致しません")
			assert.Equal(t, tt.expectedCount, int(jsonResponse["count"].(float64)), "カウント値が期待値と一致しません")

			// データが存在する場合の詳細検証
			if tt.expectedCount > 0 {
				firstAnnouncement := announcements[0].(map[string]interface{})
				assert.Contains(t, firstAnnouncement, "id")
				assert.Contains(t, firstAnnouncement, "title")
				assert.Contains(t, firstAnnouncement, "content")
				assert.Contains(t, firstAnnouncement, "createdAt")
				assert.Contains(t, firstAnnouncement, "updatedAt")
			}
		})
	}
}

// TestGetAnnouncementByIdHandler はお知らせ詳細取得のテストを行う
func (suite *AnnouncementTestSuite) TestGetAnnouncementByIdHandler() {
	// テスト用お知らせを作成
	testTitle := "詳細テストお知らせ"
	testContent := "これは詳細取得のテスト用お知らせです。"
	announcementID, err := suite.CreateTestAnnouncement(testTitle, testContent)
	assert.NoError(suite.T(), err)

	tests := []struct {
		name               string
		announcementID     string
		expectedStatusCode int
		expectedKeys       []string
		description        string
	}{
		{
			name:               "正常な詳細取得",
			announcementID:     announcementID,
			expectedStatusCode: http.StatusOK,
			expectedKeys:       []string{"id", "title", "content", "createdAt", "updatedAt"},
			description:        "存在するお知らせIDで詳細が取得できること",
		},
		{
			name:               "存在しないお知らせID",
			announcementID:     primitive.NewObjectID().Hex(),
			expectedStatusCode: http.StatusNotFound,
			expectedKeys:       []string{"error"},
			description:        "存在しないお知らせIDで404エラーが返されること",
		},
		{
			name:               "無効なお知らせID形式",
			announcementID:     "invalid-id",
			expectedStatusCode: http.StatusBadRequest,
			expectedKeys:       []string{"error"},
			description:        "無効なID形式で400エラーが返されること",
		},
	}

	for _, tt := range tests {
		suite.T().Run(tt.name, func(t *testing.T) {
			response := suite.MakeRequest("GET", fmt.Sprintf("/api/announcements/%s", tt.announcementID), nil)

			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)

			// レスポンスの形式と内容の検証
			suite.AssertJSONResponse(response, tt.expectedStatusCode, tt.expectedKeys...)

			// 成功ケースの場合、内容を詳細確認
			if tt.expectedStatusCode == http.StatusOK {
				var announcement map[string]interface{}
				err := suite.ParseJSONResponse(response, &announcement)
				assert.NoError(t, err)
				assert.Equal(t, testTitle, announcement["title"])
				assert.Equal(t, testContent, announcement["content"])
			}
		})
	}
}

// TestCreateAnnouncementHandler はお知らせ作成のテストを行う
func (suite *AnnouncementTestSuite) TestCreateAnnouncementHandler() {
	// 管理者ユーザーを作成
	adminEmail := "admin@example.com"
	adminPassword := "adminpass"
	adminUserID, err := suite.CreateTestUser(adminEmail, adminPassword, true)
	assert.NoError(suite.T(), err)
	adminToken := suite.GenerateJWTToken(adminUserID, adminEmail, "admin", true)

	// 一般ユーザーを作成
	userEmail := "user@example.com"
	userPassword := "userpass"
	userID, err := suite.CreateTestUser(userEmail, userPassword, false)
	assert.NoError(suite.T(), err)
	userToken := suite.GenerateJWTToken(userID, userEmail, "student", false)

	tests := []struct {
		name               string
		token              string
		requestBody        map[string]interface{}
		expectedStatusCode int
		expectedKeys       []string
		description        string
	}{
		{
			name:  "管理者による正常な作成",
			token: adminToken,
			requestBody: map[string]interface{}{
				"title":   "新しいお知らせ",
				"content": "これは新しく作成されたお知らせです。",
			},
			expectedStatusCode: http.StatusCreated,
			expectedKeys:       []string{"id", "title", "content", "createdAt", "updatedAt"},
			description:        "管理者が正常にお知らせを作成できること",
		},
		{
			name:  "一般ユーザーによる作成（権限なし）",
			token: userToken,
			requestBody: map[string]interface{}{
				"title":   "一般ユーザーのお知らせ",
				"content": "一般ユーザーが作成しようとするお知らせ",
			},
			expectedStatusCode: http.StatusForbidden,
			expectedKeys:       []string{"error"},
			description:        "一般ユーザーは権限がないため作成が拒否されること",
		},
		{
			name:  "認証なしでの作成",
			token: "",
			requestBody: map[string]interface{}{
				"title":   "認証なしのお知らせ",
				"content": "認証なしで作成しようとするお知らせ",
			},
			expectedStatusCode: http.StatusUnauthorized,
			expectedKeys:       []string{"error"},
			description:        "認証なしでは作成が拒否されること",
		},
		{
			name:  "無効なリクエスト（タイトル不足）",
			token: adminToken,
			requestBody: map[string]interface{}{
				"content": "タイトルが不足しているお知らせ",
			},
			expectedStatusCode: http.StatusBadRequest,
			expectedKeys:       []string{"error"},
			description:        "必須項目が不足している場合にエラーが返されること",
		},
		{
			name:  "無効なリクエスト（内容不足）",
			token: adminToken,
			requestBody: map[string]interface{}{
				"title": "内容が不足しているお知らせ",
			},
			expectedStatusCode: http.StatusBadRequest,
			expectedKeys:       []string{"error"},
			description:        "内容が不足している場合にエラーが返されること",
		},
		{
			name:  "空のタイトル",
			token: adminToken,
			requestBody: map[string]interface{}{
				"title":   "",
				"content": "空のタイトルのお知らせです。",
			},
			expectedStatusCode: http.StatusBadRequest,
			expectedKeys:       []string{"error"},
			description:        "空のタイトルの場合にエラーが返されること",
		},
	}

	for _, tt := range tests {
		suite.T().Run(tt.name, func(t *testing.T) {
			var response *httptest.ResponseRecorder
			if tt.token != "" {
				response = suite.MakeAuthenticatedRequest("POST", "/api/announcements", tt.token, tt.requestBody)
			} else {
				response = suite.MakeRequest("POST", "/api/announcements", tt.requestBody)
			}

			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)

			// レスポンスの形式と内容の検証
			suite.AssertJSONResponse(response, tt.expectedStatusCode, tt.expectedKeys...)

			// 成功ケースの場合、データベースに保存されているか確認
			if tt.expectedStatusCode == http.StatusCreated {
				var jsonResponse map[string]interface{}
				err := suite.ParseJSONResponse(response, &jsonResponse)
				assert.NoError(t, err)
				assert.Equal(t, tt.requestBody["title"], jsonResponse["title"])
				assert.Equal(t, tt.requestBody["content"], jsonResponse["content"])
			}
		})
	}
}

// TestUpdateAnnouncementHandler はお知らせ更新のテストを行う
func (suite *AnnouncementTestSuite) TestUpdateAnnouncementHandler() {
	// テスト用お知らせを作成
	originalTitle := "更新前のタイトル"
	originalContent := "更新前の内容です。"
	announcementID, err := suite.CreateTestAnnouncement(originalTitle, originalContent)
	assert.NoError(suite.T(), err)

	// 管理者ユーザーを作成
	adminEmail := "admin@example.com"
	adminPassword := "adminpass"
	adminUserID, err := suite.CreateTestUser(adminEmail, adminPassword, true)
	assert.NoError(suite.T(), err)
	adminToken := suite.GenerateJWTToken(adminUserID, adminEmail, "admin", true)

	// 一般ユーザーを作成
	userEmail := "user@example.com"
	userPassword := "userpass"
	userID, err := suite.CreateTestUser(userEmail, userPassword, false)
	assert.NoError(suite.T(), err)
	userToken := suite.GenerateJWTToken(userID, userEmail, "student", false)

	tests := []struct {
		name               string
		token              string
		announcementID     string
		requestBody        map[string]interface{}
		expectedStatusCode int
		expectedKeys       []string
		description        string
	}{
		{
			name:           "管理者による正常な更新",
			token:          adminToken,
			announcementID: announcementID,
			requestBody: map[string]interface{}{
				"title":   "更新後のタイトル",
				"content": "更新後の内容です。",
			},
			expectedStatusCode: http.StatusOK,
			expectedKeys:       []string{"id", "title", "content", "createdAt", "updatedAt"},
			description:        "管理者が正常にお知らせを更新できること",
		},
		{
			name:           "一般ユーザーによる更新（権限なし）",
			token:          userToken,
			announcementID: announcementID,
			requestBody: map[string]interface{}{
				"title": "一般ユーザーによる更新",
			},
			expectedStatusCode: http.StatusForbidden,
			expectedKeys:       []string{"error"},
			description:        "一般ユーザーは権限がないため更新が拒否されること",
		},
		{
			name:           "存在しないお知らせの更新",
			token:          adminToken,
			announcementID: primitive.NewObjectID().Hex(),
			requestBody: map[string]interface{}{
				"title": "存在しないお知らせの更新",
			},
			expectedStatusCode: http.StatusNotFound,
			expectedKeys:       []string{"error"},
			description:        "存在しないお知らせを更新しようとした場合にエラーが返されること",
		},
		{
			name:           "無効なID形式",
			token:          adminToken,
			announcementID: "invalid-id",
			requestBody: map[string]interface{}{
				"title": "無効IDの更新",
			},
			expectedStatusCode: http.StatusBadRequest,
			expectedKeys:       []string{"error"},
			description:        "無効なID形式の場合にエラーが返されること",
		},
	}

	for _, tt := range tests {
		suite.T().Run(tt.name, func(t *testing.T) {
			url := fmt.Sprintf("/api/announcements/%s", tt.announcementID)
			response := suite.MakeAuthenticatedRequest("PUT", url, tt.token, tt.requestBody)

			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)

			// レスポンスの形式と内容の検証
			suite.AssertJSONResponse(response, tt.expectedStatusCode, tt.expectedKeys...)

			// 成功ケースの場合、更新内容を確認
			if tt.expectedStatusCode == http.StatusOK {
				var jsonResponse map[string]interface{}
				err := suite.ParseJSONResponse(response, &jsonResponse)
				assert.NoError(t, err)
				if title, exists := tt.requestBody["title"]; exists {
					assert.Equal(t, title, jsonResponse["title"])
				}
				if content, exists := tt.requestBody["content"]; exists {
					assert.Equal(t, content, jsonResponse["content"])
				}
			}
		})
	}
}

// TestDeleteAnnouncementHandler はお知らせ削除のテストを行う
func (suite *AnnouncementTestSuite) TestDeleteAnnouncementHandler() {
	// テスト用お知らせを作成
	testTitle := "削除テスト用お知らせ"
	testContent := "これは削除テスト用のお知らせです。"
	announcementID, err := suite.CreateTestAnnouncement(testTitle, testContent)
	assert.NoError(suite.T(), err)

	// 管理者ユーザーを作成
	adminEmail := "admin@example.com"
	adminPassword := "adminpass"
	adminUserID, err := suite.CreateTestUser(adminEmail, adminPassword, true)
	assert.NoError(suite.T(), err)
	adminToken := suite.GenerateJWTToken(adminUserID, adminEmail, "admin", true)

	// 一般ユーザーを作成
	userEmail := "user@example.com"
	userPassword := "userpass"
	userID, err := suite.CreateTestUser(userEmail, userPassword, false)
	assert.NoError(suite.T(), err)
	userToken := suite.GenerateJWTToken(userID, userEmail, "student", false)

	tests := []struct {
		name               string
		token              string
		announcementID     string
		expectedStatusCode int
		expectedKeys       []string
		description        string
	}{
		{
			name:               "一般ユーザーによる削除（権限なし）",
			token:              userToken,
			announcementID:     announcementID,
			expectedStatusCode: http.StatusForbidden,
			expectedKeys:       []string{"error"},
			description:        "一般ユーザーは権限がないため削除が拒否されること",
		},
		{
			name:               "存在しないお知らせの削除",
			token:              adminToken,
			announcementID:     primitive.NewObjectID().Hex(),
			expectedStatusCode: http.StatusNotFound,
			expectedKeys:       []string{"error"},
			description:        "存在しないお知らせを削除しようとした場合にエラーが返されること",
		},
		{
			name:               "無効なID形式",
			token:              adminToken,
			announcementID:     "invalid-id",
			expectedStatusCode: http.StatusBadRequest,
			expectedKeys:       []string{"error"},
			description:        "無効なID形式の場合にエラーが返されること",
		},
		{
			name:               "管理者による正常な削除",
			token:              adminToken,
			announcementID:     announcementID,
			expectedStatusCode: http.StatusOK,
			expectedKeys:       []string{"message"},
			description:        "管理者が正常にお知らせを削除できること",
		},
	}

	for _, tt := range tests {
		suite.T().Run(tt.name, func(t *testing.T) {
			url := fmt.Sprintf("/api/announcements/%s", tt.announcementID)
			response := suite.MakeAuthenticatedRequest("DELETE", url, tt.token, nil)

			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)

			// レスポンスの形式と内容の検証
			suite.AssertJSONResponse(response, tt.expectedStatusCode, tt.expectedKeys...)

			// 削除成功の場合、実際に削除されているかGETで確認
			if tt.expectedStatusCode == http.StatusOK {
				getResponse := suite.MakeRequest("GET", fmt.Sprintf("/api/announcements/%s", tt.announcementID), nil)
				assert.Equal(t, http.StatusNotFound, getResponse.Code, "削除されたお知らせがまだ取得可能です")
			}
		})
	}
}
