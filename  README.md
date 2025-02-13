# Juice Academy Web Application Scaffold

このプロジェクトは、大学内ドリンクバーサービス向けウェブアプリケーションの雛形です。

## 構成

- **バックエンド**: Go + Gin を用いた API サーバー（ポート 8080）
- **フロントエンド**: React (Vite + TypeScript)（ポート 3000）
- **データベース**: MongoDB（ポート 27017）
- **コンテナ化**: Docker / Docker Compose により各サービスを管理

## セットアップ

1. Docker と Docker Compose がインストール済みであることを確認する。
2. リポジトリをクローンする。
3. プロジェクトルートで以下のコマンドを実行し、全サービスを起動する:

   ```bash
   docker-compose up --build