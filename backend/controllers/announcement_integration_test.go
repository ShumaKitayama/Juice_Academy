package controllers

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// AnnouncementIntegrationSuite はお知らせ機能のMongoDB統合テストスイート
type AnnouncementIntegrationSuite struct {
	suite.Suite
	client   *mongo.Client
	database *mongo.Database
	cleanup  func()
}

// SetupSuite はテストスイートの初期化を行う
func (suite *AnnouncementIntegrationSuite) SetupSuite() {
	mongoURI := os.Getenv("MONGODB_TEST_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		suite.T().Skip("MongoDBに接続できません。統合テストをスキップします: " + err.Error())
		return
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		suite.T().Skip("MongoDBに接続できません。統合テストをスキップします: " + err.Error())
		return
	}

	suite.client = client
	suite.database = client.Database("juice_academy_test")

	// お知らせコレクションを初期化
	InitAnnouncementCollection(suite.database)

	suite.cleanup = func() {
		suite.database.Drop(context.Background())
		client.Disconnect(context.Background())
	}
}

// TearDownSuite はテストスイートの終了処理を行う
func (suite *AnnouncementIntegrationSuite) TearDownSuite() {
	if suite.cleanup != nil {
		suite.cleanup()
	}
}

// SetupTest は各テストの前処理を行う
func (suite *AnnouncementIntegrationSuite) SetupTest() {
	if suite.client == nil {
		suite.T().Skip("MongoDBに接続されていません")
		return
	}
	// テストデータをクリア
	suite.database.Collection("announcements").Drop(context.Background())
}

// TestAnnouncementIntegrationSuite はテストスイートを実行
func TestAnnouncementIntegrationSuite(t *testing.T) {
	suite.Run(t, new(AnnouncementIntegrationSuite))
}

// TestAnnouncementCRUDIntegration はお知らせのCRUD操作統合テストを行う
func (suite *AnnouncementIntegrationSuite) TestAnnouncementCRUDIntegration() {
	if suite.client == nil {
		suite.T().Skip("MongoDBに接続されていません")
		return
	}

	collection := suite.database.Collection("announcements")

	// Create - お知らせ作成
	announcement := Announcement{
		Title:     "統合テストお知らせ",
		Content:   "これは統合テスト用のお知らせ内容です。",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result, err := collection.InsertOne(context.Background(), announcement)
	assert.NoError(suite.T(), err, "お知らせを作成できるべき")
	assert.NotNil(suite.T(), result.InsertedID)

	// 挿入されたIDを取得
	insertedID := result.InsertedID.(primitive.ObjectID)
	announcement.ID = insertedID

	// Read - 作成されたお知らせを取得
	var retrievedAnnouncement Announcement
	err = collection.FindOne(context.Background(), bson.M{"_id": insertedID}).Decode(&retrievedAnnouncement)
	assert.NoError(suite.T(), err, "作成されたお知らせを取得できるべき")
	assert.Equal(suite.T(), announcement.Title, retrievedAnnouncement.Title)
	assert.Equal(suite.T(), announcement.Content, retrievedAnnouncement.Content)

	// Update - お知らせを更新
	updateData := bson.M{
		"$set": bson.M{
			"title":      "更新されたタイトル",
			"content":    "更新された内容です。",
			"updated_at": time.Now(),
		},
	}

	updateResult, err := collection.UpdateOne(context.Background(), bson.M{"_id": insertedID}, updateData)
	assert.NoError(suite.T(), err, "お知らせを更新できるべき")
	assert.Equal(suite.T(), int64(1), updateResult.ModifiedCount, "1つのドキュメントが更新されるべき")

	// 更新されたデータを確認
	err = collection.FindOne(context.Background(), bson.M{"_id": insertedID}).Decode(&retrievedAnnouncement)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "更新されたタイトル", retrievedAnnouncement.Title)
	assert.Equal(suite.T(), "更新された内容です。", retrievedAnnouncement.Content)

	// Delete - お知らせを削除
	deleteResult, err := collection.DeleteOne(context.Background(), bson.M{"_id": insertedID})
	assert.NoError(suite.T(), err, "お知らせを削除できるべき")
	assert.Equal(suite.T(), int64(1), deleteResult.DeletedCount, "1つのドキュメントが削除されるべき")

	// 削除されたことを確認
	err = collection.FindOne(context.Background(), bson.M{"_id": insertedID}).Decode(&retrievedAnnouncement)
	assert.Error(suite.T(), err, "削除されたお知らせは取得できないべき")
	assert.Equal(suite.T(), mongo.ErrNoDocuments, err, "NoDocumentsエラーが返されるべき")
}

// TestAnnouncementListIntegration はお知らせ一覧取得の統合テストを行う
func (suite *AnnouncementIntegrationSuite) TestAnnouncementListIntegration() {
	if suite.client == nil {
		suite.T().Skip("MongoDBに接続されていません")
		return
	}

	collection := suite.database.Collection("announcements")

	// 複数のお知らせを作成
	announcements := []interface{}{
		Announcement{
			Title:     "お知らせ1",
			Content:   "最初のお知らせです。",
			CreatedAt: time.Now().Add(-2 * time.Hour),
			UpdatedAt: time.Now().Add(-2 * time.Hour),
		},
		Announcement{
			Title:     "お知らせ2",
			Content:   "2番目のお知らせです。",
			CreatedAt: time.Now().Add(-1 * time.Hour),
			UpdatedAt: time.Now().Add(-1 * time.Hour),
		},
		Announcement{
			Title:     "お知らせ3",
			Content:   "最新のお知らせです。",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	_, err := collection.InsertMany(context.Background(), announcements)
	assert.NoError(suite.T(), err, "複数のお知らせを作成できるべき")

	// 作成日時の降順でお知らせを取得（最新順）
	findOptions := options.Find()
	findOptions.SetSort(bson.M{"created_at": -1})

	cursor, err := collection.Find(context.Background(), bson.M{}, findOptions)
	assert.NoError(suite.T(), err, "お知らせ一覧を取得できるべき")
	defer cursor.Close(context.Background())

	var retrievedAnnouncements []Announcement
	err = cursor.All(context.Background(), &retrievedAnnouncements)
	assert.NoError(suite.T(), err, "カーソルから結果を取得できるべき")

	// 結果を検証
	assert.Equal(suite.T(), 3, len(retrievedAnnouncements), "3つのお知らせが取得されるべき")
	assert.Equal(suite.T(), "お知らせ3", retrievedAnnouncements[0].Title, "最新のお知らせが最初に来るべき")
	assert.Equal(suite.T(), "お知らせ2", retrievedAnnouncements[1].Title, "2番目のお知らせが2番目に来るべき")
	assert.Equal(suite.T(), "お知らせ1", retrievedAnnouncements[2].Title, "最古のお知らせが最後に来るべき")

	// 各お知らせが適切なフィールドを持っているか確認
	for _, announcement := range retrievedAnnouncements {
		assert.NotEmpty(suite.T(), announcement.ID, "お知らせIDが存在するべき")
		assert.NotEmpty(suite.T(), announcement.Title, "タイトルが存在するべき")
		assert.NotEmpty(suite.T(), announcement.Content, "内容が存在するべき")
		assert.False(suite.T(), announcement.CreatedAt.IsZero(), "作成日時が設定されているべき")
		assert.False(suite.T(), announcement.UpdatedAt.IsZero(), "更新日時が設定されているべき")
	}
}

// TestAnnouncementQueryIntegration は検索・クエリの統合テストを行う
func (suite *AnnouncementIntegrationSuite) TestAnnouncementQueryIntegration() {
	if suite.client == nil {
		suite.T().Skip("MongoDBに接続されていません")
		return
	}

	collection := suite.database.Collection("announcements")

	// 検索用のテストデータを作成
	testAnnouncements := []interface{}{
		Announcement{
			Title:     "重要なお知らせ",
			Content:   "システムメンテナンスについて",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Announcement{
			Title:     "授業について",
			Content:   "来週の授業スケジュールについて",
			CreatedAt: time.Now().Add(-1 * time.Hour),
			UpdatedAt: time.Now().Add(-1 * time.Hour),
		},
		Announcement{
			Title:     "イベント案内",
			Content:   "学園祭のイベント詳細について",
			CreatedAt: time.Now().Add(-2 * time.Hour),
			UpdatedAt: time.Now().Add(-2 * time.Hour),
		},
	}

	_, err := collection.InsertMany(context.Background(), testAnnouncements)
	assert.NoError(suite.T(), err)

	// タイトルによる部分一致検索
	cursor, err := collection.Find(context.Background(), bson.M{
		"title": bson.M{"$regex": "重要", "$options": "i"},
	})
	assert.NoError(suite.T(), err)

	var searchResults []Announcement
	err = cursor.All(context.Background(), &searchResults)
	assert.NoError(suite.T(), err)

	assert.Equal(suite.T(), 1, len(searchResults), "「重要」を含むお知らせが1つ見つかるべき")
	assert.Equal(suite.T(), "重要なお知らせ", searchResults[0].Title)
	cursor.Close(context.Background())

	// 特定の期間内のお知らせを取得
	oneHourAgo := time.Now().Add(-1 * time.Hour)
	cursor, err = collection.Find(context.Background(), bson.M{
		"created_at": bson.M{"$gte": oneHourAgo},
	})
	assert.NoError(suite.T(), err)

	err = cursor.All(context.Background(), &searchResults)
	assert.NoError(suite.T(), err)
	cursor.Close(context.Background())

	assert.GreaterOrEqual(suite.T(), len(searchResults), 1, "1時間以内に作成されたお知らせが存在するべき")

	// カウント機能のテスト
	totalCount, err := collection.CountDocuments(context.Background(), bson.M{})
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), int64(3), totalCount, "全体で3つのお知らせが存在するべき")
}
