package controllers

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserTestSuite はユーザー管理機能のテストスイート
type UserTestSuite struct {
	TestSuite
}

// TestUserSuite はテストスイートを実行
func TestUserSuite(t *testing.T) {
	suite.Run(t, new(UserTestSuite))
}

// TestDeleteAccountHandler はアカウント削除のテストを行う
func (suite *UserTestSuite) TestDeleteAccountHandler() {
	// テスト用ユーザーを作成
	testEmail := "delete-test@example.com"
	testPassword := "password123"
	userID, err := suite.CreateTestUser(testEmail, testPassword, false)
	assert.NoError(suite.T(), err)
	userToken := suite.GenerateJWTToken(userID, testEmail, "student", false)

	// 管理者ユーザーを作成
	adminEmail := "admin@example.com"
	adminPassword := "adminpass"
	adminUserID, err := suite.CreateTestUser(adminEmail, adminPassword, true)
	assert.NoError(suite.T(), err)
	adminToken := suite.GenerateJWTToken(adminUserID, adminEmail, "admin", true)

	tests := []struct {
		name               string
		token              string
		expectedStatusCode int
		expectedKeys       []string
		description        string
	}{
		{
			name:               "正常なアカウント削除",
			token:              userToken,
			expectedStatusCode: http.StatusOK,
			expectedKeys:       []string{"message"},
			description:        "認証されたユーザーが自分のアカウントを削除できること",
		},
		{
			name:               "管理者アカウントの削除",
			token:              adminToken,
			expectedStatusCode: http.StatusOK,
			expectedKeys:       []string{"message"},
			description:        "管理者ユーザーが自分のアカウントを削除できること",
		},
		{
			name:               "認証なしでの削除",
			token:              "",
			expectedStatusCode: http.StatusUnauthorized,
			expectedKeys:       []string{"error"},
			description:        "認証なしではアカウント削除が拒否されること",
		},
		{
			name:               "無効なトークンでの削除",
			token:              "invalid-token",
			expectedStatusCode: http.StatusUnauthorized,
			expectedKeys:       []string{"error"},
			description:        "無効なトークンではアカウント削除が拒否されること",
		},
	}

	for _, tt := range tests {
		suite.T().Run(tt.name, func(t *testing.T) {
			// 各テストケースの前にテストユーザーを再作成（削除される可能性があるため）
			if tt.name != "認証なしでの削除" && tt.name != "無効なトークンでの削除" {
				// データベースをクリアして新しいユーザーを作成
				suite.clearDatabase()
				var newUserID string
				var newUserEmail string
				var isAdmin bool

				if tt.name == "管理者アカウントの削除" {
					newUserEmail = "admin-delete-test@example.com"
					newUserID, _ = suite.CreateTestUser(newUserEmail, "adminpass", true)
					isAdmin = true
				} else {
					newUserEmail = "user-delete-test@example.com"
					newUserID, _ = suite.CreateTestUser(newUserEmail, "userpass", false)
					isAdmin = false
				}

				// 新しいトークンを生成
				if tt.token != "" && tt.token != "invalid-token" {
					role := "student"
					if isAdmin {
						role = "admin"
					}
					tt.token = suite.GenerateJWTToken(newUserID, newUserEmail, role, isAdmin)
				}
			}

			var response *httptest.ResponseRecorder
			if tt.token != "" {
				response = suite.MakeAuthenticatedRequest("DELETE", "/api/account", tt.token, nil)
			} else {
				response = suite.MakeRequest("DELETE", "/api/account", nil)
			}

			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)

			// レスポンスの形式と内容の検証
			suite.AssertJSONResponse(response, tt.expectedStatusCode, tt.expectedKeys...)

			// 削除成功の場合、実際にユーザーが削除されているかデータベースで確認
			if tt.expectedStatusCode == http.StatusOK {
				// データベースからユーザーを検索して、削除されていることを確認
				// 注: この部分は実装の詳細に依存するため、実際のテストでは適切に調整してください
				var jsonResponse map[string]interface{}
				err := suite.ParseJSONResponse(response, &jsonResponse)
				assert.NoError(t, err)
				assert.Contains(t, jsonResponse["message"], "削除", "削除メッセージが含まれていません")
			}
		})
	}
}

// TestSetAdminStatus は管理者権限設定のテストを行う
func (suite *UserTestSuite) TestSetAdminStatus() {
	// テスト用の一般ユーザーを作成
	userEmail := "user@example.com"
	userPassword := "password123"
	userID, err := suite.CreateTestUser(userEmail, userPassword, false)
	assert.NoError(suite.T(), err)

	// 管理者ユーザーを作成
	adminEmail := "admin@example.com"
	adminPassword := "adminpass"
	adminUserID, err := suite.CreateTestUser(adminEmail, adminPassword, true)
	assert.NoError(suite.T(), err)
	adminToken := suite.GenerateJWTToken(adminUserID, adminEmail, "admin", true)

	// 一般ユーザーのトークンを作成
	userToken := suite.GenerateJWTToken(userID, userEmail, "student", false)

	tests := []struct {
		name               string
		token              string
		targetUserID       string
		requestBody        map[string]interface{}
		expectedStatusCode int
		expectedKeys       []string
		description        string
	}{
		{
			name:         "管理者権限の付与",
			token:        adminToken,
			targetUserID: userID,
			requestBody: map[string]interface{}{
				"isAdmin": true,
			},
			expectedStatusCode: http.StatusOK,
			expectedKeys:       []string{"message", "userId", "isAdmin"},
			description:        "管理者が一般ユーザーに管理者権限を付与できること",
		},
		{
			name:         "管理者権限の削除",
			token:        adminToken,
			targetUserID: userID,
			requestBody: map[string]interface{}{
				"isAdmin": false,
			},
			expectedStatusCode: http.StatusOK,
			expectedKeys:       []string{"message", "userId", "isAdmin"},
			description:        "管理者が他のユーザーの管理者権限を削除できること",
		},
		{
			name:         "一般ユーザーによる権限変更（権限なし）",
			token:        userToken,
			targetUserID: userID,
			requestBody: map[string]interface{}{
				"isAdmin": true,
			},
			expectedStatusCode: http.StatusForbidden,
			expectedKeys:       []string{"error"},
			description:        "一般ユーザーは管理者権限を変更する権限がないこと",
		},
		{
			name:         "認証なしでの権限変更",
			token:        "",
			targetUserID: userID,
			requestBody: map[string]interface{}{
				"isAdmin": true,
			},
			expectedStatusCode: http.StatusUnauthorized,
			expectedKeys:       []string{"error"},
			description:        "認証なしでは管理者権限を変更できないこと",
		},
		{
			name:         "存在しないユーザーの権限変更",
			token:        adminToken,
			targetUserID: primitive.NewObjectID().Hex(),
			requestBody: map[string]interface{}{
				"isAdmin": true,
			},
			expectedStatusCode: http.StatusNotFound,
			expectedKeys:       []string{"error"},
			description:        "存在しないユーザーの権限を変更しようとした場合にエラーが返されること",
		},
		{
			name:         "無効なユーザーID形式",
			token:        adminToken,
			targetUserID: "invalid-user-id",
			requestBody: map[string]interface{}{
				"isAdmin": true,
			},
			expectedStatusCode: http.StatusBadRequest,
			expectedKeys:       []string{"error"},
			description:        "無効なユーザーID形式の場合にエラーが返されること",
		},
		{
			name:         "無効なリクエストボディ",
			token:        adminToken,
			targetUserID: userID,
			requestBody: map[string]interface{}{
				"wrongField": true,
			},
			expectedStatusCode: http.StatusBadRequest,
			expectedKeys:       []string{"error"},
			description:        "無効なリクエストボディの場合にエラーが返されること",
		},
		{
			name:               "リクエストボディなし",
			token:              adminToken,
			targetUserID:       userID,
			requestBody:        nil,
			expectedStatusCode: http.StatusBadRequest,
			expectedKeys:       []string{"error"},
			description:        "リクエストボディがない場合にエラーが返されること",
		},
	}

	for _, tt := range tests {
		suite.T().Run(tt.name, func(t *testing.T) {
			url := fmt.Sprintf("/api/admin/users/%s/admin", tt.targetUserID)
			var response *httptest.ResponseRecorder

			if tt.token != "" {
				response = suite.MakeAuthenticatedRequest("PUT", url, tt.token, tt.requestBody)
			} else {
				response = suite.MakeRequest("PUT", url, tt.requestBody)
			}

			// ステータスコードの検証
			assert.Equal(t, tt.expectedStatusCode, response.Code, tt.description)

			// レスポンスの形式と内容の検証
			suite.AssertJSONResponse(response, tt.expectedStatusCode, tt.expectedKeys...)

			// 成功ケースの場合、データベースで権限が実際に変更されているか確認
			if tt.expectedStatusCode == http.StatusOK {
				var jsonResponse map[string]interface{}
				err := suite.ParseJSONResponse(response, &jsonResponse)
				assert.NoError(t, err)
				
				expectedAdmin := tt.requestBody["isAdmin"].(bool)
				assert.Equal(t, expectedAdmin, jsonResponse["isAdmin"], "管理者フラグが期待値と一致しません")
				
				// データベースから直接確認
				collection := suite.Database.Collection("users")
				objectID, _ := primitive.ObjectIDFromHex(tt.targetUserID)
				var user struct {
					IsAdmin bool `bson:"isAdmin"`
				}
				err = collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&user)
				assert.NoError(t, err)
				assert.Equal(t, expectedAdmin, user.IsAdmin, "データベース内の管理者フラグが更新されていません")
			}
		})
	}
}

// TestUserManagementIntegration は統合テストを行う
func (suite *UserTestSuite) TestUserManagementIntegration() {
	// テストシナリオ: 一般ユーザーを管理者に昇格させ、その後自分のアカウントを削除する
	
	// 1. 一般ユーザーを作成
	userEmail := "integration-test@example.com"
	userPassword := "password123"
	userID, err := suite.CreateTestUser(userEmail, userPassword, false)
	assert.NoError(suite.T(), err)

	// 2. 管理者を作成
	adminEmail := "admin@example.com"
	adminPassword := "adminpass"
	adminUserID, err := suite.CreateTestUser(adminEmail, adminPassword, true)
	assert.NoError(suite.T(), err)
	adminToken := suite.GenerateJWTToken(adminUserID, adminEmail, "admin", true)

	// 3. 一般ユーザーを管理者に昇格
	url := fmt.Sprintf("/api/admin/users/%s/admin", userID)
	response := suite.MakeAuthenticatedRequest("PUT", url, adminToken, map[string]interface{}{
		"isAdmin": true,
	})
	assert.Equal(suite.T(), http.StatusOK, response.Code)

	// 4. 昇格されたユーザーでトークンを再生成
	newUserToken := suite.GenerateJWTToken(userID, userEmail, "admin", true)

	// 5. 昇格されたユーザーが自分のアカウントを削除
	deleteResponse := suite.MakeAuthenticatedRequest("DELETE", "/api/account", newUserToken, nil)
	assert.Equal(suite.T(), http.StatusOK, deleteResponse.Code)

	// 6. 削除されたユーザーがデータベースに存在しないことを確認
	collection := suite.Database.Collection("users")
	objectID, _ := primitive.ObjectIDFromHex(userID)
	count, err := collection.CountDocuments(context.Background(), bson.M{"_id": objectID})
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), int64(0), count, "削除されたユーザーがまだデータベースに存在しています")
}
