-- 二重登録防止: 端末が打刻ごとに付けるIDを保存する
ALTER TABLE attendance_records
  ADD COLUMN client_id VARCHAR(64) NULL AFTER login_id,
  ADD UNIQUE KEY uniq_login_client (login_id, client_id);
