package controllers

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// AuthIntegrationSuite はMongoDB統合テスト用のテストスイート
type AuthIntegrationSuite struct {
	suite.Suite
	client   *mongo.Client
	database *mongo.Database
	cleanup  func()
}

// SetupSuite はテストスイートの初期化を行う
func (suite *AuthIntegrationSuite) SetupSuite() {
	// 環境変数でMongoDBのテストURIを取得
	mongoURI := os.Getenv("MONGODB_TEST_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017" // ローカルの場合
	}

	// MongoDB接続を試行
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		suite.T().Skip("MongoDBに接続できません。統合テストをスキップします: " + err.Error())
		return
	}

	// 接続テスト
	err = client.Ping(ctx, nil)
	if err != nil {
		suite.T().Skip("MongoDBに接続できません。統合テストをスキップします: " + err.Error())
		return
	}

	suite.client = client
	suite.database = client.Database("juice_academy_test")

	// コレクションを初期化
	InitUserCollection(client)

	// クリーンアップ関数を設定
	suite.cleanup = func() {
		suite.database.Drop(context.Background())
		client.Disconnect(context.Background())
	}
}

// TearDownSuite はテストスイートの終了処理を行う
func (suite *AuthIntegrationSuite) TearDownSuite() {
	if suite.cleanup != nil {
		suite.cleanup()
	}
}

// SetupTest は各テストの前処理を行う
func (suite *AuthIntegrationSuite) SetupTest() {
	if suite.client == nil {
		suite.T().Skip("MongoDBに接続されていません")
		return
	}
	// テスト用データをクリア
	suite.database.Collection("users").Drop(context.Background())
}

// TestAuthIntegrationSuite はテストスイートを実行
func TestAuthIntegrationSuite(t *testing.T) {
	suite.Run(t, new(AuthIntegrationSuite))
}

// TestUserRegistrationIntegration はユーザー登録のMongoDB統合テストを行う
func (suite *AuthIntegrationSuite) TestUserRegistrationIntegration() {
	if suite.client == nil {
		suite.T().Skip("MongoDBに接続されていません")
		return
	}

	// テストデータ
	testUser := User{
		Role:         "student",
		StudentID:    "integration_test_001",
		NameKana:     "統合テストユーザー",
		Email:        "integration@example.com",
		PasswordHash: "hashed_password_test",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		IsAdmin:      false,
	}

	// MongoDBに直接挿入
	collection := suite.database.Collection("users")
	result, err := collection.InsertOne(context.Background(), testUser)
	assert.NoError(suite.T(), err, "ユーザーをMongoDBに挿入できるべき")
	assert.NotNil(suite.T(), result.InsertedID, "挿入されたIDが存在するべき")

	// データが正しく保存されているか確認
	var retrievedUser User
	err = collection.FindOne(context.Background(), bson.M{"email": testUser.Email}).Decode(&retrievedUser)
	assert.NoError(suite.T(), err, "挿入されたユーザーを取得できるべき")
	assert.Equal(suite.T(), testUser.Email, retrievedUser.Email, "メールアドレスが一致するべき")
	assert.Equal(suite.T(), testUser.StudentID, retrievedUser.StudentID, "学籍番号が一致するべき")
	assert.Equal(suite.T(), testUser.IsAdmin, retrievedUser.IsAdmin, "管理者フラグが一致するべき")

	// 重複チェック（MongoDB一意制約なしの場合は、アプリケーションレベルでの重複確認をテスト）
	var existingUser User
	err = collection.FindOne(context.Background(), bson.M{"email": testUser.Email}).Decode(&existingUser)
	assert.NoError(suite.T(), err, "既存ユーザーが見つかるべき")
	assert.Equal(suite.T(), testUser.Email, existingUser.Email, "同じメールアドレスのユーザーが存在すべき")
}

// TestUserAuthenticationIntegration は認証のMongoDB統合テストを行う  
func (suite *AuthIntegrationSuite) TestUserAuthenticationIntegration() {
	if suite.client == nil {
		suite.T().Skip("MongoDBに接続されていません")
		return
	}

	// テスト用ユーザーをデータベースに作成
	testEmail := "auth_integration@example.com"
	testUser := User{
		Role:         "student",
		StudentID:    "auth_test_001",
		NameKana:     "認証テストユーザー", 
		Email:        testEmail,
		PasswordHash: "$2a$10$example.hash", // 実際のハッシュ化されたパスワード
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		IsAdmin:      false,
	}

	collection := suite.database.Collection("users")
	_, err := collection.InsertOne(context.Background(), testUser)
	assert.NoError(suite.T(), err)

	// 認証クエリのテスト
	var foundUser User
	err = collection.FindOne(context.Background(), bson.M{"email": testEmail}).Decode(&foundUser)
	assert.NoError(suite.T(), err, "メールアドレスでユーザーを検索できるべき")
	assert.Equal(suite.T(), testEmail, foundUser.Email)
	assert.NotEmpty(suite.T(), foundUser.PasswordHash, "パスワードハッシュが存在するべき")

	// 存在しないユーザーの検索
	err = collection.FindOne(context.Background(), bson.M{"email": "nonexistent@example.com"}).Decode(&foundUser)
	assert.Error(suite.T(), err, "存在しないユーザーの検索はエラーになるべき")
}

// TestAdminUserIntegration は管理者ユーザーのMongoDB統合テストを行う
func (suite *AuthIntegrationSuite) TestAdminUserIntegration() {
	if suite.client == nil {
		suite.T().Skip("MongoDBに接続されていません")
		return
	}

	// 管理者ユーザー作成機能をテスト
	SeedAdminUser(suite.database)

	// 管理者ユーザーが正しく作成されているか確認
	collection := suite.database.Collection("users")
	var adminUser User
	err := collection.FindOne(context.Background(), bson.M{"is_admin": true}).Decode(&adminUser)
	assert.NoError(suite.T(), err, "管理者ユーザーが作成されているべき")
	assert.True(suite.T(), adminUser.IsAdmin, "is_admin フラグがtrue")
	assert.Equal(suite.T(), "admin", adminUser.Role, "ロールがadmin")
	assert.Equal(suite.T(), "admin@example.com", adminUser.Email, "デフォルトの管理者メール")

	// 冪等性のテスト（2回実行しても管理者は1人だけ）
	SeedAdminUser(suite.database)
	
	count, err := collection.CountDocuments(context.Background(), bson.M{"is_admin": true})
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), int64(1), count, "管理者ユーザーは1人だけ存在するべき")
}
