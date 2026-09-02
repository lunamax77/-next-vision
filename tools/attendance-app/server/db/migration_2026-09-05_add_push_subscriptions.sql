-- 既にテーブル作成済みの環境向け追加マイグレーション
-- (打刻通知のプッシュ購読を保存するテーブルを追加)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
