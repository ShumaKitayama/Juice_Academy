# Juice Academy 本番環境デプロイガイド

## 概要

このドキュメントは、Juice Academy プロジェクトを開発環境から本番環境にデプロイするための完全なガイドです。

## 前提条件

### 必要なソフトウェア

- Docker (20.10.0 以降)
- Docker Compose (1.29.0 以降)
- Go (1.21 以降) - テスト実行用
- Node.js (18 以降) - フロントエンドビルド用
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

### 3. Cloudflare Tunnel の設定

このプロジェクトは Cloudflare Tunnel と Zero Trust を使用してデプロイします。
SSL 証明書の管理や nginx の設定は不要です。

```bash
# Cloudflare Tunnel の設定手順はプロジェクトの要件に応じて追加してください
# 詳細は Cloudflare のドキュメントを参照: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
```

### 4. デプロイの実行

```bash
# 完全デプロイ（テスト実行込み）
./deploy.sh

# テストをスキップしてデプロイ
./deploy.sh --skip-tests

# ビルドのみ実行する場合
./deploy.sh --build-only

# バックアップをスキップする場合
./deploy.sh --no-backup

# 全オプションの確認
./deploy.sh --help
```

### 5. テスト実行（デプロイ前の確認推奨）

```bash
# バックエンドテストの実行
cd backend
./run_tests.sh

# テストカバレッジ付きで実行
cd backend
./run_tests.sh --coverage

# フロントエンドのビルドテスト
cd frontend
npm run build
npm run lint
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

### テスト関連

```bash
# バックエンドテストの実行
cd backend && ./run_tests.sh

# テストカバレッジの生成
cd backend && ./run_tests.sh --coverage

# 個別テストの実行
cd backend
go test -v ./controllers -run TestName
go test -v ./middleware

# フロントエンドテスト
cd frontend
npm run lint
npx tsc --noEmit
npm run build
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
curl -f http://localhost:3000/

# バックエンドAPIの確認
curl -f http://localhost:8080/api/announcements

# Cloudflare Tunnel経由での確認
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

### CI/CD（継続的インテグレーション）

GitHub Actions を使用した自動テスト・デプロイが設定されています：

```bash
# ワークフロー一覧
.github/workflows/
├── backend-tests.yml      # バックエンドテスト
├── frontend-tests.yml     # フロントエンドテスト
└── deploy-production.yml  # 本番デプロイ
```

#### テストの自動実行

- `main` または `production-deployment` ブランチへのプッシュ時
- プルリクエスト作成時
- バックエンド・フロントエンドファイルの変更時

#### 本番デプロイワークフロー

- `main` ブランチへのプッシュ時に自動実行
- 手動実行も可能（GitHub Actions 画面から）
- テスト成功後にデプロイ準備を実行

## トラブルシューティング

### テスト関連の問題

#### 1. テスト実行エラー

```bash
# エラー例：MongoDB接続エラー
```

**解決策**：

```bash
# テスト用MongoDBを再起動
cd backend
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d

# ヘルスチェック確認
docker-compose -f docker-compose.test.yml logs mongodb-test
```

#### 2. テストタイムアウト

```bash
# エラー例：test timeout
```

**解決策**：

```bash
# タイムアウト時間を延長
cd backend
go test -v ./controllers -run ".*Integration.*" -timeout 120s

# または個別にテスト実行
go test -v ./controllers -run TestAuthIntegrationSuite
```

### よくある問題と解決方法

#### 1. コンテナが起動しない

```bash
# ログを確認
docker-compose -f docker-compose.prod.yml logs

# ポートの競合を確認
sudo netstat -tlnp | grep :3000
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

#### 3. フロントエンドが表示されない

```bash
# フロントエンドコンテナの状態を確認
docker-compose -f docker-compose.prod.yml ps frontend

# フロントエンドのログを確認
docker-compose -f docker-compose.prod.yml logs frontend

# Cloudflare Tunnelの接続状態を確認
# cloudflared tunnel info <tunnel-name>
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
2. **Cloudflare Zero Trust**: Cloudflare の Zero Trust でアクセス制御を設定
3. **CORS 制限**: 特定のドメインのみ許可
4. **ファイアウォール**: Cloudflare Tunnel を使用することで、サーバーのポートを外部に公開する必要がありません
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

1. **Cloudflare**: Cloudflare のキャッシュと CDN を活用
2. **圧縮**: Cloudflare の自動圧縮機能を有効化
3. **データベース**: 適切なインデックスの設定
4. **Zero Trust**: Cloudflare Zero Trust でセキュリティを強化

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
