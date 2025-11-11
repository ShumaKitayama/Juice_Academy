package config

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ConnectDB は指定した URI に接続し、MongoDB クライアントを返す。
func ConnectDB(uri string) *mongo.Client {
	if uri == "" {
		log.Fatal("MONGODB_URI が設定されていません")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOpts := options.Client().ApplyURI(uri)

	if os.Getenv("MONGODB_TLS_ENABLED") == "true" {
		tlsConfig, err := buildMongoTLSConfig()
		if err != nil {
			log.Fatalf("MongoDB TLS設定エラー: %v", err)
		}
		clientOpts.SetTLSConfig(tlsConfig)
	}

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		// セキュリティ: 本番環境では接続エラーの詳細を隠す
		if os.Getenv("APP_ENV") == "production" {
			log.Fatal("MongoDB接続エラー: データベースに接続できません")
		} else {
			log.Fatal("MongoDB接続エラー:", err)
		}
	}
	return client
}

func buildMongoTLSConfig() (*tls.Config, error) {
	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
	}

	if caFile := os.Getenv("MONGODB_TLS_CA_FILE"); caFile != "" {
		caCert, err := os.ReadFile(caFile)
		if err != nil {
			return nil, fmt.Errorf("CA証明書の読み込みに失敗しました: %w", err)
		}

		caPool := x509.NewCertPool()
		if !caPool.AppendCertsFromPEM(caCert) {
			return nil, fmt.Errorf("CA証明書をプールに追加できませんでした")
		}

		tlsConfig.RootCAs = caPool
	}

	certFile := os.Getenv("MONGODB_TLS_CERT_FILE")
	keyFile := os.Getenv("MONGODB_TLS_KEY_FILE")
	if certFile != "" && keyFile != "" {
		cert, err := tls.LoadX509KeyPair(certFile, keyFile)
		if err != nil {
			return nil, fmt.Errorf("クライアント証明書の読み込みに失敗しました: %w", err)
		}
		tlsConfig.Certificates = []tls.Certificate{cert}
	}

	return tlsConfig, nil
}
