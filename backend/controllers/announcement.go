package controllers

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	// 必要なモデルやデータベースのインポート
)

// Announcement はお知らせのモデル構造体です
type Announcement struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Title     string             `json:"title" bson:"title"`
	Content   string             `json:"content" bson:"content"`
	CreatedAt time.Time          `json:"createdAt" bson:"created_at"`
	UpdatedAt time.Time          `json:"updatedAt" bson:"updated_at"`
}

// announcementCollection はお知らせコレクションへの参照
var announcementCollection *mongo.Collection

// InitAnnouncementCollection はお知らせのコレクションを初期化します
func InitAnnouncementCollection(db *mongo.Database) {
	announcementCollection = db.Collection("announcements")
}

// GetAnnouncementsHandler はお知らせ一覧を取得するハンドラ
func GetAnnouncementsHandler(c *gin.Context) {
	ctx := context.Background()

	// 最新のお知らせから順に取得するためのオプション
	findOptions := options.Find()
	findOptions.SetSort(bson.M{"created_at": -1})

	// データベースからお知らせを取得
	cursor, err := announcementCollection.Find(ctx, bson.M{}, findOptions)
	if err != nil {
		// セキュリティ: 本番環境ではエラーの詳細をログに出力しない
		if os.Getenv("APP_ENV") != "production" {
			fmt.Printf("GetAnnouncementsHandler: お知らせ取得エラー: %v\n", err)
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "お知らせの取得に失敗しました"})
		return
	}
	defer cursor.Close(ctx)

	// 結果を格納するスライス
	var announcements []Announcement

	// カーソルから結果を取得
	if err := cursor.All(ctx, &announcements); err != nil {
		// セキュリティ: 本番環境ではエラーの詳細をログに出力しない
		if os.Getenv("APP_ENV") != "production" {
			fmt.Printf("GetAnnouncementsHandler: お知らせデータ処理エラー: %v\n", err)
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "お知らせデータの処理に失敗しました"})
		return
	}

	// 空の配列の場合は空配列を返す（nullは返さない）
	if announcements == nil {
		announcements = []Announcement{}
	}

	// フロントエンドに整合する形式でレスポンスを返す
	// データをラップするか、直接配列を返すかは、フロントエンドの期待に合わせる
	c.JSON(http.StatusOK, gin.H{
		"announcements": announcements,
		"count":         len(announcements),
	})
}

// CreateAnnouncementHandler は新規お知らせ作成を行うハンドラ（管理者専用）
func CreateAnnouncementHandler(c *gin.Context) {
	// リクエストボディをパース
	var announcement Announcement
	if err := c.ShouldBindJSON(&announcement); err != nil {
		// セキュリティ: 本番環境ではエラーの詳細をログに出力しない
		if os.Getenv("APP_ENV") != "production" {
			fmt.Printf("CreateAnnouncementHandler: リクエスト解析エラー: %v\n", err)
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なリクエスト形式です"})
		return
	}

	// 現在時刻をセット
	now := time.Now()
	announcement.CreatedAt = now
	announcement.UpdatedAt = now

	// データベースに保存
	ctx := context.Background()
	result, err := announcementCollection.InsertOne(ctx, announcement)
	if err != nil {
		// セキュリティ: 本番環境ではエラーの詳細をログに出力しない
		if os.Getenv("APP_ENV") != "production" {
			fmt.Printf("CreateAnnouncementHandler: お知らせ作成エラー: %v\n", err)
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "お知らせの作成に失敗しました"})
		return
	}

	// IDをセット
	announcement.ID = result.InsertedID.(primitive.ObjectID)

	c.JSON(http.StatusCreated, announcement)
}

// UpdateAnnouncementHandler は既存のお知らせ更新を行うハンドラ（管理者専用）
func UpdateAnnouncementHandler(c *gin.Context) {
	// URLからIDを取得
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なお知らせIDです"})
		return
	}

	// リクエストボディをパース
	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なリクエスト形式です"})
		return
	}

	// 更新日時を追加
	updateData["updated_at"] = time.Now()

	// データベースを更新
	ctx := context.Background()
	result, err := announcementCollection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": updateData},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "お知らせの更新に失敗しました"})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "お知らせが見つかりません"})
		return
	}

	// 更新後のお知らせを取得
	var updatedAnnouncement Announcement
	err = announcementCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&updatedAnnouncement)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新されたお知らせの取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, updatedAnnouncement)
}

// DeleteAnnouncementHandler はお知らせ削除を行うハンドラ（管理者専用）
func DeleteAnnouncementHandler(c *gin.Context) {
	// URLからIDを取得
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なお知らせIDです"})
		return
	}

	// データベースから削除
	ctx := context.Background()
	result, err := announcementCollection.DeleteOne(ctx, bson.M{"_id": id})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "お知らせの削除に失敗しました"})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "お知らせが見つかりません"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "お知らせを削除しました"})
}

// CreateAnnouncement は新しいお知らせを作成します
// 注: このエンドポイントは AdminRequired ミドルウェアで保護されます
func CreateAnnouncement(c *gin.Context) {
	var announcement Announcement
	if err := c.ShouldBindJSON(&announcement); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 現在時刻を設定
	now := time.Now()
	announcement.CreatedAt = now
	announcement.UpdatedAt = now

	// データベースに保存
	// 例: db.Create(&announcement)

	c.JSON(http.StatusCreated, announcement)
}

// GetAnnouncements はすべてのお知らせを取得します
func GetAnnouncements(c *gin.Context) {
	var announcements []Announcement

	// データベースからお知らせを取得
	// 例: db.Find(&announcements)

	c.JSON(http.StatusOK, announcements)
}

// GetAnnouncementByIdHandler は特定のお知らせを取得するハンドラ
func GetAnnouncementByIdHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なお知らせIDです"})
		return
	}

	var announcement Announcement
	ctx := context.Background()
	err = announcementCollection.FindOne(ctx, bson.M{"_id": id}).Decode(&announcement)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "お知らせが見つかりません"})
			return
		}
		// セキュリティ: 本番環境ではエラーの詳細をログに出力しない
		if os.Getenv("APP_ENV") != "production" {
			fmt.Printf("GetAnnouncementByIdHandler: データベースエラー: %v\n", err)
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "お知らせの取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, announcement)
}

// UpdateAnnouncement はお知らせを更新します
// 注: このエンドポイントは AdminRequired ミドルウェアで保護されます
func UpdateAnnouncement(c *gin.Context) {
	id := c.Param("id")
	var announcement Announcement

	// データベースから特定のお知らせを取得
	// 例: result := db.First(&announcement, id)
	_ = id // 一時的に変数を使用したことにする（実際の実装時には削除）

	// リクエストボディからデータを取得
	if err := c.ShouldBindJSON(&announcement); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	announcement.UpdatedAt = time.Now()

	// データベースを更新
	// 例: db.Save(&announcement)

	c.JSON(http.StatusOK, announcement)
}

// DeleteAnnouncement はお知らせを削除します
// 注: このエンドポイントは AdminRequired ミドルウェアで保護されます
func DeleteAnnouncement(c *gin.Context) {
	id := c.Param("id")
	// var announcement Announcement  // 未使用なので削除

	// データベースから特定のお知らせを削除
	// 例: db.Delete(&Announcement{}, id)
	_ = id // 一時的に変数を使用したことにする（実際の実装時には削除）

	c.JSON(http.StatusOK, gin.H{"message": "お知らせが削除されました"})
}
