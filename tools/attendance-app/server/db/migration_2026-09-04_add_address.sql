-- 既にテーブル作成済みの環境向け追加マイグレーション
-- (GPS座標から住所を取得して保存するための列を追加)
ALTER TABLE attendance_records
  ADD COLUMN address VARCHAR(255) NULL AFTER lng;
