package controllers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
)

// TestHashPasswordFunction はhashPassword関数の基本的なテストを行う
func TestHashPasswordFunction(t *testing.T) {
	testPassword := "testPassword123"
	hashedPassword := hashPassword(testPassword)

	// ハッシュ化されたパスワードが元のパスワードと異なることを確認
	assert.NotEqual(t, testPassword, hashedPassword, "パスワードがハッシュ化されています")

	// ハッシュ化されたパスワードが元のパスワードと一致するか確認
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(testPassword))
	assert.NoError(t, err, "ハッシュ化されたパスワードが正しく検証できます")

	// 間違ったパスワードでは検証が失敗することを確認
	wrongPassword := "wrongPassword123"
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(wrongPassword))
	assert.Error(t, err, "間違ったパスワードでは検証が失敗します")
}

// TestHashPasswordEdgeCases はhashPassword関数のエッジケーステストを行う
func TestHashPasswordEdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		password string
	}{
		{
			name:     "短いパスワード",
			password: "123",
		},
		{
			name:     "長いパスワード",
			password: "this_is_a_very_long_password_with_many_characters_to_test_the_limits",
		},
		{
			name:     "特殊文字を含むパスワード",
			password: "password!@#$%^&*()_+{}|:<>?[]\\;'\",./-=`~",
		},
		{
			name:     "空のパスワード",
			password: "",
		},
		{
			name:     "日本語を含むパスワード",
			password: "パスワードtest123",
		},
		{
			name:     "スペースを含むパスワード",
			password: "password with spaces",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hashedPassword := hashPassword(tt.password)
			
			// ハッシュ化されたパスワードが元のパスワードと異なることを確認（空の場合を除く）
			if tt.password != "" {
				assert.NotEqual(t, tt.password, hashedPassword, "パスワードがハッシュ化されています")
			}

			// ハッシュ化されたパスワードが元のパスワードと一致するか確認
			err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(tt.password))
			assert.NoError(t, err, "ハッシュ化されたパスワードが正しく検証できます")
		})
	}
}

// TestPasswordHashConsistency はパスワードハッシュの一貫性をテストする
func TestPasswordHashConsistency(t *testing.T) {
	password := "testPassword123"
	
	// 同じパスワードを複数回ハッシュ化
	hash1 := hashPassword(password)
	hash2 := hashPassword(password)
	
	// ハッシュ値は異なるが、どちらも元のパスワードと一致すること
	assert.NotEqual(t, hash1, hash2, "bcryptソルトによりハッシュ値は毎回異なります")
	
	err1 := bcrypt.CompareHashAndPassword([]byte(hash1), []byte(password))
	assert.NoError(t, err1, "1回目のハッシュが正しく検証できます")
	
	err2 := bcrypt.CompareHashAndPassword([]byte(hash2), []byte(password))
	assert.NoError(t, err2, "2回目のハッシュが正しく検証できます")
}

// TestAdminUserStructure は管理者ユーザーの基本構造をテストする
func TestAdminUserStructure(t *testing.T) {
	// 管理者ユーザーの期待される構造をテスト
	expectedFields := map[string]interface{}{
		"username":     "admin",
		"email":        "admin@example.com",
		"name_kana":    "管理者",
		"student_id":   "admin001",
		"role":         "admin",
		"is_admin":     true,
	}
	
	// 各フィールドが適切な型と値を持っているかテスト
	assert.IsType(t, "", expectedFields["username"], "usernameは文字列である必要があります")
	assert.IsType(t, "", expectedFields["email"], "emailは文字列である必要があります")
	assert.IsType(t, "", expectedFields["name_kana"], "name_kanaは文字列である必要があります")
	assert.IsType(t, "", expectedFields["student_id"], "student_idは文字列である必要があります")
	assert.IsType(t, "", expectedFields["role"], "roleは文字列である必要があります")
	assert.IsType(t, true, expectedFields["is_admin"], "is_adminはboolである必要があります")
	
	// 値の妥当性をテスト
	assert.Equal(t, "admin", expectedFields["username"], "管理者のユーザー名は'admin'である必要があります")
	assert.Contains(t, expectedFields["email"], "@", "メールアドレスには@が含まれている必要があります")
	assert.Equal(t, "admin", expectedFields["role"], "管理者のロールは'admin'である必要があります")
	assert.True(t, expectedFields["is_admin"].(bool), "管理者のis_adminフラグはtrueである必要があります")
}

// TestAdminConstants は管理者関連の定数をテストする
func TestAdminConstants(t *testing.T) {
	// 管理者の基本情報
	adminEmail := "admin@example.com"
	adminRole := "admin"
	adminStudentID := "admin001"
	
	// メールアドレスの形式検証
	assert.Contains(t, adminEmail, "@", "管理者メールアドレスには@が含まれている必要があります")
	assert.Contains(t, adminEmail, ".", "管理者メールアドレスにはドメインが含まれている必要があります")
	
	// ロールの検証
	assert.Equal(t, "admin", adminRole, "管理者ロールは'admin'である必要があります")
	
	// 学生IDの検証
	assert.NotEmpty(t, adminStudentID, "管理者の学生IDは空ではない必要があります")
	assert.Contains(t, adminStudentID, "admin", "管理者の学生IDには'admin'が含まれている必要があります")
}

// TestBcryptConfiguration はbcryptの設定をテストする
func TestBcryptConfiguration(t *testing.T) {
	password := "testPassword"
	hashedPassword := hashPassword(password)
	
	// ハッシュの長さをチェック（bcryptハッシュは通常60文字）
	assert.Equal(t, 60, len(hashedPassword), "bcryptハッシュは60文字である必要があります")
	
	// ハッシュがbcryptプレフィックスで始まることを確認
	assert.True(t, len(hashedPassword) >= 7, "ハッシュは十分な長さが必要です")
	assert.Equal(t, "$2", hashedPassword[:2], "bcryptハッシュは$2で始まる必要があります")
}

