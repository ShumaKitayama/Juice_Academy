package controllers

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/crypto/bcrypt"
)

// SeedAdminUser は管理者ユーザーをデータベースに作成します
func SeedAdminUser() {
	if userCollection == nil {
		return
	}
	collection := userCollection

	// データベース内の既存の管理者ユーザーを確認
	var adminCount int64
	isAdminFilter := bson.M{"is_admin": true}
	isAdminCount, _ := collection.CountDocuments(context.Background(), isAdminFilter)

	oldAdminFilter := bson.M{"isAdmin": true}
	oldAdminCount, _ := collection.CountDocuments(context.Background(), oldAdminFilter)

	adminCount = isAdminCount + oldAdminCount

	if adminCount == 0 {
		// 管理者ユーザーが存在しない場合は作成
		now := time.Now()
		adminUser := bson.M{
			"email":         "admin@example.com",
			"password_hash": hashPassword("securePassword123"),
			"name_kana":     "管理者",
			"student_id":    "admin001",
			"role":          "admin",
			"is_admin":      true,
			"created_at":    now,
			"updated_at":    now,
		}

		_, err := collection.InsertOne(context.Background(), adminUser)
		if err != nil {
			return
		}
	} else {
		// isAdmin -> is_admin への変換
		if oldAdminCount > 0 {
			collection.UpdateMany(
				context.Background(),
				bson.M{"isAdmin": true},
				bson.M{"$set": bson.M{"is_admin": true}, "$unset": bson.M{"isAdmin": ""}},
			)
		}

		// roleが"admin"のユーザーの is_admin フラグをtrueに設定
		collection.UpdateMany(
			context.Background(),
			bson.M{"role": "admin", "is_admin": bson.M{"$ne": true}},
			bson.M{"$set": bson.M{"is_admin": true}},
		)
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
