package middleware

import "github.com/gin-gonic/gin"

// AdminMiddleware は管理者権限チェックのためのミドルウェア。
// 現状は常に通過させる実装（今後の拡張用）。
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: 管理者であるかの実際のチェックを実装する
		c.Next()
	}
}
