-- 勤怠確認アプリ 試作版 DBスキーマ
-- CoreServer (Value-Domain) の MySQL で実行してください

CREATE TABLE IF NOT EXISTS staff_accounts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  login_id VARCHAR(30) NOT NULL,      -- スタッフ用ログインID(例: staff0001)
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  group_name VARCHAR(100) NULL,           -- 所属グループ(任意)
  phone_number VARCHAR(20) NULL,          -- 電話番号
  nearest_station VARCHAR(100) NULL,      -- 最寄駅(自由記述)
  nearest_station_lat DECIMAL(10,6) NULL, -- 最寄駅の座標(自動取得・取得失敗時はNULL)
  nearest_station_lng DECIMAL(10,6) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_login_id (login_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance_records (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  login_id VARCHAR(30) NULL,        -- staff_accounts.login_id
  staff_name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,        -- wakeup / checkin / move / checkout
  label VARCHAR(50) NOT NULL,       -- 表示名(起床確認 等)
  transport_method VARCHAR(20) NULL, -- 移動手段(徒歩/電車/車 等)
  route VARCHAR(255) NULL,           -- 経路(自由記述)
  amount INT NULL,                   -- 金額(円)
  recorded_at DATETIME NOT NULL,    -- 端末側で取得した記録日時(UTC)
  lat DECIMAL(10,6) NULL,
  lng DECIMAL(10,6) NULL,
  address VARCHAR(255) NULL,        -- 逆ジオコーディングで取得した住所
  accuracy_m INT NULL,
  photo_path VARCHAR(255) NULL,     -- サーバー上の保存パス
  location_mismatch TINYINT(1) NOT NULL DEFAULT 0, -- 出勤確認時、登録した最寄駅から離れている場合1
  sheet_synced TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff_time (staff_name, recorded_at),
  KEY idx_login_time (login_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
