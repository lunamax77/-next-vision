-- 管理画面でスタッフのパスワードを確認できるようにするため、平文パスワードを保持する列を追加
-- (ログイン検証自体は従来どおり password_hash で行う)

ALTER TABLE staff_accounts
  ADD COLUMN password_plain VARCHAR(50) NULL AFTER password_hash;
