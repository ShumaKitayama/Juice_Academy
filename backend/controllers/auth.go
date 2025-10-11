package controllers

import (
    "context"
    "fmt"
    "juice_academy_backend/services"
    "net/http"
    "os"
	"regexp"
	"time"
	"unicode"

    jwt "github.com/golang-jwt/jwt/v5"
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

var (
	jwtSecret      []byte
	userCollection *mongo.Collection
)

func init() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		panic("JWT_SECRET environment variable is required")
	}
	jwtSecret = []byte(secret)
}

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

// validateNameKana は氏名（カナ）のバリデーションを行う
func validateNameKana(nameKana string) bool {
	// カタカナ、半角スペース、全角スペースのみを許可
	katakanaPattern := regexp.MustCompile(`^[ァ-ヶー\s　]+$`)
	return katakanaPattern.MatchString(nameKana)
}

// validatePassword はパスワードのバリデーションを行う
func validatePassword(password string) bool {
	// 8文字以上
	if len(password) < 8 {
		return false
	}
	
	var hasUpper, hasLower, hasDigit bool
	
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		}
	}
	
	// 大文字、小文字、数字がすべて含まれている必要がある
	return hasUpper && hasLower && hasDigit
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

	// 氏名（カナ）のバリデーション
	if !validateNameKana(req.NameKana) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "氏名（カナ）はカタカナのみで入力してください"})
		return
	}

	// パスワードのバリデーション
	if !validatePassword(req.Password) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "パスワードは8文字以上で、英字の大文字・小文字・数字をすべて含む必要があります"})
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

	// 一意のJWT IDを生成
	jti := uuid.New().String()
	expiry := time.Now().Add(time.Hour * 72)
	
	// JWT生成
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"jti":     jti,
		"user_id": user.ID.Hex(),
		"email":   user.Email,
		"role":    user.Role,
		"isAdmin": user.IsAdmin,
		"iat":     time.Now().Unix(),
		"exp":     expiry.Unix(),
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "認証トークンの生成に失敗しました"})
		return
	}

    // デバッグログは本番で出さない
    if os.Getenv("APP_ENV") != "production" {
        fmt.Printf("生成されたトークン情報(概要): user_id=%s, role=%s, isAdmin=%v\n",
            user.ID.Hex(), user.Role, user.IsAdmin)
    }

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

// Login2FAHandler は2段階認証付きログインの第1段階（パスワード検証のみ）を行うハンドラ
func Login2FAHandler(c *gin.Context) {
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

	// パスワード認証成功 - OTPを送信する必要があることを通知
	c.JSON(http.StatusOK, gin.H{
		"message": "パスワード認証が完了しました。2段階認証を開始してください。",
		"require_2fa": true,
		"email": user.Email,
	})
}

// LogoutHandler はログアウト処理とJWTの無効化を行うハンドラ
func LogoutHandler(c *gin.Context) {
	// JWTからjtiを取得
	jti, exists := c.Get("jti")
	if !exists {
		// jtiが存在しない場合でもログアウトは成功とする
		c.JSON(http.StatusOK, gin.H{"message": "ログアウトしました"})
		return
	}

	jtiStr, ok := jti.(string)
	if !ok {
		c.JSON(http.StatusOK, gin.H{"message": "ログアウトしました"})
		return
	}

	// トークンをブラックリストに追加
	// 有効期限までの残り時間を計算
	expClaim, expExists := c.Get("exp")
	var expiration time.Duration = 72 * time.Hour // デフォルト値
	
	if expExists {
		if expUnix, ok := expClaim.(float64); ok {
			expTime := time.Unix(int64(expUnix), 0)
			if expTime.After(time.Now()) {
				expiration = time.Until(expTime)
			}
		}
	}

	err := services.BlacklistToken(jtiStr, expiration)
	if err != nil {
		fmt.Printf("トークンのブラックリスト登録エラー: %v\n", err)
		// エラーが発生してもログアウトは成功とする
	}

    if os.Getenv("APP_ENV") != "production" {
        fmt.Printf("ログアウト成功: jti=%s\n", jtiStr)
    }
    c.JSON(http.StatusOK, gin.H{"message": "ログアウトしました"})
}
