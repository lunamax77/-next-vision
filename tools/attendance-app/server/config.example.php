<?php
// このファイルを config.php としてコピーし、実際の値を入れて使用する。
// config.php は .gitignore 対象(秘密情報のためコミットしないこと)。

return [
    // アプリ側からのアクセスを簡易的に絞るための共有トークン。
    // フロントエンドの app.js に埋め込む値と一致させる(完全な認証ではない点に注意)。
    'app_token' => 'CHANGE_ME',

    'db' => [
        'host' => 'localhost',
        'name' => 'your_db_name',
        'user' => 'your_db_user',
        'pass' => 'your_db_pass',
        'charset' => 'utf8mb4',
    ],

    // アップロード写真の保存先(公開ディレクトリの外に置くのが望ましいが、
    // CoreServer 等の共有サーバーではドキュメントルート配下になることが多い)
    'uploads_dir' => __DIR__ . '/uploads',
    'uploads_url_base' => 'https://your-domain.example.com/attendance/server/uploads',

    // Google スプレッドシート自動反映(未設定なら自動的にスキップされる)
    'google' => [
        'enabled' => false,
        'service_account_json' => __DIR__ . '/google-service-account.json',
        'spreadsheet_id' => 'YOUR_SPREADSHEET_ID',
        'sheet_range' => 'シート1!A:K',
    ],

    // エリア別メール通知の差出人(自分のドメインのアドレスにすると迷惑メール判定されにくい)
    'notify_from' => 'attendance@your-domain.example.com',
    // 通知メール末尾に載せる管理画面URL
    'admin_url' => 'https://your-domain.example.com/attendance/admin/',

    // 出勤状況サマリーメールの集計時間帯(server/cron/daily_summary.php で送信)
    'summary' => [
        'from' => '09:00',
        'to' => '11:00',
    ],

    // GitHub Actions からの自動デプロイ用トークン(server/deploy.php)。
    // GitHub の Secrets "ATTENDANCE_DEPLOY_TOKEN" と同じ値にする。空なら自動デプロイ無効。
    'deploy_token' => '',
];
