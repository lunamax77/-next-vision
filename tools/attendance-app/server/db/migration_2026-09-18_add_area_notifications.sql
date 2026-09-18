-- エリア(九州・関西 等)をスタッフに設定し、エリアごとに打刻をメール通知するための追加

ALTER TABLE staff_accounts
  ADD COLUMN area VARCHAR(100) NULL AFTER group_name;

CREATE TABLE IF NOT EXISTS area_notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  area VARCHAR(100) NOT NULL,                 -- エリア名(staff_accounts.area と一致させる)
  emails VARCHAR(500) NOT NULL,               -- 通知先メールアドレス(カンマ区切りで複数可)
  notify_types VARCHAR(100) NOT NULL DEFAULT 'wakeup,checkin,move,checkout', -- 通知する打刻種別
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_area (area)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 初期設定(管理画面「エリア別メール通知」から後で変更可)
INSERT INTO area_notifications (area, emails, notify_types) VALUES
  ('九州', 'kyushu-jimu@d-creation-o.com', 'wakeup,checkin,move,checkout'),
  ('本社', 'data@d-creation-o.com', 'wakeup,checkin,move,checkout')
ON DUPLICATE KEY UPDATE emails = VALUES(emails);
