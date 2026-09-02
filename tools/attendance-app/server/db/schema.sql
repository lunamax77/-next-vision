-- 勤怠確認アプリ 試作版 DBスキーマ
-- CoreServer (Value-Domain) の MySQL で実行してください

CREATE TABLE IF NOT EXISTS attendance_records (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,        -- wakeup / checkin / move / checkout
  label VARCHAR(50) NOT NULL,       -- 表示名(起床確認 等)
  recorded_at DATETIME NOT NULL,    -- 端末側で取得した記録日時(UTC)
  lat DECIMAL(10,6) NULL,
  lng DECIMAL(10,6) NULL,
  accuracy_m INT NULL,
  photo_path VARCHAR(255) NULL,     -- サーバー上の保存パス
  sheet_synced TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff_time (staff_name, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
