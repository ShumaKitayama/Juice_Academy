package controllers

import (
	"context"
	"juice_academy_backend/services"
	"net/http"
	"regexp"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

var (
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

// LoginHandler はログイン処理（2FA必須）を行うハンドラ
// パスワード認証後、OTPをメール送信し、2FA画面への遷移を指示します
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

	// パスワード認証成功 - 2FA画面への遷移を指示
	c.JSON(http.StatusOK, gin.H{
		"message":     "パスワード認証が完了しました。2段階認証を開始してください。",
		"require_2fa": true,
		"email":       user.Email,
	})
}

// LogoutHandler はログアウト処理とJWTの無効化を行うハンドラ
func LogoutHandler(c *gin.Context) {
	if jtiValue, exists := c.Get("jti"); exists {
		if jtiStr, ok := jtiValue.(string); ok && jtiStr != "" {
			expiration := 72 * time.Hour // デフォルト値
			if expClaim, expExists := c.Get("exp"); expExists {
				if expUnix, ok := expClaim.(float64); ok {
					expTime := time.Unix(int64(expUnix), 0)
					if expTime.After(time.Now()) {
						expiration = time.Until(expTime)
					}
				}
			}
			if err := services.BlacklistToken(jtiStr, expiration); err != nil {
				// 失敗してもユーザー体験を優先して継続
			}
		}
	}

	if refreshToken, err := c.Cookie("refresh_token"); err == nil && refreshToken != "" {
		ctx := context.Background()
		_ = revokeRefreshToken(ctx, refreshToken)
	}
	clearRefreshCookie(c)

	c.JSON(http.StatusOK, gin.H{"message": "ログアウトしました"})
}

// RefreshTokenHandler はアクセストークンを再発行するハンドラ
func RefreshTokenHandler(c *gin.Context) {
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil || refreshToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "リフレッシュトークンが見つかりません"})
		return
	}

	csrfToken := c.GetHeader("X-CSRF-Token")
	if csrfToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "CSRFトークンが必要です"})
		return
	}

	ctx := context.Background()
	existing, err := findActiveRefreshToken(ctx, refreshToken)
	if err != nil {
		clearRefreshCookie(c)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "リフレッシュトークンが無効です"})
		return
	}

	if hashToken(csrfToken) != existing.CSRFHash {
		_ = revokeRefreshToken(ctx, refreshToken)
		clearRefreshCookie(c)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "CSRFトークンが無効です"})
		return
	}

	var user User
	if err := userCollection.FindOne(ctx, bson.M{"_id": existing.UserID}).Decode(&user); err != nil {
		_ = revokeRefreshToken(ctx, refreshToken)
		clearRefreshCookie(c)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	accessToken, err := generateAccessToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "アクセストークンの生成に失敗しました"})
		return
	}

	var newRefreshToken, newCSRFToken string
	for i := 0; i < 3; i++ {
		if newRefreshToken, err = generateSecureToken(64); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "リフレッシュトークンの生成に失敗しました"})
			return
		}
		if newCSRFToken, err = generateSecureToken(32); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "CSRFトークンの生成に失敗しました"})
			return
		}

		err = rotateRefreshToken(ctx, existing, newRefreshToken, newCSRFToken, c.Request.UserAgent(), c.ClientIP())
		if err != nil {
			if mongo.IsDuplicateKeyError(err) {
				continue
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "リフレッシュトークンの更新に失敗しました"})
			return
		}
		break
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "リフレッシュトークンの更新に失敗しました"})
		return
	}

	setRefreshCookie(c, newRefreshToken, int(refreshTokenDuration.Seconds()))

	c.JSON(http.StatusOK, gin.H{
		"message":     "アクセストークンを更新しました",
		"accessToken": accessToken,
		"expiresIn":   int(accessTokenDuration.Seconds()),
		"csrfToken":   newCSRFToken,
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
