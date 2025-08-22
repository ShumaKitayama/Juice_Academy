# Juice Academy 本番環境デプロイガイド

## 概要

このドキュメントは、Juice Academy プロジェクトを開発環境から本番環境にデプロイするための完全なガイドです。

## 前提条件

### 必要なソフトウェア

- Docker (20.10.0 以降)
- Docker Compose (1.29.0 以降)
- Git
- curl（ヘルスチェック用）

### 推奨システム要件

- **メモリ**: 最低 4GB、推奨 8GB 以上
- **ディスク容量**: 最低 10GB、推奨 20GB 以上
- **CPU**: 2 コア以上

## デプロイ手順

### 1. リポジトリのクローンとブランチ切り替え

```bash
git clone <your-repository-url>
cd Juice_Academy
git checkout production-deployment
```

### 2. 環境変数の設定

```bash
# 本番環境用の環境変数ファイルを作成
cp .env.example .env.production

# エディタで編集
nano .env.production
```

#### 必須設定項目

```bash
# JWT設定（32文字以上の強力なシークレット）
JWT_SECRET=your-super-secure-jwt-secret-key-here-change-this-in-production-minimum-32-characters

# Stripe設定（本番環境用キー）
STRIPE_SECRET_KEY=sk_live_your_actual_live_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_live_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_stripe_webhook_secret

# MongoDB認証（強力なパスワード）
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your-very-secure-mongodb-password

# ドメイン設定
FRONTEND_URL=https://yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 3. SSL 証明書の準備

#### オプション A: Let's Encrypt（推奨）

```bash
# Certbotをインストール
sudo apt-get update
sudo apt-get install certbot

# SSL証明書を取得
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# 証明書をコピー
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem
```

#### オプション B: 自己署名証明書（テスト用）

```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj '/C=JP/ST=Tokyo/L=Tokyo/O=JuiceAcademy/CN=localhost'
```

### 4. デプロイの実行

```bash
# デプロイスクリプトを実行
./deploy.sh

# または、ビルドのみ実行する場合
./deploy.sh --build-only

# バックアップをスキップする場合
./deploy.sh --no-backup
```

## 運用コマンド

### サービスの状態確認

```bash
# コンテナの状態を確認
docker-compose -f docker-compose.prod.yml ps

# ログを確認
docker-compose -f docker-compose.prod.yml logs -f

# 特定のサービスのログを確認
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f mongodb
```

### サービスの制御

```bash
# サービスの停止
docker-compose -f docker-compose.prod.yml down

# サービスの再起動
docker-compose -f docker-compose.prod.yml restart

# 特定のサービスの再起動
docker-compose -f docker-compose.prod.yml restart backend

# サービスの起動
docker-compose -f docker-compose.prod.yml up -d
```

### データベース管理

```bash
# データベースバックアップ
docker-compose -f docker-compose.prod.yml exec mongodb mongodump --out /backup/$(date +%Y%m%d_%H%M%S) --gzip

# データベースリストア（例）
docker-compose -f docker-compose.prod.yml exec mongodb mongorestore /backup/20231201_120000 --gzip

# MongoDBシェルに接続
docker-compose -f docker-compose.prod.yml exec mongodb mongosh
```

## 監視とメンテナンス

### ヘルスチェック

```bash
# フロントエンドの確認
curl -f http://localhost/

# バックエンドAPIの確認
curl -f http://localhost:8080/api/announcements

# HTTPSの確認（SSL証明書設定後）
curl -f https://yourdomain.com/
```

### ログ監視

```bash
# リアルタイムでログを監視
docker-compose -f docker-compose.prod.yml logs -f

# エラーログのみ表示
docker-compose -f docker-compose.prod.yml logs | grep -i error

# 最新100行のログを表示
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### リソース監視

```bash
# Dockerコンテナのリソース使用状況
docker stats

# ディスク使用量の確認
df -h
du -sh mongodb-backup/
du -sh logs/
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. コンテナが起動しない

```bash
# ログを確認
docker-compose -f docker-compose.prod.yml logs

# ポートの競合を確認
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :8080
```

#### 2. データベース接続エラー

```bash
# MongoDB コンテナの状態を確認
docker-compose -f docker-compose.prod.yml ps mongodb

# MongoDB ログを確認
docker-compose -f docker-compose.prod.yml logs mongodb

# ネットワーク接続を確認
docker network ls
docker network inspect juice_academy_juice_academy_network
```

#### 3. SSL 証明書の問題

```bash
# 証明書の有効性を確認
openssl x509 -in ssl/cert.pem -text -noout

# 証明書の期限を確認
openssl x509 -in ssl/cert.pem -noout -dates
```

#### 4. フロントエンドが表示されない

```bash
# Nginxの設定を確認
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Nginxのログを確認
docker-compose -f docker-compose.prod.yml logs nginx
```

### 緊急時の対応

#### サービスの完全停止

```bash
docker-compose -f docker-compose.prod.yml down
docker system prune -f
```

#### データベースの緊急バックアップ

```bash
# 緊急バックアップ
mkdir -p emergency-backup
docker-compose -f docker-compose.prod.yml exec mongodb mongodump --out /backup/emergency-$(date +%Y%m%d_%H%M%S) --gzip
```

#### 開発環境への切り戻し

```bash
# 本番環境を停止
docker-compose -f docker-compose.prod.yml down

# 開発環境を起動
docker-compose up -d
```

## セキュリティ考慮事項

### 本番環境でのセキュリティ設定

1. **強力なパスワード**: すべてのパスワードは 32 文字以上の複雑なものを使用
2. **HTTPS 強制**: 本番環境では必ず HTTPS を使用
3. **CORS 制限**: 特定のドメインのみ許可
4. **ファイアウォール**: 必要なポート（80, 443, 8080）のみ開放
5. **定期更新**: Docker イメージとシステムの定期更新

### 定期メンテナンス

```bash
# 週次バックアップスクリプト例
#!/bin/bash
BACKUP_DIR="mongodb-backup/weekly/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR
docker-compose -f docker-compose.prod.yml exec mongodb mongodump --out /backup/weekly/$(date +%Y%m%d) --gzip

# 古いバックアップの削除（30日以上前）
find mongodb-backup/ -type d -mtime +30 -exec rm -rf {} \;
```

## パフォーマンス最適化

### 推奨設定

1. **リバースプロキシ**: Nginx を使用してロードバランシング
2. **キャッシュ**: 静的ファイルのキャッシュ設定
3. **圧縮**: Gzip 圧縮の有効化
4. **データベース**: 適切なインデックスの設定

### モニタリング

```bash
# パフォーマンス監視
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# ディスク使用量監視
watch -n 5 'df -h && echo && du -sh mongodb-backup/ logs/'
```

## サポート

問題が発生した場合は、以下の情報を収集してください：

1. エラーメッセージ
2. ログファイル (`docker-compose -f docker-compose.prod.yml logs`)
3. システム情報 (`docker version`, `docker-compose version`)
4. 環境変数設定（機密情報は除く）

---

このガイドに従って、安全で安定した本番環境のデプロイを実現してください。
