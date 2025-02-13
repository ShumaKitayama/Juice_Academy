package controllers

import (
	"net/http"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
)

var jwtSecret = []byte("your_secret_key")

// RegisterHandler はユーザー登録処理を行うハンドラ。
func RegisterHandler(c *gin.Context) {
	// TODO: ユーザー登録処理（バリデーション、DB保存など）
	c.JSON(http.StatusCreated, gin.H{"message": "User registered"})
}

// LoginHandler はログイン処理と JWT 発行を行うハンドラ。
func LoginHandler(c *gin.Context) {
	// TODO: ユーザー認証処理（パスワード検証など）
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email": "user@example.com",
		"exp":   time.Now().Add(time.Hour * 72).Unix(),
	})
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token生成失敗"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}
