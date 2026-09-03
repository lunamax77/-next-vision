-- 既にテーブル作成済みの環境向け追加マイグレーション
-- (最寄駅・電話番号・グループ名、出勤時の位置不一致フラグを追加)

ALTER TABLE staff_accounts
  ADD COLUMN group_name VARCHAR(100) NULL AFTER display_name,
  ADD COLUMN phone_number VARCHAR(20) NULL AFTER group_name,
  ADD COLUMN nearest_station VARCHAR(100) NULL AFTER phone_number,
  ADD COLUMN nearest_station_lat DECIMAL(10,6) NULL AFTER nearest_station,
  ADD COLUMN nearest_station_lng DECIMAL(10,6) NULL AFTER nearest_station_lat;

ALTER TABLE attendance_records
  ADD COLUMN location_mismatch TINYINT(1) NOT NULL DEFAULT 0 AFTER photo_path;
