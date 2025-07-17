package controllers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

var (
	jwtSecret      = []byte("your_secret_key")
	userCollection *mongo.Collection
)

// User はMongoDBのusersコレクションのドキュメント構造
type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Role         string             `bson:"role" json:"role"`
	StudentID    string             `bson:"student_id" json:"student_id"`
	NameKana     string             `bson:"name_kana" json:"name_kana"`
	Email        string             `bson:"email" json:"email"`
	PasswordHash string             `bson:"password_hash" json:"-"`
	CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updated_at"`
	IsAdmin      bool               `bson:"is_admin" json:"is_admin"`
}

// InitUserCollection はユーザーコレクションを初期化
func InitUserCollection(client *mongo.Client) {
	userCollection = client.Database("juice_academy").Collection("users")
}

// RegisterHandler はユーザー登録処理を行うハンドラ
func RegisterHandler(c *gin.Context) {
	var req struct {
		Role      string `json:"role" binding:"required"`
		StudentID string `json:"student_id" binding:"required"`
		NameKana  string `json:"name_kana" binding:"required"`
		Email     string `json:"email" binding:"required,email"`
		Password  string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な入力データです"})
		return
	}

	// メールアドレスとstudent_idの重複チェック
	ctx := context.Background()
	existingUser := userCollection.FindOne(ctx, bson.M{
		"$or": []bson.M{
			{"email": req.Email},
			{"student_id": req.StudentID},
		},
	})
	if existingUser.Err() == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "既に登録済みのメールアドレスまたは学籍番号です"})
		return
	}

	// パスワードのハッシュ化
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "パスワード処理エラー"})
		return
	}

	now := time.Now()
	user := User{
		Role:         req.Role,
		StudentID:    req.StudentID,
		NameKana:     req.NameKana,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		CreatedAt:    now,
		UpdatedAt:    now,
		IsAdmin:      false,
	}

	result, err := userCollection.InsertOne(ctx, user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー登録に失敗しました"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "ユーザーを登録しました",
		"id":      result.InsertedID,
	})
}

// LoginHandler はログイン処理とJWT発行を行うハンドラ
func LoginHandler(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な入力データです"})
		return
	}

	var user User
	ctx := context.Background()
	err := userCollection.FindOne(ctx, bson.M{"email": req.Email}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "メールアドレスまたはパスワードが正しくありません"})
		return
	}

	// パスワード検証
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "メールアドレスまたはパスワードが正しくありません"})
		return
	}

	// JWT生成
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.Hex(),
		"email":   user.Email,
		"role":    user.Role,
		"isAdmin": user.IsAdmin,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "認証トークンの生成に失敗しました"})
		return
	}

	// デバッグ用にトークンの内容をログ出力
	fmt.Printf("生成されたトークン情報: user_id=%s, email=%s, role=%s, isAdmin=%v\n",
		user.ID.Hex(), user.Email, user.Role, user.IsAdmin)

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":        user.ID,
			"email":     user.Email,
			"role":      user.Role,
			"studentId": user.StudentID,
			"nameKana":  user.NameKana,
			"isAdmin":   user.IsAdmin,
		},
	})
}
