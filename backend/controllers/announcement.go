package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// GetAnnouncementsHandler はお知らせ一覧を取得するハンドラ。
func GetAnnouncementsHandler(c *gin.Context) {
	// TODO: DBからお知らせ一覧を取得
	c.JSON(http.StatusOK, []gin.H{
		{"id": "1", "title": "Announcement 1", "content": "Content 1", "created_at": time.Now(), "updated_at": time.Now()},
	})
}

// CreateAnnouncementHandler は新規お知らせ作成を行うハンドラ（管理者専用）。
func CreateAnnouncementHandler(c *gin.Context) {
	// TODO: お知らせ作成処理
	c.JSON(http.StatusCreated, gin.H{"message": "Announcement created"})
}

// UpdateAnnouncementHandler は既存のお知らせ更新を行うハンドラ（管理者専用）。
func UpdateAnnouncementHandler(c *gin.Context) {
	// TODO: お知らせ更新処理
	c.JSON(http.StatusOK, gin.H{"message": "Announcement updated"})
}

// DeleteAnnouncementHandler はお知らせ削除を行うハンドラ（管理者専用）。
func DeleteAnnouncementHandler(c *gin.Context) {
	// TODO: お知らせ削除処理
	c.JSON(http.StatusOK, gin.H{"message": "Announcement deleted"})
}
