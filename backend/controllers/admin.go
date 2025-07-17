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

	// データベース内の既存の管理者ユーザーを確認
	// is_admin と isAdmin の両方を確認（フィールド名の不一致がある可能性があるため）
	var adminCount int64
	isAdminFilter := bson.M{"is_admin": true}
	isAdminCount, _ := collection.CountDocuments(context.Background(), isAdminFilter)

	oldAdminFilter := bson.M{"isAdmin": true}
	oldAdminCount, _ := collection.CountDocuments(context.Background(), oldAdminFilter)

	adminCount = isAdminCount + oldAdminCount

	if adminCount == 0 {
		// 管理者ユーザーが存在しない場合は作成
		fmt.Println("管理者ユーザーが見つかりません。新しく作成します。")
		adminUser := struct {
			Username  string `bson:"username"`
			Email     string `bson:"email"`
			Password  string `bson:"password_hash"` // フィールド名をpassword_hashに修正
			NameKana  string `bson:"name_kana"`
			StudentID string `bson:"student_id"`
			Role      string `bson:"role"`
			IsAdmin   bool   `bson:"is_admin"` // フィールド名をis_adminに修正
		}{
			Username:  "admin",
			Email:     "admin@example.com",
			Password:  hashPassword("securePassword123"),
			NameKana:  "管理者",
			StudentID: "admin001",
			Role:      "admin",
			IsAdmin:   true,
		}

		_, err := collection.InsertOne(context.Background(), adminUser)
		if err != nil {
			fmt.Printf("管理者ユーザー作成エラー: %v\n", err)
			return
		}
		fmt.Println("管理者ユーザーが作成されました")
	} else {
		// 既存の管理者ユーザーを新しいフィールド名に更新
		fmt.Printf("既存の管理者ユーザーが見つかりました: %d 件\n", adminCount)

		// isAdmin -> is_admin への変換
		if oldAdminCount > 0 {
			updateResult, err := collection.UpdateMany(
				context.Background(),
				bson.M{"isAdmin": true},
				bson.M{"$set": bson.M{"is_admin": true}, "$unset": bson.M{"isAdmin": ""}},
			)
			if err != nil {
				fmt.Printf("管理者ユーザーの更新に失敗しました: %v\n", err)
			} else {
				fmt.Printf("%d 件の管理者ユーザーを更新しました\n", updateResult.ModifiedCount)
			}
		}

		// roleが"admin"のユーザーの is_admin フラグをtrueに設定
		roleUpdateResult, err := collection.UpdateMany(
			context.Background(),
			bson.M{"role": "admin", "is_admin": bson.M{"$ne": true}},
			bson.M{"$set": bson.M{"is_admin": true}},
		)
		if err != nil {
			fmt.Printf("admin ロールユーザーの更新に失敗しました: %v\n", err)
		} else if roleUpdateResult.ModifiedCount > 0 {
			fmt.Printf("%d 件の admin ロールユーザーを管理者として設定しました\n", roleUpdateResult.ModifiedCount)
		}
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
