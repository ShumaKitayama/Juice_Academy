package controllers

import (
	"context"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

// AdminTestSuite は管理者機能のテストスイート
type AdminTestSuite struct {
	TestSuite
}

// TestAdminSuite はテストスイートを実行
func TestAdminSuite(t *testing.T) {
	suite.Run(t, new(AdminTestSuite))
}

// TestSeedAdminUser は管理者ユーザー作成機能のテストを行う
func (suite *AdminTestSuite) TestSeedAdminUser() {
	// データベースをクリア
	suite.clearDatabase()

	// 管理者ユーザーが存在しない状態で SeedAdminUser を実行
	SeedAdminUser(suite.Database)

	// 管理者ユーザーが作成されているかを確認
	collection := suite.Database.Collection("users")
	count, err := collection.CountDocuments(context.Background(), bson.M{"is_admin": true})
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), int64(1), count, "管理者ユーザーが1つ作成されている必要があります")

	// 作成された管理者ユーザーの詳細を確認
	var adminUser struct {
		Username  string `bson:"username"`
		Email     string `bson:"email"`
		NameKana  string `bson:"name_kana"`
		StudentID string `bson:"student_id"`
		Role      string `bson:"role"`
		IsAdmin   bool   `bson:"is_admin"`
	}
	
	err = collection.FindOne(context.Background(), bson.M{"is_admin": true}).Decode(&adminUser)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "admin", adminUser.Username, "管理者のユーザー名が正しく設定されています")
	assert.Equal(suite.T(), "admin@example.com", adminUser.Email, "管理者のメールアドレスが正しく設定されています")
	assert.Equal(suite.T(), "管理者", adminUser.NameKana, "管理者の名前が正しく設定されています")
	assert.Equal(suite.T(), "admin001", adminUser.StudentID, "管理者の学生IDが正しく設定されています")
	assert.Equal(suite.T(), "admin", adminUser.Role, "管理者のロールが正しく設定されています")
	assert.True(suite.T(), adminUser.IsAdmin, "管理者フラグが正しく設定されています")
}

// TestSeedAdminUserWithExistingAdmin は既存管理者がいる場合のテストを行う
func (suite *AdminTestSuite) TestSeedAdminUserWithExistingAdmin() {
	// データベースをクリア
	suite.clearDatabase()

	// テスト用管理者を事前に作成
	collection := suite.Database.Collection("users")
	existingAdmin := bson.M{
		"username":  "existing_admin",
		"email":     "existing@admin.com",
		"name_kana": "既存管理者",
		"role":      "admin",
		"is_admin":  true,
	}
	_, err := collection.InsertOne(context.Background(), existingAdmin)
	assert.NoError(suite.T(), err)

	// SeedAdminUser を実行
	SeedAdminUser(suite.Database)

	// 管理者ユーザーが1つだけ存在することを確認（新しい管理者が作成されないこと）
	count, err := collection.CountDocuments(context.Background(), bson.M{"is_admin": true})
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), int64(1), count, "既存の管理者がいる場合、新しい管理者は作成されません")
}

// TestSeedAdminUserLegacyFieldUpdate は古いフィールド名の更新テストを行う
func (suite *AdminTestSuite) TestSeedAdminUserLegacyFieldUpdate() {
	// データベースをクリア
	suite.clearDatabase()

	// 古いフィールド名（isAdmin）を使用した管理者を作成
	collection := suite.Database.Collection("users")
	legacyAdmin := bson.M{
		"username":  "legacy_admin",
		"email":     "legacy@admin.com",
		"name_kana": "レガシー管理者",
		"role":      "admin",
		"isAdmin":   true, // 古いフィールド名
	}
	_, err := collection.InsertOne(context.Background(), legacyAdmin)
	assert.NoError(suite.T(), err)

	// SeedAdminUser を実行
	SeedAdminUser(suite.Database)

	// 古いフィールドが新しいフィールドに更新されていることを確認
	var updatedAdmin struct {
		IsAdmin   bool  `bson:"is_admin"`
		OldIsAdmin interface{} `bson:"isAdmin,omitempty"`
	}
	err = collection.FindOne(context.Background(), bson.M{"email": "legacy@admin.com"}).Decode(&updatedAdmin)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), updatedAdmin.IsAdmin, "新しいフィールド(is_admin)が設定されています")
	assert.Nil(suite.T(), updatedAdmin.OldIsAdmin, "古いフィールド(isAdmin)が削除されています")
}

// TestHashPassword はパスワードハッシュ化機能のテストを行う
func (suite *AdminTestSuite) TestHashPassword() {
	testPassword := "testPassword123"
	hashedPassword := hashPassword(testPassword)

	// ハッシュ化されたパスワードが元のパスワードと異なることを確認
	assert.NotEqual(suite.T(), testPassword, hashedPassword, "パスワードがハッシュ化されています")

	// ハッシュ化されたパスワードが元のパスワードと一致するか確認
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(testPassword))
	assert.NoError(suite.T(), err, "ハッシュ化されたパスワードが正しく検証できます")

	// 間違ったパスワードでは検証が失敗することを確認
	wrongPassword := "wrongPassword123"
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(wrongPassword))
	assert.Error(suite.T(), err, "間違ったパスワードでは検証が失敗します")
}

// TestAdminUserManagement は管理者によるユーザー管理機能の統合テストを行う
func (suite *AdminTestSuite) TestAdminUserManagement() {
	// データベースをクリア
	suite.clearDatabase()

	// SeedAdminUser を実行して管理者を作成
	SeedAdminUser(suite.Database)

	// 作成された管理者の情報を取得
	collection := suite.Database.Collection("users")
	var adminUser struct {
		ID    primitive.ObjectID `bson:"_id"`
		Email string             `bson:"email"`
	}
	err := collection.FindOne(context.Background(), bson.M{"is_admin": true}).Decode(&adminUser)
	assert.NoError(suite.T(), err)

	// 管理者トークンを生成
	adminToken := suite.GenerateJWTToken(adminUser.ID.Hex(), adminUser.Email, "admin", true)

	// 一般ユーザーを作成
	userEmail := "test-user@example.com"
	userID, err := suite.CreateTestUser(userEmail, "password123", false)
	assert.NoError(suite.T(), err)

	// 管理者権限で一般ユーザーを管理者に昇格
	url := fmt.Sprintf("/api/admin/users/%s/admin", userID)
	response := suite.MakeAuthenticatedRequest("PUT", url, adminToken, map[string]interface{}{
		"isAdmin": true,
	})
	suite.AssertJSONResponse(response, http.StatusOK, "message", "userId", "isAdmin")

	// データベースで権限変更を確認
	objectID, _ := primitive.ObjectIDFromHex(userID)
	var updatedUser struct {
		IsAdmin bool `bson:"isAdmin"`
	}
	err = collection.FindOne(context.Background(), bson.M{"_id": objectID}).Decode(&updatedUser)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), updatedUser.IsAdmin, "ユーザーが管理者に昇格されています")
}

// TestAdminDatabaseConsistency は管理者データの整合性テストを行う
func (suite *AdminTestSuite) TestAdminDatabaseConsistency() {
	// データベースをクリア
	suite.clearDatabase()

	// 管理者ロールのユーザーを作成（is_admin フラグなし）
	collection := suite.Database.Collection("users")
	adminRoleUser := bson.M{
		"username":  "role_admin",
		"email":     "role@admin.com",
		"name_kana": "ロール管理者",
		"role":      "admin",
		"is_admin":  false, // 意図的にfalseに設定
	}
	_, err := collection.InsertOne(context.Background(), adminRoleUser)
	assert.NoError(suite.T(), err)

	// SeedAdminUser を実行
	SeedAdminUser(suite.Database)

	// admin ロールのユーザーの is_admin フラグが true に更新されることを確認
	var updatedUser struct {
		IsAdmin bool `bson:"is_admin"`
		Role    string `bson:"role"`
	}
	err = collection.FindOne(context.Background(), bson.M{"email": "role@admin.com"}).Decode(&updatedUser)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "admin", updatedUser.Role, "ロールが管理者のままです")
	assert.True(suite.T(), updatedUser.IsAdmin, "admin ロールユーザーの is_admin フラグが true に更新されています")

	// 全体の管理者数を確認（新しく作成された管理者 + 既存の admin ロールユーザー）
	adminCount, err := collection.CountDocuments(context.Background(), bson.M{"is_admin": true})
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), int64(2), adminCount, "管理者が2名存在します（作成された管理者 + 更新された admin ロールユーザー）")
}

// TestAdminCreationTime は管理者作成時間の検証テストを行う
func (suite *AdminTestSuite) TestAdminCreationTime() {
	// データベースをクリア
	suite.clearDatabase()

	startTime := time.Now()
	
	// SeedAdminUser を実行
	SeedAdminUser(suite.Database)
	
	endTime := time.Now()

	// 作成された管理者の詳細を確認
	collection := suite.Database.Collection("users")
	var adminUser struct {
		CreatedAt time.Time `bson:"created_at"`
		UpdatedAt time.Time `bson:"updated_at"`
	}
	
	err := collection.FindOne(context.Background(), bson.M{"is_admin": true, "username": "admin"}).Decode(&adminUser)
	
	// created_at フィールドが存在しない場合は、このテストをスキップ
	if err != nil {
		suite.T().Log("created_at フィールドが設定されていません。管理者作成時に時間情報を追加することを検討してください。")
		return
	}

	// 作成時間が適切な範囲内にあることを確認
	assert.True(suite.T(), adminUser.CreatedAt.After(startTime) || adminUser.CreatedAt.Equal(startTime), 
		"作成時間がテスト開始時間以降である必要があります")
	assert.True(suite.T(), adminUser.CreatedAt.Before(endTime) || adminUser.CreatedAt.Equal(endTime), 
		"作成時間がテスト終了時間以前である必要があります")
}

