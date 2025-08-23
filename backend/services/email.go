package services

import (
	"bytes"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
	"strconv"
)

// EmailConfig はメール設定の構造体
type EmailConfig struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	FromEmail    string
	FromName     string
}

// getEmailConfig は環境変数からメール設定を取得
func getEmailConfig() EmailConfig {
	port, _ := strconv.Atoi(os.Getenv("SMTP_PORT"))
	if port == 0 {
		port = 587 // デフォルトポート
	}

	return EmailConfig{
		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     port,
		SMTPUsername: os.Getenv("SMTP_USERNAME"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		FromEmail:    os.Getenv("FROM_EMAIL"),
		FromName:     os.Getenv("FROM_NAME"),
	}
}

// OTPEmailData はOTPメールテンプレート用のデータ構造体
type OTPEmailData struct {
	UserName string
	OTPCode  string
	Purpose  string
	ExpiryMinutes int
	CompanyName   string
}

// sendEmail は汎用メール送信関数
func sendEmail(to, subject, body string) error {
	config := getEmailConfig()

	// 開発環境ではメール送信をモック（コンソールに出力）
	if os.Getenv("APP_ENV") == "development" && (config.SMTPHost == "" || config.SMTPUsername == "test@example.com") {
		fmt.Printf("\n=== 📧 メール送信モック ===\n")
		fmt.Printf("宛先: %s\n", to)
		fmt.Printf("件名: %s\n", subject)
		fmt.Printf("送信者: %s\n", config.FromEmail)
		
		// OTPコードを抽出して表示（開発用）
		if subject == "【Juice Academy】ログイン認証コード" {
			// 簡単なOTPコード抽出（本文からOTPコードを探す）
			fmt.Printf("🔐 開発用OTPコード表示機能を有効にしました\n")
		}
		fmt.Printf("========================\n\n")
		return nil
	}

	// 設定の検証
	if config.SMTPHost == "" || config.SMTPUsername == "" || config.SMTPPassword == "" {
		return fmt.Errorf("メール設定が不完全です")
	}

	// 認証設定
	auth := smtp.PlainAuth("", config.SMTPUsername, config.SMTPPassword, config.SMTPHost)

	// メールヘッダー
	from := config.FromEmail
	if config.FromName != "" {
		from = fmt.Sprintf("%s <%s>", config.FromName, config.FromEmail)
	}

	msg := []byte(fmt.Sprintf(
		"From: %s\r\n"+
			"To: %s\r\n"+
			"Subject: %s\r\n"+
			"MIME-Version: 1.0\r\n"+
			"Content-Type: text/html; charset=UTF-8\r\n"+
			"\r\n"+
			"%s\r\n",
		from, to, subject, body))

	// メール送信
	addr := fmt.Sprintf("%s:%d", config.SMTPHost, config.SMTPPort)
	err := smtp.SendMail(addr, auth, config.FromEmail, []string{to}, msg)
	if err != nil {
		return fmt.Errorf("メール送信エラー: %v", err)
	}

	fmt.Printf("メール送信成功: %s\n", to)
	return nil
}

// getOTPEmailTemplate はOTPメール用のHTMLテンプレートを返す
func getOTPEmailTemplate() string {
	return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>認証コード - {{.CompanyName}}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        .otp-container {
            background: #f8f9fa;
            border: 2px dashed #ff6b35;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .otp-code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #ff6b35;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
        }
        .otp-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
        .expiry-info {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .expiry-info strong {
            color: #856404;
        }
        .instructions {
            margin: 20px 0;
            padding: 20px;
            background: #e7f3ff;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        .security-notice {
            margin-top: 30px;
            padding: 15px;
            background: #f8d7da;
            border-radius: 6px;
            border-left: 4px solid #dc3545;
            font-size: 14px;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #e9ecef;
        }
        .purpose-badge {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{.CompanyName}}</h1>
            <p>認証コードをお送りします</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                {{.UserName}} 様
            </div>
            
            <p>{{.CompanyName}}へのログインに必要な認証コードを送信いたします。</p>
            
            {{if eq .Purpose "login"}}
            <div class="purpose-badge">ログイン認証</div>
            {{else if eq .Purpose "password_reset"}}
            <div class="purpose-badge">パスワードリセット</div>
            {{end}}
            
            <div class="otp-container">
                <div class="otp-label">認証コード</div>
                <div class="otp-code">{{.OTPCode}}</div>
            </div>
            
            <div class="expiry-info">
                <strong>⏰ 有効期限:</strong> この認証コードは {{.ExpiryMinutes}} 分間有効です。
            </div>
            
            <div class="instructions">
                <h3>🔐 ご利用方法</h3>
                <ol>
                    <li>ログイン画面で上記の認証コードを入力してください</li>
                    <li>認証コードは一度のみ使用可能です</li>
                    <li>有効期限内にご入力ください</li>
                </ol>
            </div>
            
            <div class="security-notice">
                <h4>🛡️ セキュリティについて</h4>
                <p>
                    この認証コードは第三者に教えないでください。<br>
                    もしこのメールに心当たりがない場合は、すぐに管理者にお知らせください。
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p>このメールは {{.CompanyName}} から自動送信されています。</p>
            <p>返信の必要はありません。</p>
            <p>&copy; {{.CompanyName}} All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`
}

// SendOTPEmail はOTPをメールで送信する
func SendOTPEmail(to, userName, otpCode, purpose string) error {
	// 開発環境でのデバッグ情報
	if os.Getenv("APP_ENV") == "development" {
		fmt.Printf("\n🔐 [DEBUG] OTP送信情報:\n")
		fmt.Printf("  宛先: %s\n", to)
		fmt.Printf("  ユーザー名: %s\n", userName)
		fmt.Printf("  OTPコード: %s\n", otpCode)
		fmt.Printf("  目的: %s\n", purpose)
		fmt.Printf("  有効期限: 5分\n\n")
	}

	// テンプレートデータを準備
	data := OTPEmailData{
		UserName:      userName,
		OTPCode:       otpCode,
		Purpose:       purpose,
		ExpiryMinutes: 5,
		CompanyName:   "Juice Academy",
	}

	// HTMLテンプレートを解析
	tmpl, err := template.New("otp").Parse(getOTPEmailTemplate())
	if err != nil {
		return fmt.Errorf("テンプレート解析エラー: %v", err)
	}

	// テンプレートにデータを適用
	var body bytes.Buffer
	err = tmpl.Execute(&body, data)
	if err != nil {
		return fmt.Errorf("テンプレート実行エラー: %v", err)
	}

	// 件名を設定
	var subject string
	switch purpose {
	case "login":
		subject = "【Juice Academy】ログイン認証コード"
	case "password_reset":
		subject = "【Juice Academy】パスワードリセット認証コード"
	default:
		subject = "【Juice Academy】認証コード"
	}

	// メール送信
	return sendEmail(to, subject, body.String())
}
