package db

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
	// gorm.io/gorm パッケージが利用できない場合は、代替の実装を検討
)

// User はユーザーモデルを表します
type User struct {
	ID        uint   `json:"id" bson:"_id,omitempty"`
	Username  string `json:"username" bson:"username"`
	Email     string `json:"email" bson:"email"`
	Password  string `json:"password" bson:"password"`
	IsAdmin   bool   `json:"isAdmin" bson:"isAdmin" default:"false"`
	CreatedAt string `json:"createdAt" bson:"createdAt"`
	UpdatedAt string `json:"updatedAt" bson:"updatedAt"`
}

// DB はデータベース接続を保持します
var DB interface{}

// SeedAdminUser は管理者ユーザーをデータベースに作成します
func SeedAdminUser(db interface{}) {
	// MongoDB を使用している場合は、MongoDB 用の実装に変更する必要があります
	fmt.Println("管理者ユーザー作成機能を実行します")

	// MongoDB を使用している場合の実装例
	collection := db.(*mongo.Database).Collection("users")
	filter := bson.M{"isAdmin": true}
	count, _ := collection.CountDocuments(context.Background(), filter)

	if count == 0 {
		adminUser := User{
			Username: "admin",
			Email:    "admin@example.com",
			Password: hashPassword("securePassword123"),
			IsAdmin:  true,
		}
		collection.InsertOne(context.Background(), adminUser)
		fmt.Println("管理者ユーザーが作成されました")
	}
}

// hashPassword はパスワードをハッシュ化します
func hashPassword(password string) string {
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		panic(err) // 実際のアプリケーションではエラーハンドリングを適切に行う
	}
	return string(hashedBytes)
}
