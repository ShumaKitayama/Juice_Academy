package controllers

import (
	"net/http"
	"net/mail"
	"strings"

	"github.com/gin-gonic/gin"
)

// TestBasicRegisterHandler はテスト用の基本的な登録ハンドラー（データベース不要）
func TestBasicRegisterHandler(c *gin.Context) {
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

	// 基本的な検証
	if req.Role == "" || req.StudentID == "" || req.NameKana == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "必須フィールドが不足しています"})
		return
	}

	if req.Email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "メールアドレスとパスワードは必須です"})
		return
	}

	// メールアドレス形式の検証
	if _, err := mail.ParseAddress(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なメールアドレス形式です"})
		return
	}

	// パスワードの基本検証
	if len(req.Password) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "パスワードは8文字以上である必要があります"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "ユーザーを登録しました",
		"id":      "test_user_id",
	})
}

// TestBasicLoginHandler はテスト用の基本的なログインハンドラー（データベース不要）
func TestBasicLoginHandler(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な入力データです"})
		return
	}

	// メールアドレス形式の検証
	if _, err := mail.ParseAddress(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なメールアドレス形式です"})
		return
	}

	// テスト用の固定認証情報
	validEmails := []string{"test@example.com", "admin@example.com"}
	validPassword := "password123"

	emailValid := false
	for _, email := range validEmails {
		if req.Email == email {
			emailValid = true
			break
		}
	}

	if !emailValid || req.Password != validPassword {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "メールアドレスまたはパスワードが正しくありません"})
		return
	}

	// 簡単なJWTトークンのシミュレーション
	isAdmin := strings.Contains(req.Email, "admin")
	
	c.JSON(http.StatusOK, gin.H{
		"token": "test_jwt_token_" + req.Email,
		"user": gin.H{
			"id":        "test_user_id",
			"email":     req.Email,
			"role":      "student",
			"studentId": "test123",
			"nameKana":  "テストユーザー",
			"isAdmin":   isAdmin,
		},
	})
}

// TestBasicAnnouncementsHandler はテスト用の基本的なお知らせ一覧ハンドラー
func TestBasicAnnouncementsHandler(c *gin.Context) {
	// ダミーデータ
	announcements := []gin.H{
		{
			"id":        "announcement_1",
			"title":     "テストお知らせ1",
			"content":   "これは最初のテストお知らせです。",
			"createdAt": "2024-01-01T09:00:00Z",
			"updatedAt": "2024-01-01T09:00:00Z",
		},
		{
			"id":        "announcement_2",
			"title":     "テストお知らせ2",
			"content":   "これは2番目のテストお知らせです。",
			"createdAt": "2024-01-02T09:00:00Z",
			"updatedAt": "2024-01-02T09:00:00Z",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"announcements": announcements,
		"count":         len(announcements),
	})
}

// TestBasicAnnouncementByIdHandler はテスト用の基本的なお知らせ詳細ハンドラー
func TestBasicAnnouncementByIdHandler(c *gin.Context) {
	id := c.Param("id")

	// 無効なID形式をチェック（"invalid-id"の場合）
	if id == "invalid-id" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なお知らせIDです"})
		return
	}

	// テスト用の有効なIDをチェック
	validIds := []string{"announcement_1", "announcement_2"}
	
	validId := false
	for _, validID := range validIds {
		if id == validID {
			validId = true
			break
		}
	}

	// 有効なObjectID形式だが存在しない場合は404を返す
	if !validId {
		c.JSON(http.StatusNotFound, gin.H{"error": "お知らせが見つかりません"})
		return
	}

	// ダミーデータを返す
	c.JSON(http.StatusOK, gin.H{
		"id":        id,
		"title":     "テスト詳細お知らせ",
		"content":   "これは詳細取得のテスト用お知らせです。",
		"createdAt": "2024-01-01T09:00:00Z",
		"updatedAt": "2024-01-01T09:00:00Z",
	})
}
