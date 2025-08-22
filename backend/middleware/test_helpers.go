package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/suite"
	"github.com/tryvium-travels/memongo"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

// TestSuite はテスト用の共通構造体
type TestSuite struct {
	suite.Suite
	MongoServer *memongo.Server
	Client      *mongo.Client
	Database    *mongo.Database
	Router      *gin.Engine
}

// SetupSuite はテストスイートの初期化を行う
func (suite *TestSuite) SetupSuite() {
	// インメモリMongoDBサーバーを起動
	mongoServer, err := memongo.Start("4.0.5")
	if err != nil {
		suite.T().Fatal(err)
	}
	suite.MongoServer = mongoServer

	// MongoDBクライアントを作成
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(mongoServer.URI()))
	if err != nil {
		suite.T().Fatal(err)
	}
	suite.Client = client

	// テスト用データベースを作成
	suite.Database = client.Database("test_juice_academy")

	// Ginのテストモードを設定
	gin.SetMode(gin.TestMode)

	// ルーターを作成
	suite.Router = gin.New()
}

// TearDownSuite はテストスイートの終了処理を行う
func (suite *TestSuite) TearDownSuite() {
	if suite.Client != nil {
		suite.Client.Disconnect(context.Background())
	}
	if suite.MongoServer != nil {
		suite.MongoServer.Stop()
	}
}

// SetupTest は各テストの前処理を行う
func (suite *TestSuite) SetupTest() {
	// テスト用データベースをクリア
	suite.clearDatabase()
}

// TearDownTest は各テストの後処理を行う
func (suite *TestSuite) TearDownTest() {
	// テスト用データベースをクリア
	suite.clearDatabase()
}

// clearDatabase はデータベースの全データを削除する
func (suite *TestSuite) clearDatabase() {
	collections := []string{"users", "payments", "subscriptions", "announcements"}
	for _, collectionName := range collections {
		collection := suite.Database.Collection(collectionName)
		collection.Drop(context.Background())
	}
}

// GenerateJWTToken はテスト用JWTトークンを生成する
func (suite *TestSuite) GenerateJWTToken(userID, email, role string, isAdmin bool) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"role":    role,
		"isAdmin": isAdmin,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, _ := token.SignedString([]byte("your_secret_key"))
	return tokenString
}

// MakeAuthenticatedRequest は認証付きHTTPリクエストを作成する
func (suite *TestSuite) MakeAuthenticatedRequest(method, url, token string, body interface{}) *httptest.ResponseRecorder {
	var jsonBody []byte
	if body != nil {
		jsonBody, _ = json.Marshal(body)
	}

	req, _ := http.NewRequest(method, url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	suite.Router.ServeHTTP(w, req)

	return w
}

// MakeRequest は通常のHTTPリクエストを作成する
func (suite *TestSuite) MakeRequest(method, url string, body interface{}) *httptest.ResponseRecorder {
	var jsonBody []byte
	if body != nil {
		jsonBody, _ = json.Marshal(body)
	}

	req, _ := http.NewRequest(method, url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.Router.ServeHTTP(w, req)

	return w
}

// ParseJSONResponse はレスポンスのJSONを解析する
func (suite *TestSuite) ParseJSONResponse(response *httptest.ResponseRecorder, target interface{}) error {
	return json.Unmarshal(response.Body.Bytes(), target)
}

// AssertJSONResponse はJSONレスポンスの内容を検証する
func (suite *TestSuite) AssertJSONResponse(response *httptest.ResponseRecorder, expectedCode int, expectedKeys ...string) {
	suite.Equal(expectedCode, response.Code)
	suite.Equal("application/json; charset=utf-8", response.Header().Get("Content-Type"))

	if len(expectedKeys) > 0 {
		var jsonResponse map[string]interface{}
		err := suite.ParseJSONResponse(response, &jsonResponse)
		suite.NoError(err)

		for _, key := range expectedKeys {
			_, exists := jsonResponse[key]
			suite.True(exists, fmt.Sprintf("Expected key '%s' not found in response", key))
		}
	}
}

// CreateTestUser はテスト用ユーザーを作成する
func (suite *TestSuite) CreateTestUser(email, password string, isAdmin bool) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	user := map[string]interface{}{
		"role":         "student",
		"student_id":   "test123",
		"name_kana":    "テストユーザー",
		"email":        email,
		"password_hash": string(hashedPassword),
		"created_at":   time.Now(),
		"updated_at":   time.Now(),
		"is_admin":     isAdmin,
	}

	if isAdmin {
		user["role"] = "admin"
	}

	collection := suite.Database.Collection("users")
	result, err := collection.InsertOne(context.Background(), user)
	if err != nil {
		return "", err
	}

	return result.InsertedID.(string), nil
}

