-- 既にテーブル作成済みの環境向け追加マイグレーション
-- (スタッフごとのID/PWログイン機能を追加)

CREATE TABLE IF NOT EXISTS staff_accounts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  login_id VARCHAR(30) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_login_id (login_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE attendance_records
  ADD COLUMN login_id VARCHAR(30) NULL AFTER id,
  ADD KEY idx_login_time (login_id, recorded_at);
