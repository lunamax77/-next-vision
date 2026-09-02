-- 既にテーブル作成済みの環境向け追加マイグレーション
-- (移動手段・経路・金額を後から追加)
ALTER TABLE attendance_records
  ADD COLUMN transport_method VARCHAR(20) NULL AFTER label,
  ADD COLUMN route VARCHAR(255) NULL AFTER transport_method,
  ADD COLUMN amount INT NULL AFTER route;
