package controllers

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

// SeedAdminUser は管理者ユーザーをデータベースに作成します
func SeedAdminUser(db *mongo.Database) {
	fmt.Println("管理者ユーザー作成機能を実行します")

	// MongoDB を使用している場合の実装例
	collection := db.Collection("users")
	filter := bson.M{"isAdmin": true}
	count, _ := collection.CountDocuments(context.Background(), filter)

	if count == 0 {
		// 管理者ユーザーが存在しない場合は作成
		adminUser := struct {
			Username string `bson:"username"`
			Email    string `bson:"email"`
			Password string `bson:"password"`
			IsAdmin  bool   `bson:"isAdmin"`
		}{
			Username: "admin",
			Email:    "admin@example.com",
			Password: hashPassword("securePassword123"),
			IsAdmin:  true,
		}
		
		_, err := collection.InsertOne(context.Background(), adminUser)
		if err != nil {
			fmt.Printf("管理者ユーザー作成エラー: %v\n", err)
			return
		}
		fmt.Println("管理者ユーザーが作成されました")
	} else {
		fmt.Println("管理者ユーザーは既に存在します")
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