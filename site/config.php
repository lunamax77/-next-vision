<?php
/**
 * nextvision.fun 問い合わせフォーム設定
 *
 * ★ このファイルは「プレースホルダ版」をリポジトリにコミットしています。
 *    本番値はサーバー上（CORESERVER のファイルマネージャー等）で直接書き換えてください。
 *    GitHub Actions のデプロイ対象からは除外しているので、サーバー上の値が上書きされることはありません。
 *    （手順: docs/setup/form.md）
 *
 * ※ パスワード・APIキーなど秘密情報をリポジトリに書かないこと。
 */

return [
    // 通知メールの宛先（代表宛）。複数なら 'a@example.com, b@example.com'
    'NOTIFY_TO'   => 'data@nextvision.fun',

    // 送信元アドレス（自ドメインのアドレスにすると迷惑メール判定されにくい）
    'MAIL_FROM'      => 'data@nextvision.fun',
    'MAIL_FROM_NAME' => '株式会社NextVision',

    // Google スプレッドシート記録用 Apps Script ウェブアプリURL
    // 未設定（プレースホルダのまま）の場合はシート記録をスキップし、メール送信のみ行います。
    'GAS_WEBHOOK_URL' => 'https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec',

    // GAS 側と共有する簡易トークン（第三者がシートに書き込むのを防ぐ）。
    // gas-webhook.gs の SHARED_TOKEN と同じ文字列にする。空なら送らない。
    'GAS_TOKEN' => 'CHANGE_ME_RANDOM_TOKEN',

    // 送信完了ページ／エラー時の戻り先
    'THANKS_URL' => 'thanks.html',
    'ERROR_URL'  => 'index.html',
];
